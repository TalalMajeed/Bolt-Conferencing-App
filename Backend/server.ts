import express from "express";
import http from "http";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import { createSessionStorage } from "react-router-dom";

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
app.post("/create/meeting", (req, res) => {
  const meetingId = uuidv4();
  const username = req.body.name;
  const userId = uuidv4() + "@" + username;

  sessions.push({
    meetingId,
    participants: [userId],
  });

  console.log(sessions[0].participants[0]);
  console.log(sessions[0].meetingId);
  res.json({ meetingId, userId });
});

// Join an existing meeting
app.post("/join/meeting/:id", (req, res) => {
  const { username } = req.body.name;
  const meetingId = req.params.id;
  const userId = uuidv4() + "@" + username;

  console.log(sessions);
  const session = sessions.find((s) => s.meetingId === meetingId);
  if (!session) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  session.participants.push(userId);
  res.json({ userId });
});

// Leave a meeting
app.post("/leave/meeting", (req, res) => {
  const { meetingId, userId } = req.body;

  const sessionIndex = sessions.findIndex((s) => s.meetingId === meetingId);
  if (sessionIndex === -1) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  const session = sessions[sessionIndex];
  const userIndex = session.participants.indexOf(userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found in the meeting" });
  }

  session.participants.splice(userIndex, 1);


  // Delete session if empty
  if (session.participants.length === 0) {
    sessions.splice(sessionIndex, 1);
  }

  res.json({ message: "User left the meeting successfully" });
});

server.listen(PORT, () =>
  console.log(`Primary server running on port ${PORT}`)
);
