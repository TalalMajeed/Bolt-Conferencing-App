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
import { io, Socket } from "socket.io-client";

interface Participant {
    id: string;
    name: string;
    videoOn: boolean;
    audioOn: boolean;
    stream?: MediaStream;
    peerConnection?: RTCPeerConnection;
}

interface Message {
    sender: string | null;
    text: string;
    timestamp?: string;
}

function RemoteVideo({ stream }: { stream?: MediaStream }) {
    const ref = React.useRef<HTMLVideoElement>(null);
    React.useEffect(() => {
        if (!ref.current) return;
        if (stream) {
            ref.current.srcObject = stream;
            ref.current.onloadedmetadata = () => {
                ref.current?.play().catch(() => {});
            };
        } else {
            ref.current.srcObject = null;
        }
    }, [stream]);
    return (
        <video
            ref={ref}
            autoPlay
            playsInline
            className="w-full h-full rounded-lg object-cover"
        />
    );
}

function MeetingRoom({ params }: { params: Promise<{ meetingId: string }> }) {
    const resolvedParams = React.use(params);
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
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const [activeSidebar, setActiveSidebar] = useState<string | null>(null);
    const [roomName, setRoomName] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const [participants, setParticipants] = useState<Participant[]>([
        {
            id: searchParams.get("participantId") || "",
            name: username || "",
            videoOn: isCameraOn,
            audioOn: isMicOn,
        },
    ]);

    // Socket.IO connection
    const socketRef = useRef<Socket | null>(null);
    const participantId = searchParams.get("participantId") || username || "";

    // WebRTC configuration
    const rtcConfiguration: RTCConfiguration = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
        ],
    };

    // WebRTC peer connections management
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(
        new Map()
    );
    const localStreamRef = useRef<MediaStream | null>(null);

    const pendingPeers = React.useRef<Set<string>>(new Set());

    // Function to fetch room details (moved from useEffect for reuse)
    const fetchRoomDetails = async () => {
        try {
            console.log("Fetching room details for:", resolvedParams.meetingId);
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${resolvedParams.meetingId}`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch room details");
            }

            const roomData = await response.json();
            console.log("Room data received:", roomData);

            // Update room name
            setRoomName(roomData.name);

            // Map participants from API response
            const mappedParticipants = roomData.participants.map(
                (p: {
                    id: string;
                    username: string;
                    joinedAt: string;
                    mediaState?: { audioOn: boolean; videoOn: boolean };
                }) => ({
                    id: p.id,
                    name: p.username || "",
                    videoOn:
                        p.username === username
                            ? isCameraOn
                            : p.mediaState?.videoOn || false,
                    audioOn:
                        p.username === username
                            ? isMicOn
                            : p.mediaState?.audioOn || false,
                })
            );

            // Completely replace participants to ensure consistency with server state
            // Only preserve streams for participants that still exist
            setParticipants((prev: Participant[]) => {
                const prevById = new Map(
                    prev.map((p: Participant) => [p.id, p])
                );
                return mappedParticipants.map((p: Participant) => {
                    const old = prevById.get(p.id);
                    return old ? { ...old, ...p, stream: old.stream } : p;
                });
            });
            setIsLoading(false);
            console.log("Participants updated:", mappedParticipants);
        } catch (error) {
            console.error("Error fetching room details:", error);
            setIsLoading(false);
            // Keep current participants if fetch fails
        }
    };

    // WebRTC Functions
    const createPeerConnection = (
        targetParticipantId: string
    ): RTCPeerConnection => {
        const peerConnection = new RTCPeerConnection(rtcConfiguration);

        // Add local stream tracks to peer connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                peerConnection.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle incoming streams
        peerConnection.ontrack = (event) => {
            console.log("Received remote stream from:", targetParticipantId);
            setParticipants((prev) =>
                prev.map((p) =>
                    p.id === targetParticipantId
                        ? { ...p, stream: event.streams[0] }
                        : p
                )
            );
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit("webrtc-signal", {
                    type: "ice-candidate",
                    data: event.candidate,
                    from: participantId,
                    to: targetParticipantId,
                });
            }
        };

        // 🔑  renegotiate automatically whenever we add a new track
        peerConnection.onnegotiationneeded = async () => {
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socketRef.current?.emit("webrtc-signal", {
                    type: "offer",
                    data: offer,
                    from: participantId,
                    to: targetParticipantId,
                });
            } catch (err) {
                console.error("Renegotiation error:", err);
            }
        };

        peerConnectionsRef.current.set(targetParticipantId, peerConnection);
        return peerConnection;
    };

    const handleOffer = async (
        offer: RTCSessionDescriptionInit,
        fromParticipantId: string
    ) => {
        try {
            const peerConnection = createPeerConnection(fromParticipantId);
            await peerConnection.setRemoteDescription(offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            if (socketRef.current) {
                socketRef.current.emit("webrtc-signal", {
                    type: "answer",
                    data: answer,
                    from: participantId,
                    to: fromParticipantId,
                });
            }
        } catch (error) {
            console.error("Error handling offer:", error);
        }
    };

    const handleAnswer = async (
        answer: RTCSessionDescriptionInit,
        fromParticipantId: string
    ) => {
        try {
            const peerConnection =
                peerConnectionsRef.current.get(fromParticipantId);
            if (peerConnection) {
                // Only set remote answer if we are in the correct state
                if (peerConnection.signalingState === "have-local-offer") {
                    await peerConnection.setRemoteDescription(answer);
                } else {
                    console.warn(
                        "Skipping setRemoteDescription(answer) due to invalid signaling state:",
                        peerConnection.signalingState
                    );
                }
            }
        } catch (error) {
            console.error("Error handling answer:", error);
        }
    };

    const handleIceCandidate = async (
        candidate: RTCIceCandidateInit,
        fromParticipantId: string
    ) => {
        try {
            const peerConnection =
                peerConnectionsRef.current.get(fromParticipantId);
            if (peerConnection) {
                await peerConnection.addIceCandidate(candidate);
            }
        } catch (error) {
            console.error("Error handling ICE candidate:", error);
        }
    };

    const cleanupPeerConnection = (participantId: string) => {
        const peerConnection = peerConnectionsRef.current.get(participantId);
        if (peerConnection) {
            peerConnection.close();
            peerConnectionsRef.current.delete(participantId);
        }

        // Remove the participant from the state completely
        setParticipants((prev) =>
            prev.filter((p) => p.id !== participantId)
        );
    };

    // Initial fetch only (no polling)
    useEffect(() => {
        fetchRoomDetails();
    }, [resolvedParams.meetingId, username, isCameraOn, isMicOn]);

    // Socket.IO connection and media state synchronization
    useEffect(() => {
        // Connect to Socket.IO server
        socketRef.current = io(`${process.env.NEXT_PUBLIC_API_URL}`);

        const socket = socketRef.current;

        // Join the room
        socket.emit("join-room", {
            roomId: resolvedParams.meetingId,
            participantId: participantId,
            initialMediaState: {
                audioOn: isMicOn,
                videoOn: isCameraOn,
            },
        });

        console.log("Joined room with participant ID:", participantId);
        console.log("Initial media state:", {
            audioOn: isMicOn,
            videoOn: isCameraOn,
        });

        // Listen for media state changes from other participants
        socket.on(
            "media-state-changed",
            (data: {
                participantId: string;
                audioOn: boolean;
                videoOn: boolean;
                username: string;
            }) => {
                setParticipants((prev) =>
                    prev.map((p) =>
                        p.id === data.participantId
                            ? {
                                  ...p,
                                  audioOn: data.audioOn,
                                  videoOn: data.videoOn,
                              }
                            : p
                    )
                );
            }
        );

        // Listen for new user joining
        socket.on(
            "user-joined",
            (data: { participantId: string; socketId: string }) => {
                console.log("New user joined:", data);
                if (localStreamRef.current) {
                    createPeerConnection(data.participantId); // onnegotiationneeded fires
                } else {
                    pendingPeers.current.add(data.participantId);
                }
                fetchRoomDetails();
            }
        );

        // Listen for user leaving
        socket.on(
            "user-left",
            (data: { participantId: string; username: string }) => {
                console.log("User left:", data);
                // Cleanup peer connection and remove participant
                cleanupPeerConnection(data.participantId);
                // Also refresh room details to ensure consistency after a small delay
                setTimeout(() => {
                    fetchRoomDetails();
                }, 100);
            }
        );

        // WebRTC signaling events
        socket.on(
            "webrtc-signal",
            (data: {
                type: string;
                data: RTCSessionDescriptionInit | RTCIceCandidateInit;
                from: string;
                to: string;
            }) => {
                console.log("Received WebRTC signal:", data);

                if (data.to === participantId) {
                    switch (data.type) {
                        case "offer":
                            handleOffer(
                                data.data as RTCSessionDescriptionInit,
                                data.from
                            );
                            break;
                        case "answer":
                            handleAnswer(
                                data.data as RTCSessionDescriptionInit,
                                data.from
                            );
                            break;
                        case "ice-candidate":
                            handleIceCandidate(
                                data.data as RTCIceCandidateInit,
                                data.from
                            );
                            break;
                    }
                }
            }
        );

        // Request current media states from all participants
        socket.emit("request-media-states", {
            roomId: resolvedParams.meetingId,
        });

        // Listen for media states response
        socket.on(
            "media-states-response",
            (data: {
                mediaStates: Array<{
                    participantId: string;
                    username: string;
                    audioOn: boolean;
                    videoOn: boolean;
                }>;
            }) => {
                setParticipants((prev) => {
                    const updated = [...prev];
                    data.mediaStates.forEach((state) => {
                        const existingIndex = updated.findIndex(
                            (p) => p.id === state.participantId
                        );
                        if (existingIndex !== -1) {
                            updated[existingIndex] = {
                                ...updated[existingIndex],
                                audioOn: state.audioOn,
                                videoOn: state.videoOn,
                            };
                        }
                    });
                    return updated;
                });

                // Create peer connections for existing participants
                data.mediaStates.forEach((state) => {
                    if (state.participantId !== participantId) {
                        createPeerConnection(state.participantId);
                    }
                });
            }
        );

        // Listen for chat messages from other participants
        socket.on("chat-message", (data: { sender: string; text: string; timestamp: string }) => {
            console.log("Received chat message:", data);
            setMessages((prev) => [
                ...prev,
                { sender: data.sender, text: data.text, timestamp: data.timestamp }
            ]);
            
            // Set unread status if message is from another participant and chat is not open
            if (data.sender !== username && activeSidebar !== "chat") {
                setHasUnreadMessages(true);
                setUnreadCount((prev) => prev + 1);
            }
        });

        // Cleanup on unmount
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [resolvedParams.meetingId, participantId]);

    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

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
        
        // Clear unread messages when chat is opened
        if (type === "chat" && activeSidebar !== "chat") {
            setHasUnreadMessages(false);
            setUnreadCount(0);
        }
    };

    const toggleCamera = async () => {
        if (isCameraOn) {
            // Stop all video tracks
            if (videoStreamRef.current) {
                videoStreamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                videoStreamRef.current = null;
            }
            // Clear video element
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            // Update local stream
            if (localStreamRef.current) {
                localStreamRef.current
                    .getVideoTracks()
                    .forEach((track) => track.stop());
            }
            setIsCameraOn(false);
            // Update participants state
            setParticipants((prev) =>
                prev.map((p) =>
                    p.name === username ? { ...p, videoOn: false } : p
                )
            );

            // Emit media state change
            if (socketRef.current) {
                socketRef.current.emit("media-state-update", {
                    participantId: participantId,
                    audioOn: isMicOn,
                    videoOn: false,
                });
            }
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });

                if (localStreamRef.current) {
                    stream.getVideoTracks().forEach((track) => {
                        localStreamRef.current!.addTrack(track);
                        peerConnectionsRef.current.forEach((pc) =>
                            pc.addTrack(track, localStreamRef.current!)
                        );
                    });
                } else {
                    localStreamRef.current = stream;
                }

                videoStreamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
                setIsCameraOn(true);
                // Update participants state
                setParticipants((prev) =>
                    prev.map((p) =>
                        p.name === username ? { ...p, videoOn: true } : p
                    )
                );

                // Emit media state change
                if (socketRef.current) {
                    socketRef.current.emit("media-state-update", {
                        participantId: participantId,
                        audioOn: isMicOn,
                        videoOn: true,
                    });
                }

                // After media is ready, connect to any pending peers
                pendingPeers.current.forEach((id) => createPeerConnection(id));
                pendingPeers.current.clear();
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
            // Update participants state
            setParticipants((prev) =>
                prev.map((p) =>
                    p.name === username ? { ...p, audioOn: false } : p
                )
            );

            // Emit media state change
            if (socketRef.current) {
                socketRef.current.emit("media-state-update", {
                    participantId: participantId,
                    audioOn: false,
                    videoOn: isCameraOn,
                });
            }
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
                audioStreamRef.current = stream;
                setIsMicOn(true);
                // Update participants state
                setParticipants((prev) =>
                    prev.map((p) =>
                        p.name === username ? { ...p, audioOn: true } : p
                    )
                );

                // Emit media state change
                if (socketRef.current) {
                    socketRef.current.emit("media-state-update", {
                        participantId: participantId,
                        audioOn: true,
                        videoOn: isCameraOn,
                    });
                }
            } catch (error) {
                console.error("Error accessing microphone:", error);
            }
        }
    };

    // Initialize camera and microphone on component mount
    useEffect(() => {
        const initializeMedia = async () => {
            // Only request media if at least one is enabled
            if (!isCameraOn && !isMicOn) {
                return;
            }
            try {
                const constraints: MediaStreamConstraints = {
                    video: isCameraOn,
                    audio: isMicOn,
                };
                const stream = await navigator.mediaDevices.getUserMedia(
                    constraints
                );
                localStreamRef.current = stream;
                // Set video stream for local display
                if (isCameraOn && videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                    videoStreamRef.current = stream;
                }
                // Set audio stream
                if (isMicOn) {
                    audioStreamRef.current = stream;
                }
                console.log("Media streams initialized successfully");

                // After media is ready, connect to any pending peers
                pendingPeers.current.forEach((id) => createPeerConnection(id));
                pendingPeers.current.clear();
            } catch (error) {
                console.error("Error accessing media devices:", error);
                setIsCameraOn(false);
                setIsMicOn(false);
                setParticipants((prev) =>
                    prev.map((p) =>
                        p.name === username
                            ? { ...p, videoOn: false, audioOn: false }
                            : p
                    )
                );
            }
        };
        initializeMedia();
    }, []);

    // Handle video stream changes
    useEffect(() => {
        if (videoRef.current && isCameraOn) {
            // Ensure video element is properly set up
            videoRef.current.muted = true; // Mute to prevent feedback
            videoRef.current.playsInline = true;
            videoRef.current.autoplay = true;
        }
    }, [isCameraOn]);

    // Cleanup function to stop all media streams when component unmounts
    useEffect(() => {
        return () => {
            // Stop local stream
            if (localStreamRef.current) {
                localStreamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                localStreamRef.current = null;
            }

            // Stop video stream
            if (videoStreamRef.current) {
                videoStreamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                videoStreamRef.current = null;
            }
            // Stop audio stream
            if (audioStreamRef.current) {
                audioStreamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                audioStreamRef.current = null;
            }
            // Clear video element
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }

            // Close all peer connections
            peerConnectionsRef.current.forEach((connection) => {
                connection.close();
            });
            peerConnectionsRef.current.clear();
        };
    }, []);

    const sendMessage = () => {
        if (newMessage.trim() === "") return;
        
        // Broadcast message to all participants in the room (including self)
        if (socketRef.current) {
            socketRef.current.emit("chat-message", {
                roomId: resolvedParams.meetingId,
                sender: username,
                text: newMessage,
            });
        }
        
        setNewMessage("");
    };

    const handleLeaveMeeting = async () => {
        try {
            console.log("Leaving meeting:", resolvedParams.meetingId);
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${resolvedParams.meetingId}/leave`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        participantId:
                            searchParams.get("participantId") || username,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to leave meeting");
            }

            console.log("Successfully left meeting");
            window.location.href = "/";
        } catch (error) {
            console.error("Error leaving meeting:", error);
            alert(
                error instanceof Error
                    ? error.message
                    : "Failed to leave meeting"
            );
        }
    };

    return (
        <div className="h-screen bg-[#f8f9fa] font-sans flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 bg-white py-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <img
                        src="/image.png"
                        className="w-[120px] sm:w-[150px]"
                        alt="Bolt Logo"
                    />
                    {roomName && (
                        <div className="border-l border-gray-300 pl-4">
                            <h1 className="text-lg font-semibold text-gray-800">
                                {roomName}
                            </h1>
                            <p className="text-sm text-gray-600">
                                {participants.length} participant
                                {participants.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex flex-1">
                {/* Main Content */}
                <main className="flex justify-center items-center py-4 mx-4 flex-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-600">
                                Loading meeting room...
                            </p>
                        </div>
                    ) : (
                        <div
                            className={`grid ${getGridLayout(
                                participants.length
                            )} gap-4 ${getVideoContainerSize(
                                participants.length
                            )} max-h-[calc(100vh-100px)] aspect-video overflow-hidden w-[800px] h-[600px]`}
                        >
                            {participants.map((participant) => (
                                <div
                                    key={participant.id}
                                    className="p-2 aspect-video"
                                >
                                    <div className="relative bg-gray-300 h-full w-full rounded-lg overflow-hidden">
                                        {participant.name === username ? (
                                            // Current user's video
                                            <div className="w-full h-full relative overflow-hidden">
                                                <video
                                                    ref={videoRef}
                                                    className="w-full h-full rounded-lg object-cover"
                                                    style={{
                                                        display: isCameraOn
                                                            ? "block"
                                                            : "none",
                                                    }}
                                                    muted
                                                />
                                                <div
                                                    style={{
                                                        display: isCameraOn
                                                            ? "none"
                                                            : "block",
                                                    }}
                                                    className="absolute inset-0 flex flex-col items-center justify-center"
                                                >
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
                                                </div>
                                            </div>
                                        ) : participant.videoOn ? (
                                            <RemoteVideo
                                                stream={participant.stream}
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

                                        {/* Video indicator */}
                                        <div className="absolute bottom-2 left-2">
                                            {participant.videoOn ? (
                                                <div className="bg-green-500 rounded-full p-1">
                                                    <Video className="h-3 w-3 text-white" />
                                                </div>
                                            ) : (
                                                <div className="bg-red-500 rounded-full p-1">
                                                    <X className="h-3 w-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* Chat Sidebar */}
                {activeSidebar === "chat" && (
                    <div className="flex flex-col w-[350px] border-l bg-white">
                        <div className="p-4 flex items-center justify-between border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-gray-600" />
                                <h2 className="font-bold text-lg text-gray-800">
                                    Chat
                                </h2>
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                                    {messages.length}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                onClick={() => toggleSidebar("chat")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto" ref={chatContainerRef}>
                            {messages.length > 0 ? (
                                messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`mb-4 ${
                                            message.sender === username
                                                ? "flex justify-end"
                                                : "flex justify-start"
                                        }`}
                                    >
                                        <div
                                            className={`max-w-[80%] ${
                                                message.sender === username
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-gray-100 text-gray-800"
                                            } rounded-2xl px-4 py-3 shadow-sm`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                                        message.sender ===
                                                        username
                                                            ? "bg-blue-400 text-white"
                                                            : "bg-gray-300 text-gray-600"
                                                    }`}
                                                >
                                                    {message.sender
                                                        ?.charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                                <span
                                                    className={`text-xs font-medium ${
                                                        message.sender ===
                                                        username
                                                            ? "text-blue-100"
                                                            : "text-gray-500"
                                                    }`}
                                                >
                                                    {message.sender}
                                                </span>
                                            </div>
                                            <p className="text-sm leading-relaxed">
                                                {message.text}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
                                    <p className="text-gray-500 font-medium">
                                        No messages yet
                                    </p>
                                    <p className="text-gray-400 text-sm mt-1">
                                        Start the conversation!
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <Input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) =>
                                            setNewMessage(e.target.value)
                                        }
                                        className="w-full pr-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-full"
                                        placeholder="Type a message..."
                                        onKeyPress={(e) =>
                                            e.key === "Enter" && sendMessage()
                                        }
                                    />
                                    <Button
                                        onClick={sendMessage}
                                        disabled={!newMessage.trim()}
                                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                            />
                                        </svg>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Participants Sidebar */}
                {activeSidebar === "participants" && (
                    <div className="flex flex-col w-[350px] border-l bg-white">
                        <div className="p-4 flex items-center justify-between border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-gray-600" />
                                <h2 className="font-bold text-lg text-gray-800">
                                    Participants
                                </h2>
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                                    {participants.length}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                onClick={() => toggleSidebar("participants")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {participants.map((participant, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 mb-2"
                                >
                                    {/* Participant Avatar */}
                                    <div className="relative">
                                        <div className="w-10 h-10 bg-gradient-to-br bg-gray-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                            {participant.name
                                                ?.charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        {/* Online Status Indicator */}
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                    </div>

                                    {/* Participant Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-800 truncate">
                                                {participant.name}
                                            </span>
                                            {participant.name === username && (
                                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {/* Video Status */}
                                            <div
                                                className={`flex items-center gap-1 text-xs ${
                                                    participant.videoOn
                                                        ? "text-green-600"
                                                        : "text-gray-500"
                                                }`}
                                            >
                                                <Video className="h-3 w-3" />
                                                <span>
                                                    {participant.videoOn
                                                        ? "Video on"
                                                        : "Video off"}
                                                </span>
                                            </div>

                                            {/* Audio Status */}
                                            <div
                                                className={`flex items-center gap-1 text-xs ${
                                                    participant.audioOn
                                                        ? "text-green-600"
                                                        : "text-red-500"
                                                }`}
                                            >
                                                <Mic className="h-3 w-3" />
                                                <span>
                                                    {participant.audioOn
                                                        ? "Audio on"
                                                        : "Audio off"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex justify-center items-center gap-6 bg-white shadow-lg p-4 border-t border-gray-200">
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
                    } text-white rounded-full relative`}
                    onClick={() => toggleSidebar("chat")}
                >
                    <MessageSquare className="h-4 w-4" />
                    {hasUnreadMessages && (
                        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </div>
                    )}
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
                    onClick={handleLeaveMeeting}
                >
                    <Phone className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default MeetingRoom;
