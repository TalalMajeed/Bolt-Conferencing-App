# Bolt Conferencing App

A real-time video conferencing application built with Next.js, TypeScript, and WebRTC.

## Features

- **Real-time Video Conferencing**: High-quality video and audio communication
- **Room Management**: Create and join conference rooms
- **Real-time Media State Synchronization**: See microphone and camera status of all participants in real-time
- **Chat Functionality**: Text-based communication during meetings
- **Responsive Design**: Works on desktop and mobile devices
- **WebRTC Signaling**: Peer-to-peer communication for optimal performance

## Real-time Media State Synchronization

The app now includes real-time synchronization of microphone and camera states between all participants in a room. Here's how it works:

### Backend Implementation
- **Socket.IO Events**: Uses Socket.IO for real-time communication
- **Media State Tracking**: Stores and syncs audio/video state for each participant
- **Redis Persistence**: Media states are persisted in Redis for reliability
- **Real-time Broadcasting**: Changes are immediately broadcast to all room participants

### Frontend Implementation
- **Real-time Updates**: UI updates instantly when participants toggle mic/camera
- **Visual Indicators**: Green/red indicators show mic and camera status
- **State Management**: Local state synchronized with server state
- **Automatic Sync**: New participants receive current media states when joining

### Key Features
- ✅ **Instant Updates**: Media state changes appear immediately for all participants
- ✅ **Visual Feedback**: Clear indicators for mic (🎤) and camera (📹) status
- ✅ **Persistent State**: Media states survive page refreshes and reconnections
- ✅ **Join Sync**: New participants see current media states when joining
- ✅ **Reliable**: Uses Redis for state persistence and Socket.IO for real-time updates

## Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Socket.IO Client**: Real-time communication
- **Lucide React**: Icon library

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **Socket.IO**: Real-time bidirectional communication
- **Redis**: In-memory data store for room and state management
- **TypeScript**: Type-safe development

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Redis server running locally

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Bolt-Conferencing-App
   ```

2. **Install backend dependencies**
   ```bash
   cd Backend-API
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../Frontend-Web
   npm install
   ```

4. **Start Redis server**
   ```bash
   # Make sure Redis is running on localhost:6379
   ```

5. **Start the backend server**
   ```bash
   cd Backend-API
   npm start
   ```

6. **Start the frontend development server**
   ```bash
   cd Frontend-Web
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

1. **Create a Meeting**: Click "Create Meeting" and enter your name
2. **Join a Meeting**: Click "Join Meeting" and enter the meeting ID and your name
3. **Media Controls**: Use the mic and camera buttons to toggle your media
4. **Real-time Sync**: See other participants' media states update in real-time
5. **Chat**: Use the chat sidebar for text communication

## API Endpoints

### Rooms
- `POST /api/rooms` - Create a new room
- `POST /api/rooms/:roomId/join` - Join an existing room
- `POST /api/rooms/:roomId/leave` - Leave a room
- `GET /api/rooms` - Get all active rooms
- `GET /api/rooms/:roomId` - Get room details

### Socket.IO Events
- `join-room` - Join a room with initial media state
- `media-state-update` - Update participant's media state
- `media-state-changed` - Broadcast media state change to room
- `request-media-states` - Request current media states from room
- `media-states-response` - Response with current media states
- `user-joined` - Notify when user joins room
- `user-left` - Notify when user leaves room

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
