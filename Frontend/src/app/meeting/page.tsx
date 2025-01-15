"use client";

import { Layout, Typography, Button, Input } from "antd";
import {
    VideoCameraOutlined,
    AudioOutlined,
    CameraOutlined,
} from "@ant-design/icons";
import { useState, useRef } from "react";
import Link from "next/link";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

export default function Meeting() {
    const [meetingId, setMeetingId] = useState("");
    const [name, setName] = useState("");
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isMicOn, setIsMicOn] = useState(false);
    const [isCameraAllowed, setIsCameraAllowed] = useState(true);
    const [isMicAllowed, setIsMicAllowed] = useState(true);

    const videoRef = useRef<HTMLVideoElement>(null);

    const handleJoin = () => {
        alert(`Joining meeting with ID: ${meetingId} and Name: ${name}`);
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
        <Layout className="min-h-screen bg-white font-sans h-[100svh]">
            <Header className="flex items-center justify-center p-4 bg-white">
                <img
                    src="/image.png"
                    className="w-[120px] sm:w-[150px] mt-[20px]"
                    alt="Bolt Logo"
                />
            </Header>
            <Content
                className="h-full px-4 py-8 overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 120px)" }}
            >
                <div className="h-full flex flex-col md:flex-row items-center justify-center gap:6 md:gap-12">
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
                        <div className="flex gap-4 justify-center md:justify-start">
                            <Button
                                type="primary"
                                size="large"
                                icon={<AudioOutlined />}
                                className={`${
                                    isMicAllowed
                                        ? isMicOn
                                            ? "!bg-[#00796b] hover:!bg-[#268e82]"
                                            : "!bg-red-600 hover:!bg-red-500"
                                        : "!bg-gray-400 cursor-not-allowed"
                                } text-white rounded-full`}
                                onClick={toggleMicrophone}
                                disabled={!isMicAllowed}
                            />
                            <Button
                                size="large"
                                type="primary"
                                icon={<CameraOutlined />}
                                className={`${
                                    isCameraAllowed
                                        ? isCameraOn
                                            ? "!bg-[#00796b] hover:!bg-[#268e82]"
                                            : "!bg-red-600 hover:!bg-red-500"
                                        : "bg-gray-400 cursor-not-allowed"
                                } text-white rounded-full`}
                                onClick={toggleCamera}
                                disabled={!isCameraAllowed}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center max-w-[400px] flex-1">
                        <Title
                            level={2}
                            className="text-[#00796b] text-xl md:text-2xl mb-4"
                        >
                            Join a Meeting
                        </Title>
                        <Text className="text-[#1b1d1f] text-base md:text-lg mb-6 md:text-left">
                            Please enter your name & meeting ID to join.
                        </Text>
                        <Input
                            className="w-full py-3 px-4 rounded-lg mb-4"
                            placeholder="Enter Your Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Input
                            className="w-full py-3 px-4 rounded-lg mb-6"
                            placeholder="Enter Meeting ID"
                            value={meetingId}
                            onChange={(e) => setMeetingId(e.target.value)}
                        />
                        <Button
                            size="large"
                            type="primary"
                            icon={<VideoCameraOutlined />}
                            className="rounded-full transition-all"
                            onClick={handleJoin}
                        >
                            Join Meeting
                        </Button>
                    </div>
                </div>
            </Content>
            <Footer className="text-sm md:text-base text-center bg-white text-[#1b1d1f] py-4">
                Bolt ©2025 | All Rights Reserved
            </Footer>
        </Layout>
    );
}
