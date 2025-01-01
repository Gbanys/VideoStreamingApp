import { socket, roomId } from './stream.js';

export function changeEmojiOptionPopUpPosition(){
    const popup = document.getElementById('emoji-popup');
    const reactionButton = document.getElementById('reaction');
    if (!popup.classList.contains('hidden')) {
        const rect = reactionButton.getBoundingClientRect();
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.top - popup.offsetHeight}px`;
        document.addEventListener('click', closePopupOnClick);
    }
}

export function toggleEmojiPopup(show_chat_messages=false) {
    const popup = document.getElementById('emoji-popup');
    popup.classList.toggle('hidden');
    changeEmojiOptionPopUpPosition();
}

function closePopupOnClick(event) {
    const popup = document.getElementById('emoji-popup');
    const reactionButton = document.getElementById('reaction');
    if (!popup.contains(event.target) && event.target !== reactionButton) {
        popup.classList.add('hidden');
        document.removeEventListener('click', closePopupOnClick); // Remove the listener
    }
}

window.triggerEmoji = function (emoji) {
    console.log(`Selected Emoji: ${emoji}`);
    triggerEmoji(emoji, false);
};

export function triggerEmoji(emoji, receive=false) {
    const overlay = document.getElementById('emoji-overlay');

    // Create an emoji element
    const emojiElement = document.createElement('div');
    emojiElement.className = 'emoji';
    emojiElement.textContent = emoji;

    // Randomize starting position
    const startX = Math.random() * 80 + 10; // Random position between 10% and 90% width
    emojiElement.style.left = `${startX}%`;
    emojiElement.style.bottom = '0';

    // Append to overlay
    overlay.appendChild(emojiElement);

    if(!receive){
        socket.emit('send-emoji', { emoji, roomId });
    }

    // Remove emoji after animation ends
    emojiElement.addEventListener('animationend', () => {
        overlay.removeChild(emojiElement);
    });
}

document.getElementById('reaction').addEventListener('click', toggleEmojiPopup);