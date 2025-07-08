"use client";

import { Button } from "@/components/ui/button";
import { Video, Mic, MicOff, Camera, CameraOff } from "lucide-react";
import Link from "next/link";

export default function Home() {
    return (
        <div className="min-h-screen bg-white font-sans flex flex-col">
            {/* Header */}
            <header className="bg-white flex items-center md:justify-start justify-center p-4 sm:p-6 m-3">
                <img src="/image.png" className="w-[150px]" alt="Bolt Logo" />
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center py-[150px]">
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <h1 className="text-[#1b1d1f] font-semibold text-3xl sm:text-5xl pb-2 sm:pb-4">
                        Welcome to Bolt
                    </h1>
                    <p className="text-[#1b1d1f] text-lg sm:text-xl max-w-[700px] leading-10">
                        Connect seamlessly and collaborate effectively. Whether
                        it is a team meeting or a virtual hangout, Bolt makes
                        video conferencing simple and engaging.
                    </p>
                    <Link href="/create">
                        <Button
                            size="lg"
                            className="mt-6 bg-[#262626] hover:bg-[#404040] text-white rounded-full px-8 py-3 text-lg"
                        >
                            <Video className="mr-2 h-5 w-5" />
                            Create a Meeting
                        </Button>
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="text-center bg-white text-[#1b1d1f] text-sm sm:text-base py-4">
                Bolt ©2025 | All Rights Reserved
            </footer>
        </div>
    );
}
