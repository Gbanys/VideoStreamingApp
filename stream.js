const socket = io("http://20.77.1.49:3000");  // Connect to the socket server

// Global variables
let localStream;
let peerConnection;
const videoGrid = document.getElementById("video-grid");

// Constraints for video/audio
const constraints = {
    video: true,
    audio: true
};

// Get local stream (user's webcam)
navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;

        // Display local video (your webcam)
        const localVideo = document.createElement("video");
        localVideo.srcObject = stream;
        localVideo.muted = true;  // Mute the local video to avoid feedback
        localVideo.autoplay = true;
        videoGrid.appendChild(localVideo);

        // Initialize the peer connection now that the local stream is available
        setupPeerConnection();

        // Create offer after peer connection is ready
        makeOffer();
    })
    .catch(error => {
        console.error('Error accessing webcam: ', error);
    });

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
        const remoteVideo = document.createElement('video');
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
        videoGrid.appendChild(remoteVideo);
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
