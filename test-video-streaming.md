# Video Streaming Test Guide

This guide helps you test the WebRTC video streaming functionality in the Bolt Conferencing App.

## Prerequisites
- Backend server running on `http://localhost:5000`
- Frontend running on `http://localhost:3000`
- Redis server running
- Two or more browser windows/tabs
- Camera and microphone permissions enabled

## Test Steps

### 1. Create a Meeting with Video
1. Open browser window 1
2. Navigate to `http://localhost:3000`
3. Click "Create Meeting"
4. Enter your name (e.g., "Alice")
5. **Enable camera and microphone** (important!)
6. Click "Create Meeting"
7. Note the meeting ID
8. Verify you can see your own video feed

### 2. Join the Meeting (Second Participant)
1. Open browser window 2
2. Navigate to `http://localhost:3000`
3. Click "Join Meeting"
4. Enter the meeting ID from step 1
5. Enter a different name (e.g., "Bob")
6. **Enable camera and microphone** (important!)
7. Click "Join Meeting"
8. Wait 5-10 seconds for WebRTC connection to establish

### 3. Test Video Streaming

#### Test 1: Initial Video Display
- ✅ Alice should see Bob's video stream (not grey screen)
- ✅ Bob should see Alice's video stream (not grey screen)
- ✅ Both participants should see their own video feed
- ✅ Video indicators should be green for both participants

#### Test 2: Video Toggle
1. In window 1 (Alice), toggle the camera off
   - ✅ Bob should see Alice's video disappear and show avatar
   - ✅ Alice's video indicator should turn red
   - ✅ Bob's video should remain visible to Alice

2. In window 1 (Alice), toggle the camera on
   - ✅ Bob should see Alice's video stream return
   - ✅ Alice's video indicator should turn green

3. In window 2 (Bob), toggle the camera off
   - ✅ Alice should see Bob's video disappear and show avatar
   - ✅ Bob's video indicator should turn red

4. In window 2 (Bob), toggle the camera on
   - ✅ Alice should see Bob's video stream return
   - ✅ Bob's video indicator should turn green

#### Test 3: Multiple Participants
1. Open browser window 3
2. Join the same meeting as "Charlie"
3. Enable camera and microphone
4. ✅ All three participants should see each other's video streams
5. ✅ Toggle video on/off for each participant
6. ✅ Verify all participants see the changes in real-time

#### Test 4: Audio Testing
1. Speak into the microphone in window 1
2. ✅ Participants in other windows should hear the audio
3. Toggle microphone off in window 1
4. ✅ Other participants should no longer hear audio
5. Toggle microphone on in window 1
6. ✅ Other participants should hear audio again

#### Test 5: Network Resilience
1. Temporarily disable network in one window
2. ✅ Other participants should see the disconnected participant leave
3. Re-enable network and rejoin
4. ✅ Video streams should re-establish automatically

## Expected Behavior

### Video Display
- **Local video**: Should show in the participant's own video container
- **Remote videos**: Should show actual video streams from other participants
- **No video**: Should show avatar with participant's initial
- **Loading**: Brief delay (5-10 seconds) while WebRTC connection establishes

### Visual Indicators
- **Green video icon**: Camera is ON and streaming
- **Red X icon**: Camera is OFF
- **Green mic icon**: Microphone is ON
- **Red mic-off icon**: Microphone is OFF

### Connection Process
1. Participant joins room
2. Socket.IO connection established
3. WebRTC peer connections created
4. ICE candidates exchanged
5. Video streams start flowing
6. Real-time media state updates

## Troubleshooting

### Common Issues

1. **Grey screens instead of video**
   - Check browser console for WebRTC errors
   - Verify camera permissions are granted
   - Check if STUN servers are accessible
   - Ensure both participants have cameras enabled

2. **No video streams**
   - Check browser console for "Received remote stream" messages
   - Verify Socket.IO connection is established
   - Check for WebRTC signaling errors
   - Ensure participants are in the same room

3. **Video not updating when toggled**
   - Check media state synchronization
   - Verify WebRTC track replacement
   - Check for JavaScript errors in console

4. **Audio issues**
   - Check microphone permissions
   - Verify audio tracks are being added to peer connections
   - Check browser audio settings

### Debug Information
- Open browser developer tools
- Check Console tab for:
  - "Joined room with participant ID"
  - "Received WebRTC signal"
  - "Received remote stream from"
  - "Media state updated"
- Check Network tab for WebSocket connections
- Monitor WebRTC peer connection states

### Browser Compatibility
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: May require additional configuration
- **Mobile browsers**: Limited support

## Success Criteria
- ✅ All participants can see each other's video streams
- ✅ Video toggles work in real-time
- ✅ Audio streams work properly
- ✅ No grey screens for active video participants
- ✅ Smooth video playback without stuttering
- ✅ Automatic reconnection on network issues
- ✅ No errors in browser console
- ✅ Responsive video grid layout

## Performance Notes
- Initial connection may take 5-10 seconds
- Video quality depends on network conditions
- Multiple participants may affect performance
- Consider bandwidth limitations for mobile devices 