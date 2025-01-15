"use client";

import { Layout, Typography, Button } from "antd";
import { VideoCameraOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

export default function Home() {
  return (
    <Layout className="min-h-screen bg-white font-sans">
      <Header className="bg-white flex items-center p-6 m-3">
        <img src="/image.png" className="w-30 h-20" alt="Bolt Logo" />
      </Header>
      <Content className="py-20">
        <div className="flex flex-col items-center justify-center gap-3 text-center mx-auto">
          <h1 className="text-[#1b1d1f] font-semibold text-5xl pb-4">
            Welcome to Bolt
          </h1>
          <Text className="text-[#1b1d1f] text-xl">
            Connect seamlessly and collaborate effectively. Whether it's a team
            meeting or a virtual hangout, Bolt makes video conferencing simple
            and engaging.
          </Text>
          <Link href="/meeting">
            <Button
              size="large"
              icon={<VideoCameraOutlined />}
              className="mt-6 bg-[#1b1d1f] text-white hover:bg-[#f0f0f0] hover:text-[#1b1d1f] border-none"
            >
              Join a Meeting
            </Button>
          </Link>
        </div>
      </Content>
      <Footer className="text-center bg-white text-[#1b1d1f]">
        Bolt ©2025 | All Rights Reserved
      </Footer>
    </Layout>
  );
}
