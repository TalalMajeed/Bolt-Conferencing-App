"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const uuid_1 = require("uuid");
const cors_1 = __importDefault(require("cors"));
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
dotenv_1.default.config();
// Redis client for room management
const redisClient = (0, redis_1.createClient)();
redisClient.connect().catch(console.error);
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Socket.IO server for WebRTC signaling
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
const PORT = process.env.PORT || 5000;
// In-memory room tracking for active sessions
const activeRooms = new Map();
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
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname)));
// Serve index.html on the root route
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "index.html"));
});
// API Routes
// Create a new conference room
app.post("/api/rooms", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, username } = req.body;
        if (!name || !username) {
            return res
                .status(400)
                .json({ error: "Room name and username are required" });
        }
        const roomId = (0, uuid_1.v4)();
        const participantId = (0, uuid_1.v4)();
        const socketId = req.headers["x-socket-id"];
        const participant = {
            id: participantId,
            username,
            socketId: socketId || "",
            joinedAt: new Date(),
        };
        const room = {
            id: roomId,
            name,
            participants: [participant],
            createdAt: new Date(),
            lastActivity: new Date(),
            isActive: true,
        };
        // Store room in Redis
        yield redisClient.setEx(`${ROOM_PREFIX}${roomId}`, 3600, // 1 hour TTL
        JSON.stringify(room));
        // Add to active rooms list
        yield redisClient.sAdd(ROOM_LIST_KEY, roomId);
        yield redisClient.expire(ROOM_LIST_KEY, 3600);
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
    }
    catch (error) {
        console.error("Error creating room:", error);
        res.status(500).json({ error: "Failed to create room" });
    }
}));
// Join an existing conference room
app.post("/api/rooms/:roomId/join", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomId } = req.params;
        const { username } = req.body;
        const socketId = req.headers["x-socket-id"];
        if (!username) {
            return res.status(400).json({ error: "Username is required" });
        }
        // Get room from Redis
        const roomData = yield redisClient.get(`${ROOM_PREFIX}${roomId}`);
        if (!roomData) {
            return res.status(404).json({ error: "Room not found" });
        }
        const room = JSON.parse(roomData);
        if (!room.isActive) {
            return res.status(400).json({ error: "Room is no longer active" });
        }
        const participantId = (0, uuid_1.v4)();
        const participant = {
            id: participantId,
            username,
            socketId: socketId || "",
            joinedAt: new Date(),
        };
        room.participants.push(participant);
        room.lastActivity = new Date();
        // Update room in Redis
        yield redisClient.setEx(`${ROOM_PREFIX}${roomId}`, 3600, JSON.stringify(room));
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
    }
    catch (error) {
        console.error("Error joining room:", error);
        res.status(500).json({ error: "Failed to join room" });
    }
}));
// Leave a conference room
app.post("/api/rooms/:roomId/leave", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomId } = req.params;
        const { participantId } = req.body;
        const roomData = yield redisClient.get(`${ROOM_PREFIX}${roomId}`);
        if (!roomData) {
            return res.status(404).json({ error: "Room not found" });
        }
        const room = JSON.parse(roomData);
        const participantIndex = room.participants.findIndex((p) => p.id === participantId);
        if (participantIndex === -1) {
            return res
                .status(404)
                .json({ error: "Participant not found in room" });
        }
        const removedParticipant = room.participants.splice(participantIndex, 1)[0];
        room.lastActivity = new Date();
        if (room.participants.length === 0) {
            // No participants left, delete the room
            yield deleteRoom(roomId);
            console.log(`Room ${roomId} deleted - no participants remaining`);
        }
        else {
            // Update room with remaining participants
            yield redisClient.setEx(`${ROOM_PREFIX}${roomId}`, 3600, JSON.stringify(room));
            activeRooms.set(roomId, room);
            console.log(`User ${removedParticipant.username} left room: ${roomId}`);
            // Notify remaining participants via socket
            io.to(roomId).emit("user-left", {
                participantId: removedParticipant.id,
                username: removedParticipant.username,
            });
        }
        res.json({ message: "Successfully left the room" });
    }
    catch (error) {
        console.error("Error leaving room:", error);
        res.status(500).json({ error: "Failed to leave room" });
    }
}));
// Get all active rooms
app.get("/api/rooms", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const roomIds = yield redisClient.sMembers(ROOM_LIST_KEY);
        const rooms = [];
        for (const roomId of roomIds) {
            const roomData = yield redisClient.get(`${ROOM_PREFIX}${roomId}`);
            if (roomData) {
                const room = JSON.parse(roomData);
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
    }
    catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
}));
// Get room details
app.get("/api/rooms/:roomId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomId } = req.params;
        const roomData = yield redisClient.get(`${ROOM_PREFIX}${roomId}`);
        if (!roomData) {
            return res.status(404).json({ error: "Room not found" });
        }
        const room = JSON.parse(roomData);
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
    }
    catch (error) {
        console.error("Error fetching room:", error);
        res.status(500).json({ error: "Failed to fetch room" });
    }
}));
// Socket.IO event handlers for WebRTC signaling
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    // Join a room
    socket.on("join-room", (data) => __awaiter(void 0, void 0, void 0, function* () {
        const { roomId, participantId, initialMediaState } = data;
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room: ${roomId}`);
        // Update socket ID for participant
        const room = activeRooms.get(roomId);
        if (room) {
            const participant = room.participants.find((p) => p.id === participantId);
            if (participant) {
                participant.socketId = socket.id;
                // Initialize media state if provided
                if (initialMediaState) {
                    participant.mediaState = initialMediaState;
                }
                activeRooms.set(roomId, room);
                // Update in Redis
                yield redisClient.setEx(`${ROOM_PREFIX}${roomId}`, 3600, JSON.stringify(room));
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
    }));
    // WebRTC signaling
    socket.on("webrtc-signal", (data) => {
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
    socket.on("media-state-update", (data) => __awaiter(void 0, void 0, void 0, function* () {
        const { participantId, audioOn, videoOn } = data;
        // Find the room containing this participant
        for (const [roomId, room] of activeRooms.entries()) {
            const participant = room.participants.find(p => p.id === participantId);
            if (participant) {
                // Update participant's media state
                participant.mediaState = { audioOn, videoOn };
                activeRooms.set(roomId, room);
                // Update in Redis
                yield redisClient.setEx(`${ROOM_PREFIX}${roomId}`, 3600, JSON.stringify(room));
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
    }));
    // Request current media states from all participants in room
    socket.on("request-media-states", (data) => __awaiter(void 0, void 0, void 0, function* () {
        const { roomId } = data;
        const room = activeRooms.get(roomId);
        if (room) {
            const mediaStates = room.participants
                .filter(p => p.mediaState)
                .map(p => ({
                participantId: p.id,
                username: p.username,
                audioOn: p.mediaState.audioOn,
                videoOn: p.mediaState.videoOn
            }));
            socket.emit("media-states-response", { mediaStates });
        }
    }));
    // Handle disconnection
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`User disconnected: ${socket.id}`);
        // Find and remove participant from all rooms
        for (const [roomId, room] of activeRooms.entries()) {
            const participantIndex = room.participants.findIndex((p) => p.socketId === socket.id);
            if (participantIndex !== -1) {
                const removedParticipant = room.participants.splice(participantIndex, 1)[0];
                room.lastActivity = new Date();
                if (room.participants.length === 0) {
                    // Delete empty room
                    yield deleteRoom(roomId);
                    console.log(`Room ${roomId} deleted - last participant disconnected`);
                }
                else {
                    // Update room
                    activeRooms.set(roomId, room);
                    yield redisClient.setEx(`${ROOM_PREFIX}${roomId}`, 3600, JSON.stringify(room));
                    // Notify remaining participants using io instead of socket
                    io.to(roomId).emit("user-left", {
                        participantId: removedParticipant.id,
                        username: removedParticipant.username,
                    });
                }
                break;
            }
        }
    }));
});
// Helper functions
function deleteRoom(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Remove from Redis
            yield redisClient.del(`${ROOM_PREFIX}${roomId}`);
            yield redisClient.sRem(ROOM_LIST_KEY, roomId);
            // Remove from memory
            activeRooms.delete(roomId);
            console.log(`Room ${roomId} completely removed`);
        }
        catch (error) {
            console.error(`Error deleting room ${roomId}:`, error);
        }
    });
}
function cleanupStaleRooms() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const roomIds = yield redisClient.sMembers(ROOM_LIST_KEY);
            for (const roomId of roomIds) {
                const roomData = yield redisClient.get(`${ROOM_PREFIX}${roomId}`);
                if (roomData) {
                    const room = JSON.parse(roomData);
                    const timeSinceLastActivity = Date.now() - new Date(room.lastActivity).getTime();
                    // Delete rooms inactive for more than 1 hour
                    if (timeSinceLastActivity > 3600000) {
                        yield deleteRoom(roomId);
                        console.log(`Cleaned up stale room: ${roomId}`);
                    }
                }
            }
        }
        catch (error) {
            console.error("Error cleaning up stale rooms:", error);
        }
    });
}
// Periodic cleanup of stale rooms (every 30 minutes)
setInterval(cleanupStaleRooms, 30 * 60 * 1000);
// Graceful shutdown
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Shutting down server...");
    yield redisClient.quit();
    server.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
}));
server.listen(PORT, () => {
    console.log(`Conference server running on port ${PORT}`);
    console.log(`WebSocket server ready for WebRTC signaling`);
});
