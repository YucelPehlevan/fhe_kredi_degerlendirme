from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from concrete import fhe
from pydantic import BaseModel
import numpy as np
import uvicorn

app = FastAPI(title="Yerel İstemci (Güvenli Kasa)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CLIENT_DIR = "./deployment"
client = fhe.Client.load(f"{CLIENT_DIR}/client.zip")

FEATURE_COLS = [
    "Cari_Oran_Q",
    "Nakit_Orani_Q",
    "Kaldirac_Orani_Q",
    "Finansal_Borc_Q",
    "Kar_Marji_Q",
]

KEYS_GENERATED_IN_RAM = False


@app.get("/generate_keys")
def generate_keys():
    global KEYS_GENERATED_IN_RAM
    client.keygen(force=True)
    KEYS_GENERATED_IN_RAM = True
    return {"message": "Yeni geçici (ephemeral) anahtarlar RAM'de oluşturuldu", "has_eval_key": True}


@app.get("/get_evaluation_keys")
def get_evaluation_keys():
    if not KEYS_GENERATED_IN_RAM:
        raise HTTPException(status_code=400, detail="Önce /generate_keys çağrılmalıdır.")
    eval_keys_bytes = client.evaluation_keys.serialize()
    return Response(content=eval_keys_bytes, media_type="application/octet-stream")


@app.post("/encrypt")
async def encrypt_data(data: dict):
    if not KEYS_GENERATED_IN_RAM:
        raise HTTPException(
            status_code=400,
            detail="Anahtarlar henüz RAM'de üretilmedi! Lütfen 'Anahtar Üret' butonunu kullanın."
        )

    try:
        features = [int(data[col]) for col in FEATURE_COLS]
    except KeyError as e:
        raise HTTPException(status_code=422, detail=f"Eksik rasyo parametresi: {e}")

    if any(v < 0 or v > 15 for v in features):
        raise HTTPException(status_code=422, detail="Tüm kuantize değerler 0-15 aralığında olmalıdır.")

    features_arr = np.array(features, dtype=np.int64)
    encrypted_val = client.encrypt(features_arr)

    return {"encrypted_payload": encrypted_val.serialize().hex()}


class DecryptPayload(BaseModel):
    encrypted_result_hex: str


@app.post("/decrypt")
def decrypt_result(payload: DecryptPayload):
    serialized_bytes = bytes.fromhex(payload.encrypted_result_hex)
    encrypted_value = fhe.Value.deserialize(serialized_bytes)
    decrypted_result = client.decrypt(encrypted_value)
    return {"decrypted_result": int(decrypted_result)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)