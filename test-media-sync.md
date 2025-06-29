# Media State Synchronization Test Guide

This guide helps you test the real-time media state synchronization feature in the Bolt Conferencing App.

## Prerequisites
- Backend server running on `http://localhost:5000`
- Frontend running on `http://localhost:3000`
- Redis server running
- Two or more browser windows/tabs

## Test Steps

### 1. Create a Meeting
1. Open browser window 1
2. Navigate to `http://localhost:3000`
3. Click "Create Meeting"
4. Enter your name (e.g., "Alice")
5. Enable/disable camera and microphone as desired
6. Click "Create Meeting"
7. Note the meeting ID

### 2. Join the Meeting (Second Participant)
1. Open browser window 2
2. Navigate to `http://localhost:3000`
3. Click "Join Meeting"
4. Enter the meeting ID from step 1
5. Enter a different name (e.g., "Bob")
6. Enable/disable camera and microphone as desired
7. Click "Join Meeting"

### 3. Test Media State Synchronization

#### Test 1: Initial State Sync
- ✅ Verify that both participants can see each other's initial mic/camera states
- ✅ Check that the visual indicators (green/red circles) show correct states
- ✅ Verify that the states match what each participant has set

#### Test 2: Real-time Updates
1. In window 1 (Alice), toggle the microphone off
   - ✅ Window 2 (Bob) should immediately see Alice's mic indicator turn red
   - ✅ The change should appear instantly without page refresh

2. In window 1 (Alice), toggle the camera on
   - ✅ Window 2 (Bob) should immediately see Alice's camera indicator turn green
   - ✅ The change should appear instantly

3. In window 2 (Bob), toggle the microphone on
   - ✅ Window 1 (Alice) should immediately see Bob's mic indicator turn green

4. In window 2 (Bob), toggle the camera off
   - ✅ Window 1 (Alice) should immediately see Bob's camera indicator turn red

#### Test 3: Multiple Participants
1. Open browser window 3
2. Join the same meeting as "Charlie"
3. Toggle Charlie's media states
4. ✅ Verify that both Alice and Bob see Charlie's state changes in real-time
5. ✅ Verify that Charlie sees Alice and Bob's current states

#### Test 4: Reconnection Test
1. Close browser window 2 (Bob)
2. Wait a few seconds
3. Open a new browser window
4. Join the same meeting as "Bob" again
5. ✅ Verify that Bob sees the current media states of all participants
6. ✅ Verify that other participants see Bob's media states

#### Test 5: State Persistence
1. Refresh browser window 1 (Alice)
2. ✅ Verify that Alice's media states are preserved
3. ✅ Verify that other participants still see Alice's correct states

## Expected Behavior

### Visual Indicators
- **Green circle with mic icon**: Microphone is ON
- **Red circle with mic-off icon**: Microphone is OFF
- **Green circle with video icon**: Camera is ON
- **Red circle with X icon**: Camera is OFF

### Real-time Updates
- State changes should appear within 1-2 seconds
- No page refresh should be required
- All participants should see the same states

### Error Handling
- If connection is lost, states should sync when reconnected
- Invalid states should be handled gracefully
- Network issues should not crash the application

## Troubleshooting

### Common Issues

1. **States not updating**
   - Check browser console for Socket.IO connection errors
   - Verify backend server is running
   - Check Redis connection

2. **Visual indicators not showing**
   - Check if Socket.IO client is properly imported
   - Verify participant IDs are being set correctly
   - Check CSS classes for indicator styling

3. **Delayed updates**
   - Check network latency
   - Verify Socket.IO connection is stable
   - Check for JavaScript errors in console

### Debug Information
- Open browser developer tools
- Check Console tab for Socket.IO events
- Check Network tab for WebSocket connections
- Monitor Redis for state persistence

## Success Criteria
- ✅ All participants see real-time media state updates
- ✅ Visual indicators accurately reflect current states
- ✅ States persist across page refreshes
- ✅ New participants receive current states when joining
- ✅ No errors in browser console
- ✅ Smooth, responsive user experience 