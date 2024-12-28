let seconds = 0; // Initialize seconds to 0

// Set an interval to update the time every second
setInterval(() => {
    seconds++;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

    document.getElementById('time').textContent = formattedTime;
}, 1000);

