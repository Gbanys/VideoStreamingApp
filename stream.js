const userId = "UYEt6d7ewybFQ9IDueeeA"; // Unique identifier for the user
const roomId = "room123"; // Unique identifier for the room
const socket = io("http://18.175.207.152:3000", { query: { userId, roomId } });

// Global variables
let localStream;
let peerConnection;
const videoGrid = document.getElementById("video-grid");
const connectedUsers = new Map(); // Map to track users and their video elements

// Constraints for video/audio
const constraints = {
    video: true,
    audio: true
};

// Get local stream (user's webcam)
function startLocalWebcam() {
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            localStream = stream;

            // Reuse or create local video element
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

            // Ensure the peer connection is initialized
            if (!peerConnection) {
                setupPeerConnection();  // Initialize peer connection if not already done
            }

            // Re-add local tracks to the peer connection if it's initialized
            if (peerConnection) {
                const senders = peerConnection.getSenders();
                localStream.getTracks().forEach(track => {
                    const sender = senders.find(s => s.track && s.track.kind === track.kind);
                    if (sender) {
                        sender.replaceTrack(track);  // Replace the track if sender already exists
                    } else {
                        peerConnection.addTrack(track, localStream);  // Otherwise, add a new track
                    }
                });
            }
            document.getElementById('webcam').onclick = stopWebcam;
            document.getElementById('webcam').innerText = "videocam";
            // Notify the remote peer that the video is started
            socket.emit('signal', { type: 'video-started', roomId });

            // Optionally, re-offer the connection to refresh the state
            makeOffer();
        })
        .catch(error => {
            console.error('Error accessing webcam: ', error);
        });
}

function stopWebcam() {
    if (localStream) {
        // Remove the tracks from the peer connection
        const senders = peerConnection.getSenders();
        senders.forEach(sender => {
            if (sender.track) {
                peerConnection.removeTrack(sender);
            }
        });

        // Stop the local tracks
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;

        console.log("Webcam stopped");
        document.getElementById('webcam').innerText = "videocam_off";

        // Notify the remote peer that the video is stopped
        document.getElementById('webcam').onclick = startLocalWebcam;
        socket.emit('signal', { type: 'video-stopped', roomId });
    }
}

// Initialize peer connection
function setupPeerConnection() {
    peerConnection = new RTCPeerConnection();

    // Add local tracks to the peer connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendIceCandidate(event.candidate);
        }
    };

    // Display remote video stream (other person's video)
    peerConnection.ontrack = (event) => {
        const remoteUserId = event.streams[0].id; // Assumes the stream ID is the userId
        if (!document.getElementById(remoteUserId)) {
            const remoteVideo = document.createElement('video');
            remoteVideo.id = remoteUserId;
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.autoplay = true;
            videoGrid.appendChild(remoteVideo);
            connectedUsers.set(remoteUserId, remoteVideo);
        }
    };
}

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

socket.on('user-connected', (data) => {
    console.log(`User connected: ${data.userId} in room: ${data.roomId}`);
});

socket.on('user-disconnected', (data) => {
    const videoElement = connectedUsers.get(data.userId);
    if (videoElement) {
        videoGrid.removeChild(videoElement); // Remove the video from the grid
        connectedUsers.delete(data.userId); // Remove the user from the map
    }
    console.log(`User disconnected: ${data.userId} from room: ${data.roomId}`);
});

// Send ICE candidates to the server
function sendIceCandidate(candidate) {
    socket.emit('signal', {
        type: 'ice-candidate',
        candidate: candidate,
        roomId
    });
}

// Send offer to the other peer
function sendOffer(offer) {
    socket.emit('signal', {
        type: 'offer',
        offer: offer,
        roomId
    });
}

// Send answer to the other peer
function sendAnswer(answer) {
    socket.emit('signal', {
        type: 'answer',
        answer: answer,
        roomId
    });
}

// Handle received offer
function handleOffer(data) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => sendAnswer(peerConnection.localDescription));
}

// Handle received answer
function handleAnswer(data) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
}

// Handle incoming ICE candidates
function handleIceCandidate(data) {
    const candidate = new RTCIceCandidate(data.candidate);
    peerConnection.addIceCandidate(candidate);
}

// Send the offer once the peer connection is ready
function makeOffer() {
    if (peerConnection) {
        peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => sendOffer(peerConnection.localDescription))
            .catch(err => console.error('Error creating offer: ', err));
    } else {
        console.error('Peer connection not initialized yet.');
    }
}

startLocalWebcam();