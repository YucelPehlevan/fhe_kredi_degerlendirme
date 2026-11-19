🛡️ Aegis FHE: Sıfır Güven (Zero-Trust) Kurumsal Finansal Risk Değerlendirme Terminali

Aegis FHE, Tam Homomorfik Şifreleme (TFHE) altyapısıyla çalışan, yerel barındırmalı bir masaüstü kredi değerlendirme terminalidir. Finansal kuruluşların, kurumsal müşterilerinin mizan ve bilanço verilerini, banka sunucularına hiçbir zaman açık metin (plaintext) olarak ifşa etmeden değerlendirmesini sağlar.

Yeni geliştirilen Çift Taraflı Kör (Double-Blind) Sıfır Güven Mimarisi sayesinde her iki taraf da korunur:

Müşteri Veri Gizliliği: Uzak banka sunucusu, verileri tamamen şifreli bir durumda işler (Kör Değerlendirme / Blind Evaluation) ve müşterinin gerçek finansal rakamlarını asla görmez.

Banka Fikri Mülkiyet (IP) Koruması: Bankanın tescilli risk skorlama algoritması (Karar Ağacı eşikleri ve mantığı), sunucudaki kriptografik devrelere doğrudan derlenmiştir. İstemci uygulamasının bankanın karar kuralları hakkında hiçbir bilgisi yoktur.

🏗️ Sistem Mimarisi ve Çift Taraflı Güven Sınırları

Sistem, birbirine asla güvenmeyen iki izole bileşene kesin olarak ayrılmıştır. TFHE'nin yoğun C++ kriptografik bağımlılıkları nedeniyle, yerel şifreleme motoru, müşterinin makinesinde Electron arayüzü ile iletişim kuran hafif ve izole bir Docker konteyneri içinde çalışır.

1. Yerel Kasa (Güvenli İstemci Alanı - Port 8000)

Müşterinin / şubenin yerel makinesinde güvenle çalışır.

Veri İşleme: Yüklenen finansal mizan tablolarını (Excel) ayrıştırır ve 5 kritik TDHP rasyosunu hesaplar (Cari Oran, Nakit Oranı, Kaldıraç, Finansal Borç, Kâr Marjı).

Kuantizasyon (Ölçekleme): TFHE performans sınırlarına uymak için, hesaplanan rasyoları 4-bitlik (0–15) tamsayı uzayına sıkıştırır.

Kriptografi: Geçici (ephemeral) kriptografik anahtarları (Gizli Anahtar ve Değerlendirme Anahtarı) tamamen RAM'de üretir. Kuantize edilmiş verileri LWE şifreli metinlerine (Ciphertext) dönüştürür.

Şifre Çözme: Bankadan dönen şifreli kararı alır ve yerel Gizli Anahtar'ı kullanarak nihai sonucu (0: ONAY, 1: RET) ortaya çıkarır.

2. Uzak Banka Sunucusu (Güvensiz Bulut Alanı - Port 8001)

Bankanın bulutunda veya veri merkezinde barındırılır.

Durumsuz (Stateless) Değerlendirme: İstemciden gelen şifreli yükü (Ciphertext) ve Değerlendirme Anahtarlarını (Evaluation Keys) kabul eder.

Gömülü IP Modeli: Önceden eğitilmiş FHE Karar Ağacı modelini, kriptografik bir devre (server.zip) olarak yerleşik şekilde çalıştırır. Hiçbir harici parametre dosyasına ihtiyaç duymaz; böylece bankanın skorlama algoritmasını (IP) tamamen korur.

Sıfır Bilgi ile Dönüş: Yalnızca şifreli çıktıyı istemciye geri döndürür. Sunucu; girdiyi, izlenen mantık yolunu veya az önce ürettiği nihai kararı kesinlikle bilemez.

🔄 Şifreli Veri ve Süreç Akışı

sequenceDiagram
    participant UI as Electron Arayüzü
    participant Vault as Yerel Kasa (Port 8000)
    participant Cloud as Banka Sunucusu (Port 8001)

    UI->>Vault: Mizanı Yükle (Nakit, Borç, Gelir vb.)
    Note over Vault: Sıkı Veri Doğrulama ve 4-bit Kuantizasyon
    Vault->>Vault: Geçici Anahtar Üretimi (RAM'de)
    Vault->>Vault: 5 TDHP Rasyosunu Şifrele (Ciphertext)
    UI->>Cloud: Şifreli Veriyi + Değerlendirme Anahtarını Gönder
    Note over Cloud: FHE Karar Ağacı Değerlendirmesi (Gömülü IP)
    Cloud-->>UI: Şifreli Risk Kararı (Şifreli Çıktı)
    UI->>Vault: Şifreli Çıktıyı Çöz
    Vault-->>UI: Nihai Karar (0: ONAY, 1: RET)


🛠️ Teknoloji Yığını

Frontend (Masaüstü Terminali)

Framework: React.js + Vite (Yüksek performanslı arayüz derlemesi)

Masaüstü Motoru: Electron.js (İşletim sistemi entegrasyonu, .exe paketleme)

Veri İşleme: Kolon başlığı değişikliklerine veya boş hücre açıklarına karşı bağışık, kesin hücre indeksine dayalı xlsx ayrıştırıcı.

UI/UX: Sıfır Güven temalı karanlık mod, gerçek zamanlı kriptografik görselleştiriciler ve yandan açılan Denetim İzi (Audit Trail) paneli.

Backend (Kriptografi ve Yapay Zeka)

Çekirdek Motor: Python 3.10, FastAPI, Uvicorn

FHE Kütüphanesi: concrete-ml / concrete-python (Zama)

Model Eğitimi: Sentetik TDHP rasyo üretimi (0_preparation.py) ve Concrete Compiler ile FHE devrelerine derleme işlemi.

Altyapı: Docker ve Docker Compose (Önbellek optimizasyonu ile Windows üzerinde sorunsuz çalışma için izole ortamlar).

🔒 Temel Güvenlik Özellikleri

Gerçek Sıfır Güven (tree_params.json Yok): Model mantığı, sunucunun FHE devresine doğrudan derlenmiştir. İstemci, bankanın değerlendirme kriterlerine tamamen kördür.

Sıkı Veri Bütünlüğü: Yüklenen tablolar kesin olarak hücre indeksleri üzerinden okunur. Tanımsız metinler, boş dosyalar veya eksik hücreler anında reddedilir; böylece geçersiz verinin "sıfır" kabul edilmesinden doğabilecek güvenlik açıkları engellenir.

Bellek İçi (In-Memory) Kriptografi: Kriptografik anahtarlar RAM'de geçici olarak üretilir (KEYS_GENERATED_IN_RAM). Diske hiçbir zaman gizli anahtar yazılmaz.

Gelişmiş Denetim İzi: Uygulama üzerinde yapılan her işlem (dosya okuma, şifreleme, anahtar üretimi, sunucu iletişimi), denetim ve regülasyon uyumluluğu için "İşlem Geçmişi" panelinde zaman damgasıyla günlüğe kaydedilir.

🚀 Geliştirici Kurulumu

Projeyi yerel geliştirme ortamınızda kurmak ve çalıştırmak için aşağıdaki adımları izleyin:

1. Arka Plan FHE Servislerini Başlatın

Proje dizininde bir terminal açın ve izole Python/FastAPI sunucularını başlatın. Derleme süreleri .dockerignore optimizasyonları sayesinde hızlandırılmıştır.

# Hem Yerel Kasayı (Client) hem de Uzak Sunucuyu başlatır
docker compose up --build -d


(Bu komut Yerel Kasayı localhost:8000 portuna, Uzak Sunucuyu ise localhost:8001 portuna bağlar.)

2. Masaüstü Arayüzünü Başlatın

Ayrı bir terminalde Node bağımlılıklarını kurun ve Electron uygulamasını başlatın:

npm install
npm run dev


3. Prodüksiyon İçin Derleme

Kurulabilir Windows .exe terminalini oluşturmak için:

npm run build:exe
