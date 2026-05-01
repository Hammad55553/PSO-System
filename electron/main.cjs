const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Bilal Medical Store - POS Terminal",
    icon: path.join(__dirname, '../public/vite.svg'), // You can replace this with a proper clinic icon
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // In production, load the built index.html
  // In development, load the vite dev server URL
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Hide Top Menu Bar for a clean POS look
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
