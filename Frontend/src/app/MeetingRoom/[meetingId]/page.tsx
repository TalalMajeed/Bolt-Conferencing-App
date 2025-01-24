"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AudioOutlined, VideoCameraOutlined, MessageOutlined, CloseOutlined } from "@ant-design/icons";
import Link from "next/link";

export default function MeetingRoom({ params }: { params: { meetingId: string } }) {
    const { meetingId } = params;
    const searchParams = useSearchParams();
    const router = useRouter();

    const audioEnabled = searchParams.get("audio") === "true";
    const videoEnabled = searchParams.get("video") === "true";
    const userName = searchParams.get("name") || "You";

    const [isMicOn, setIsMicOn] = useState(audioEnabled);
    const [isCameraOn, setIsCameraOn] = useState(videoEnabled);

    const localVideoRef = useRef<HTMLVideoElement>(null);

    const [participants, setParticipants] = useState([
        { id: meetingId, name: userName, video: videoEnabled, audio: audioEnabled },
    ]);

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        if (videoEnabled && localVideoRef.current) {
            navigator.mediaDevices
                .getUserMedia({ video: true })
                .then((stream) => {
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream;
                        localVideoRef.current.play();
                    }
                })
                .catch((error) => {
                    console.error("Error accessing camera:", error);
                });
        }

        return () => {
            if (localVideoRef.current?.srcObject) {
                const tracks = (localVideoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach((track) => track.stop());
                localVideoRef.current.srcObject = null;
            }
        };
    }, [videoEnabled]);

    const toggleMicrophone = () => {
        setIsMicOn((prev) => !prev);
    };

    const toggleCamera = () => {
        if (isCameraOn && localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            localVideoRef.current.srcObject = null;
        } else {
            navigator.mediaDevices
                .getUserMedia({ video: true })
                .then((stream) => {
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream;
                        localVideoRef.current.play();
                    }
                })
                .catch((error) => {
                    console.error("Error accessing camera:", error);
                });
        }
        setIsCameraOn((prev) => !prev);
    };

    const toggleChat = () => {
        setIsChatOpen((prev) => !prev);
    };

    const sendMessage = () => {
        if (newMessage.trim() === "") return;
        setMessages((prev) => [...prev, { sender: userName, text: newMessage }]);
        setNewMessage("");
    };

    const leaveMeeting = (participantId: string) => {
        setParticipants((prev) => prev.filter((participant) => participant.id !== participantId));
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white overflow-hidden">
            {/* Top Bar */}
            <header className="flex items-center justify-between p-4 bg-gray-800">
                <h1 className="text-lg font-bold">Meeting Room: {meetingId}</h1>
                <Link href="/meeting">
                    <button
                        onClick={() => leaveMeeting(meetingId)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
                    >
                        Leave Meeting
                    </button>
                </Link>
            </header>
            <div className="flex flex-1">
                <div
                    className={`flex-1 grid gap-4 p-4 ${participants.length === 1
                        ? "grid-cols-1"
                        : participants.length <= 4
                            ? "grid-cols-2"
                            : "grid-cols-3"
                        } max-h-screen overflow-y-auto`}
                >
                    {participants.map((participant) => (
                        <div
                            key={participant.id}
                            className="relative aspect-w-16 aspect-h-9 rounded overflow-hidden"
                        >
                            {/* Video Element */}
                            {participant.name === userName && isCameraOn ? (
                                <video
                                    ref={localVideoRef}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    muted
                                ></video>
                            ) : participant.video ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                                    <span className="text-gray-300">Video Placeholder</span>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                                    <span className="text-gray-300">Video is Off</span>
                                </div>
                            )}
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-sm px-2 py-1 rounded">
                                {participant.name}
                            </div>
                        </div>
                    ))}
                </div>

                <div
                    className={`flex flex-col border-l border-gray-700 transition-all duration-300 ${isChatOpen ? "w-[350px]" : "w-0"
                        } overflow-hidden`}
                >

                    <div className="p-4 flex items-center justify-between bg-gray-800">
                        <h2 className="font-bold text-lg">Chat</h2>
                        <button
                            className="text-gray-400 hover:text-white"
                            onClick={toggleChat}
                        >
                            <CloseOutlined />
                        </button>
                    </div>

                    <div
                        className="flex-1 p-4 overflow-y-auto"
                        style={{
                            maxHeight: "calc(100vh - 112px)",
                        }}
                    >
                        {messages.length > 0 ? (
                            messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`w-fit p-2 rounded-lg ${message.sender === userName
                                            ? "bg-blue-500 text-white self-end"
                                            : "bg-gray-700 text-gray-200"
                                        }`}
                                    style={{
                                        maxWidth: "80%",
                                        wordWrap: "break-word",
                                    }}
                                >
                                    <p className="text-sm font-bold">{message.sender}</p>
                                    <p className="text-sm">{message.text}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400">No messages yet...</p>
                        )}
                    </div>
                    <div className="p-4 border-t border-gray-700 bg-gray-800">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg outline-none"
                                placeholder="Type your message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button
                                onClick={sendMessage}
                                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="flex justify-center items-center gap-4 p-4 bg-gray-800">
                <button
                    onClick={toggleMicrophone}
                    className={`w-12 h-12 flex items-center justify-center rounded-full text-white ${isMicOn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                        }`}
                >
                    <AudioOutlined />
                </button>
                <button
                    onClick={toggleCamera}
                    className={`w-12 h-12 flex items-center justify-center rounded-full text-white ${isCameraOn
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                        }`}
                >
                    <VideoCameraOutlined />
                </button>
                <button
                    onClick={toggleChat}
                    className={`w-12 h-12 flex items-center justify-center rounded-full text-white ${isChatOpen
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-gray-600 hover:bg-gray-700"
                        }`}
                >
                    <MessageOutlined />
                </button>
            </footer>
        </div>
    );
}
