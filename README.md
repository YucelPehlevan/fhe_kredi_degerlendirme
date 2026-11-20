🛡️ Aegis FHE: Sıfır Güven Tabanlı Kurumsal Finansal Risk Değerlendirme Terminali

⚠️ DEMO / KAVRAM KANITLAMA (PoC) SÜRÜMÜ: Bu proje, Tam Homomorfik Şifreleme (TFHE) mimarisinin kurumsal kredi skorlama süreçlerinde uçtan uca uygulanabilirliğini göstermek amacıyla geliştirilmiş bir demo uygulamasıdır. Yerel geliştirme ve sunum ortamında hem Müşteri Kasası (Port 8000) hem de Banka Sunucusu (Port 8001) simüle edilerek aynı makinede izole konteynerler halinde çalıştırılmaktadır.

Aegis FHE, Tam Homomorfik Şifreleme (TFHE) altyapısıyla çalışan, yerel barındırmalı bir masaüstü kredi değerlendirme terminalidir. Finansal kuruluşların, kurumsal müşterilerinin mizan ve bilanço verilerini banka sunucularına hiçbir zaman açık metin olarak ifşa etmeden analiz etmesini sağlar.

Çift Taraflı Kör Sıfır Güven Mimarisi sayesinde süreçteki her iki tarafın gizliliği aynı anda korunur:

Müşteri Veri Gizliliği: Uzak banka sunucusu, gelen verileri tamamen şifreli halde işler (Kör Değerlendirme) ve müşterinin gerçek finansal rakamlarını hiçbir aşamada göremez.

Banka Fikri Mülkiyet (IP) Koruması: Bankanın tescilli risk skorlama algoritması (Karar Ağacı eşikleri ve karar mantığı), sunucudaki kriptografik devrelere doğrudan derlenmiştir. İstemci uygulamasının bankanın değerlendirme kuralları hakkında hiçbir bilgisi yoktur.

🏗️ Sistem Mimarisi ve Çift Taraflı Güven Sınırları

Sistem, birbirine asla güvenmeyen iki izole bileşene ayrılmıştır. TFHE'nin yoğun C++ kriptografik bağımlılıkları nedeniyle yerel şifreleme motoru, müşterinin bilgisayarında masaüstü arayüzü ile haberleşen hafif ve izole bir Docker konteyneri içinde çalışır.

1. Yerel Kasa (Güvenli İstemci Alanı — Port 8000)

Müşterinin veya şubenin yerel bilgisayarında güvenle çalışır.

Veri İşleme: Yüklenen finansal mizan tablolarını (Excel) ayrıştırır ve 5 kritik TDHP finansal rasyosunu hesaplar (Cari Oran, Nakit Oranı, Kaldıraç Oranı, Finansal Borç Oranı, Net Kâr Marjı).

Kuantizasyon (Ölçekleme): TFHE performans sınırlarına uymak için hesaplanan rasyoları 4-bitlik (0–15) tamsayı uzayına sıkıştırır.

Kriptografi: Geçici kriptografik anahtarları (Gizli Anahtar ve Değerlendirme Anahtarları) tamamen RAM üzerinde üretir. Ölçeklenmiş verileri şifreli veri paketlerine dönüştürür.

Şifre Çözme: Bankadan dönen şifreli kararı alır ve yalnızca yerel bellekte tutulan Gizli Anahtar'ı kullanarak nihai sonucu (0: ONAY, 1: RET) ortaya çıkarır.

2. Uzak Banka Sunucusu (Güvensiz Bulut Alanı — Port 8001)

Bankanın bulut altyapısında veya veri merkezinde barındırılır.

Durumsuz Değerlendirme: İstemciden gelen şifreli veri paketini ve Değerlendirme Anahtarlarını kabul eder; hiçbir müşteri verisini diske kaydetmez.

Gömülü Karar Devresi: Önceden eğitilmiş FHE Karar Ağacı modelini, kriptografik bir devre (server.zip) olarak yerleşik şekilde çalıştırır. Harici bir parametre dosyasına ihtiyaç duymaz; böylece bankanın skorlama algoritmasını tamamen gizli tutar.

Sıfır Bilgi ile Dönüş: Yalnızca şifreli karar çıktısını istemciye geri döndürür. Sunucu; müşterinin rasyolarını, ağaçta izlenen karar yolunu veya ürettiği nihai sonucu kesinlikle bilemez.

🔄 Şifreli Veri ve Süreç Akışı

sequenceDiagram
    participant UI as Masaüstü Arayüzü (Electron)
    participant Vault as Yerel Kasa (Port 8000)
    participant Cloud as Banka Sunucusu (Port 8001)

    UI->>Vault: Mizan Dosyasını Yükle (Excel)
    Note over Vault: Hücre Doğrulama ve 4-Bit Ölçekleme (0-15)
    Vault->>Vault: Geçici Anahtar Üretimi (RAM)
    Vault->>Vault: 5 TDHP Rasyosunu Şifrele
    UI->>Cloud: Şifreli Rasyolar + Değerlendirme Anahtarları
    Note over Cloud: Şifreli Veri Üzerinde Karar Ağacı İşletimi (Gömülü IP)
    Cloud-->>UI: Şifreli Risk Kararı
    UI->>Vault: Şifreli Kararı Çöz
    Vault-->>UI: Nihai Sonuç (0: ONAY, 1: RET)


🛠️ Teknoloji Yığını

Masaüstü Arayüzü

Arayüz Çatısı: React.js + Vite (Yüksek performanslı kullanıcı arayüzü)

Masaüstü Motoru: Electron.js (İşletim sistemi entegrasyonu ve .exe kurulum paketleme)

Veri İşleme: Kolon başlığı değişikliklerine veya boş hücre açıklarına karşı korumalı, kesin hücre indeksine dayalı xlsx ayrıştırıcı

Kullanıcı Deneyimi: Sıfır Güven temalı karanlık arayüz, gerçek zamanlı şifreleme göstergeleri ve yandan açılan Denetim İzi paneli

Kriptografi ve Yapay Zeka Altyapısı

Sunucu Motoru: Python 3.10, FastAPI, Uvicorn

FHE Kütüphanesi: Zama concrete-python / concrete-fhe-toolkit

Model Derleme: Sentetik TDHP rasyo veri seti üzerinde eğitilen karar ağacının Concrete derleyicisi ile doğrudan kriptografik FHE devrelerine dönüştürülmesi

Konteyner Altyapısı: Docker ve Docker Compose (Önbellek optimizasyonu ile Windows üzerinde sorunsuz çalışma için izole servisler)

🔒 Temel Güvenlik Özellikleri

Gerçek Çift Taraflı Sıfır Güven: Karar ağacı kuralları istemcide hiçbir açık metin dosyasında tutulmaz; doğrudan sunucunun FHE devresine gömülüdür. İstemci bankanın değerlendirme eşiklerine tamamen kördür.

Sıkı Veri Bütünlüğü: Yüklenen mizan tabloları kesin olarak hücre indeksleri üzerinden okunur. Tanımsız metinler, boş dosyalar veya eksik hücreler anında reddedilir; geçersiz verinin "sıfır" kabul edilmesinden doğabilecek güvenlik açıkları engellenir.

Bellek İçi Kriptografi: Kriptografik anahtarlar yalnızca RAM üzerinde geçici olarak üretilir. Diske hiçbir zaman gizli anahtar yazılmaz ve oturum kapandığında anahtarlar bellekten silinir.

Gelişmiş Denetim İzi: Uygulama üzerinde gerçekleştirilen her adım (dosya okuma, anahtar üretimi, şifreleme, sunucu iletişimi ve karar çözme), denetim uyumluluğu için İşlem Geçmişi panelinde zaman damgasıyla kayıt altına alınır.

🚀 Geliştirici Kurulumu ve Demo Çalıştırma

Projeyi yerel ortamınızda kurup demo modunda uçtan uca test etmek için aşağıdaki adımları izleyin:

1. Arka Plan FHE Servislerini Başlatın

Proje ana dizininde bir terminal açın ve hem Yerel Kasa'yı hem de Banka Sunucusu'nu izole Docker konteynerleri olarak başlatın:

docker compose up --build -d


(Bu komut Yerel Kasa servisini localhost:8000 portuna, Uzak Banka Sunucusu servisini ise localhost:8001 portuna bağlar.)

2. Masaüstü Arayüzünü Başlatın

Ayrı bir terminalde gerekli paketleri yükleyin ve Electron masaüstü uygulamasını başlatın:

npm install
npm run dev


3. Kurulum Dosyası (.exe) Oluşturma

Windows için kurulabilir .exe paketini derlemek için:

npm run build:exe