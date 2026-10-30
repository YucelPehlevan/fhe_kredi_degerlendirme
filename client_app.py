from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from concrete import fhe
from pydantic import BaseModel
import uvicorn
import json

app = FastAPI(title="Yerel İstemci (Güvenli Kasa)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CLIENT_DIR = "./deployment"
client = fhe.Client.load(f"{CLIENT_DIR}/client.zip")

with open(f"{CLIENT_DIR}/tree_params.json", "r") as f:
    tree_params = json.load(f)

# YENİ: SADECE RAM'DE ANAHTAR ÜRETİLDİĞİNDE AÇILACAK KİLİT
KEYS_GENERATED_IN_RAM = False

@app.get("/generate_keys")
def generate_keys():
    global KEYS_GENERATED_IN_RAM
    client.keygen(force=True)
    KEYS_GENERATED_IN_RAM = True # Kilit açıldı
    return {"message": "Yeni geçici (ephemeral) anahtarlar RAM'de oluşturuldu", "has_eval_key": True}

@app.get("/get_evaluation_keys")
def get_evaluation_keys():
    # Kazara silinen kısım: React'in sunucuya göndereceği public anahtarı sağlayan endpoint
    eval_keys_bytes = client.evaluation_keys.serialize()
    return Response(content=eval_keys_bytes, media_type="application/octet-stream")

@app.post("/encrypt")
async def encrypt_data(data: dict):
    # KİLİT KONTROLÜ
    if not KEYS_GENERATED_IN_RAM:
        raise HTTPException(status_code=400, detail="Anahtarlar henüz RAM'de üretilmedi! Lütfen 'Anahtar Üret' butonunu kullanın.")

    features = [data["Cash_Q"], data["Debt_Q"], data["Income_Q"]]
    
    encrypted_tuple = client.encrypt(
        features,
        tree_params["enc_t"],
        tree_params["enc_f"],
        tree_params["enc_l"]
    )
    
    # Kazara silinen kısım: Şifreli veriyi Hex formatına çevirip döndürme
    hex_list = [val.serialize().hex() for val in encrypted_tuple]
    combined_hex = ":".join(hex_list)
    return {"encrypted_payload": combined_hex}

class DecryptPayload(BaseModel):
    encrypted_result_hex: str

@app.post("/decrypt")
def decrypt_result(payload: DecryptPayload):
    print("1. Encrypted result received from React UI for decryption...")
    serialized_bytes = bytes.fromhex(payload.encrypted_result_hex)
    encrypted_value = fhe.Value.deserialize(serialized_bytes)
    
    print("2. Decrypting the result using the local secret key...")
    decrypted_result = client.decrypt(encrypted_value)
    
    print(f"3. Decryption successful! Plain result: {decrypted_result}")
    return {"decrypted_result": int(decrypted_result)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)                                             
    