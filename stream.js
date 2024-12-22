const videoGrid = document.getElementById('video-grid');
const localVideo = document.createElement('video');
localVideo.muted = true;

// Socket.io client for signaling
const userId = 'HDEii443jdwji32DE11';
const socket = io('http://20.77.1.49:3000', { query: { userId } });

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

    socket.on('user-connected', (socketId) => {
      if(socketId !== userId){
        socket.emit('get-chat-users');
      }
    });

    socket.on('get-chat-users', (socketIds) => {
      for(let count = 0; count < socketIds.length; count++){
        let socketId = socketIds[count];
        if(socketId !== userId) {
          console.log(count);
          try {
            createPeerConnection(socketId, stream)
            const peer = peers[socketId];
            socket.emit('signal', {target: socketId, message: peer.localDescription});
          } catch (error) {
            console.log(error);
          }
        }
      }
    })

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
    if(!document.getElementById(userId)) {
      const remoteVideo = document.createElement('video');
      remoteVideo.id = userId;
      remoteVideo.srcObject = event.streams[0];
      remoteVideo.addEventListener('loadedmetadata', () => remoteVideo.play());
      videoGrid.append(remoteVideo);
    }
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
