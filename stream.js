const userId = "google123"; // Unique identifier for the user
const roomId = "room123"; // Unique identifier for the room
const socket = io("http://localhost:3000", { query: { userId, roomId } });

let localStream;
let userIds = [];
let peerConnections = new Map(); // Map to track peer connections by userId
const videoGrid = document.getElementById("video-grid");
const connectedUsers = new Map(); // Map to track users and their video elements

// Constraints for video/audio
const constraints = {
    video: true,
    audio: true
};

function retrieveAllUsersFromDatabase(){
    socket.emit('get-all-users-from-database', { roomId: roomId });
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

            userIds.forEach(userId => {
                if (!peerConnections.has(userId)) {
                    setupPeerConnection(userId);
                }

                const peerConnection = peerConnections.get(userId);

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
    userIds = data.chat_room_users;
    console.log('Users retrieved:', userIds);
    startLocalWebcam();
});


// Listen for signaling data from the server
socket.on('signal', (data) => {
    console.log("Hello world");
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

socket.on('user-connected', (data) => {
    console.log(`User connected: ${data.userId} in room: ${data.roomId}`);
    if (!peerConnections.has(data.userId)) {
        setupPeerConnection(data.userId);  // Set up connection for the new user
    }
    socket.emit('get-all-users-from-database', { roomId: roomId });
});

socket.on('user-disconnected', (data) => {
    const videoElement = connectedUsers.get(data.userId);
    if (videoElement) {
        videoGrid.removeChild(videoElement);  // Remove the video from the grid
        connectedUsers.delete(data.userId); // Remove the user from the map
    }

    const peerConnection = peerConnections.get(data.userId);
    if (peerConnection) {
        peerConnection.close();  // Close the peer connection
        peerConnections.delete(data.userId);  // Remove the peer connection from the map
    }

    console.log(`User disconnected: ${data.userId} from room: ${data.roomId}`);
});


// function resetPeerConnection() {
//     if (peerConnection) {
//         peerConnection.getSenders().forEach(sender => {
//             peerConnection.removeTrack(sender);
//         });
//         peerConnection.close();
//         peerConnection = null;
//     }
//     setupPeerConnection(peerUserId); // Reinitialize the peer connection
// }

// Send ICE candidates to the server (with userId)
function sendIceCandidate(candidate, peerUserId) {
    socket.emit('signal', {
        type: 'ice-candidate',
        candidate: candidate,
        roomId,
        userId: peerUserId  // Include the userId in the signaling message
    });
}

// Send offer to the other peer (with userId)
function sendOffer(offer, peerUserId) {
    socket.emit('signal', {
        type: 'offer',
        offer: offer,
        roomId,
        userId: peerUserId  // Include the userId in the signaling message
    });
}

// Send answer to the other peer (with userId)
function sendAnswer(answer, peerUserId) {
    socket.emit('signal', {
        type: 'answer',
        answer: answer,
        roomId,
        userId: peerUserId  // Include the userId in the signaling message
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
        userIds.forEach(userId => {
            if (!peerConnections.has(userId)) {
                setupPeerConnection(userId);
            }
            const peerConnection = peerConnections.get(userId);
            peerConnection.createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .then(() => sendOffer(peerConnection.localDescription, userId))
                .catch(err => console.error('Error creating offer: ', err));
        });
    } else {
        console.error('Local stream not available.');
    }
}


retrieveAllUsersFromDatabase()