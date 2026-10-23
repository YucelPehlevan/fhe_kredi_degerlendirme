const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true, // Menü çubuğunu gizleyerek modern bir görünüm sağlar
    webPreferences: {
      nodeIntegration: true,
    }
  });

  // Vite sunucusunun (React) adresini masaüstü penceresine yükle
  mainWindow.loadURL('http://localhost:5173');
}

app.whenReady().then(() => {
  // 1. Kullanıcı exe'ye tıkladığında arka planda Python kasasını gizlice başlat
  const executablePath = path.join(__dirname, 'dist', 'LocalVault', 'LocalVault');
  
  pythonProcess = spawn(executablePath, [], { stdio: 'ignore' });

  pythonProcess.on('error', (err) => {
    console.error('LocalVault baslatilamadi:', err);
  });

  // 2. React arayüzünü masaüstü penceresi olarak aç
  createWindow();
});

// Uygulama kapatıldığında arkada çalışan Python sunucusunu (kapanmayan port sorunlarını önlemek için) temizle
app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});