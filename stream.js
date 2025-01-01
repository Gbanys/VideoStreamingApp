import { User, getRandomColor } from './user.js';
import { updateChatWithMessages, mapUsersToMessages } from "./chat_messages.js";

export const userId = "google123"; // Unique identifier for the user
export const username= "google";
export const roomId = "room123"; // Unique identifier for the room
export const socket = io("http://3.10.214.5:3000", { query: { userId, roomId } });

export let userIds = [];
export let usernames = [];
export let users = [];
export let messages = [];

let localStream;
let peerConnections = new Map(); // Map to track peer connections by userId
const videoGrid = document.getElementById("video-grid");
const connectedUsers = new Map(); // Map to track users and their video elements

// Constraints for video/audio
const constraints = {
    video: true,
    audio: true
};

function retrieveAllUsersFromDatabase(){
    socket.emit('get-all-users-and-messages-from-database', { roomId: roomId, userId: userId});
}

function startLocalWebcam() {
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            localStream = stream;

            let localVideo = document.getElementById('local');
            if (!localVideo) {
                localVideo = document.createElement("video");
                localVideo.id = 'local';
                localVideo.muted = true; // Mute the local video
                localVideo.autoplay = true;
                videoGrid.appendChild(localVideo);
            }
            localVideo.srcObject = stream;

            // Track local user's video element
            connectedUsers.set('local', localVideo);

            userIds.forEach(peerUserId => {
                if (!peerConnections.has(peerUserId)) {
                    setupPeerConnection(peerUserId);
                }

                const peerConnection = peerConnections.get(peerUserId);

                // Re-add local tracks to the peer connection if it's initialized
                localStream.getTracks().forEach(track => {
                    const senders = peerConnection.getSenders();
                    const sender = senders.find(s => s.track && s.track.kind === track.kind);
                    if (sender) {
                        sender.replaceTrack(track);  // Replace the track if sender already exists
                    } else {
                        peerConnection.addTrack(track, localStream);  // Otherwise, add a new track
                    }
                });
            });

            document.getElementById('webcam').onclick = stopWebcam;
            document.getElementById('webcam').innerText = "videocam";
            socket.emit('signal', { type: 'video-started', roomId: roomId, userId: userId });

            makeOffer();
        })
        .catch(error => {
            console.error('Error accessing webcam: ', error);
        });
}

function stopWebcam() {
    if (localStream) {
        // Remove the tracks from all peer connections
        peerConnections.forEach((peerConnection, peerUserId) => {
            // Remove all tracks from this peer connection
            const senders = peerConnection.getSenders();
            senders.forEach(sender => {
                if (sender.track) {
                    peerConnection.removeTrack(sender);
                }
            });
        });

        localStream.getTracks().forEach(track => track.stop());
        localStream = null;

        document.getElementById('webcam').innerText = "videocam_off";
        document.getElementById('webcam').onclick = startLocalWebcam;
        socket.emit('signal', { type: 'video-stopped', roomId: roomId, userId: userId });
    }
}


// Initialize peer connection
function setupPeerConnection(peerUserId) {
    const peerConnection = new RTCPeerConnection();

    // Add local tracks to the peer connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendIceCandidate(event.candidate, peerUserId);
        }
    };

    // Display remote video stream (other person's video)
    peerConnection.ontrack = (event) => {
        //const remoteUserId = event.streams[0].id; // Assumes the stream ID is the userI
        if (!document.getElementById(peerUserId)) {
            const remoteVideo = document.createElement('video');
            remoteVideo.id = peerUserId;
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.autoplay = true;
            videoGrid.appendChild(remoteVideo);
            connectedUsers.set(peerUserId, remoteVideo);
        }
        else{
            const remoteVideo = document.getElementById(peerUserId);
            remoteVideo.id = peerUserId;
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.autoplay = true;
            connectedUsers.set(peerUserId, remoteVideo)
        }
    };
    peerConnections.set(peerUserId, peerConnection);
}

socket.on('all-users-retrieved', (data) => {
    if (!data || !data.chat_room_users) {
        console.error('Invalid data received from server');
        return;
    }
    else if(data.userId !== userId){
        return;
    }
    usernames = data.usernames;
    userIds = data.chat_room_users;

    for (let index = 0; index < data.chat_room_users.length; index++) {
        users.push(new User(data.chat_room_users[index], data.usernames[index], getRandomColor()));
    }

    messages = mapUsersToMessages(data);

    console.log('Users retrieved:', userIds);
    startLocalWebcam();
});

socket.on('receive-chat-messages', (data) => {
    messages = mapUsersToMessages(data);
    updateChatWithMessages();
});


// Listen for signaling data from the server
socket.on('signal', (data) => {
    if (data.type === 'video-stopped') {
        const remoteVideo = connectedUsers.get(data.userId);
        if (remoteVideo) {
            remoteVideo.srcObject = null;
        }
    } else if (data.type === 'video-started') {
        console.log('Remote user started their video.');
    }
    else if (data.type === 'offer') {
        handleOffer(data);
    } else if (data.type === 'answer') {
        handleAnswer(data);
    } else if (data.type === 'ice-candidate') {
        handleIceCandidate(data);
    }
});

socket.on('user-disconnected', (data) => {
    const videoElement = connectedUsers.get(data.userId);
    if (videoElement) {
        // Stop the media tracks of the video stream
        const mediaStream = videoElement.srcObject;
        if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop()); // Stop all tracks
        }

        videoElement.srcObject = null; // Disconnect the video element from the stream
        videoGrid.removeChild(videoElement);  // Remove the video element from the DOM
        connectedUsers.delete(data.userId); // Remove the user from the map
    }

    // Close the peer connection
    const peerConnection = peerConnections.get(data.userId);
    if (peerConnection) {
        peerConnection.close();  // Close the peer connection
        peerConnections.delete(data.userId);  // Remove the peer connection from the map
    }

    console.log(`User disconnected: ${data.userId} from room: ${data.roomId}`);
});

// Send ICE candidates to the server (with userId)
function sendIceCandidate(candidate, peerUserId) {
    socket.emit('signal', {
        type: 'ice-candidate',
        candidate: candidate,
        roomId,
        userId: userId  // Include the userId in the signaling message
    });
}

// Send offer to the other peer (with userId)
function sendOffer(offer, peerUserId) {
    socket.emit('signal', {
        type: 'offer',
        offer: offer,
        roomId,
        userId: userId  // Include the userId in the signaling message
    });
}

// Send answer to the other peer (with userId)
function sendAnswer(answer, peerUserId) {
    socket.emit('signal', {
        type: 'answer',
        answer: answer,
        roomId,
        userId: userId  // Include the userId in the signaling message
    });
}

// Handle received offer
function handleOffer(data) {
    const peerUserId = data.userId;  // Retrieve the userId of the offer sender
    // If the peer connection doesn't already exist, create it
    if (!peerConnections.has(peerUserId)) {
        setupPeerConnection(peerUserId);
    }

    const peerConnection = peerConnections.get(peerUserId);
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => sendAnswer(peerConnection.localDescription, peerUserId));
}

function handleAnswer(data) {
    const peerUserId = data.userId;
    const peerConnection = peerConnections.get(peerUserId);
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
}

function handleIceCandidate(data) {
    const peerUserId = data.userId;
    const peerConnection = peerConnections.get(peerUserId);
    const candidate = new RTCIceCandidate(data.candidate);
    peerConnection.addIceCandidate(candidate);
}


// Send the offer once the peer connection is ready
function makeOffer() {
    if (localStream) {
        userIds.forEach(peerUserId => {
            if (!peerConnections.has(peerUserId)) {
                setupPeerConnection(peerUserId);
            }
            const peerConnection = peerConnections.get(peerUserId);
            peerConnection.createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .then(() => sendOffer(peerConnection.localDescription, peerUserId))
                .catch(err => console.error('Error creating offer: ', err));
        });
    } else {
        console.error('Local stream not available.');
    }
}


retrieveAllUsersFromDatabase();