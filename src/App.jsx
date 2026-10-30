import { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import './App.css';
import FheTransferModal from './components/FheTransferModal';

const ipcRenderer =
  typeof window !== 'undefined' && typeof window.require === 'function'
    ? window.require('electron').ipcRenderer
    : null;

const SCALING_PARAMS = {
  Cash: { min: 0, max: 15 },
  Debt: { min: 0, max: 15 },
  Income: { min: 0, max: 15 }
};

const truncatePayload = (hexString, prefixLen = 140, suffixLen = 60) => {
  if (!hexString) return "";
  if (hexString.length <= prefixLen + suffixLen + 30) return hexString;
  const start = hexString.substring(0, prefixLen);
  const end = hexString.substring(hexString.length - suffixLen);
  return `${start}\n\n. . .\n\n${end}`;
};

// İkonlar
const ShieldIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>);
const KeyIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 2-2 2m-1.5 1.5L14 9l-2-2-4 4 2 2-3 3H3v4h4v-3l3-3 2 2 4-4-1.5-1.5z"/></svg>);
const LockIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>);
const UnlockIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>);
const UploadCloudIcon = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>);
const ServerIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/></svg>);
const CpuIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>);
const TableIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>);
const FileSpreadsheetIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></svg>);
const CheckCircleIcon = () => (<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>);
const CheckSmallIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);
const CopyIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>);
const AlertTriangleIcon = () => (<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);
const SpinnerIcon = () => (<svg className="spinner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>);
const HistoryIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>);

function App() {
  const [financialData, setFinancialData] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [encryptedPayload, setEncryptedPayload] = useState("");

  const [keyStatus, setKeyStatus] = useState(null); 
  const [encryptError, setEncryptError] = useState(null); 
  
  const [encryptedResult, setEncryptedResult] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [keysGenerated, setKeysGenerated] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState('preparing');
  const [uploadProgress, setUploadProgress] = useState({ percentage: 0, loadedMB: '0.00 MB', totalMB: '0.00 MB' });
  const [modalError, setModalError] = useState('');
  const [errorAlert, setErrorAlert] = useState(null);

  // İşlem Geçmişi State'leri
  const [logs, setLogs] = useState([]);
  const [isLogOpen, setIsLogOpen] = useState(false); 

  const addLog = (message, type = 'info') => {
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { time, message, type }]);
  };

  const quantizeValue = (value, min, max) => {
    const num = Number(value) || 0;
    if (num <= min) return 0;
    if (num >= max) return 15;
    return Math.round(((num - min) / (max - min)) * 15);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setEncryptedPayload("");
    setEncryptedResult("");
    setFinalResult(null);
    setIsProcessing(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          throw new Error("Hata: Yüklenen Excel dosyası tamamen boş.");
        }

        const processedData = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const values = Object.values(row);
          const cashVal = values[0];
          const debtVal = values[1];
          const incomeVal = values[2];

          if (cashVal === undefined || debtVal === undefined || incomeVal === undefined || 
              cashVal === "" || debtVal === "" || incomeVal === "") {
            throw new Error(`Satır ${i + 2}: Eksik veri bulundu. Lütfen boş hücre bırakmayın.`);
          }

          if (isNaN(Number(cashVal)) || isNaN(Number(debtVal)) || isNaN(Number(incomeVal))) {
            throw new Error(`Satır ${i + 2}: Hatalı veri formatı. Finansal değerler sadece rakam olmalıdır.`);
          }

          processedData.push({
            Cash: Number(cashVal),
            Debt: Number(debtVal),
            Income: Number(incomeVal),
            Cash_Q: quantizeValue(Number(cashVal), SCALING_PARAMS.Cash.min, SCALING_PARAMS.Cash.max),
            Debt_Q: quantizeValue(Number(debtVal), SCALING_PARAMS.Debt.min, SCALING_PARAMS.Debt.max),
            Income_Q: quantizeValue(Number(incomeVal), SCALING_PARAMS.Income.min, SCALING_PARAMS.Income.max),
          });
        }

        setFinancialData(processedData);
        addLog(`"${file.name}" başarıyla yüklendi.`, "success");

      } catch (error) {
        console.error("Veri doğrulama hatası:", error);
        setFinancialData(null);
        setUploadedFileName("");
        addLog("Dosya içeriği reddedildi.", "error");
        setErrorAlert(error.message); 
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const copyToClipboard = (text, setCopiedState) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    }).catch(err => console.error("Clipboard copy failed:", err));
  };

  const generateKeys = async () => {
    setIsGeneratingKeys(true);
    setKeyStatus(null);
    setEncryptError(null); 
    addLog("Yerel kasada FHE anahtarları üretiliyor...", "warning");
    
    try {
      const response = await fetch("http://127.0.0.1:8000/generate_keys");
      if (!response.ok) throw new Error("Sunucu hatası");
      await response.json();
      setKeyStatus('success');
      setKeysGenerated(true);
      addLog("Kriptografik anahtarlar başarıyla oluşturuldu.", "success");
      setTimeout(() => setKeyStatus(null), 3000);
    } catch (error) {
      console.error("Key generation failed:", error);
      setKeyStatus('error');
      addLog("Anahtar üretimi başarısız oldu.", "error");
    } finally {
      setIsGeneratingKeys(false);
    }
  };

  const encryptFirstRow = async () => {
    if (!financialData || financialData.length === 0) return;
    setEncryptError(null); 
    const rowToEncrypt = financialData[0];
    
    try {
      const response = await fetch("http://127.0.0.1:8000/encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Cash_Q: rowToEncrypt.Cash_Q,
          Debt_Q: rowToEncrypt.Debt_Q,
          Income_Q: rowToEncrypt.Income_Q
        }),
      });
      
      if (!response.ok) throw new Error("Anahtar bulunamadı");
      
      const data = await response.json();
      setEncryptedPayload(data.encrypted_payload);
      addLog("1. satır verisi LWE şeması ile başarıyla şifrelendi.", "success");
    } catch (error) {
      console.error("Encryption failed:", error);
      setEncryptError("Lütfen işlemi şifrelemeden önce 'Kriptografik Anahtar Üret' butonuna basarak anahtarlarınızı oluşturun.");
      addLog("Şifreleme işlemi başarısız oldu. Anahtar eksik olabilir.", "error");
    }
  };

  const sendToServer = async () => {
    if (!encryptedPayload) return;

    setModalOpen(true);
    setModalStep('preparing');
    setUploadProgress({ percentage: 0, loadedMB: '0.00 MB', totalMB: '0.00 MB' });
    setModalError('');
    setIsProcessing(true);
    addLog("Şifreli veri uzak sunucuya değerlendirme için iletiliyor...", "info");

    try {
      const keysResponse = await fetch("http://127.0.0.1:8000/get_evaluation_keys");
      if (!keysResponse.ok) throw new Error("Evaluation keys kasadan alınamadı (Port 8000).");
      const keysBlob = await keysResponse.blob();

      const formData = new FormData();
      formData.append("encrypted_hex", encryptedPayload);
      formData.append("evaluation_keys", keysBlob, "eval_keys.bin");

      const totalBytes = keysBlob.size + new Blob([encryptedPayload]).size;
      const totalMBStr = (totalBytes / (1024 * 1024)).toFixed(2) + ' MB';

      setModalStep('uploading');

      const response = await axios.post("http://127.0.0.1:8001/run_fhe", formData, {
        onUploadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded;
          const total = progressEvent.total || totalBytes;
          const pct = Math.min(Math.round((loaded / total) * 100), 99);
          setUploadProgress({
            percentage: pct,
            loadedMB: (loaded / (1024 * 1024)).toFixed(2) + ' MB',
            totalMB: (total / (1024 * 1024)).toFixed(2) + ' MB',
          });
        },
      });

      setUploadProgress({ percentage: 100, loadedMB: totalMBStr, totalMB: totalMBStr });
      setModalStep('evaluating');

      setEncryptedResult(response.data.encrypted_result_hex);
      setModalStep('success');
      addLog("Sunucu kör (blind) hesaplamayı tamamladı ve sonucu iletti.", "success");
      
      setTimeout(() => {
        setModalOpen(false);
        setIsProcessing(false);
      }, 1500);

    } catch (error) {
      console.error("Server connection error:", error);
      const message = error?.response?.data?.detail || error?.message || "Uzak banka sunucusuna (Port 8001) bağlanılamadı.";
      setModalError(message);
      setModalStep('error');
      setIsProcessing(false);
      addLog("Uzak sunucu iletişimi veya hesaplama başarısız oldu.", "error");
    }
  };

  const handleModalRetry = () => sendToServer();
  const handleModalClose = () => { setModalOpen(false); setIsProcessing(false); };

  const decryptFinalResult = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypted_result_hex: encryptedResult }),
      });
      
      if (!response.ok) throw new Error("Local vault did not respond");
      
      const data = await response.json();
      setFinalResult(data.decrypted_result);
      
      const verdict = data.decrypted_result === 1 ? "REDDEDİLDİ" : "ONAYLANDI";
      addLog(`Nihai kredi kararı yerel kasada deşifre edildi: ${verdict}`, "success");
      
    } catch (error) {
      console.error("Decryption failed:", error);
      alert("Decryption process failed.");
      addLog("Deşifreleme işlemi başarısız oldu.", "error");
    }
  };

  return (
    <>
      <header className="app-topbar">
        <div className="topbar-brand">
          <div className="brand-icon-box">
            <ShieldIcon />
          </div>
          <div className="brand-text-wrap">
            <div className="brand-title">
              CONCRETE FHE <span className="brand-tag">FINANCIAL RISK</span>
            </div>
            <div className="brand-subtitle">
              Tam Homomorfik Şifreleme Tabanlı Kredi Değerlendirme Terminali
            </div>
          </div>
        </div>

        <div className="topbar-status-group">
          <div className="status-pill">
            <span className="status-dot active-green"></span>
            <span>Yerel Kasa (Port 8000)</span>
          </div>
          <div className="status-pill">
            <span className="status-dot active-blue"></span>
            <span>Banka Sunucusu (Port 8001)</span>
          </div>
          <div className="status-pill">
            <span className="status-dot active-purple"></span>
            <span>Zero-Trust FHE</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: 'auto' }}>
          <button 
            onClick={() => setIsLogOpen(true)} // Tıklanırsa her türlü açar.
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500',
              transition: 'background-color 0.2s', outline: 'none', WebkitAppRegion: 'no-drag'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
          >
            <HistoryIcon /> İşlem Geçmişi
          </button>
          
          <div className="window-controls">
            <button className="win-btn minimize" onClick={() => ipcRenderer?.send('window-minimize')} title="Küçült" style={{WebkitAppRegion: 'no-drag'}}>
              &#8211;
            </button>
            <button className="win-btn maximize" onClick={() => ipcRenderer?.send('window-maximize')} title="Büyüt" style={{WebkitAppRegion: 'no-drag'}}>
              &#9723;
            </button>
            <button className="win-btn close" onClick={() => ipcRenderer?.send('window-close')} title="Kapat" style={{WebkitAppRegion: 'no-drag'}}>
              &#10005;
            </button>
          </div>
        </div>
      </header>

      <main className="app-container">
        <section className="hero-banner">
          <div className="hero-content">
            <div className="hero-badge-group">
              <span className="hero-badge">
                <ShieldIcon /> Tam Homomorfik Şifreleme (TFHE)
              </span>
              <span className="hero-badge-secondary">
                128-Bit Post-Kuantum Güvenlik
              </span>
            </div>
            <h1 className="hero-title">Tamamen Şifreli Finansal Risk Analizi</h1>
            <p className="hero-subtitle">
              Müşteri mizan verileri yerel kasada şifrelenir. Uzak banka sunucusu, verileri veya model çıktısını 
              asla deşifre edemeden matematiksel olarak kredi risk skorunu kör (blind) şekilde hesaplar.
            </p>
          </div>
        </section>

        <section className="architecture-ribbon">
          <div className={`arch-step-box ${financialData ? 'completed' : 'active'}`}>
            <div className="arch-step-num">
              {financialData ? <CheckSmallIcon /> : "1"}
            </div>
            <div className="arch-step-info">
              <span className="arch-step-title">Mizan Yükleme</span>
              <span className="arch-step-sub">{financialData ? 'Veri Aktarıldı' : 'Bekleniyor'}</span>
            </div>
          </div>

          <div className={`arch-step-box ${encryptedPayload ? 'completed' : financialData ? 'active' : ''}`}>
            <div className="arch-step-num">
              {encryptedPayload ? <CheckSmallIcon /> : "2"}
            </div>
            <div className="arch-step-info">
              <span className="arch-step-title">Kriptografik Şifreleme</span>
              <span className="arch-step-sub">{encryptedPayload ? 'LWE Korumalı' : 'Yerel Kasa'}</span>
            </div>
          </div>

          <div className={`arch-step-box ${encryptedResult ? 'completed' : encryptedPayload ? 'active' : ''}`}>
            <div className="arch-step-num">
              {encryptedResult ? <CheckSmallIcon /> : "3"}
            </div>
            <div className="arch-step-info">
              <span className="arch-step-title">Kör FHE Değerlendirmesi</span>
              <span className="arch-step-sub">{encryptedResult ? 'Tamamlandı' : 'Bulut Sunucu'}</span>
            </div>
          </div>

          <div className={`arch-step-box ${finalResult !== null ? 'completed' : encryptedResult ? 'active' : ''}`}>
            <div className="arch-step-num">
              {finalResult !== null ? <CheckSmallIcon /> : "4"}
            </div>
            <div className="arch-step-info">
              <span className="arch-step-title">Nihai Karar Çözümleme</span>
              <span className="arch-step-sub">{finalResult !== null ? 'Karar Hazır' : 'Gizli Kasa'}</span>
            </div>
          </div>
        </section>

        <section className="corp-card">
          <div className="card-header">
            <div className="card-header-left">
              <div className="card-header-icon">
                <UploadCloudIcon />
              </div>
              <div className="card-titles">
                <h3 className="card-title">Mizan Verisi Yükleme & Kuantizasyon</h3>
                <p className="card-description">Kurumsal müşteri bilanço ve mizan tablosunu (.xlsx, .xls) sisteme aktarın.</p>
              </div>
            </div>
          </div>
          
          <div className="card-body">
            <div className="upload-dropzone">
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onClick={(e) => { e.target.value = null; }}
                onChange={handleFileUpload} 
                className="hidden-file-input" 
                id="mizan-file-input"
              />
              <div className="upload-icon-container">
                <UploadCloudIcon />
              </div>
              <div className="upload-title">Mizan Dosyasını Seçin veya Sürükleyin</div>
              <div className="upload-subtitle">
                Excel formatındaki Nakit (Cash), Borç (Debt) ve Gelir (Income) kalemlerini içeren mizan tablosunu yükleyin.
              </div>
              <label htmlFor="mizan-file-input" className="file-input-custom-label">
                <UploadCloudIcon /> {financialData ? "Farklı Dosya Seç" : "Dosya Seç"}
              </label>

              {financialData && financialData.length > 0 && (
                <div className="upload-success-strip">
                  <div className="upload-success-left">
                    {uploadedFileName && (
                      <span className="upload-file-badge">
                        <FileSpreadsheetIcon /> {uploadedFileName}
                      </span>
                    )}
                    <span className="upload-success-text">
                      ✓ Mizan aktarıldı: <strong>{financialData.length}</strong> adet kayıt kuantize edilerek belleğe alındı.
                    </span>
                  </div>
                  <label htmlFor="mizan-file-input" className="reupload-link-btn">
                    Dosyayı Değiştir
                  </label>
                </div>
              )}
            </div>
          </div>
        </section>

        {financialData && financialData.length > 0 && (
          <section className="corp-card">
            <div className="card-header">
              <div className="card-header-left">
                <div className="card-header-icon emerald">
                  <TableIcon />
                </div>
                <div className="card-titles">
                  <h3 className="card-title">Finansal Mizan & Kuantize Veri Matrisi</h3>
                  <p className="card-description">FHE şifrelemesi öncesi ham mizan değerleri ve 4-bit ölçeklenmiş girdi matrisi</p>
                </div>
              </div>

              <div className="card-header-right">
                <div className="toolbar-btn-group">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <button
                      onClick={generateKeys}
                      disabled={isGeneratingKeys || keysGenerated}
                      className={`btn btn-amber${isGeneratingKeys ? ' btn-loading' : ''} ${keysGenerated ? 'btn-disabled' : ''}`}
                      style={keysGenerated ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                    >
                      {isGeneratingKeys ? (
                        <><SpinnerIcon /> Üretiliyor...</>
                      ) : keysGenerated ? (
                        <><CheckSmallIcon /> Anahtarlar RAM'de Aktif</>
                      ) : (
                        <><KeyIcon /> Kriptografik Anahtar Üret</>
                      )}
                    </button>
                    
                    {isGeneratingKeys && (
                      <div className="keygen-status-banner">
                        <SpinnerIcon /> Evaluation & Secret Key hesaplanıyor...
                      </div>
                    )}
                    {keyStatus === 'success' && (
                      <div className="keygen-status-banner" style={{ color: '#4ade80' }}>
                        <CheckSmallIcon /> Anahtarlar başarıyla üretildi!
                      </div>
                    )}
                    {keyStatus === 'error' && (
                      <div className="keygen-status-banner" style={{ color: '#f87171' }}>
                        <AlertTriangleIcon /> Anahtar üretimi başarısız oldu.
                      </div>
                    )}
                    {encryptError && (
                      <div className="keygen-status-banner" style={{ color: '#f87171', maxWidth: '300px', textAlign: 'right' }}>
                        <AlertTriangleIcon /> {encryptError}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={encryptFirstRow} 
                    className={`btn ${encryptedPayload ? 'btn-emerald-active' : 'btn-emerald'}`}
                  >
                    <LockIcon /> {encryptedPayload ? "1. Satırı Yeniden Şifrele" : "1. Satırı Şifrele"}
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body" style={{ padding: '16px' }}>
              <div className="table-wrapper">
                <div className="table-scroll-container">
                  <table className="corp-table">
                    <thead>
                      <tr className="th-group-row">
                        <th style={{ width: '68px', textAlign: 'center' }} rowSpan="2" className="th-index">Kayıt</th>
                        <th colSpan="3" className="th-group-raw th-divider">Ham Finansal Veriler (Gizli Mizan)</th>
                        <th colSpan="3" className="th-group-quantized">4-Bit Kuantize Değerler (Model Girdisi)</th>
                      </tr>
                      <tr className="th-sub-row">
                        <th>Nakit</th>
                        <th>Borç</th>
                        <th className="th-divider">Gelir</th>
                        <th>Nakit [Q]</th>
                        <th>Borç [Q]</th>
                        <th>Gelir [Q]</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialData.map((row, index) => (
                        <tr key={index} className={index === 0 ? "row-target" : ""}>
                          <td className="td-index">
                            {index === 0 ? (
                              <span className="target-row-chip">Hedef</span>
                            ) : (
                              <span className="row-num">#{index + 1}</span>
                            )}
                          </td>
                          <td>{row.Cash}</td>
                          <td>{row.Debt}</td>
                          <td className="td-divider">{row.Income}</td>
                          <td><span className="badge-q-pill">{row.Cash_Q}</span></td>
                          <td><span className="badge-q-pill">{row.Debt_Q}</span></td>
                          <td><span className="badge-q-pill">{row.Income_Q}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {encryptedPayload && (
          <section className="corp-card">
            <div className="card-header">
              <div className="card-header-left">
                <div className="card-header-icon emerald">
                  <LockIcon />
                </div>
                <div className="card-titles">
                  <h3 className="card-title">İstemci Kasası Şifreli Yükü (Ciphertext)</h3>
                  <p className="card-description">Mizan verisi yerel kasada şifrelendi; açık metin veriler cihazınızı terk etmez.</p>
                </div>
              </div>
              <div className="card-header-right">
                <span className="status-pill">
                  <span className="status-dot active-green"></span>
                  LWE Korumalı
                </span>
              </div>
            </div>

            <div className="card-body">
              <div className="terminal-box">
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <span className="t-dot red"></span>
                    <span className="t-dot yellow"></span>
                    <span className="t-dot green"></span>
                  </div>
                  <span className="terminal-filename">client_encrypted_payload.hex</span>
                  <div className="terminal-actions">
                    <span className="terminal-len-badge">{encryptedPayload.length.toLocaleString('tr-TR')} Karakter</span>
                    <button 
                      onClick={() => copyToClipboard(encryptedPayload, setCopiedPayload)} 
                      className="terminal-copy-btn"
                    >
                      {copiedPayload ? <><CheckSmallIcon /> Kopyalandı</> : <><CopyIcon /> Kopyala</>}
                    </button>
                  </div>
                </div>
                <div className="terminal-content">
                  {truncatePayload(encryptedPayload)}
                </div>
              </div>

              <button 
                onClick={sendToServer} 
                disabled={!encryptedPayload || isProcessing}
                className="btn btn-primary btn-block"
              >
                {isProcessing ? (
                  <><SpinnerIcon /> Uzak Sunucuda FHE Karar Ağacı Kör Olarak Çalıştırılıyor...</>
                ) : (
                  <><ServerIcon /> Uzak Banka Sunucusuna İlet ve Kör FHE Değerlendirmesini Başlat</>
                )}
              </button>
            </div>
          </section>
        )}

        {encryptedResult && (
          <section className="corp-card">
            <div className="card-header">
              <div className="card-header-left">
                <div className="card-header-icon purple">
                  <CpuIcon />
                </div>
                <div className="card-titles">
                  <h3 className="card-title">Uzak Banka Sunucusu Çıktısı (Şifreli Sonuç)</h3>
                  <p className="card-description">Sunucu mizanı hiç görmeden değerlendirmeyi tamamladı ve şifreli sonucu döndürdü.</p>
                </div>
              </div>
              <div className="card-header-right">
                <span className="status-pill">
                  <span className="status-dot active-purple"></span>
                  Zero-Trust Kör Hesaplama
                </span>
              </div>
            </div>

            <div className="card-body">
              <div className="terminal-box">
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <span className="t-dot red"></span>
                    <span className="t-dot yellow"></span>
                    <span className="t-dot green"></span>
                  </div>
                  <span className="terminal-filename">server_encrypted_verdict.hex</span>
                  <div className="terminal-actions">
                    <span className="terminal-len-badge">{encryptedResult.length.toLocaleString('tr-TR')} Karakter</span>
                    <button 
                      onClick={() => copyToClipboard(encryptedResult, setCopiedResult)} 
                      className="terminal-copy-btn"
                    >
                      {copiedResult ? <><CheckSmallIcon /> Kopyalandı</> : <><CopyIcon /> Kopyala</>}
                    </button>
                  </div>
                </div>
                <div className="terminal-content purple">
                  {truncatePayload(encryptedResult)}
                </div>
              </div>

              <button 
                onClick={decryptFinalResult} 
                className="btn btn-purple btn-block"
                style={{ marginBottom: finalResult !== null ? '24px' : '0' }}
              >
                <UnlockIcon /> Şifreli Sonucu Yerel Kasada Deşifre Et
              </button>

              {finalResult !== null && (
                <div className={`verdict-card ${finalResult === 1 ? 'rejected' : 'approved'}`}>
                  <div className="verdict-icon-wrap">
                    {finalResult === 1 ? <AlertTriangleIcon /> : <CheckCircleIcon />}
                  </div>
                  <div className="verdict-header-title">Nihai Kredi Risk Değerlendirme Kararı</div>
                  <div className="verdict-main-decision">
                    {finalResult === 1 ? "KREDİ TAHSİS KARARI: REDDEDİLDİ" : "KREDİ TAHSİS KARARI: ONAYLANDI"}
                  </div>
                  <p className="verdict-description">
                    {finalResult === 1 
                      ? "FHE Karar Ağacı modeli, borç ve likidite oranlarını kritik risk eşiğinin üzerinde değerlendirmiştir (Yüksek Temerrüt İhtimali)."
                      : "FHE Karar Ağacı modeli, mizan likidite ve gelir rasyolarını güvenli kredi tahsis standartlarına uygun bulmuştur."}
                  </p>

                  <div className="verdict-single-metric">
                    <div className="metric-k">Risk Kategorisi</div>
                    <div className="metric-v">{finalResult === 1 ? "Yüksek Risk" : "Düşük Risk"}</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <footer className="corp-footer">
          <div className="footer-left">
            <ShieldIcon /> Concrete FHE Toolkit • Zero-Trust Finansal Risk Yönetim Sistemi
          </div>
          <div className="footer-right">
            <span>TFHE & Concrete ML Tabanlı Kriptografik Güvenlik</span>
            <span>Port: 8000 / 8001</span>
          </div>
        </footer>
      </main>

      {isLogOpen && (
        <div 
          onClick={() => setIsLogOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)',
            zIndex: 9998, transition: 'all 0.3s ease', cursor: 'pointer'
          }}
        />
      )}

      {/* PANELDEN ÇIKINCA İŞLEM GEÇMİŞİ BUTONUNU ENGELLEMEMESİ İÇİN POINTER-EVENTS NONE VE VISIBILITY HIDDEN EKLENDİ */}
      <aside 
        className="audit-sidebar-fixed"
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: '320px', maxWidth: '85vw',
          backgroundColor: '#151521', borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: isLogOpen ? '-5px 0 25px rgba(0, 0, 0, 0.5)' : 'none',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          transform: isLogOpen ? 'translateX(0)' : 'translateX(100%)',
          visibility: isLogOpen ? 'visible' : 'hidden', 
          pointerEvents: isLogOpen ? 'auto' : 'none',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s'
        }}
      >
        <div className="audit-header" style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="audit-icon">&#128196;</span>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '15px' }}>İşlem Geçmişi</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {logs.length > 0 && (
              <button 
                onClick={() => setLogs([])} 
                title="Logları Temizle"
                style={{
                  background: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#a0a0b0',
                  padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', transition: '0.2s',
                  WebkitAppRegion: 'no-drag'
                }}
                onMouseOver={(e) => e.target.style.color = '#fff'}
                onMouseOut={(e) => e.target.style.color = '#a0a0b0'}
              >
                Temizle
              </button>
            )}
            
            {/* ÇARPI BUTONUNUN ÇALIŞMASI İÇİN Z-INDEX, POSITION VE PADDING DÜZELTİLDİ */}
            <button 
              onClick={() => setIsLogOpen(false)} 
              style={{ 
                background: 'none', border: 'none', color: '#a0a0b0', cursor: 'pointer', 
                fontSize: '20px', padding: '10px', WebkitAppRegion: 'no-drag',
                position: 'relative', zIndex: 99999
              }}
              onMouseOver={(e) => e.target.style.color = '#fff'}
              onMouseOut={(e) => e.target.style.color = '#a0a0b0'}
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="audit-content" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {logs.length === 0 ? (
            <div className="empty-log" style={{ color: '#6b6b80', textAlign: 'center', marginTop: '20px' }}>Henüz işlem yapılmadı...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`log-item ${log.type}`} style={{ marginBottom: '12px', fontSize: '13px', lineHeight: '1.4' }}>
                <span className="log-time" style={{ color: '#a0a0b0', marginRight: '6px' }}>[{log.time}]</span>
                <span className="log-message" style={{ color: log.type === 'error' ? '#ff4d4d' : log.type === 'success' ? '#4ade80' : log.type === 'warning' ? '#fbbf24' : '#fff' }}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </aside>

      <FheTransferModal
        isOpen={modalOpen}
        step={modalStep}
        uploadProgress={uploadProgress}
        errorMessage={modalError}
        onRetry={handleModalRetry}
        onClose={handleModalClose}
      />

      {errorAlert && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(4px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <div style={{
            backgroundColor: "#1e1e2d", border: "1px solid #ff4d4d", 
            boxShadow: "0 0 20px rgba(255, 77, 77, 0.2)", borderRadius: "12px",
            padding: "30px", maxWidth: "450px", width: "90%", textAlign: "center",
            color: "#fff", fontFamily: "system-ui, sans-serif"
          }}>
            <svg style={{ width: "50px", height: "50px", color: "#ff4d4d", margin: "0 auto 15px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <h3 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 10px", color: "#ff4d4d" }}>Veri Bütünlüğü İhlali</h3>
            <p style={{ fontSize: "15px", color: "#a0a0b0", lineHeight: "1.5", marginBottom: "25px" }}>{errorAlert}</p>
            <button 
              onClick={() => setErrorAlert(null)}
              style={{
                backgroundColor: "#ff4d4d", color: "#fff", border: "none",
                padding: "10px 25px", borderRadius: "6px", fontSize: "14px",
                fontWeight: "600", cursor: "pointer", transition: "background 0.2s", WebkitAppRegion: 'no-drag'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#ff3333"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#ff4d4d"}
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;