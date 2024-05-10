/* eslint global-require: off, no-console: off, promise/always-return: off */
/* eslint import/prefer-default-export: off, import/no-mutable-exports: off */

import { app, BrowserWindow, shell, Menu, dialog, ipcMain } from 'electron';
// import { autoUpdater } from 'electron-updater';
import { URL } from 'url';
import path from 'path';

let resolveHtmlPath: (htmlFileName: string) => string;

if (process.env.NODE_ENV === 'development') {
  const port = process.env.PORT || 1212;
  resolveHtmlPath = (htmlFileName: string) => {
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  };
} else {
  resolveHtmlPath = (htmlFileName: string) => {
    return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
  };
}

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
    windowsCount -= 1;
  });

  window.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', (e) => {
  if (process.platform === 'darwin' && windowsCount > 0) {
    const win = BrowserWindow.getFocusedWindow();
    if (win?.isVisible()) {
      e.preventDefault();
      win.show();
      win.webContents.send('close');
    } else {
      const answer = !!dialog.showMessageBoxSync({
        type: 'question',
        buttons: ['Yes', 'No'],
        message: `You have ${windowsCount} window${windowsCount > 1 ? 's' : ''} open.\nAre you sure you want to quit?\n${windowsCount > 1 ? 'All windows' : 'The window'} will be closed and pending changes will be lost.`,
      });
      if (answer) {
        e.preventDefault();
      } else {
        BrowserWindow.getAllWindows().forEach((w) => {
          w.webContents.send('force-close');
        });
      }
    }
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
      if (windowsCount === 0) createWindow();
    });
    ipcMain.handle('dialog:openAny', openAny);
    ipcMain.handle('dialog:saveAny', saveAny);
    ipcMain.handle('dialog:openSql', openSql);
    ipcMain.handle('dialog:saveSql', saveSql);
  })
  .catch(console.log);
