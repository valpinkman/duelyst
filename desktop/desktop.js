const { app, ipcMain, Menu, BrowserWindow, globalShortcut, dialog, shell } = require('electron');
const path = require('path');
const localShortcut = require('electron-localshortcut');
const minimist = require('minimist');
const osName = require('os-name')();
const debounce = require('lodash.debounce');
const pkgJson = require('./package.json');

require('electron-debug')();

const argv = minimist(process.argv.slice(1), {
  alias: {
    windowed: 'w',
    token: 't',
    overlay: 'o',
    disableOverlay: 'd',
    inProcessGpu: 'i',
  },
  string: ['token'],
  boolean: ['windowed', 'overlay', 'disableOverlay', 'inProcessGpu'],
});

// enable in-process gpu flag
if (argv.inProcessGpu) {
  app.commandLine.appendSwitch('in-process-gpu');
}

// enable WebGL hardware acceleration by default
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode');
app.commandLine.appendSwitch('enable-accelerated-video');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('ignore-gpu-blacklist');

process.on('uncaughtException', (error) => {
  if (error != null && error.message != null) console.log(error.message);
  if (error != null && error.stack != null) console.log(error.stack);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// register protocol for duelyst:// urls
app.setAsDefaultProtocolClient('duelyst');

let mainWindow = null;

// make this a single instance app (app.makeSingleInstance was removed in
// Electron 4 in favour of the lock + 'second-instance' event)
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // someone tried to run a second instance: focus the window we already have
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Note: It's important that you don't do anything with Electron
// unless it's after 'ready', or else mysterious bad things will happen
// to you.
app.on('ready', () => {
  // check for existance of token argv
  // for now can be anything - just needs to be set
  // if (pkgJson.name === 'duelyst' && argv.token === undefined) {
  //   dialog.showMessageBox({
  //     type: 'error',
  //     title: 'ERROR',
  //     message: 'Please use the launcher to start Duelyst',
  //     detail: 'You cannot start the Duelyst executable directly.',
  //     buttons: []
  //   }, app.quit)
  //   return
  // }

  // create keyboard shortcuts for win32
  // we don't need to do it for darwin because the menu takes care of it for us
  if (process.platform === 'win32') setupWin32Shortcuts();
  // create standard menu for darwin (allows cut-copy-paste)
  if (process.platform === 'darwin') {
    setupDarwinMenu();
    // open url handler (osx only)
    app.on('open-url', (event, url) => {
      dialog.showErrorBox('Welcome Back', `You arrived from: ${url}`);
      event.preventDefault();
    });
  }

  const windowOptions = {
    title: 'Duelyst',
    width: 1300,
    height: 760,
    frame: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      // the preload assigns onto `window` directly and uses Node builtins,
      // which needs the pre-Electron-12/20 behaviour
      contextIsolation: false,
      sandbox: false,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  };

  // can access at window.__args__ from scripts ran from index.html
  const argsForRenderer = {
    data: argv,
  };
  // electron-window (unmaintained since 2017) used to create the window and
  // inject these args; additionalArguments is the supported mechanism.
  windowOptions.webPreferences.additionalArguments = [
    `--app-args=${JSON.stringify(argsForRenderer)}`,
  ];
  windowOptions.show = false;

  mainWindow = new BrowserWindow(windowOptions);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // toggle to fullscreen after launch
  if (!argv.windowed) {
    mainWindow.setFullScreen(true);
  }

  // setupDiscord();

  // packaged: the client ships as an unpacked resource next to the app
  // (see electron-builder.yml extraResources); unpackaged: it is the root
  // build output two levels up from desktop/build/
  const clientRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'client')
    : path.resolve(__dirname, '..', '..', 'dist', 'src');
  const indexPath = path.resolve(clientRoot, 'index.html');
  mainWindow.loadFile(indexPath);
});

function setupWin32Shortcuts() {
  if (process.platform !== 'win32') return;

  localShortcut.register('Ctrl+R', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) focusedWindow.webContents.reloadIgnoringCache();
  });
  localShortcut.register('Ctrl+Shift+I', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) focusedWindow.toggleDevTools();
  });
  localShortcut.register('Ctrl+Shift+F', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
  });
}

function setupDarwinMenu() {
  if (process.platform !== 'darwin') return;
  const template = [
    {
      label: 'Duelyst',
      submenu: [
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click() {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'Command+Z',
          selector: 'undo:',
        },
        {
          label: 'Redo',
          accelerator: 'Shift+Command+Z',
          selector: 'redo:',
        },
        {
          type: 'separator',
        },
        {
          label: 'Cut',
          accelerator: 'Command+X',
          selector: 'cut:',
        },
        {
          label: 'Copy',
          accelerator: 'Command+C',
          selector: 'copy:',
        },
        {
          label: 'Paste',
          accelerator: 'Command+V',
          selector: 'paste:',
        },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click() {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) focusedWindow.webContents.reloadIgnoringCache();
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click() {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click() {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) focusedWindow.toggleDevTools();
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Support',
          click() {
            shell.openExternal('https://support.duelyst.com');
          },
        },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/*
function setupDiscord() {
  // Send events received from discordRpc down to the mainWindow (ie application.coffee)
  // We use a single 'discord' event with the type as second param along with any ...arguments
  mainWindow.webContents.on("did-finish-load", () => {
    // wait until mainWindow is done loading so we can be sure to catch all events
    const DISCORD_APPLICATION_ID = "357706468843061258";
    app.setAsDefaultProtocolClient(`discord-${DISCORD_APPLICATION_ID}`);

    const DiscordRpc = require("@counterplay/discord-rpc-nodejs");
    const discordRpc = new DiscordRpc(DISCORD_APPLICATION_ID, '291410'); // Old Steam ID.

    discordRpc.on("ready", (...args) => {
      mainWindow.webContents.send("discord", "ready", ...args);
    });
    discordRpc.on("disconnected", (...args) => {
      mainWindow.webContents.send("discord", "disconnected", ...args);
    });
    discordRpc.on("error", (...args) => {
      mainWindow.webContents.send("discord", "error", ...args);
    });
    discordRpc.on("spectateGame", (...args) => {
      mainWindow.webContents.send("discord", "spectateGame", ...args);
    });
    discordRpc.on("joinGame", (...args) => {
      mainWindow.webContents.send("discord", "joinGame", ...args);
    });
    // this is just for testing
    // discordRpc.on('tick', (...args) => {
    //   mainWindow.webContents.send('discord', 'tick', ...args)
    // })

    // Receiver to listen for 'discord-update-presence' event sent from mainWindow
    ipcMain.on("discord-update-presence", (event, presence) => {
      discordRpc.updatePresence(presence);
    });
    // When the application quits, we have to make sure to call shutdown on discordRpc
    app.on("quit", () => {
      discordRpc.shutdown();
    });
  });
}
*/

const showInfoDialog = debounce(
  (data) => {
    const options = {
      type: 'info',
      title: 'Information',
      buttons: ['OK'],
      message: data.message,
      detail: data.detail,
    };
    const noop = () => {};
    return dialog.showMessageBox(options, noop);
  },
  1000,
  { leading: true, trailing: false },
);

ipcMain.on('quit-app', () => app.quit());

ipcMain.on('create-window', (event, options) => {
  const windowOptions = {
    title: options.title || 'Paymentwall',
    width: options.width || 800,
    height: options.height || 600,
    fullscreen: false,
    resizable: false,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      webSecurity: true,
    },
  };
  const win = new BrowserWindow(windowOptions);
  win.loadURL(options.url);
});
