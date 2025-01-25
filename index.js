const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const io = require('socket.io-client');

let mainWindow;
let userId;
let roomId;
let socket;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 1000,
        autoHideMenuBar: true, // Hide the menu bar by default
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
        },
    });

    mainWindow.loadFile('main.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Send message to renderer process
ipcMain.on('open-index-page', (event, data) => {
    console.log('Received message from renderer:', data);
    roomId = data.roomId;
    let roomPassword = data.roomPassword;
    userId = data.userId;
    socket = io("http://13.41.191.104:3000", { query: { roomId, roomPassword, userId } });

    socket.on('validation-message', (data) => {
        if (data.isValidated) {
            let username = data.username;
            console.log('Sending validation-success with:', { userId, roomId });
            socket.close();
            mainWindow.loadFile('index.html').then(() => {
                mainWindow.webContents.send('validation-success', { userId, roomId, roomPassword, username });
            });
        } else {
            mainWindow.webContents.send('validation-error', "Sorry, we could not validate these details. Please try again.");
        }
    });
});

ipcMain.on('end-call', () => {
    console.log('End call button clicked. Closing the application.');
    app.quit();
});


