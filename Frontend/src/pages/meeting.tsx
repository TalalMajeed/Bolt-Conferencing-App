"use client";

import { Layout, Typography, Button, Input, Row, Col } from "antd";
import { VideoCameraOutlined, AudioOutlined, SoundOutlined } from "@ant-design/icons";
import { useState } from "react";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
export default function Meeting() {
    const [meetingId, setMeetingId] = useState("");
    const [name, setName] = useState("");

    const handleJoin = () => {
        alert("Joining meeting with ID: ${ meetingId } and Name: ${ name }");
    };

    return (
        <Layout className="min-h-screen bg-white font-sans">
            <Header className="flex items-center justify-center p-6 m-3 bg-white">
                <img src="/image.png" className="w-30 h-20" alt="Bolt Logo" />
            </Header>
            <Content className="p-3">
                <Row
                    gutter={24}
                    justify="center"
                    className="min-h-screen flex items-center justify-center"
                >
                    <Col
                        xs={24}
                        sm={12}
                        lg={8}
                        className="flex flex-col items-center justify-center mb-2"
                    >
                        <div className="w-full h-64 bg-gray-300 rounded-lg mb-4 flex items-center justify-center">
                            <Text className="text-xl text-white">Video Placeholder</Text>
                        </div>
                        <div className="flex gap-6 mb-6 justify-center">
                            <Button
                                icon={<AudioOutlined />}
                                className="bg-[#00796b] text-white hover:bg-[#004d40] rounded-full"
                            />
                            <Button
                                icon={<SoundOutlined />}
                                className="bg-[#00796b] text-white hover:bg-[#004d40] rounded-full"
                            />
                        </div>
                    </Col>
                    <Col
                        xs={24}
                        sm={12}
                        lg={8}
                        className="flex flex-col items-center justify-center"
                        style={{ maxWidth: "400px" }}
                    >
                        <Title level={2} className="text-[#00796b] text-3xl mb-4">
                            Join a Meeting
                        </Title>
                        <Text className="text-[#1b1d1f] text-lg mb-6">
                            Please enter your name and the meeting ID to join.
                        </Text>
                        <Input
                            className="w-full py-3 px-4 rounded-lg text-black mb-4"
                            placeholder="Enter Your Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                backgroundColor: "#f0f0f0",
                                border: "1px solid #00796b",
                            }}
                        />
                        <Input
                            className="w-full py-3 px-4 rounded-lg text-black mb-6"
                            placeholder="Enter Meeting ID"
                            value={meetingId}
                            onChange={(e) => setMeetingId(e.target.value)}
                            style={{
                                backgroundColor: "#f0f0f0",
                                border: "1px solid #00796b",
                            }}
                        />
                        <Button
                            size="large"
                            icon={<VideoCameraOutlined />}
                            className="bg-[#1b1d1f] text-white hover:bg-[#1b1d1f] hover:text-white border-none rounded-full transition-all"
                            onClick={handleJoin}
                        >
                            Join Meeting
                        </Button>
                    </Col>
                </Row>
            </Content>
            <Footer className="text-center bg-white text-[#1b1d1f] py-4">
                Bolt ©2025 | All Rights Reserved
            </Footer>
        </Layout>);
}