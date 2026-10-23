import React from 'react';

/**
 * Sıfır Güven Veri İletimi (Zero-Trust FHE Transfer) Modalı
 * 
 * Aşama 1: Ağ Transferi (Evaluation Keys & Ciphertext) - Canlı % ve MB gösterimi
 * Aşama 2: Sunucu İçi FHE İşleme - Parlayan pulse/matrix & dönen kilit animasyonu
 * Aşama 3: Başarı - Yeşil onay ve 1.5 sn sonra otomatik kapanış
 * Aşama 4: Hata - Kırmızı uyarı ve Yeniden Dene butonu
 */
export default function FheTransferModal({
  isOpen,
  step, // 'preparing' | 'uploading' | 'evaluating' | 'success' | 'error'
  uploadProgress, // { percentage: number, loadedMB: string, totalMB: string }
  errorMessage,
  onRetry,
  onClose,
}) {
  if (!isOpen) return null;

  const isUploading = step === 'preparing' || step === 'uploading';
  const isEvaluating = step === 'evaluating';
  const isSuccess = step === 'success';
  const isError = step === 'error';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        {/* Modal Top Header */}
        <div className="modal-header">
          <div className="modal-header-brand">
            <span className="modal-shield-badge">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </span>
            <div>
              <div className="modal-title">Sıfır Güven Veri İletimi (Zero-Trust Transfer)</div>
              <div className="modal-subtitle">İstemci Kasası (Port 8000) ➔ Uzak Banka Sunucusu (Port 8001)</div>
            </div>
          </div>

          <div className="modal-header-actions">
            <span className="modal-security-pill">
              <span className="modal-pulse-dot"></span>
              TLS + 128-Bit Post-Kuantum FHE
            </span>
            {isError && (
              <button 
                onClick={onClose} 
                className="modal-close-btn" 
                title="Pencereyi Kapat"
                aria-label="Kapat"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 2-Step Process Visual Stepper */}
        <div className="modal-stepper">
          <div className={`modal-step-item ${isUploading ? 'active' : (isEvaluating || isSuccess) ? 'completed' : ''}`}>
            <div className="step-circle">
              {(isEvaluating || isSuccess) ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : "1"}
            </div>
            <div className="step-label">
              <span className="step-title">1. Ağ Transferi</span>
              <span className="step-status">
                {isUploading ? `${uploadProgress.percentage}% Aktarılıyor` : (isEvaluating || isSuccess) ? "Tamamlandı" : "Bekleniyor"}
              </span>
            </div>
          </div>

          <div className={`step-connector ${(isEvaluating || isSuccess) ? 'filled' : ''}`}></div>

          <div className={`modal-step-item ${isEvaluating ? 'active' : isSuccess ? 'completed' : ''}`}>
            <div className="step-circle purple">
              {isSuccess ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : "2"}
            </div>
            <div className="step-label">
              <span className="step-title">2. Kör FHE Değerlendirmesi</span>
              <span className="step-status">
                {isEvaluating ? "Kör İşlem Sürüyor" : isSuccess ? "Sonuç Alındı" : "Bekleniyor"}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Dynamic Body Content */}
        <div className="modal-body">
          {/* AŞAMA 1: Ağ Transferi (Canlı Yüzde ve Progress Bar) */}
          {isUploading && (
            <div className="modal-stage-card upload-stage">
              <div className="upload-stage-icon-wrap">
                <svg className="upload-cloud-animated" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                  <path d="M12 12v9"/>
                  <path d="m16 16-4-4-4 4"/>
                </svg>
                <div className="upload-wave-pulse"></div>
              </div>

              <h4 className="stage-main-title">
                Şifreli Yük (Evaluation Key & Ciphertext) Uzak Sunucuya İletiliyor...
              </h4>
              <p className="stage-main-desc">
                TFHE Evaluation Keys (~410 MB) ve mizan şifreli yükü banka sunucusuna akıtılıyor.
              </p>

              {/* Live Progress Bar Container */}
              <div className="progress-container">
                <div className="progress-header">
                  <span className="progress-tag">AĞ YÜKLEME DURUMU</span>
                  <span className="progress-percent-badge">{uploadProgress.percentage}%</span>
                </div>

                <div className="progress-track" role="progressbar" aria-valuenow={uploadProgress.percentage} aria-valuemin="0" aria-valuemax="100">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress.percentage}%` }}
                  >
                    <div className="progress-shimmer"></div>
                  </div>
                </div>

                <div className="progress-meta-info">
                  <span className="meta-speed-text">
                    <span className="pulse-mini-dot"></span>
                    Canlı Soket İletimi
                  </span>
                  <span className="meta-mb-info">
                    <strong>{uploadProgress.loadedMB}</strong> / {uploadProgress.totalMB} ({uploadProgress.percentage}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AŞAMA 2: Sunucu İçi FHE İşleme (Şifreli Hesaplama Animasyonu) */}
          {isEvaluating && (
            <div className="modal-stage-card eval-stage">
              <div className="matrix-pulse-container">
                {/* Concentric Pulse Wave Rings */}
                <div className="pulse-ring ring-1"></div>
                <div className="pulse-ring ring-2"></div>
                <div className="pulse-ring ring-3"></div>

                {/* Rotating Cyber Lock & Shield */}
                <div className="rotating-cyber-lock">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>

                <div className="center-cipher-core">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
              </div>

              <h4 className="stage-main-title purple-glow">
                Kör FHE Değerlendirmesi Sunucuda Gerçekleştiriliyor (Veri Açılmadan İşleniyor)...
              </h4>
              <p className="stage-main-desc">
                Uzak banka sunucusu, şifreli girdi verilerini ve model karar ağırlıklarını 
                <strong> asla görmeden / deşifre etmeden</strong> homomorfik polinom kapıları üzerinde kör olarak çalıştırıyor.
              </p>

              {/* Cyber Matrix Particle Feed */}
              <div className="cipher-matrix-stream">
                <span className="matrix-chip">LWE_CIPHERTEXT</span>
                <span className="matrix-chip">EVAL_BOOTSTRAP</span>
                <span className="matrix-chip">POLY_MULT</span>
                <span className="matrix-chip">ZERO_KNOWLEDGE</span>
                <span className="matrix-chip">PBS_ACC</span>
              </div>
            </div>
          )}

          {/* AŞAMA 3: Tamamlanma (Success State) */}
          {isSuccess && (
            <div className="modal-stage-card success-stage">
              <div className="success-icon-wrap">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>

              <h4 className="stage-main-title success-text">
                Kör Değerlendirme Başarıyla Tamamlandı
              </h4>
              <p className="stage-main-desc">
                Uzak sunucu mizan verisini hiç görmeden FHE karar ağacı çıktısını üretti ve şifreli sonuç kasaya iletildi.
              </p>

              <div className="auto-redirect-badge">
                <div className="redirect-spinner"></div>
                <span>1.5 saniye içinde sonuç paneline yönlendiriliyorsunuz...</span>
              </div>
            </div>
          )}

          {/* AŞAMA 4: Hata Durumu (Error State) */}
          {isError && (
            <div className="modal-stage-card error-stage">
              <div className="error-icon-wrap">
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>

              <h4 className="stage-main-title error-text">
                Veri İletimi veya Değerlendirme Hatası
              </h4>
              <p className="stage-error-desc">
                {errorMessage || "Uzak banka sunucusuna (Port 8001) bağlanılamadı veya işlem zaman aşımına uğradı."}
              </p>

              <div className="modal-error-actions">
                <button onClick={onRetry} className="btn btn-primary">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                    <path d="M16 21h5v-5"/>
                  </svg>
                  Yeniden Dene
                </button>
                <button onClick={onClose} className="btn btn-ghost">
                  Pencereyi Kapat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

