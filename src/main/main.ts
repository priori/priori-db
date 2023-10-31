/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import { app, BrowserWindow, shell, Menu, dialog, ipcMain } from 'electron';
// import { autoUpdater } from 'electron-updater';
// import log from 'electron-log';
import { resolveHtmlPath } from './util';

// export default class AppUpdater {
//   constructor() {
//     log.transports.file.level = 'info';
//     autoUpdater.logger = log;
//     autoUpdater.checkForUpdatesAndNotify();
//   }
// }

// ipcMain.on('ipc-example', async (event, arg) => {
//   const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
//   console.log(msgTemplate(arg));
//   event.reply('ipc-example', msgTemplate('pong'));
// });

async function openAny() {
  const { canceled, filePaths } = await dialog.showOpenDialog({});
  if (!canceled) {
    return filePaths[0];
  }
  return null;
}

async function openSql() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'SQL', extensions: ['sql'] }],
  });
  if (!canceled) {
    return filePaths[0];
  }
  return null;
}

async function saveSql() {
  const { canceled, filePath } = await dialog.showSaveDialog({
    filters: [{ name: 'SQL', extensions: ['sql'] }],
  });
  if (!canceled) {
    return filePath;
  }
  return null;
}

async function saveAny() {
  const { canceled, filePath } = await dialog.showSaveDialog({});
  if (!canceled) {
    return filePath;
  }
  return null;
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

let windowsCount = 0;
const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }
  windowsCount += 1;
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 440,
    title: 'Priori DB',
    icon: 'icon.png',
    fullscreenable: true,
    webPreferences: {
      nodeIntegration: true, // opt out to node integration
      contextIsolation: false, // opt out to node integration
      // opt out to node integration preload: app.isPackaged
      // opt out to node integration ? path.join(__dirname, 'preload.js')
      // opt out to node integration : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  window.setMenu(null);

  window.loadURL(resolveHtmlPath('index.html'));

  window.on('ready-to-show', () => {
    if (!window) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      window.minimize();
    } else {
      window.show();
    }
  });

  window.on('closed', () => {
    // window = null;
    windowsCount -= 1;
  });

  // Open urls in the user's browser
  window.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // new AppUpdater();
};

if (isDebug) {
  require('electron-debug')();
}
const localShortcut = require('electron-localshortcut');

localShortcut.register('CommandOrControl+R', () => {});
localShortcut.register('CommandOrControl+N', () => {
  createWindow();
});
localShortcut.register('F5', () => {});
/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const dockMenu = Menu.buildFromTemplate([
  {
    label: 'New Window',
    click() {
      createWindow();
    },
  },
]);

app
  .whenReady()
  .then(() => {
    createWindow();
    if (process.platform === 'darwin') {
      app.dock.setMenu(dockMenu);
    }
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (windowsCount === 0) createWindow();
    });
    ipcMain.handle('dialog:openAny', openAny);
    ipcMain.handle('dialog:saveAny', saveAny);
    ipcMain.handle('dialog:openSql', openSql);
    ipcMain.handle('dialog:saveSql', saveSql);
  })
  .catch(console.log);
