import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import './App.css';
import FheTransferModal from './components/FheTransferModal';

const ipcRenderer =
  typeof window !== 'undefined' && typeof window.require === 'function'
    ? window.require('electron').ipcRenderer
    : null;

// 0_preparation.py ile birebir aynı ölçekleme sınırları (0 - 15 aralığı)
const SCALING_PARAMS = {
  Cari_Oran: { min: 0.0, max: 3.0 },
  Nakit_Orani: { min: 0.0, max: 1.0 },
  Kaldirac_Orani: { min: 0.0, max: 1.0 },
  Finansal_Borc: { min: 0.0, max: 1.0 },
  Kar_Marji: { min: -0.20, max: 0.40 },
};

// İndirilebilir örnek TDHP genel geçici mizan verisi (Anadolu Makina Sanayi A.Ş.)
const SAMPLE_TDHP_ACCOUNTS = [
  ["100", "Kasa", "1 - Dönen Varlıklar", 450000, 250000],
  ["102", "Bankalar", "1 - Dönen Varlıklar", 6800000, 5600000],
  ["120", "Alıcılar", "1 - Dönen Varlıklar", 11500000, 8300000],
  ["153", "Ticari Mallar", "1 - Dönen Varlıklar", 13400000, 11100000],
  ["190", "Devreden KDV", "1 - Dönen Varlıklar", 900000, 600000],
  ["253", "Tesis, Makine ve Cihazlar", "2 - Duran Varlıklar", 7400000, 400000],
  ["254", "Taşıtlar", "2 - Duran Varlıklar", 1800000, 200000],
  ["255", "Demirbaşlar", "2 - Duran Varlıklar", 850000, 50000],
  ["257", "Birikmiş Amortismanlar (-)", "2 - Duran Varlıklar", 200000, 1800000],
  ["300", "Banka Kredileri (Kısa Vadeli)", "3 - Kısa Vadeli Yabancı Kaynaklar", 2100000, 3300000],
  ["320", "Satıcılar (Kısa Vadeli)", "3 - Kısa Vadeli Yabancı Kaynaklar", 7500000, 9800000],
  ["335", "Personele Borçlar", "3 - Kısa Vadeli Yabancı Kaynaklar", 1950000, 2200000],
  ["360", "Ödenecek Vergi ve Fonlar", "3 - Kısa Vadeli Yabancı Kaynaklar", 1100000, 1350000],
  ["400", "Banka Kredileri (Uzun Vadeli)", "4 - Uzun Vadeli Yabancı Kaynaklar", 1000000, 2500000],
  ["420", "Satıcılar (Uzun Vadeli)", "4 - Uzun Vadeli Yabancı Kaynaklar", 500000, 1750000],
  ["500", "Sermaye", "5 - Öz Kaynaklar", 0, 5200000],
  ["540", "Yasal Yedekler", "5 - Öz Kaynaklar", 0, 890000],
  ["600", "Yurtiçi Satışlar", "6 - Gelir Tablosu Hesapları", 0, 18450000],
  ["610", "Satıştan İadeler (-)", "6 - Gelir Tablosu Hesapları", 450000, 0],
  ["621", "Satılan Ticari Mallar Maliyeti (-)", "6 - Gelir Tablosu Hesapları", 11800000, 0],
  ["760", "Pazarlama Satış ve Dağıtım Giderleri", "7 - Maliyet Hesapları", 1450000, 0],
  ["770", "Genel Yönetim Giderleri", "7 - Maliyet Hesapları", 1350000, 0],
  ["780", "Finansman Giderleri", "7 - Maliyet Hesapları", 520000, 0],
  ["691", "Dönem Kârı Vergi Karşılığı (-)", "6 - Gelir Tablosu Hesapları", 720000, 0],
];

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
const DownloadIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>);
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

// Gizlilik (Göz) İkonları
const EyeIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>);
const EyeOffIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>);

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

  const [logs, setLogs] = useState([]);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Ekran Gizliliği Durumu
  const [isPrivacyOn, setIsPrivacyOn] = useState(false);

  // Canlı Yerel Kasa (Docker) Durumu
  const [vaultStatus, setVaultStatus] = useState({
    state: ipcRenderer ? 'loading' : 'ready',
    message: ipcRenderer ? 'Kasa kontrol ediliyor...' : 'Yerel Kasa (Port 8000)'
  });

  const isVaultReady = vaultStatus.state === 'ready';

  const addLog = (message, type = 'info') => {
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { time, message, type }]);
  };

  useEffect(() => {
    if (!ipcRenderer) return;

    let lastLoggedState = null;

    const applyStatus = (newStatus) => {
      if (!newStatus) return;
      setVaultStatus(newStatus);

      if (newStatus.state === 'ready' && lastLoggedState !== 'ready') {
        lastLoggedState = 'ready';
        addLog('Yerel FHE kasası (Port 8000) aktif ve işleme hazır.', 'success');
      } else if (newStatus.state === 'error' && lastLoggedState !== 'error') {
        lastLoggedState = 'error';
        addLog(`Kasa hatası: ${newStatus.message}`, 'error');
      }
    };

    ipcRenderer.invoke('get-vault-status').then(applyStatus).catch(() => {});

    const handleVaultUpdate = (_event, newStatus) => {
      applyStatus(newStatus);
    };

    ipcRenderer.on('vault-status-update', handleVaultUpdate);
    return () => {
      ipcRenderer.removeListener('vault-status-update', handleVaultUpdate);
    };
  }, []);

  const quantizeValue = (value, min, max) => {
    const num = Number(value) || 0;
    if (num <= min) return 0;
    if (num >= max) return 15;
    return Math.round(((num - min) / (max - min)) * 15);
  };

  // Kullanıcının bilgisayarına örnek TDHP genel geçici mizan Excel şablonunu indirir
  const downloadSampleMizan = () => {
    try {
      const sheetRows = [
        ["ANADOLU MAKİNA SANAYİ A.Ş. — TEK DÜZEN HESAP PLANI (TDHP) GENEL GEÇİCİ MİZANI"],
        ["Dönem: 01.01.2026 – 31.12.2026 | Para Birimi: TRY (₺) | Örnek Mizan Şablonu"],
        [],
        [
          "Hesap Kodu",
          "Hesap Adı",
          "TDHP Ana Grubu",
          "Borç Tutarı (₺)",
          "Alacak Tutarı (₺)",
          "Borç Bakiyesi (₺)",
          "Alacak Bakiyesi (₺)",
        ],
      ];

      let totBorc = 0;
      let totAlacak = 0;
      let totBorcBak = 0;
      let totAlacakBak = 0;

      SAMPLE_TDHP_ACCOUNTS.forEach(([code, name, group, borc, alacak]) => {
        const borcBak = borc > alacak ? borc - alacak : 0;
        const alacakBak = alacak > borc ? alacak - borc : 0;
        totBorc += borc;
        totAlacak += alacak;
        totBorcBak += borcBak;
        totAlacakBak += alacakBak;
        sheetRows.push([code, name, group, borc, alacak, borcBak, alacakBak]);
      });

      sheetRows.push([
        "TOPLAM",
        "Mizan Genel Toplamı (Borç = Alacak)",
        "Tam Mutabakat",
        totBorc,
        totAlacak,
        totBorcBak,
        totAlacakBak,
      ]);

      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
      ws["!cols"] = [
        { wch: 14 },
        { wch: 38 },
        { wch: 32 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detayli_TDHP_Mizan");
      XLSX.writeFile(wb, "ornek_sirket_tdhp_mizani.xlsx");
      addLog("Örnek şirket TDHP mizan şablonu (ornek_sirket_tdhp_mizani.xlsx) indirildi.", "info");
    } catch (error) {
      console.error("Sample download failed:", error);
      setErrorAlert("Örnek mizan dosyası oluşturulurken bir hata oluştu.");
    }
  };

  // Satırı hem 8 kalemli TDHP Mizan formatından hem de 5 rasyolu doğrudan formattan işler
  const parseAndQuantizeRow = (
    row,
    rowIndex,
    fallbackCompanyName = "Kurumsal Müşteri",
    options = {}
  ) => {
    const { isKesinMizan = false } = options;
    const lineNo = rowIndex + 2;
    const companyName = row.Sirket_Adi || row.Firma_Adi || fallbackCompanyName;

    // 1) Doğrudan 5 Rasyo sütunları mevcutsa (ör. mock_financial_data.xlsx)
    if (
      row.Cari_Oran !== undefined &&
      row.Nakit_Orani !== undefined &&
      row.Kaldirac_Orani !== undefined &&
      row.Finansal_Borc !== undefined &&
      row.Kar_Marji !== undefined
    ) {
      const cariOran = Number(row.Cari_Oran);
      const nakitOrani = Number(row.Nakit_Orani);
      const kaldiracOrani = Number(row.Kaldirac_Orani);
      const finansalBorc = Number(row.Finansal_Borc);
      const karMarji = Number(row.Kar_Marji);

      if ([cariOran, nakitOrani, kaldiracOrani, finansalBorc, karMarji].some(v => isNaN(v))) {
        throw new Error(`Satır ${lineNo}: Hatalı veri formatı. Rasyo değerleri sadece rakam olmalıdır.`);
      }

      return {
        Sirket_Adi: companyName,
        Cari_Oran: cariOran,
        Nakit_Orani: nakitOrani,
        Kaldirac_Orani: kaldiracOrani,
        Finansal_Borc: finansalBorc,
        Kar_Marji: karMarji,
        Cari_Oran_Q: quantizeValue(cariOran, SCALING_PARAMS.Cari_Oran.min, SCALING_PARAMS.Cari_Oran.max),
        Nakit_Orani_Q: quantizeValue(nakitOrani, SCALING_PARAMS.Nakit_Orani.min, SCALING_PARAMS.Nakit_Orani.max),
        Kaldirac_Orani_Q: quantizeValue(kaldiracOrani, SCALING_PARAMS.Kaldirac_Orani.min, SCALING_PARAMS.Kaldirac_Orani.max),
        Finansal_Borc_Q: quantizeValue(finansalBorc, SCALING_PARAMS.Finansal_Borc.min, SCALING_PARAMS.Finansal_Borc.max),
        Kar_Marji_Q: quantizeValue(karMarji, SCALING_PARAMS.Kar_Marji.min, SCALING_PARAMS.Kar_Marji.max),
      };
    }

    // 2) TDHP Bilanço / Gelir Tablosu kalemlerinden (8 kalem) rasyo hesabı
    const numericVals = Object.entries(row)
      .filter(([key]) => !/sirket|firma|unvan|ad|senaryo/i.test(key))
      .map(([, val]) => val);

    const hasNamedTdhp =
      row.Hazir_Degerler !== undefined &&
      row.Donen_Varliklar !== undefined &&
      row.Toplam_Varliklar !== undefined &&
      row.KV_Borclar !== undefined &&
      row.Finansal_Borclar !== undefined &&
      row.Toplam_Borclar !== undefined &&
      row.Net_Satislar !== undefined &&
      row.Net_Kar !== undefined;

    const rawItems = hasNamedTdhp
      ? [
          row.Hazir_Degerler,
          row.Donen_Varliklar,
          row.Toplam_Varliklar,
          row.KV_Borclar,
          row.Finansal_Borclar,
          row.Toplam_Borclar,
          row.Net_Satislar,
          row.Net_Kar,
        ]
      : numericVals.slice(0, 8);

    if (rawItems.length < 8 || rawItems.some(v => v === undefined || v === null || v === "")) {
      throw new Error(
        `Satır ${lineNo}: Geçersiz tablo formatı. Lütfen 'Hesap Kodu' sütunlu TDHP Genel Geçici Mizan Excel şablonunu yükleyiniz.`
      );
    }

    const [
      hazirDegerler,
      donenVarliklar,
      toplamVarliklar,
      kvBorclar,
      finansalBorclar,
      toplamBorclar,
      netSatislar,
      netKar,
    ] = rawItems.map(Number);

    if (
      [
        hazirDegerler,
        donenVarliklar,
        toplamVarliklar,
        kvBorclar,
        finansalBorclar,
        toplamBorclar,
        netSatislar,
        netKar,
      ].some(v => isNaN(v))
    ) {
      throw new Error(`Satır ${lineNo}: Hatalı veri formatı. Finansal kalemler sadece rakam olmalıdır.`);
    }

    // Muhasebe temel denkliği: Faal şirketin aktif varlıkları 0 olamaz
    if (toplamVarliklar <= 0) {
      throw new Error(`Satır ${lineNo}: Muhasebe denkliği hatası. Toplam Varlıklar sıfırdan büyük olmalıdır.`);
    }

    if (hazirDegerler < 0 || hazirDegerler > donenVarliklar || donenVarliklar > toplamVarliklar) {
      throw new Error(`Satır ${lineNo}: Muhasebe tutarlılığı hatası (0 ≤ Hazır Değerler ≤ Dönen Varlıklar ≤ Toplam Varlıklar olmalıdır).`);
    }

    if (kvBorclar < 0 || finansalBorclar < 0 || toplamBorclar < 0 || finansalBorclar > toplamBorclar) {
      throw new Error(`Satır ${lineNo}: Borç kalemleri tutarsız (0 ≤ Finansal Borçlar ≤ Toplam Borçlar olmalıdır).`);
    }

    // Net Satışlar = 0 ise Kesin Mizan vs. Faaliyetsiz Şirket ayrımı
    if (netSatislar <= 0) {
      if (isKesinMizan) {
        throw new Error(
          "Yüklenen dosya yıl sonu kapanış kayıtları yapılmış 'Kesin Mizan' formatındadır (gelir tablosu hesapları 590/591'e devredilerek sıfırlanmış). Lütfen kapanış öncesi 'Genel Geçici Mizan' yükleyiniz."
        );
      }
      throw new Error(
        `Satır ${lineNo}: Mizanda satış hasılatı (600 Net Satışlar > 0) bulunmadığı için Kâr Marjı hesaplanamıyor. Ticari kredi değerlendirmesi için faal satış hasılatı gereklidir.`
      );
    }

    // Borcu olmayan (KV Borç = 0 / Toplam Borç = 0) sağlam şirketler için güvenli uç değer dengesi:
    // Pay > 0 iken payda = 0 ise modelin en iyi üst sınırına oturur; 0 / 0 ise 0 kabul edilir.
    const cariOran =
      kvBorclar > 0
        ? donenVarliklar / kvBorclar
        : donenVarliklar > 0
        ? SCALING_PARAMS.Cari_Oran.max
        : 0;

    const nakitOrani =
      kvBorclar > 0
        ? hazirDegerler / kvBorclar
        : hazirDegerler > 0
        ? SCALING_PARAMS.Nakit_Orani.max
        : 0;

    const kaldiracOrani = toplamBorclar / toplamVarliklar;
    const finansalBorc = toplamBorclar > 0 ? finansalBorclar / toplamBorclar : 0;
    const karMarji = netKar / netSatislar;

    return {
      Sirket_Adi: companyName,
      Cari_Oran: cariOran,
      Nakit_Orani: nakitOrani,
      Kaldirac_Orani: kaldiracOrani,
      Finansal_Borc: finansalBorc,
      Kar_Marji: karMarji,
      Cari_Oran_Q: quantizeValue(cariOran, SCALING_PARAMS.Cari_Oran.min, SCALING_PARAMS.Cari_Oran.max),
      Nakit_Orani_Q: quantizeValue(nakitOrani, SCALING_PARAMS.Nakit_Orani.min, SCALING_PARAMS.Nakit_Orani.max),
      Kaldirac_Orani_Q: quantizeValue(kaldiracOrani, SCALING_PARAMS.Kaldirac_Orani.min, SCALING_PARAMS.Kaldirac_Orani.max),
      Finansal_Borc_Q: quantizeValue(finansalBorc, SCALING_PARAMS.Finansal_Borc.min, SCALING_PARAMS.Finansal_Borc.max),
      Kar_Marji_Q: quantizeValue(karMarji, SCALING_PARAMS.Kar_Marji.min, SCALING_PARAMS.Kar_Marji.max),
    };
  };

  // Detaylı TDHP Genel Geçici Mizan sekmesini (100..780 hesap kodları) okuyup tek şirket profiline dönüştürür
  const parseDetailedTdhpSheet = (worksheet, fileName = "") => {
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    const headerIdx = rawRows.findIndex(
      (r) => Array.isArray(r) && r.some((cell) => String(cell ?? "").trim() === "Hesap Kodu")
    );
    if (headerIdx === -1) return null;

    let detectedCompany = fileName.replace(/\.(xlsx|xls)$/i, "").replace(/[_-]+/g, " ").trim() || "TDHP Mizan Kaydı";
    if (headerIdx > 0 && Array.isArray(rawRows[0]) && rawRows[0][0]) {
      const titleText = String(rawRows[0][0]).trim();
      const splitTitle = titleText.split(/—|-/)[0].trim();
      if (splitTitle.length > 2 && splitTitle.length < 60) {
        detectedCompany = splitTitle;
      }
    }

    const headers = rawRows[headerIdx].map((h) => String(h ?? "").trim());
    const idxCode = headers.findIndex((h) => h === "Hesap Kodu");
    const idxBorcTut = headers.findIndex((h) => h.startsWith("Borç Tutarı"));
    const idxAlacakTut = headers.findIndex((h) => h.startsWith("Alacak Tutarı"));
    const idxBorcBak = headers.findIndex((h) => h.startsWith("Borç Bakiyesi"));
    const idxAlacakBak = headers.findIndex((h) => h.startsWith("Alacak Bakiyesi"));

    let hazirDegerler = 0;
    let donenVarliklar = 0;
    let duranVarliklar = 0;
    let kvBorclar = 0;
    let uvBorclar = 0;
    let finansalBorclar = 0;
    let netSatislar = 0;
    let netKar = 0;
    let donemNetKarZararBakiyesi = 0; // 590 / 591 / 690 kapanış hesapları kontrolü için
    let toplamBorcTutari = 0;
    let toplamAlacakTutari = 0;
    let accountCount = 0;

    for (let i = headerIdx + 1; i < rawRows.length; i++) {
      const r = rawRows[i];
      if (!r || r[idxCode] === null) continue;
      const code = String(r[idxCode]).trim();
      if (!/^\d{3}$/.test(code)) continue;

      accountCount++;
      const borcTut = idxBorcTut >= 0 ? Number(r[idxBorcTut]) || 0 : 0;
      const alacakTut = idxAlacakTut >= 0 ? Number(r[idxAlacakTut]) || 0 : 0;
      toplamBorcTutari += borcTut;
      toplamAlacakTutari += alacakTut;

      const rawBorcBak = idxBorcBak >= 0 && typeof r[idxBorcBak] === "number" ? r[idxBorcBak] : null;
      const rawAlacakBak = idxAlacakBak >= 0 && typeof r[idxAlacakBak] === "number" ? r[idxAlacakBak] : null;
      const borcBak = rawBorcBak !== null ? rawBorcBak : Math.max(0, borcTut - alacakTut);
      const alacakBak = rawAlacakBak !== null ? rawAlacakBak : Math.max(0, alacakTut - borcTut);

      const netDebit = borcBak - alacakBak;
      const netCredit = alacakBak - borcBak;
      const p1 = code[0];
      const p2 = code.slice(0, 2);

      if (code === "590" || code === "591" || code === "690") {
        donemNetKarZararBakiyesi += Math.abs(netCredit);
      }

      if (p2 === "10") hazirDegerler += netDebit;
      if (p1 === "1") {
        donenVarliklar += netDebit;
      } else if (p1 === "2") {
        duranVarliklar += netDebit;
      } else if (p1 === "3") {
        kvBorclar += netCredit;
        if (p2 === "30") finansalBorclar += netCredit;
      } else if (p1 === "4") {
        uvBorclar += netCredit;
        if (p2 === "40") finansalBorclar += netCredit;
      } else if (p1 === "6" || p1 === "7") {
        if (p2 === "60") netSatislar += netCredit;
        else if (p2 === "61") netSatislar -= netDebit;
        netKar += netCredit;
      }
    }

    if (accountCount === 0) {
      throw new Error("Detaylı TDHP mizan tablosunda geçerli 3 haneli hesap kodu bulunamadı.");
    }
    if (Math.abs(toplamBorcTutari - toplamAlacakTutari) > 1) {
      throw new Error(
        `Mizan denkliği hatalı: Borç Toplamı (${toplamBorcTutari.toLocaleString("tr-TR")} ₺) ≠ Alacak Toplamı (${toplamAlacakTutari.toLocaleString("tr-TR")} ₺).`
      );
    }

    const toplamVarliklar = donenVarliklar + duranVarliklar;
    const toplamBorclar = kvBorclar + uvBorclar;
    const isKesinMizan = netSatislar <= 0 && donemNetKarZararBakiyesi > 0;

    return {
      parsed: parseAndQuantizeRow(
        {
          Sirket_Adi: detectedCompany,
          Hazir_Degerler: hazirDegerler,
          Donen_Varliklar: donenVarliklar,
          Toplam_Varliklar: toplamVarliklar,
          KV_Borclar: kvBorclar,
          Finansal_Borclar: finansalBorclar,
          Toplam_Borclar: toplamBorclar,
          Net_Satislar: netSatislar,
          Net_Kar: netKar,
        },
        0,
        detectedCompany,
        { isKesinMizan }
      ),
      accountCount,
    };
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setEncryptedPayload("");
    setEncryptedResult("");
    setFinalResult(null);
    setIsProcessing(false);
    setEncryptError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // 1) Öncelikle kitapta 'Detayli_TDHP_Mizan' sekmesi veya 'Hesap Kodu' içeren genel geçici mizan var mı bak
        const tdhpSheetName =
          workbook.SheetNames.find((name) => name === "Detayli_TDHP_Mizan") ||
          workbook.SheetNames.find((name) => {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
            return rows.some((r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim() === "Hesap Kodu"));
          });

        if (tdhpSheetName) {
          const result = parseDetailedTdhpSheet(workbook.Sheets[tdhpSheetName], file.name);
          if (result) {
            setFinancialData(result.parsed);
            addLog(
              `"${file.name}" (${result.accountCount} TDHP hesabı) okundu, borç/alacak denkliği doğrulandı ve 5 rasyoya kuantize edildi.`,
              "success"
            );
            return;
          }
        }

        // 2) Detaylı hesap mizanı değilse tek satırlık özet bilanço / rasyo formatını oku
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          throw new Error("Hata: Yüklenen Excel dosyası tamamen boş.");
        }

        const fallbackName = file.name.replace(/\.(xlsx|xls)$/i, "");
        const singleRecord = parseAndQuantizeRow(jsonData[0], 0, fallbackName);
        setFinancialData(singleRecord);
        addLog(`"${file.name}" başarıyla yüklendi ve 5 TDHP rasyosuna kuantize edildi.`, "success");
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
    if (!isVaultReady) return;
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

  const encryptMizanData = async () => {
    if (!isVaultReady || !financialData) return;
    setEncryptError(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Cari_Oran_Q: financialData.Cari_Oran_Q,
          Nakit_Orani_Q: financialData.Nakit_Orani_Q,
          Kaldirac_Orani_Q: financialData.Kaldirac_Orani_Q,
          Finansal_Borc_Q: financialData.Finansal_Borc_Q,
          Kar_Marji_Q: financialData.Kar_Marji_Q,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const detailMsg =
          typeof errBody.detail === "string"
            ? errBody.detail
            : "Lütfen işlemi şifrelemeden önce 'Kriptografik Anahtar Üret' butonuna basarak anahtarlarınızı oluşturun.";
        throw new Error(detailMsg);
      }

      const data = await response.json();
      setEncryptedPayload(data.encrypted_payload);
      addLog("Mizan verisi (5 TDHP rasyosu) LWE şeması ile başarıyla şifrelendi.", "success");
    } catch (error) {
      console.error("Encryption failed:", error);
      setEncryptError(
        error?.message ||
          "Lütfen işlemi şifrelemeden önce 'Kriptografik Anahtar Üret' butonuna basarak anahtarlarınızı oluşturun."
      );
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
          <div
            className="status-pill"
            style={{
              borderColor:
                vaultStatus.state === 'ready'
                  ? 'rgba(74, 222, 128, 0.35)'
                  : vaultStatus.state === 'error'
                  ? 'rgba(248, 113, 113, 0.4)'
                  : 'rgba(251, 191, 36, 0.4)',
              backgroundColor:
                vaultStatus.state === 'ready'
                  ? 'rgba(74, 222, 128, 0.08)'
                  : vaultStatus.state === 'error'
                  ? 'rgba(248, 113, 113, 0.1)'
                  : 'rgba(251, 191, 36, 0.1)',
              color:
                vaultStatus.state === 'ready'
                  ? '#4ade80'
                  : vaultStatus.state === 'error'
                  ? '#f87171'
                  : '#fbbf24'
            }}
          >
            <span
              className={`status-dot ${vaultStatus.state === 'ready' ? 'active-green' : ''}`}
              style={
                vaultStatus.state !== 'ready'
                  ? {
                      backgroundColor: vaultStatus.state === 'error' ? '#f87171' : '#fbbf24',
                      boxShadow:
                        vaultStatus.state === 'error'
                          ? '0 0 8px rgba(248, 113, 113, 0.7)'
                          : '0 0 8px rgba(251, 191, 36, 0.7)'
                    }
                  : undefined
              }
            ></span>
            <span>{vaultStatus.message}</span>
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
            onClick={() => setIsLogOpen(true)}
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
            <button className="win-btn minimize" onClick={() => ipcRenderer?.send('window-minimize')} title="Küçült" style={{ WebkitAppRegion: 'no-drag' }}>
              &#8211;
            </button>
            <button className="win-btn maximize" onClick={() => ipcRenderer?.send('window-maximize')} title="Büyüt" style={{ WebkitAppRegion: 'no-drag' }}>
              &#9723;
            </button>
            <button className="win-btn close" onClick={() => ipcRenderer?.send('window-close')} title="Kapat" style={{ WebkitAppRegion: 'no-drag' }}>
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
                <h3 className="card-title">TDHP Genel Geçici Mizan Yükleme & Kuantizasyon</h3>
                <p className="card-description">Kurumsal müşteri kapanış öncesi genel geçici mizanını (.xlsx, .xls) sisteme aktarın veya örnek şablonu indirin.</p>
              </div>
            </div>

            <div className="card-header-right">
              <button
                type="button"
                onClick={downloadSampleMizan}
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.14)',
                  border: '1px solid rgba(99, 102, 241, 0.45)',
                  color: '#c7d2fe',
                  padding: '9px 15px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  WebkitAppRegion: 'no-drag'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.25)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.14)'}
              >
                <DownloadIcon /> Örnek Şirket Mizanı İndir
              </button>
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
              <div className="upload-title">TDHP Genel Geçici Mizan Dosyasını Seçin veya Sürükleyin</div>
              <div className="upload-subtitle">
                Tek Düzen Hesap Planı (100–780 hesap kodlu, kapanış öncesi) genel geçici mizan Excel dosyanızı yükleyin; borç/alacak denkliği kontrol edilip 5 finansal rasyo otomatik hesaplanır.
              </div>

              <label htmlFor="mizan-file-input" className="file-input-custom-label">
                <UploadCloudIcon /> {financialData ? "Farklı Mizan Seç" : "Mizan Dosyası Seç"}
              </label>

              {financialData && (
                <div className="upload-success-strip">
                  <div className="upload-success-left">
                    {uploadedFileName && (
                      <span className="upload-file-badge">
                        <FileSpreadsheetIcon /> {uploadedFileName}
                      </span>
                    )}
                    <span className="upload-success-text">
                      ✓ Mizan doğrulandı: <strong>{financialData.Sirket_Adi}</strong> için 5 TDHP rasyosu hesaplanıp kuantize edildi.
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

        {financialData && (
          <section className="corp-card">
            <div className="card-header">
              <div className="card-header-left">
                <div className="card-header-icon emerald">
                  <TableIcon />
                </div>
                <div className="card-titles">
                  <h3 className="card-title">Finansal Mizan & Kuantize Veri Matrisi</h3>
                  <p className="card-description">FHE şifrelemesi öncesi hesaplanan 5 TDHP rasyosu ve 4-bit ölçeklenmiş girdi matrisi</p>
                </div>
              </div>

              <div className="card-header-right">
                <div className="toolbar-btn-group">

                  {/* Gizlilik Butonu */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <button
                      onClick={() => setIsPrivacyOn(prev => !prev)}
                      style={{
                        backgroundColor: isPrivacyOn ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                        border: `1px solid ${isPrivacyOn ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`,
                        color: isPrivacyOn ? '#4ade80' : '#a0a0b0',
                        padding: '9px 14px', borderRadius: '6px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500',
                        transition: 'all 0.2s ease', height: 'fit-content'
                      }}
                      onMouseOver={(e) => {
                        if (!isPrivacyOn) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                      onMouseOut={(e) => {
                        if (!isPrivacyOn) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {isPrivacyOn ? <EyeOffIcon /> : <EyeIcon />}
                      {isPrivacyOn ? "Gizlilik Aktif" : "Değerleri Gizle"}
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={generateKeys}
                        disabled={!isVaultReady || isGeneratingKeys || keysGenerated}
                        title={!isVaultReady ? vaultStatus.message : undefined}
                        className={`btn btn-amber${isGeneratingKeys ? ' btn-loading' : ''} ${(!isVaultReady || keysGenerated) ? 'btn-disabled' : ''}`}
                        style={(!isVaultReady || keysGenerated) ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
                      >
                        {isGeneratingKeys ? (
                          <><SpinnerIcon /> Üretiliyor...</>
                        ) : keysGenerated ? (
                          <><CheckSmallIcon /> Anahtarlar RAM'de Aktif</>
                        ) : (
                          <><KeyIcon /> Kriptografik Anahtar Üret</>
                        )}
                      </button>

                      {!isVaultReady && (
                        <div
                          className="keygen-status-banner"
                          style={{ color: vaultStatus.state === 'error' ? '#f87171' : '#fbbf24' }}
                        >
                          {vaultStatus.state === 'error' ? <AlertTriangleIcon /> : <SpinnerIcon />} {vaultStatus.message}
                        </div>
                      )}
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
                  </div>

                  <button
                    onClick={encryptMizanData}
                    disabled={!isVaultReady}
                    title={!isVaultReady ? vaultStatus.message : undefined}
                    className={`btn ${encryptedPayload ? 'btn-emerald-active' : 'btn-emerald'} ${!isVaultReady ? 'btn-disabled' : ''}`}
                    style={!isVaultReady ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
                  >
                    <LockIcon /> {encryptedPayload ? "Mizan Verisini Yeniden Şifrele" : "Mizan Verisini Şifrele"}
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
                        <th style={{ minWidth: '150px', textAlign: 'left' }} rowSpan="2" className="th-index">Kurum / Mizan</th>
                        <th colSpan="5" className="th-group-raw th-divider">Hesaplanan TDHP Rasyoları (Gizli Mizan)</th>
                        <th colSpan="5" className="th-group-quantized">4-Bit Kuantize Değerler (Model Girdisi)</th>
                      </tr>
                      <tr className="th-sub-row">
                        <th>Cari Oran</th>
                        <th>Nakit Oranı</th>
                        <th>Kaldıraç</th>
                        <th>Fin. Borç</th>
                        <th className="th-divider">Kâr Marjı</th>
                        <th>Cari [Q]</th>
                        <th>Nakit [Q]</th>
                        <th>Kaldıraç [Q]</th>
                        <th>Fin. Borç [Q]</th>
                        <th>Kâr Marjı [Q]</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="row-target">
                        <td className="td-index" style={{ textAlign: 'left', fontWeight: 600 }}>
                          {isPrivacyOn ? 'Gizli Kurum' : financialData.Sirket_Adi}
                        </td>
                        <td>{isPrivacyOn ? '***' : financialData.Cari_Oran.toFixed(2)}</td>
                        <td>{isPrivacyOn ? '***' : financialData.Nakit_Orani.toFixed(2)}</td>
                        <td>{isPrivacyOn ? '***' : `%${(financialData.Kaldirac_Orani * 100).toFixed(1)}`}</td>
                        <td>{isPrivacyOn ? '***' : `%${(financialData.Finansal_Borc * 100).toFixed(1)}`}</td>
                        <td className="td-divider">{isPrivacyOn ? '***' : `%${(financialData.Kar_Marji * 100).toFixed(1)}`}</td>

                        <td><span className="badge-q-pill">{financialData.Cari_Oran_Q}</span></td>
                        <td><span className="badge-q-pill">{financialData.Nakit_Orani_Q}</span></td>
                        <td><span className="badge-q-pill">{financialData.Kaldirac_Orani_Q}</span></td>
                        <td><span className="badge-q-pill">{financialData.Finansal_Borc_Q}</span></td>
                        <td><span className="badge-q-pill">{financialData.Kar_Marji_Q}</span></td>
                      </tr>
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