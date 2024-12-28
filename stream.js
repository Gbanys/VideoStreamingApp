const userId = "UYEt6d7ewybFQ9IDueeeA";
const roomId = "12345"
const socket = io("http://18.175.207.152:3000", { query: { roomId }});

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
            document.getElementById('webcam').onclick = () => {
                stopWebcam();
            }
            let localVideo;
            // Display local video (your webcam)
            if(!document.getElementById('local')) {
                localVideo = document.createElement("video");
                localVideo.id = 'local';
                localVideo.srcObject = stream;
                localVideo.muted = true;  // Mute the local video to avoid feedback
                localVideo.autoplay = true;
                videoGrid.appendChild(localVideo);
            }
            else{
                localVideo = document.getElementById('local');
                localVideo.srcObject = stream;
                localVideo.muted = true;  // Mute the local video to avoid feedback
                localVideo.autoplay = true;
                document.getElementById('webcam').innerText = "videocam";
            }

            // Track local user's video element (optional, for consistency)
            connectedUsers.set('local', localVideo);

            // Initialize the peer connection now that the local stream is available
            setupPeerConnection();

            // Create offer after peer connection is ready
            makeOffer();
        })
        .catch(error => {
            console.error('Error accessing webcam: ', error);
        });
}

function stopWebcam() {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop()); // Stop all tracks
    localStream = null;
    console.log("Webcam stopped");
    document.getElementById('webcam').innerText = "videocam_off";
    document.getElementById('webcam').onclick = () => {
        startLocalWebcam();
    }
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
        if(!document.getElementById(userId)) {
            const remoteVideo = document.createElement('video');
            remoteVideo.id = userId;
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.autoplay = true;
            videoGrid.appendChild(remoteVideo);
            // Use a unique identifier for the video (socket ID in a real-world app)
            connectedUsers.set(userId, remoteVideo);
        }
    };
}

// Listen for signaling data from the server
socket.on('signal', (data) => {
    if (data.type === 'offer') {
        handleOffer(data);
    } else if (data.type === 'answer') {
        handleAnswer(data);
    } else if (data.type === 'ice-candidate') {
        handleIceCandidate(data);
    }
});

socket.on('user-disconnected', (userId) => {
    const videoElement = connectedUsers.get(userId);
    if (videoElement) {
        videoGrid.removeChild(videoElement); // Remove the video from the grid
        connectedUsers.delete(userId); // Remove the user from the map
    }
});

// Send ICE candidates to the server
function sendIceCandidate(candidate) {
    socket.emit('signal', {
        type: 'ice-candidate',
        candidate: candidate
    });
}

// Send offer to the other peer
function sendOffer(offer) {
    socket.emit('signal', {
        type: 'offer',
        offer: offer
    });
}

// Send answer to the other peer
function sendAnswer(answer) {
    socket.emit('signal', {
        type: 'answer',
        answer: answer
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