const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execSync, exec, spawn } = require('child_process'); // exec ve spawn eklendi

const projectRoot = app.isPackaged ? process.resourcesPath : __dirname;
let win;
let clientContainerStarted = false;

// Kasa (Konteyner) başlatma fonksiyonu aynı kaldı
function startDockerClient() {
  try {
    execSync('docker start fhe_client_container', { 
      shell: true, 
      stdio: 'ignore' 
    });
    clientContainerStarted = true;
  } catch (error) {
    console.error("Konteyner başlatılamadı.");
  }
}

// YENİ: Docker'ın açık olup olmadığını denetleyen ve kapalıysa açan fonksiyon
// YENİ VE DİNAMİK: Docker'ın açık olup olmadığını denetleyen ve kapalıysa Registry'den bularak açan fonksiyon
function ensureDockerAndStartContainer() {
  exec('docker info', (error) => {
    if (!error) {
      // Motor zaten çalışıyor, direkt kasanı başlat
      startDockerClient(); 
      return;
    }

    console.log("Docker kapalı, Registry üzerinden konumu aranıyor...");
    
    // Windows Kayıt Defterinden Docker'ın kurulu olduğu AppPath değerini çekiyoruz
    exec('reg query "HKLM\\Software\\Docker Inc.\\Docker Desktop" /v AppPath', (regErr, stdout) => {
      // Ne olur ne olmaz diye standart yolu (fallback) yedekte tutuyoruz
      let dockerPath = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe'; 
      
      if (!regErr && stdout) {
        // Çıktı genelde şöyledir: AppPath    REG_SZ    D:\Docker\Docker Desktop.exe
        // Çıktıyı 'REG_SZ' kelimesinden bölüp sağda kalan dosya yolunu alıp temizliyoruz (trim)
        const match = stdout.split('REG_SZ');
        if (match.length > 1) {
          dockerPath = match[1].trim(); 
        }
      }

      console.log(`Docker şu konumdan başlatılıyor: ${dockerPath}`);

      // Bulduğumuz dinamik yoldan Docker'ı sessizce ayağa kaldırıyoruz
      const dockerProcess = spawn(dockerPath, [], {
        detached: true,
        stdio: 'ignore'
      });
      dockerProcess.unref();

      // Docker motorunun tam uyanmasını beklemek için 3 saniyede bir kontrol et
      const checkInterval = setInterval(() => {
        exec('docker info', (err) => {
          if (!err) {
            clearInterval(checkInterval);
            console.log("Docker motoru uyandı, kasanız başlatılıyor...");
            startDockerClient(); 
          }
        });
      }, 3000);
    });
  });
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
  ensureDockerAndStartContainer(); // YENİ: Doğrudan başlatmak yerine önce kontrol ediyoruz
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