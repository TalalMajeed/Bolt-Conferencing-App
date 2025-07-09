"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Join from "@/components/pages/join";
import Error from "@/components/pages/error";

export default function MeetingPage() {
    const params = useParams();
    const meetingId = params.meetingId as string;
    const [isLoading, setIsLoading] = useState(true);
    const [roomExists, setRoomExists] = useState(false);

    useEffect(() => {
        const checkRoomExists = async () => {
            if (!meetingId) {
                setRoomExists(false);
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${meetingId}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (response.ok) {
                    setRoomExists(true);
                } else {
                    setRoomExists(false);
                }
            } catch (error) {
                console.error("Error checking room existence:", error);
                setRoomExists(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkRoomExists();
    }, [meetingId]);

    if (isLoading) {
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

                {/* Loading Content */}
                <main className="flex-1 px-4 py-8 overflow-y-auto flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#262626] mx-auto mb-4"></div>
                        <p className="text-[#1b1d1f] text-lg">
                            Checking meeting...
                        </p>
                    </div>
                </main>

                {/* Footer */}
                <footer className="text-sm md:text-base text-center bg-white text-[#1b1d1f] py-4">
                    Bolt ©2025 | All Rights Reserved
                </footer>
            </div>
        );
    }

    return roomExists ? <Join roomId={meetingId} /> : <Error />;
}
