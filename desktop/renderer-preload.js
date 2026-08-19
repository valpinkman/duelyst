const electron = require('electron');
const uuid = require('node-uuid');

const { ipcRenderer } = electron;

// flag we use in client to detect desktop mode
window.isDesktop = true;

// The `remote` module was removed in Electron 14, so quitting goes through
// IPC instead of reaching into the main process from here.
window.quitDesktop = () => ipcRenderer.send('quit-app');
window.uuid = uuid;
window.openUrl = (url) => electron.shell.openExternal(url);

const ipcWhiteList = ['create-window', 'quit-app']; // Removed discord, discord-update-presence.
window.ipcRenderer = {};
window.ipcRenderer.send = (channel, ...args) => {
  if (!ipcWhiteList.includes(channel)) return;
  ipcRenderer.send(channel, ...args);
};
window.ipcRenderer.on = (channel, ...args) => {
  if (!ipcWhiteList.includes(channel)) return;
  ipcRenderer.on(channel, ...args);
};

// Arguments from the main process. electron-window used to inject these;
// they now arrive through webPreferences.additionalArguments, which is the
// supported way to hand data to a preload.
const ARGS_PREFIX = '--app-args=';
const argsArg = process.argv.find((a) => a.startsWith(ARGS_PREFIX));
window.__args__ = argsArg ? JSON.parse(argsArg.slice(ARGS_PREFIX.length)) : {};

const args = window.__args__;
