const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector);
        if (element) element.innerText = text;
    };

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type]);
    }
});

contextBridge.exposeInMainWorld('electronAPI', {
    sendToMain: (channel, data) => {
        const validChannels = ['open-index-page'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    onValidationSuccess: (callback) => {
        ipcRenderer.removeAllListeners('validation-success');
        ipcRenderer.on('validation-success', (event, data) => callback(data));
    },
    sendEndCall: () => ipcRenderer.send('end-call'),
});

ipcRenderer.on('validation-error', (event, errorMessage) => {
    const errorElement = document.createElement("p");
    const errorElementDiv = document.getElementById('validation_error_message_div');
    errorElement.id = "validation_error_message";
    errorElement.innerText = errorMessage;
    errorElementDiv.appendChild(errorElement);
});