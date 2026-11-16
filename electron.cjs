const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execSync, exec, spawn } = require('child_process');
const util = require('util');
const fs = require('fs');
const net = require('net');

const execAsync = util.promisify(exec);

let win;
let clientContainerStarted = false;
let isStartingClient = false;

// Arayuzun her an sorgulayabilecegi canli kasa durumu
let vaultStatus = {
  state: 'loading', // 'loading' | 'ready' | 'error'
  message: 'Docker motoru kontrol ediliyor...'
};

function updateVaultStatus(state, message) {
  vaultStatus = { state, message };
  if (win && !win.isDestroyed()) {
    win.webContents.send('vault-status-update', vaultStatus);
  }
}

// React arayuzu acildiginda mevcut son durumu aninda alabilsin
ipcMain.handle('get-vault-status', () => vaultStatus);

// Konteyner basladiktan sonra icindeki Python servisinin 8000 portunu acmasini bekler
function waitForVaultPort(port = 8000, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });

      const handleRetry = () => {
        socket.destroy();
        if (Date.now() - startTime >= timeoutMs) {
          reject(new Error('Kasa servisi (Port 8000) zaman aşımına uğradı'));
        } else {
          setTimeout(tryConnect, 800);
        }
      };

      socket.once('error', handleRetry);
      socket.once('timeout', handleRetry);
      socket.connect(port, '127.0.0.1');
    };

    tryConnect();
  });
}

// Kasa (Konteyner) baslatma fonksiyonu (Asenkron - Arayuzu dondurmez)
async function startDockerClient() {
  if (isStartingClient || clientContainerStarted) return;
  isStartingClient = true;

  try {
    // 1. Konteyner mevcut mu kontrol et ve varsa baslat
    updateVaultStatus('loading', 'Yerel kasa başlatılıyor...');
    await execAsync('docker inspect fhe_client_container');
    await execAsync('docker start fhe_client_container');

    updateVaultStatus('loading', 'Kasa servisi hazırlanıyor...');
    await waitForVaultPort(8000);

    clientContainerStarted = true;
    updateVaultStatus('ready', 'Yerel Kasa Aktif (Port 8000)');
    console.log("Kasa konteyneri basariyla baslatildi.");
  } catch (error) {
    console.log("Konteyner bulunamadi veya kapali. Kurulum adimlari kontrol ediliyor...");

    // Yarim kalmis/bozuk ayni isimli konteyner varsa isim cakismasini onlemek icin temizle
    try {
      await execAsync('docker rm -f fhe_client_container');
    } catch (_) {}

    // 2. Imaj Docker icinde var mi kontrol et
    let imageExists = false;
    try {
      await execAsync('docker inspect --type=image fhe-client-image');
      imageExists = true;
    } catch (imgErr) {
      imageExists = false;
    }

    // 3. Imaj yoksa app klasorune kopyalanmis tar dosyasindan arka planda yukle
    if (!imageExists) {
      const tarPath = path.join(path.dirname(app.getPath('exe')), 'fhe-vault.tar');
      if (fs.existsSync(tarPath)) {
        try {
          console.log("fhe-vault.tar tespit edildi, imaj arka planda yukleniyor...");
          updateVaultStatus('loading', 'Kasa imajı yükleniyor (1-2 dk sürebilir)...');
          await execAsync(`docker load -i "${tarPath}"`, { maxBuffer: 1024 * 1024 * 10 });
          console.log("Imaj basariyla yuklendi.");

          try {
            await fs.promises.unlink(tarPath);
            console.log("Gecici tar dosyasi diskten temizlendi.");
          } catch (unlinkErr) {
            console.warn("Tar dosyasi izin nedeniyle silinemedi:", unlinkErr.message);
          }
        } catch (loadErr) {
          console.error("Tar yuklenemedi:", loadErr);
          updateVaultStatus('error', 'Kasa imajı yüklenemedi');
          isStartingClient = false;
          return;
        }
      } else {
        console.error("Kritik: fhe-vault.tar dosyasi bulunamadi!");
        updateVaultStatus('error', 'Kurulum imajı (fhe-vault.tar) bulunamadı');
        isStartingClient = false;
        return;
      }
    }

    // 4. Konteyneri DOGRU parametrelerle sifirdan olustur ve baslat
    try {
      updateVaultStatus('loading', 'Kriptografik kasa oluşturuluyor...');
      await execAsync('docker run -d --name fhe_client_container -p 8000:8000 fhe-client-image:latest python client_app.py');

      updateVaultStatus('loading', 'Kasa servisi hazırlanıyor...');
      await waitForVaultPort(8000);

      clientContainerStarted = true;
      updateVaultStatus('ready', 'Yerel Kasa Aktif (Port 8000)');
      console.log("Kasa konteyneri sifirdan olusturuldu ve baslatildi.");
    } catch (runErr) {
      console.error("Konteyner run komutu basarisiz:", runErr);
      updateVaultStatus('error', 'Kasa konteyneri başlatılamadı');
    }
  } finally {
    isStartingClient = false;
  }
}

// Docker'in acik olup olmadigini denetleyen ve kapaliysa Registry'den acan fonksiyon
function ensureDockerAndStartContainer() {
  updateVaultStatus('loading', 'Docker motoru kontrol ediliyor...');

  exec('docker info', (error) => {
    if (!error) {
      startDockerClient();
      return;
    }

    console.log("Docker kapali, Registry uzerinden konumu araniyor...");
    updateVaultStatus('loading', 'Docker Desktop uyandırılıyor...');

    exec('reg query "HKLM\\Software\\Docker Inc.\\Docker Desktop" /v AppPath', (regErr, stdout) => {
      let dockerPath = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';

      if (!regErr && stdout) {
        const match = stdout.split('REG_SZ');
        if (match.length > 1) {
          let regPath = match[1].trim().replace(/^"|"$/g, '');
          if (!regPath.toLowerCase().endsWith('.exe')) {
            regPath = path.join(regPath, 'Docker Desktop.exe');
          }
          if (fs.existsSync(regPath)) {
            dockerPath = regPath;
          }
        }
      }

      console.log(`Docker baslatiliyor: ${dockerPath}`);

      const dockerProcess = spawn(dockerPath, [], {
        detached: true,
        stdio: 'ignore'
      });

      dockerProcess.on('error', (spawnErr) => {
        console.error("Docker Desktop baslatilamadi:", spawnErr);
        updateVaultStatus('error', 'Docker Desktop başlatılamadı');
      });

      dockerProcess.unref();

      let attempts = 0;
      const maxAttempts = 60; // Maksimum 3 dakika (60 x 3 sn) bekle

      const checkInterval = setInterval(() => {
        attempts++;
        exec('docker info', (err) => {
          if (!err) {
            clearInterval(checkInterval);
            console.log("Docker motoru uyandi, kasa baslatiliyor...");
            startDockerClient();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.error("Docker motoru zaman asimi suresi icinde baslatilamadi.");
            updateVaultStatus('error', 'Docker motoru zaman aşımına uğradı');
          }
        });
      }, 3000);
    });
  });
}

function stopDockerClient() {
  if (clientContainerStarted) {
    try {
      execSync('docker stop -t 1 fhe_client_container', {
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
    show: false,
    backgroundColor: '#0b1120',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    win.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(() => {
  ensureDockerAndStartContainer();
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