"use client";

import { Button } from "@/components/ui/button";
import { Video, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Error() {
    const router = useRouter();

    const handleCreateMeeting = () => {
        router.push("/create");
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
                <div className="h-full flex flex-col items-center justify-center gap-6">
                    {/* Error Icon */}
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-12 w-12 text-red-600" />
                        </div>

                        {/* Error Message */}
                        <div className="text-center max-w-[400px]">
                            <h2 className="text-xl md:text-2xl mb-4 font-semibold text-[#1b1d1f]">
                                Meeting Not Found
                            </h2>
                            <p className="text-[#1b1d1f] text-base md:text-lg mb-8">
                                The meeting you're looking for doesn't exist or
                                has been removed. Please check the meeting ID or
                                create a new meeting.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[400px]">
                            <Button
                                size="lg"
                                variant="default"
                                className="bg-[#262626] hover:bg-[#404040] text-white rounded-full px-8 py-3 flex-1"
                                onClick={handleCreateMeeting}
                            >
                                <Video className="mr-2 h-5 w-5" />
                                Create New Meeting
                            </Button>
                        </div>
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
