export let userId; // Dynamically updated
export let roomId; // Dynamically updated
export let roomPassword;// Dynamically updated
export let username;

// Listen for the validation-success event
window.electronAPI.onValidationSuccess((data) => {
    userId = data.userId;
    roomId = data.roomId;
    roomPassword = data.roomPassword;
    username = data.username;

    console.log('Renderer received userId:', userId);
    console.log('Renderer received roomId:', roomId);
    console.log('Renderer received roomPassword:', roomPassword);
    console.log('Renderer received username:', username);

    // Dispatch a custom event to notify stream.js that userId and roomId are set
    const event = new CustomEvent('userIdRoomIdUpdated', {
        detail: { userId, roomId, roomPassword, username },
    });
    window.dispatchEvent(event);
});


