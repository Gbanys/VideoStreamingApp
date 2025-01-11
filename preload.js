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
        ipcRenderer.removeAllListeners('validation-success'); // Avoid duplicate listeners
        ipcRenderer.on('validation-success', (event, data) => callback(data));
    },
});

