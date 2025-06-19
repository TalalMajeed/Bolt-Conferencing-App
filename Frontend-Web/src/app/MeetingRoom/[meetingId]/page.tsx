"use client";
import { Layout, Button, Row, Col } from "antd";
import {
  VideoCameraOutlined,
  AudioOutlined,
  MessageOutlined,
  PhoneFilled,
  CloseOutlined,
  AudioMutedOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const { Header, Content } = Layout;

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
  const [isMicOn, setIsMicOn] = useState(searchParams.get("audio") === "true");

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const [activeSidebar, setActiveSidebar] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([
    { name: username, videoOn: isCameraOn, audioOn: isMicOn },
  ]);

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
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
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
    setMessages((prev) => [...prev, { sender: username, text: newMessage }]);
    setNewMessage("");
  };

  return (
    <Layout className="h-screen bg-[#ffffff] font-sans flex flex-col">
      <Header className="flex items-center justify-between px-6 bg-white shadow-md">
        <img
          src="/image.png"
          className="w-[120px] sm:w-[150px]"
          alt="Bolt Logo"
        />
      </Header>
      <div className="flex flex-1">
        <Content className="flex justify-center items-center py-4 mx-4">
          <Row gutter={[16, 16]} justify="center" className="w-full h-full">
            {participants.map((participant, index) => (
              <Col
                key={index}
                span={24 / Math.min(3, participants.length)}
                className="p-2"
              >
                <div className="relative bg-gray-300 h-full flex items-center justify-center rounded-lg shadow-md">
                  {participant.videoOn ? (
                    <video
                      ref={participant.name === username ? videoRef : null}
                      autoPlay
                      playsInline
                      className="rounded-lg h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-700 font-medium">
                      {participant.name}
                    </span>
                  )}
                </div>
              </Col>
            ))}
          </Row>
        </Content>
        {activeSidebar === "chat" && (
          <div className="flex flex-col w-[350px] border-l bg-white">
            <div className="p-4 flex items-center justify-between border-b">
              <h2 className="font-bold text-lg">Chat</h2>
              <button
                className="text-gray-400 hover:text-black"
                onClick={() => toggleSidebar("chat")}
              >
                <CloseOutlined />
              </button>
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
                    <p className="text-sm font-bold">{message.sender}</p>
                    <p className="text-sm">{message.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No messages yet...</p>
              )}
            </div>
            <div className="p-2 border-t flex">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 p-2 border rounded-lg mr-2"
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </div>
        )}
        {activeSidebar === "participants" && (
          <div className="flex flex-col w-[350px] border-l bg-white p-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-bold text-lg">Participants</h2>
              <button
                className="text-gray-400 hover:text-black"
                onClick={() => toggleSidebar("participants")}
              >
                <CloseOutlined />
              </button>
            </div>
            {participants.map((participant, index) => (
              <p key={index} className="text-gray-700 border-b py-2">
                {participant.name}{" "}
                {participant.audioOn ? (
                  <AudioOutlined className="ml-2" />
                ) : (
                  <AudioMutedOutlined className="ml-2" />
                )}
              </p>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-center items-center gap-6 bg-white shadow-lg p-4">
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={isMicOn ? <AudioOutlined /> : <AudioMutedOutlined />}
          className={isMicOn ? "bg-blue-600" : "bg-gray-600"}
          onClick={toggleMicrophone}
        />
        <Button
          shape="circle"
          size="large"
          type="primary"
          icon={<VideoCameraOutlined />}
          className={isCameraOn ? "bg-blue-600" : "bg-gray-600"}
          onClick={toggleCamera}
        />
        <Button
          shape="circle"
          size="large"
          type="primary"
          icon={<MessageOutlined />}
          className={activeSidebar === "chat" ? "bg-blue-600" : "bg-gray-600"}
          onClick={() => toggleSidebar("chat")}
        />
        <Button
          shape="circle"
          size="large"
          type="primary"
          icon={<TeamOutlined />}
          className={
            activeSidebar === "participants" ? "bg-blue-600" : "bg-gray-600"
          }
          onClick={() => toggleSidebar("participants")}
        />
        <Button
          shape="circle"
          size="large"
          type="primary"
          icon={<PhoneFilled />}
          onClick={() => (window.location.href = "/")}
          className="bg-red-600 hover:bg-red-500"
        />
      </div>
    </Layout>
  );
}

export default MeetingRoom;
