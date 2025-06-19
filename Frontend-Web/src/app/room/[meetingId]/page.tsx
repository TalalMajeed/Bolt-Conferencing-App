"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Video,
    Mic,
    MicOff,
    MessageSquare,
    Users,
    Phone,
    X,
} from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface Participant {
    name: string | null;
    videoOn: boolean;
    audioOn: boolean;
}

interface Message {
    sender: string | null;
    text: string;
}

function MeetingRoom({ params }: { params: { meetingId: string } }) {
    const searchParams = useSearchParams();
    const username = searchParams.get("name");
    const [isCameraOn, setIsCameraOn] = useState(
        searchParams.get("video") === "true"
    );
    const [isMicOn, setIsMicOn] = useState(
        searchParams.get("audio") === "true"
    );

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");

    const [activeSidebar, setActiveSidebar] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);

    const [participants, setParticipants] = useState<Participant[]>([
        { name: username, videoOn: isCameraOn, audioOn: isMicOn },
    ]);

    // Function to get grid layout based on number of participants
    const getGridLayout = (participantCount: number) => {
        switch (participantCount) {
            case 1:
                return "grid-cols-1";
            case 2:
                return "grid-cols-2";
            case 3:
                return "grid-cols-3";
            case 4:
                return "grid-cols-2";
            case 5:
            case 6:
                return "grid-cols-3";
            case 7:
            case 8:
            case 9:
                return "grid-cols-3";
            default:
                return "grid-cols-4";
        }
    };

    // Function to get video container size based on number of participants
    const getVideoContainerSize = (participantCount: number) => {
        switch (participantCount) {
            case 1:
                return "h-full w-full max-w-4xl mx-auto";
            case 2:
                return "h-full w-full";
            case 3:
                return "h-full w-full";
            case 4:
                return "h-full w-full";
            case 5:
            case 6:
                return "h-full w-full";
            case 7:
            case 8:
            case 9:
                return "h-full w-full";
            default:
                return "h-full w-full";
        }
    };

    const toggleSidebar = (type: string) => {
        setActiveSidebar((prev) => (prev === type ? null : type));
    };

    const toggleCamera = async () => {
        if (isCameraOn) {
            // Stop all video tracks
            if (videoStreamRef.current) {
                videoStreamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                videoStreamRef.current = null;
            }
            // Clear video element
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            setIsCameraOn(false);
            // Update participants state
            setParticipants((prev) =>
                prev.map((p) =>
                    p.name === username ? { ...p, videoOn: false } : p
                )
            );
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                videoStreamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
                setIsCameraOn(true);
                // Update participants state
                setParticipants((prev) =>
                    prev.map((p) =>
                        p.name === username ? { ...p, videoOn: true } : p
                    )
                );
            } catch (error) {
                console.error("Error accessing camera:", error);
            }
        }
    };

    const toggleMicrophone = async () => {
        if (isMicOn) {
            audioStreamRef.current
                ?.getTracks()
                .forEach((track) => track.stop());
            audioStreamRef.current = null;
            setIsMicOn(false);
            // Update participants state
            setParticipants((prev) =>
                prev.map((p) =>
                    p.name === username ? { ...p, audioOn: false } : p
                )
            );
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
                audioStreamRef.current = stream;
                setIsMicOn(true);
                // Update participants state
                setParticipants((prev) =>
                    prev.map((p) =>
                        p.name === username ? { ...p, audioOn: true } : p
                    )
                );
            } catch (error) {
                console.error("Error accessing microphone:", error);
            }
        }
    };

    // Initialize camera and microphone on component mount
    useEffect(() => {
        const initializeMedia = async () => {
            if (isCameraOn) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                    });
                    videoStreamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play();
                        console.log("Video stream initialized successfully");
                    }
                } catch (error) {
                    console.error("Error accessing camera:", error);
                    setIsCameraOn(false);
                    setParticipants((prev) =>
                        prev.map((p) =>
                            p.name === username ? { ...p, videoOn: false } : p
                        )
                    );
                }
            }

            if (isMicOn) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                    });
                    audioStreamRef.current = stream;
                } catch (error) {
                    console.error("Error accessing microphone:", error);
                    setIsMicOn(false);
                    setParticipants((prev) =>
                        prev.map((p) =>
                            p.name === username ? { ...p, audioOn: false } : p
                        )
                    );
                }
            }
        };

        initializeMedia();
    }, []);

    // Handle video stream changes
    useEffect(() => {
        if (videoRef.current && isCameraOn) {
            // Ensure video element is properly set up
            videoRef.current.muted = true; // Mute to prevent feedback
            videoRef.current.playsInline = true;
            videoRef.current.autoplay = true;
        }
    }, [isCameraOn]);

    // Cleanup function to stop all media streams when component unmounts
    useEffect(() => {
        return () => {
            // Stop video stream
            if (videoStreamRef.current) {
                videoStreamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                videoStreamRef.current = null;
            }
            // Stop audio stream
            if (audioStreamRef.current) {
                audioStreamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                audioStreamRef.current = null;
            }
            // Clear video element
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, []);

    const sendMessage = () => {
        if (newMessage.trim() === "") return;
        setMessages((prev) => [
            ...prev,
            { sender: username, text: newMessage },
        ]);
        setNewMessage("");
    };

    return (
        <div className="h-screen bg-[#f8f9fa] font-sans flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 bg-white py-4 border-b border-gray-200">
                <img
                    src="/image.png"
                    className="w-[120px] sm:w-[150px]"
                    alt="Bolt Logo"
                />
            </header>

            <div className="flex flex-1">
                {/* Main Content */}
                <main className="flex justify-center items-center py-4 mx-4 flex-1">
                    <div
                        className={`grid ${getGridLayout(
                            participants.length
                        )} gap-4 ${getVideoContainerSize(
                            participants.length
                        )} max-h-[calc(100vh-100px)] aspect-video overflow-hidden w-[800px] h-[600px]`}
                    >
                        {participants.map((participant, index) => (
                            <div key={index} className="p-2 aspect-video">
                                <div className="relative bg-gray-300 h-full w-full rounded-lg overflow-hidden">
                                    {participant.name === username ? (
                                        // Current user's video
                                        <div className="w-full h-full relative overflow-hidden">
                                            <video
                                                ref={videoRef}
                                                className="w-full h-full rounded-lg object-cover"
                                                style={{
                                                    display: isCameraOn
                                                        ? "block"
                                                        : "none",
                                                }}
                                                muted
                                            />
                                            <div
                                                style={{
                                                    display: isCameraOn
                                                        ? "none"
                                                        : "block",
                                                }}
                                                className="absolute inset-0 flex flex-col items-center justify-center"
                                            >
                                                <div className="flex flex-col items-center justify-center h-full">
                                                    <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mb-2">
                                                        <span className="text-white text-xl font-bold">
                                                            {participant.name
                                                                ?.charAt(0)
                                                                .toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="text-gray-700 font-medium text-center">
                                                        {participant.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : // Other participants' video
                                    participant.videoOn ? (
                                        <div className="w-full h-full relative overflow-hidden">
                                            <video
                                                autoPlay
                                                playsInline
                                                className="w-full h-full rounded-lg object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mb-2">
                                                <span className="text-white text-xl font-bold">
                                                    {participant.name
                                                        ?.charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-gray-700 font-medium text-center">
                                                {participant.name}
                                            </span>
                                        </div>
                                    )}
                                    {/* Audio indicator */}
                                    <div className="absolute bottom-2 right-2">
                                        {participant.audioOn ? (
                                            <div className="bg-green-500 rounded-full p-1">
                                                <Mic className="h-3 w-3 text-white" />
                                            </div>
                                        ) : (
                                            <div className="bg-red-500 rounded-full p-1">
                                                <MicOff className="h-3 w-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>

                {/* Chat Sidebar */}
                {activeSidebar === "chat" && (
                    <div className="flex flex-col w-[350px] border-l bg-white">
                        <div className="p-4 flex items-center justify-between border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-gray-600" />
                                <h2 className="font-bold text-lg text-gray-800">
                                    Chat
                                </h2>
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                                    {messages.length}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                onClick={() => toggleSidebar("chat")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto">
                            {messages.length > 0 ? (
                                messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`mb-4 ${
                                            message.sender === username
                                                ? "flex justify-end"
                                                : "flex justify-start"
                                        }`}
                                    >
                                        <div
                                            className={`max-w-[80%] ${
                                                message.sender === username
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-gray-100 text-gray-800"
                                            } rounded-2xl px-4 py-3 shadow-sm`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                                        message.sender ===
                                                        username
                                                            ? "bg-blue-400 text-white"
                                                            : "bg-gray-300 text-gray-600"
                                                    }`}
                                                >
                                                    {message.sender
                                                        ?.charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                                <span
                                                    className={`text-xs font-medium ${
                                                        message.sender ===
                                                        username
                                                            ? "text-blue-100"
                                                            : "text-gray-500"
                                                    }`}
                                                >
                                                    {message.sender}
                                                </span>
                                            </div>
                                            <p className="text-sm leading-relaxed">
                                                {message.text}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
                                    <p className="text-gray-500 font-medium">
                                        No messages yet
                                    </p>
                                    <p className="text-gray-400 text-sm mt-1">
                                        Start the conversation!
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <Input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) =>
                                            setNewMessage(e.target.value)
                                        }
                                        className="w-full pr-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-full"
                                        placeholder="Type a message..."
                                        onKeyPress={(e) =>
                                            e.key === "Enter" && sendMessage()
                                        }
                                    />
                                    <Button
                                        onClick={sendMessage}
                                        disabled={!newMessage.trim()}
                                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                            />
                                        </svg>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Participants Sidebar */}
                {activeSidebar === "participants" && (
                    <div className="flex flex-col w-[350px] border-l bg-white">
                        <div className="p-4 flex items-center justify-between border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-gray-600" />
                                <h2 className="font-bold text-lg text-gray-800">
                                    Participants
                                </h2>
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                                    {participants.length}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                onClick={() => toggleSidebar("participants")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {participants.map((participant, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 mb-2"
                                >
                                    {/* Participant Avatar */}
                                    <div className="relative">
                                        <div className="w-10 h-10 bg-gradient-to-br bg-gray-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                            {participant.name
                                                ?.charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        {/* Online Status Indicator */}
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                    </div>

                                    {/* Participant Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-800 truncate">
                                                {participant.name}
                                            </span>
                                            {participant.name === username && (
                                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {/* Video Status */}
                                            <div
                                                className={`flex items-center gap-1 text-xs ${
                                                    participant.videoOn
                                                        ? "text-green-600"
                                                        : "text-gray-500"
                                                }`}
                                            >
                                                <Video className="h-3 w-3" />
                                                <span>
                                                    {participant.videoOn
                                                        ? "Video on"
                                                        : "Video off"}
                                                </span>
                                            </div>

                                            {/* Audio Status */}
                                            <div
                                                className={`flex items-center gap-1 text-xs ${
                                                    participant.audioOn
                                                        ? "text-green-600"
                                                        : "text-red-500"
                                                }`}
                                            >
                                                {participant.audioOn ? (
                                                    <>
                                                        <Mic className="h-3 w-3" />
                                                        <span>Audio on</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <MicOff className="h-3 w-3" />
                                                        <span>Audio off</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Icons */}
                                    <div className="flex items-center gap-1">
                                        {participant.videoOn && (
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        )}
                                        {participant.audioOn ? (
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        ) : (
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex justify-center items-center gap-6 bg-white shadow-lg p-4 border-t border-gray-200">
                <Button
                    variant="default"
                    size="icon"
                    className={`${
                        isMicOn
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-gray-600 hover:bg-gray-700"
                    } text-white rounded-full`}
                    onClick={toggleMicrophone}
                >
                    {isMicOn ? (
                        <Mic className="h-4 w-4" />
                    ) : (
                        <MicOff className="h-4 w-4" />
                    )}
                </Button>
                <Button
                    variant="default"
                    size="icon"
                    className={`${
                        isCameraOn
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-gray-600 hover:bg-gray-700"
                    } text-white rounded-full`}
                    onClick={toggleCamera}
                >
                    <Video className="h-4 w-4" />
                </Button>
                <Button
                    variant="default"
                    size="icon"
                    className={`${
                        activeSidebar === "chat"
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-gray-600 hover:bg-gray-700"
                    } text-white rounded-full`}
                    onClick={() => toggleSidebar("chat")}
                >
                    <MessageSquare className="h-4 w-4" />
                </Button>
                <Button
                    variant="default"
                    size="icon"
                    className={`${
                        activeSidebar === "participants"
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-gray-600 hover:bg-gray-700"
                    } text-white rounded-full`}
                    onClick={() => toggleSidebar("participants")}
                >
                    <Users className="h-4 w-4" />
                </Button>
                <Button
                    variant="destructive"
                    size="icon"
                    className="bg-red-600 hover:bg-red-700 text-white rounded-full"
                    onClick={() => (window.location.href = "/")}
                >
                    <Phone className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default MeetingRoom;
