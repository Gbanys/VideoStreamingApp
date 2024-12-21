const videoGrid = document.getElementById('video-grid');
const localVideo = document.createElement('video');
localVideo.muted = true;

// Socket.io client for signaling
const socket = io('http://localhost:3000');

// Peer connections
const peers = {};

// Initialize local video stream
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then((stream) => {
    addVideoStream(localVideo, stream);

    socket.on('signal', async ({ sender, message }) => {
      if (!peers[sender]) {
        createPeerConnection(sender, stream);
      }

      const peer = peers[sender];
      if (message.type === 'offer') {
        await peer.setRemoteDescription(new RTCSessionDescription(message));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit('signal', { target: sender, message: peer.localDescription });
      } else if (message.type === 'answer') {
        await peer.setRemoteDescription(new RTCSessionDescription(message));
      } else if (message.candidate) {
        await peer.addIceCandidate(new RTCIceCandidate(message));
      }
    });

    socket.on('user-disconnected', (userId) => {
      if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
      }
    });

    socket.emit('join-room');
  })
  .catch((error) => {
    console.error('Error accessing media devices:', error);
  });

// Create a new peer connection
function createPeerConnection(userId, stream) {
  const peer = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  });

  peers[userId] = peer;

  // Add local stream tracks to the connection
  stream.getTracks().forEach((track) => peer.addTrack(track, stream));

  // Handle incoming tracks from the remote peer
  peer.ontrack = (event) => {
    const remoteVideo = document.createElement('video');
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.addEventListener('loadedmetadata', () => remoteVideo.play());
    videoGrid.append(remoteVideo);
  };

  // Send ICE candidates to the signaling server
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', { target: userId, message: event.candidate });
    }
  };

  // Send an offer to the remote peer
  peer.onnegotiationneeded = async () => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('signal', { target: userId, message: peer.localDescription });
  };
}

// Add a video stream to the DOM
function addVideoStream(videoElement, stream) {
  videoElement.srcObject = stream;
  videoElement.addEventListener('loadedmetadata', () => videoElement.play());
  videoGrid.append(videoElement);
}
