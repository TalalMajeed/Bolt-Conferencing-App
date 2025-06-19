import express from "express";
import http from "http";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import { createSessionStorage } from "react-router-dom";
import { createClient } from "redis";

const redisClient = createClient();
redisClient.connect().catch(console.error);

const app = express();
const server = http.createServer(app);

const PORT = 5000;

type Session = {
  meetingId: string;
  participants: string[];
};

const sessions: Session[] = [];

app.use(cors());
app.use(express.json());

// Create a new meeting
app.post("/create/meeting", async (req, res) => {
  const meetingId = uuidv4();
  const username = req.body.username;
  const userId = uuidv4() + "@" + username;

  const session = {
    meetingId,
    participants: [userId],
  };

  // Store in Redis with 1-hour expiry (3600 seconds)
  await redisClient.setEx(meetingId, 3600, JSON.stringify(session));

  res.json({ meetingId, userId });
});


// Join an existing meeting
app.post("/join/meeting/:id", async (req, res) => {
  const { name: username } = req.body;
  const meetingId = req.params.id;
  const userId = uuidv4() + "@" + username;

  const sessionData = await redisClient.get(meetingId);
  if (!sessionData) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  const session = JSON.parse(sessionData);
  session.participants.push(userId);

  // Update session and reset expiry
  await redisClient.setEx(meetingId, 3600, JSON.stringify(session));

  res.json({ userId });
});


//Leave a meeting
app.post("/leave/meeting", async (req, res) => {
  const { meetingId, userId } = req.body;

  const sessionData = await redisClient.get(meetingId);
  if (!sessionData) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  const session = JSON.parse(sessionData);
  const userIndex = session.participants.indexOf(userId);

  if (userIndex === -1) {
    return res.status(404).json({ error: "User not in the meeting" });
  }

  session.participants.splice(userIndex, 1);

  if (session.participants.length === 0) {
    // Delete meeting immediately
    await redisClient.del(meetingId);
  } else {
    // Reset TTL and save updated session
    await redisClient.setEx(meetingId, 3600, JSON.stringify(session));
  }

  res.json({ message: "User left the meeting successfully" });
});


server.listen(PORT, () =>
  console.log(`Primary server running on port ${PORT}`)
);
