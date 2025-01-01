import { localStream } from './stream.js';

function toggleMicrophone() {
    if (!localStream) {
        console.error('Local stream is not initialized');
        return;
    }

    // Find the audio track in the local stream
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        // Toggle the enabled property
        audioTrack.enabled = !audioTrack.enabled;

        // Update the button text based on the microphone status
        const microphoneButton = document.getElementById('microphone');
        if (audioTrack.enabled) {
            microphoneButton.innerText = 'mic';
        } else {
            microphoneButton.innerText = 'mic_off';
        }
    } else {
        console.error('No audio track found in local stream');
    }
}

// Add event listener to the microphone toggle button
document.getElementById('microphone').addEventListener('click', toggleMicrophone);
