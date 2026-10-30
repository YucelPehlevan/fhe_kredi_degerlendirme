🛡️ Aegis FHE: Zero-Trust Enterprise Financial Risk Evaluation Terminal
Aegis FHE is a desktop credit evaluation terminal based on Fully Homomorphic Encryption (TFHE) that analyzes enterprise customers' trial balance and balance sheet data without sending them in plaintext to bank servers.

Unlike traditional systems, the remote server in this architecture never needs to decrypt the data to process it. The server performs "Blind Evaluation" on the encrypted input to generate a credit risk score and returns it in an encrypted format. The data and the final decision are only decrypted locally on the client's (customer's) own device.

🏗️ System Architecture and Trust Boundaries
The system consists of two main components that never trust each other (Zero-Trust). Due to TFHE constraints (dependencies in the Windows environment), the local encryption engine runs as an isolated "Vault" via Docker on the client machine.

1. Local Vault (Client - Port 8000)
Secure Zone: An isolated Docker container running on the customer's own device.

Generation of cryptographic keys (Secret Key and Evaluation Key).

Reading raw Excel trial balance data and quantizing it to 4-bit (0-15) to meet TFHE limits.

Encrypting data with the Secret Key (LWE Ciphertext).

Decrypting the encrypted credit decision returned from the remote server.

2. Remote Bank Server (Remote Cloud - Port 8001)
Insecure Zone: The model server hosted in the bank's cloud or remote data center.

Accepts the encrypted payload (Ciphertext) and Evaluation Keys from the client.

Executes the pre-trained FHE Decision Tree model on the encrypted data.

Can never read/see the customer's financial statements or the decision it generates.

Returns only the encrypted result back to the client.

🔄 Encrypted Data and Process Flow
The end-to-end data flow of the system is illustrated in the sequence diagram below:

sequenceDiagram
    participant UI as Electron Interface
    participant Vault as Local Vault (Port 8000)
    participant Cloud as Bank Server (Port 8001)

    UI->>Vault: Upload Trial Balance (Cash, Debt, Income)
    Note over Vault: Strict Data Validation & 4-bit Quantization
    Vault->>Vault: Cryptographic Key Generation
    Vault->>Vault: Encrypt Raw Data (Ciphertext)
    UI->>Cloud: Send Encrypted Payload + Evaluation Keys
    Note over Cloud: FHE Blind Decision Tree Evaluation
    Cloud-->>UI: Encrypted Risk Verdict (Encrypted Output)
    UI->>Vault: Decrypt Encrypted Output
    Vault-->>UI: Final Verdict (0: Approved, 1: Rejected)
🛠️ Tech Stack
Frontend (Desktop Terminal)
Framework: React.js + Vite (High-performance UI build).

Desktop Engine: Electron.js (OS integration, .exe packaging).

Data Processing: XLSX (Strict cell-index-based Excel validation algorithm).

UI/UX: Zero-Trust themed dark mode, custom notification modals, and a slide-in (Drawer) Audit Trail panel.

Backend (Cryptography & AI)
Language & API: Python 3.10, FastAPI, Uvicorn.

FHE Library: Zama concrete-python

Infrastructure: Docker & Docker Compose (Isolated environments for seamless execution of Python dependencies on Windows with cache optimization).

🔒 Key Features
Strict Data Integrity: Uploaded trial balance spreadsheets are read directly via cell indices, completely independent of column header names. Empty files, missing cells, or undefined (text/character) financial data are strictly rejected with a custom error modal, preventing vulnerability loopholes where invalid data defaults to zero.

Automated Docker Process: Heavy Python/C++ FHE dependencies on the client side are isolated using docker-compose. With the restart: unless-stopped policy and .dockerignore optimizations, the system is resilient against crashes and highly optimized for build times.

Advanced Audit Trail: Every action performed on the application (file reading, encryption, key generation, server communication) is logged with a timestamp in the slide-in "Audit History" panel.

🚀 Developer Setup
To set up and run the project in your local environment, follow these steps:

1. Start the Background FHE Services:
Open a terminal in the project directory and start the Python/FastAPI servers. Build times are accelerated thanks to cache optimizations:

Bash
docker-compose up --build -d
(This command will start two separate containers on ports 8000 and 8001.)

2. Start the Desktop Interface:

Bash
npm install
npm run dev
3. Build for Production:
To generate the installable Windows .exe file:

Bash
npm run build:exe