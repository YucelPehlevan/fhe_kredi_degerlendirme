const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = app.isPackaged ? process.resourcesPath : __dirname;
let win;
let clientContainerStarted = false;

function startDockerClient() {
  try {
    execSync('docker start fhe_client_container', { 
      shell: true, 
      stdio: 'ignore' 
    });
    clientContainerStarted = true;
  } catch (error) {
    console.error("Docker başlatılamadı.");
  }
}

function stopDockerClient() {
  if (clientContainerStarted) {
    try {
      execSync('docker stop fhe_client_container', { 
        shell: true, 
        stdio: 'ignore' 
      });
    } catch (error) {}
    clientContainerStarted = false;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    win.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(() => {
  startDockerClient();
  createWindow();
});

ipcMain.on('window-minimize', () => { if (win) win.minimize(); });
ipcMain.on('window-maximize', () => {
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on('window-close', () => { if (win) win.close(); });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopDockerClient();
});