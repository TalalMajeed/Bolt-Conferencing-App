"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Mic, MicOff, Camera, CameraOff } from "lucide-react";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/toast";

export default function CreateMeeting() {
    const [meetingName, setMeetingName] = useState("");
    const [hostName, setHostName] = useState("");
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isMicOn, setIsMicOn] = useState(false);
    const [isCameraAllowed, setIsCameraAllowed] = useState(true);
    const [isMicAllowed, setIsMicAllowed] = useState(true);

    const videoRef = useRef<HTMLVideoElement>(null);
    const router = useRouter();
    const { toast } = useToast();

    const createMeeting = async () => {
        if (!meetingName.trim() || !hostName.trim()) {
            toast({
                title: "Missing Information",
                description: "Please enter both meeting name and your name.",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/rooms`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: meetingName,
                        username: hostName,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create meeting");
            }

            const data = await response.json();
            console.log("Successfully created meeting:", data);

            // Auto-join the created meeting
            const audioEnabled = isMicOn;
            const videoEnabled = isCameraOn;
            const roomUrl = `/${data.roomId}?audio=${audioEnabled}&video=${videoEnabled}&name=${hostName}&participantId=${data.participantId}&host=true`;
            console.log("Navigating to:", roomUrl);
            router.push(roomUrl);
        } catch (error) {
            console.error("Error creating meeting:", error);
            toast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to create meeting. Please try again.",
                variant: "destructive",
            });
        }
    };

    const toggleCamera = async () => {
        if (isCameraOn) {
            const stream = videoRef.current?.srcObject;
            if (stream instanceof MediaStream) {
                stream.getTracks().forEach((track) => track.stop());
                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }
            }
            setIsCameraOn(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
                setIsCameraOn(true);
                setIsCameraAllowed(true);
            } catch (error) {
                console.error("Error accessing camera:", error);
                setIsCameraAllowed(false);
            }
        }
    };

    const toggleMicrophone = async () => {
        if (isMicOn) {
            setIsMicOn(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
                stream.getTracks().forEach((track) => track.stop());
                setIsMicOn(true);
                setIsMicAllowed(true);
            } catch (error) {
                console.error("Error accessing microphone:", error);
                setIsMicAllowed(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans h-[100svh] flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-center p-4 bg-white">
                <img
                    src="/image.png"
                    className="w-[120px] sm:w-[150px] mt-[20px]"
                    alt="Bolt Logo"
                />
            </header>

            {/* Main Content */}
            <main
                className="flex-1 px-4 py-8 overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 120px)" }}
            >
                <div className="h-full flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
                    {/* Video Preview Section */}
                    <div className="flex flex-col items-center justify-center gap-3 flex-1 max-w-[330px] md:max-w-[400px] w-[100%]">
                        <div className="w-[100%] h-[300px] bg-gray-300 rounded-lg flex items-center justify-center">
                            <video
                                ref={videoRef}
                                className="w-full h-full rounded-lg"
                                style={{
                                    objectFit: "cover",
                                    display: isCameraOn ? "block" : "none",
                                }}
                                muted
                            ></video>
                            <div
                                style={{
                                    display: isCameraOn ? "none" : "block",
                                }}
                                className="text-lg md:text-2xl text-gray-500"
                            >
                                Video Preview
                            </div>
                        </div>
                        {/* Controls */}
                        <div className="flex gap-4 justify-center md:justify-start">
                            <Button
                                size="icon"
                                variant="default"
                                className={`${
                                    isMicAllowed
                                        ? isMicOn
                                            ? "bg-[#00796b] hover:bg-[#268e82]"
                                            : "bg-red-600 hover:bg-red-500"
                                        : "bg-gray-400 cursor-not-allowed"
                                } text-white rounded-full`}
                                onClick={toggleMicrophone}
                                disabled={!isMicAllowed}
                            >
                                {isMicOn ? (
                                    <Mic className="h-4 w-4" />
                                ) : (
                                    <MicOff className="h-4 w-4" />
                                )}
                            </Button>
                            <Button
                                size="icon"
                                variant="default"
                                className={`${
                                    isCameraAllowed
                                        ? isCameraOn
                                            ? "bg-[#00796b] hover:bg-[#268e82]"
                                            : "bg-red-600 hover:bg-red-500"
                                        : "bg-gray-400 cursor-not-allowed"
                                } text-white rounded-full`}
                                onClick={toggleCamera}
                                disabled={!isCameraAllowed}
                            >
                                {isCameraOn ? (
                                    <Camera className="h-4 w-4" />
                                ) : (
                                    <CameraOff className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Meeting Creation Section */}
                    <div className="flex flex-col items-center justify-center max-w-[400px] flex-1">
                        <h2 className="text-xl md:text-2xl mb-4 font-semibold">
                            Create a Meeting
                        </h2>
                        <p className="text-[#1b1d1f] text-base md:text-lg mb-6 md:text-left">
                            Set up your meeting and invite participants.
                        </p>
                        <Input
                            className="w-full py-3 px-4 rounded-lg mb-4"
                            placeholder="Enter Your Name"
                            value={hostName}
                            onChange={(e) => setHostName(e.target.value)}
                        />
                        <Input
                            className="w-full py-3 px-4 rounded-lg mb-6"
                            placeholder="Enter Meeting Name"
                            value={meetingName}
                            onChange={(e) => setMeetingName(e.target.value)}
                        />
                        <Button
                            size="lg"
                            variant="default"
                            className="bg-[#262626] hover:bg-[#404040] text-white rounded-full px-8 py-3"
                            onClick={createMeeting}
                        >
                            <Video className="mr-2 h-5 w-5" />
                            Create Meeting
                        </Button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="text-sm md:text-base text-center bg-white text-[#1b1d1f] py-4">
                Bolt ©2025 | All Rights Reserved
            </footer>
        </div>
    );
}
