const socket = io("http://20.77.1.49:3000");  // Connect to the socket server

// Global variables
let localStream;
let peerConnection;
const videoGrid = document.getElementById("video-grid");

// Your webcam constraints
const constraints = {
    video: true,
    audio: true
};

// Get the local webcam stream and display it
navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        const localVideo = document.createElement("video");
        localVideo.srcObject = stream;
        localVideo.muted = true;  // Mute local video
        localVideo.autoplay = true;
        videoGrid.appendChild(localVideo);
    })
    .catch(error => console.error('Error accessing webcam: ', error));

// Handle signaling and peer connection
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

// Send an offer to the server
function sendOffer(offer) {
    socket.emit('signal', {
        type: 'offer',
        offer: offer
    });
}

// Send an answer to the server
function sendAnswer(answer) {
    socket.emit('signal', {
        type: 'answer',
        answer: answer
    });
}

// Handle incoming offer
function handleOffer(data) {
    peerConnection = new RTCPeerConnection();

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendIceCandidate(event.candidate);
        }
    };

    peerConnection.ontrack = (event) => {
        const remoteVideo = document.createElement('video');
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
        videoGrid.appendChild(remoteVideo);
    };

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => sendAnswer(peerConnection.localDescription));
}

// Handle incoming answer
function handleAnswer(data) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
}

// Handle incoming ICE candidates
function handleIceCandidate(data) {
    const candidate = new RTCIceCandidate(data.candidate);
    peerConnection.addIceCandidate(candidate);
}
