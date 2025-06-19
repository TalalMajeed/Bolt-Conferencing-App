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
            if (videoRef.current) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream?.getTracks().forEach((track) => track.stop());
                videoRef.current.srcObject = null;
            }
            setIsCameraOn(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setIsCameraOn(true);
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
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
                audioStreamRef.current = stream;
                setIsMicOn(true);
            } catch (error) {
                console.error("Error accessing microphone:", error);
            }
        }
    };

    const sendMessage = () => {
        if (newMessage.trim() === "") return;
        setMessages((prev) => [
            ...prev,
            { sender: username, text: newMessage },
        ]);
        setNewMessage("");
    };

    return (
        <div className="h-screen bg-[#ffffff] font-sans flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 bg-white shadow-md py-4">
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
                        )} gap-4 ${getVideoContainerSize(participants.length)}`}
                    >
                        {participants.map((participant, index) => (
                            <div key={index} className="p-2">
                                <div className="relative bg-gray-300 h-full flex items-center justify-center rounded-lg shadow-md overflow-hidden">
                                    {participant.videoOn ? (
                                        <video
                                            ref={
                                                participant.name === username
                                                    ? videoRef
                                                    : null
                                            }
                                            autoPlay
                                            playsInline
                                            className="rounded-lg h-full w-full object-cover"
                                        />
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
                        <div className="p-4 flex items-center justify-between border-b">
                            <h2 className="font-bold text-lg">Chat</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-black"
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
                                        className={`w-fit p-2 rounded-lg mb-2 ${
                                            message.sender === username
                                                ? "bg-blue-500 text-white"
                                                : "bg-gray-700 text-gray-200"
                                        }`}
                                    >
                                        <p className="text-sm font-bold">
                                            {message.sender}
                                        </p>
                                        <p className="text-sm">
                                            {message.text}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-600">
                                    No messages yet...
                                </p>
                            )}
                        </div>
                        <div className="p-2 border-t flex gap-2">
                            <Input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="flex-1"
                                placeholder="Type a message..."
                                onKeyPress={(e) =>
                                    e.key === "Enter" && sendMessage()
                                }
                            />
                            <Button onClick={sendMessage}>Send</Button>
                        </div>
                    </div>
                )}

                {/* Participants Sidebar */}
                {activeSidebar === "participants" && (
                    <div className="flex flex-col w-[350px] border-l bg-white p-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h2 className="font-bold text-lg">Participants</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-black"
                                onClick={() => toggleSidebar("participants")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        {participants.map((participant, index) => (
                            <div
                                key={index}
                                className="text-gray-700 border-b py-2 flex items-center justify-between"
                            >
                                <span>{participant.name}</span>
                                {participant.audioOn ? (
                                    <Mic className="h-4 w-4" />
                                ) : (
                                    <MicOff className="h-4 w-4" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex justify-center items-center gap-6 bg-white shadow-lg p-4">
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
