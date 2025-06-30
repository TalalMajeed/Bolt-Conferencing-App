import express from "express";
import http from "http";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import { createClient } from "redis";
import dotenv from "dotenv";
import path from "path";
import { Server as SocketIOServer } from "socket.io";

dotenv.config();

// Redis client for room management
const redisClient = createClient();
redisClient.connect().catch(console.error);

const app = express();
const server = http.createServer(app);

// Socket.IO server for WebRTC signaling
const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const PORT = process.env.PORT || 5000;

// Types for conference room management
interface Participant {
    id: string;
    username: string;
    socketId: string;
    joinedAt: Date;
    mediaState?: {
        audioOn: boolean;
        videoOn: boolean;
    };
}

interface ConferenceRoom {
    id: string;
    name: string;
    participants: Participant[];
    createdAt: Date;
    lastActivity: Date;
    isActive: boolean;
}

interface WebRTCSignal {
    type: "offer" | "answer" | "ice-candidate";
    data: any;
    from: string;
    to: string;
}

interface MediaStateUpdate {
    participantId: string;
    audioOn: boolean;
    videoOn: boolean;
}

// In-memory room tracking for active sessions
const activeRooms = new Map<string, ConferenceRoom>();

// Redis key patterns
const ROOM_PREFIX = "conference:room:";
const ROOM_LIST_KEY = "conference:rooms:active";

// Initialize Redis connection and cleanup
redisClient.on("connect", () => {
    console.log("Connected to Redis");
    // Clean up any stale rooms on startup
    cleanupStaleRooms();
});

redisClient.on("error", (err) => {
    console.error("Redis connection error:", err);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve index.html on the root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// API Routes

// Create a new conference room
app.post("/api/rooms", async (req, res) => {
    try {
        const { name, username } = req.body;

        if (!name || !username) {
            return res
                .status(400)
                .json({ error: "Room name and username are required" });
        }

        const roomId = uuidv4();
        const participantId = uuidv4();
        const socketId = req.headers["x-socket-id"] as string;

        const participant: Participant = {
            id: participantId,
            username,
            socketId: socketId || "",
            joinedAt: new Date(),
        };

        const room: ConferenceRoom = {
            id: roomId,
            name,
            participants: [participant],
            createdAt: new Date(),
            lastActivity: new Date(),
            isActive: true,
        };

        // Store room in Redis
        await redisClient.setEx(
            `${ROOM_PREFIX}${roomId}`,
            3600, // 1 hour TTL
            JSON.stringify(room)
        );

        // Add to active rooms list
        await redisClient.sAdd(ROOM_LIST_KEY, roomId);
        await redisClient.expire(ROOM_LIST_KEY, 3600);

        // Store in memory for active sessions
        activeRooms.set(roomId, room);

        console.log(`Created room: ${roomId} with name: ${name}`);

        res.json({
            roomId,
            participantId,
            room: {
                id: room.id,
                name: room.name,
                participants: room.participants.map((p) => ({
                    id: p.id,
                    username: p.username,
                })),
            },
        });
    } catch (error) {
        console.error("Error creating room:", error);
        res.status(500).json({ error: "Failed to create room" });
    }
});

// Join an existing conference room
app.post("/api/rooms/:roomId/join", async (req, res) => {
    try {
        const { roomId } = req.params;
        const { username } = req.body;
        const socketId = req.headers["x-socket-id"] as string;

        if (!username) {
            return res.status(400).json({ error: "Username is required" });
        }

        // Get room from Redis
        const roomData = await redisClient.get(`${ROOM_PREFIX}${roomId}`);
        if (!roomData) {
            return res.status(404).json({ error: "Room not found" });
        }

        const room: ConferenceRoom = JSON.parse(roomData);

        if (!room.isActive) {
            return res.status(400).json({ error: "Room is no longer active" });
        }

        const participantId = uuidv4();
        const participant: Participant = {
            id: participantId,
            username,
            socketId: socketId || "",
            joinedAt: new Date(),
        };

        room.participants.push(participant);
        room.lastActivity = new Date();

        // Update room in Redis
        await redisClient.setEx(
            `${ROOM_PREFIX}${roomId}`,
            3600,
            JSON.stringify(room)
        );

        // Update in memory
        activeRooms.set(roomId, room);

        console.log(`User ${username} joined room: ${roomId}`);

        res.json({
            participantId,
            room: {
                id: room.id,
                name: room.name,
                participants: room.participants.map((p) => ({
                    id: p.id,
                    username: p.username,
                })),
            },
        });
    } catch (error) {
        console.error("Error joining room:", error);
        res.status(500).json({ error: "Failed to join room" });
    }
});

// Leave a conference room
app.post("/api/rooms/:roomId/leave", async (req, res) => {
    try {
        const { roomId } = req.params;
        const { participantId } = req.body;

        const roomData = await redisClient.get(`${ROOM_PREFIX}${roomId}`);
        if (!roomData) {
            return res.status(404).json({ error: "Room not found" });
        }

        const room: ConferenceRoom = JSON.parse(roomData);
        const participantIndex = room.participants.findIndex(
            (p) => p.id === participantId
        );

        if (participantIndex === -1) {
            return res
                .status(404)
                .json({ error: "Participant not found in room" });
        }

        const removedParticipant = room.participants.splice(
            participantIndex,
            1
        )[0];
        room.lastActivity = new Date();

        if (room.participants.length === 0) {
            // No participants left, delete the room
            await deleteRoom(roomId);
            console.log(`Room ${roomId} deleted - no participants remaining`);
        } else {
            // Update room with remaining participants
            await redisClient.setEx(
                `${ROOM_PREFIX}${roomId}`,
                3600,
                JSON.stringify(room)
            );
            activeRooms.set(roomId, room);
            console.log(
                `User ${removedParticipant.username} left room: ${roomId}`
            );
            
            // Notify remaining participants via socket
            io.to(roomId).emit("user-left", {
                participantId: removedParticipant.id,
                username: removedParticipant.username,
            });
        }

        res.json({ message: "Successfully left the room" });
    } catch (error) {
        console.error("Error leaving room:", error);
        res.status(500).json({ error: "Failed to leave room" });
    }
});

// Get all active rooms
app.get("/api/rooms", async (req, res) => {
    try {
        const roomIds = await redisClient.sMembers(ROOM_LIST_KEY);
        const rooms: Array<{
            id: string;
            name: string;
            participantCount: number;
            createdAt: Date;
            lastActivity: Date;
        }> = [];

        for (const roomId of roomIds) {
            const roomData = await redisClient.get(`${ROOM_PREFIX}${roomId}`);
            if (roomData) {
                const room: ConferenceRoom = JSON.parse(roomData);
                rooms.push({
                    id: room.id,
                    name: room.name,
                    participantCount: room.participants.length,
                    createdAt: room.createdAt,
                    lastActivity: room.lastActivity,
                });
            }
        }

        res.json({ rooms });
    } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
});

// Get room details
app.get("/api/rooms/:roomId", async (req, res) => {
    try {
        const { roomId } = req.params;
        const roomData = await redisClient.get(`${ROOM_PREFIX}${roomId}`);

        if (!roomData) {
            return res.status(404).json({ error: "Room not found" });
        }

        const room: ConferenceRoom = JSON.parse(roomData);
        res.json({
            id: room.id,
            name: room.name,
            participants: room.participants.map((p) => ({
                id: p.id,
                username: p.username,
                joinedAt: p.joinedAt,
                mediaState: p.mediaState || { audioOn: false, videoOn: false }
            })),
            createdAt: room.createdAt,
            lastActivity: room.lastActivity,
        });
    } catch (error) {
        console.error("Error fetching room:", error);
        res.status(500).json({ error: "Failed to fetch room" });
    }
});

// Socket.IO event handlers for WebRTC signaling
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a room
    socket.on(
        "join-room",
        async (data: { roomId: string; participantId: string; initialMediaState?: { audioOn: boolean; videoOn: boolean } }) => {
            const { roomId, participantId, initialMediaState } = data;

            socket.join(roomId);
            console.log(`Socket ${socket.id} joined room: ${roomId}`);

            // Update socket ID for participant
            const room = activeRooms.get(roomId);
            if (room) {
                const participant = room.participants.find(
                    (p) => p.id === participantId
                );
                if (participant) {
                    participant.socketId = socket.id;
                    
                    // Initialize media state if provided
                    if (initialMediaState) {
                        participant.mediaState = initialMediaState;
                    }
                    
                    activeRooms.set(roomId, room);

                    // Update in Redis
                    await redisClient.setEx(
                        `${ROOM_PREFIX}${roomId}`,
                        3600,
                        JSON.stringify(room)
                    );
                    
                    // Notify other participants about the new user's media state
                    if (initialMediaState) {
                        socket.to(roomId).emit("media-state-changed", {
                            participantId,
                            audioOn: initialMediaState.audioOn,
                            videoOn: initialMediaState.videoOn,
                            username: participant.username
                        });
                    }
                }
            }

            // Notify other participants in the room
            socket.to(roomId).emit("user-joined", {
                participantId,
                socketId: socket.id,
            });
        }
    );

    // WebRTC signaling
    socket.on("webrtc-signal", (data: WebRTCSignal) => {
        const { to, type, data: signalData } = data;

        // Find the target participant's socket ID
        for (const [roomId, room] of activeRooms.entries()) {
            const targetParticipant = room.participants.find(p => p.id === to);
            if (targetParticipant && targetParticipant.socketId) {
                // Forward the signal to the specific participant
                io.to(targetParticipant.socketId).emit("webrtc-signal", {
                    type,
                    data: signalData,
                    from: data.from,
                    to: data.to
                });
                break;
            }
        }
    });

    // Media state synchronization
    socket.on("media-state-update", async (data: MediaStateUpdate) => {
        const { participantId, audioOn, videoOn } = data;
        
        // Find the room containing this participant
        for (const [roomId, room] of activeRooms.entries()) {
            const participant = room.participants.find(p => p.id === participantId);
            if (participant) {
                // Update participant's media state
                participant.mediaState = { audioOn, videoOn };
                activeRooms.set(roomId, room);
                
                // Update in Redis
                await redisClient.setEx(
                    `${ROOM_PREFIX}${roomId}`,
                    3600,
                    JSON.stringify(room)
                );
                
                // Broadcast to all other participants in the room
                socket.to(roomId).emit("media-state-changed", {
                    participantId,
                    audioOn,
                    videoOn,
                    username: participant.username
                });
                
                console.log(`Media state updated for ${participant.username}: audio=${audioOn}, video=${videoOn}`);
                break;
            }
        }
    });

    // Request current media states from all participants in room
    socket.on("request-media-states", async (data: { roomId: string }) => {
        const { roomId } = data;
        const room = activeRooms.get(roomId);
        
        if (room) {
            const mediaStates = room.participants
                .filter(p => p.mediaState)
                .map(p => ({
                    participantId: p.id,
                    username: p.username,
                    audioOn: p.mediaState!.audioOn,
                    videoOn: p.mediaState!.videoOn
                }));
            
            socket.emit("media-states-response", { mediaStates });
        }
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
        console.log(`User disconnected: ${socket.id}`);

        // Find and remove participant from all rooms
        for (const [roomId, room] of activeRooms.entries()) {
            const participantIndex = room.participants.findIndex(
                (p) => p.socketId === socket.id
            );

            if (participantIndex !== -1) {
                const removedParticipant = room.participants.splice(
                    participantIndex,
                    1
                )[0];
                room.lastActivity = new Date();

                if (room.participants.length === 0) {
                    // Delete empty room
                    await deleteRoom(roomId);
                    console.log(
                        `Room ${roomId} deleted - last participant disconnected`
                    );
                } else {
                    // Update room
                    activeRooms.set(roomId, room);
                    await redisClient.setEx(
                        `${ROOM_PREFIX}${roomId}`,
                        3600,
                        JSON.stringify(room)
                    );

                    // Notify remaining participants using io instead of socket
                    io.to(roomId).emit("user-left", {
                        participantId: removedParticipant.id,
                        username: removedParticipant.username,
                    });
                }
                break;
            }
        }
    });
});

// Helper functions

async function deleteRoom(roomId: string) {
    try {
        // Remove from Redis
        await redisClient.del(`${ROOM_PREFIX}${roomId}`);
        await redisClient.sRem(ROOM_LIST_KEY, roomId);

        // Remove from memory
        activeRooms.delete(roomId);

        console.log(`Room ${roomId} completely removed`);
    } catch (error) {
        console.error(`Error deleting room ${roomId}:`, error);
    }
}

async function cleanupStaleRooms() {
    try {
        const roomIds = await redisClient.sMembers(ROOM_LIST_KEY);

        for (const roomId of roomIds) {
            const roomData = await redisClient.get(`${ROOM_PREFIX}${roomId}`);
            if (roomData) {
                const room: ConferenceRoom = JSON.parse(roomData);
                const timeSinceLastActivity =
                    Date.now() - new Date(room.lastActivity).getTime();

                // Delete rooms inactive for more than 1 hour
                if (timeSinceLastActivity > 3600000) {
                    await deleteRoom(roomId);
                    console.log(`Cleaned up stale room: ${roomId}`);
                }
            }
        }
    } catch (error) {
        console.error("Error cleaning up stale rooms:", error);
    }
}

// Periodic cleanup of stale rooms (every 30 minutes)
setInterval(cleanupStaleRooms, 30 * 60 * 1000);

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("Shutting down server...");
    await redisClient.quit();
    server.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
});

server.listen(PORT, () => {
    console.log(`Conference server running on port ${PORT}`);
    console.log(`WebSocket server ready for WebRTC signaling`);
});
