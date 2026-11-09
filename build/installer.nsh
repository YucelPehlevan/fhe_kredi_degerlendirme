!macro customInstall
  ; 1. EN GARANTİ YÖNTEM: Direkt varsayilan klasorde Docker var mi diye bak
  IfFileExists "C:\Program Files\Docker\Docker\Docker Desktop.exe" loadTar checkRegistry
  
  checkRegistry:
    ; 2. Eger C: diskinde yoksa (kullanici baska diske kurduysa) 64-bit Kayit Defterine bak
    SetRegView 64
    ReadRegStr $0 HKLM "Software\Docker Inc.\Docker Desktop" "AppPath"
    StrCmp $0 "" checkRegistry32 loadTar
    
  checkRegistry32:
    ; 3. Belki eski sistemdir diye 32-bit Kayit Defterine de bak
    SetRegView 32
    ReadRegStr $0 HKLM "Software\Docker Inc.\Docker Desktop" "AppPath"
    StrCmp $0 "" installDocker loadTar
  
  installDocker:
    DetailPrint "Sistemde Docker bulunamadi. PowerShell ile arka planda indiriliyor..."
    nsExec::ExecToLog 'powershell -Command "Invoke-WebRequest -Uri https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe -OutFile $TEMP\DockerInstaller.exe"'
    
    IfFileExists "$TEMP\DockerInstaller.exe" +3 0
      MessageBox MB_OK "Docker indirilemedi! Lutfen internet baglantinizi veya guvenlik duvarinizi kontrol edin."
      Goto loadTar
      
    DetailPrint "Docker Desktop sisteme sessizce kuruluyor, lutfen bekleyin..."
    nsExec::ExecToLog '"$TEMP\DockerInstaller.exe" install --quiet'
    
  loadTar:
    DetailPrint "Zero-Trust Kriptografik Kasa (Docker Imaj) sisteme yukleniyor..."
    nsExec::ExecToLog 'cmd.exe /c "docker load -i $EXEDIR\fhe-vault.tar"'
!macroend