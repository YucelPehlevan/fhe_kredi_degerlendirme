RequestExecutionLevel admin

!macro customInstall
  ; 1. Setup yanindaki fhe-vault.tar dosyasini dogrula
  IfFileExists "$EXEDIR\fhe-vault.tar" tarFound tarMissing

  tarMissing:
    MessageBox MB_ICONSTOP "Kurulum Dosyasi Eksik!$\n$\n'fhe-vault.tar' dosyasi kurulum sihirbazi ile ayni klasorde bulunamadi.$\nLutfen dosyalari zipten cikarip ayni klasorde calistirin."
    Abort

  tarFound:
    ; 2. Docker CLI kontrolu
    nsExec::Exec 'where docker'
    Pop $0
    IntCmp $0 0 checkEngineRunning 0 0

    IfFileExists "C:\Program Files\Docker\Docker\Docker Desktop.exe" checkEngineRunning checkRegistry

  checkRegistry:
    SetRegView 64
    ReadRegStr $0 HKLM "Software\Docker Inc.\Docker Desktop" "AppPath"
    StrCmp $0 "" checkRegistry32 checkEngineRunning

  checkRegistry32:
    SetRegView 32
    ReadRegStr $0 HKLM "Software\Docker Inc.\Docker Desktop" "AppPath"
    StrCmp $0 "" installDocker checkEngineRunning

  installDocker:
    DetailPrint "Sistemde Docker bulunamadi. Arka planda indiriliyor..."
    nsExec::ExecToLog 'powershell -Command "$$ProgressPreference = ''SilentlyContinue''; Invoke-WebRequest -Uri https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe -OutFile $TEMP\DockerInstaller.exe"'

    IfFileExists "$TEMP\DockerInstaller.exe" +3 0
      MessageBox MB_ICONEXCLAMATION "Docker indirilemedi! Lutfen internet baglantinizi kontrol edin."
      Goto copyTarForRuntime

    DetailPrint "Docker Desktop kuruluyor..."
    nsExec::ExecToLog '"$TEMP\DockerInstaller.exe" install --quiet --accept-license --backend=wsl-2'
    MessageBox MB_ICONINFORMATION "Docker kurulumu tamamlandi.$\n$\nSistemin sanallastirma bilesenlerinin devreye girmesi icin bilgisayarinizi bir kez yeniden baslatmaniz onerilir."
    Goto copyTarForRuntime

  checkEngineRunning:
    ; Motor acik mi kontrol et
    nsExec::Exec 'docker info'
    Pop $0
    ; Motor kapaliysa tar'i app klasorune kopyala ki Electron acilista yukleyebilsin
    IntCmp $0 0 checkImageExists copyTarForRuntime copyTarForRuntime

  checkImageExists:
    ; Imaj zaten Docker icinde kayitli mi?
    nsExec::Exec 'docker inspect --type=image fhe-client-image'
    Pop $0
    IntCmp $0 0 finishSetup 0 0

    DetailPrint "Zero-Trust Kriptografik Kasa (Docker Imaj) yukleniyor..."
    ; Yolu tırnak içine alarak boşluklu klasör adlarını garantiye alıyoruz
    nsExec::ExecToLog 'cmd.exe /c docker load -i "$EXEDIR\fhe-vault.tar"'
    Pop $0
    ; Eger yukleme basariliysa (0) bitir, basarisizsa (hata kodu) tar'i app klasorune kopyala
    IntCmp $0 0 finishSetup copyTarForRuntime copyTarForRuntime

  copyTarForRuntime:
    DetailPrint "Kasa imaji daha sonra yuklenmek uzere hazirlaniyor..."
    CopyFiles "$EXEDIR\fhe-vault.tar" "$INSTDIR\fhe-vault.tar"

  finishSetup:
!macroend

!macro customUnInstall
  DetailPrint "Kasa konteyneri ve verileri temizleniyor..."
  nsExec::Exec 'docker rm -f fhe_client_container'
  nsExec::Exec 'docker rmi fhe-client-image:latest'
!macroend