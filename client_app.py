from fastapi import FastAPI
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

# Karar ağacının o gizli 3 parametresini yüklüyoruz
with open(f"{CLIENT_DIR}/tree_params.json", "r") as f:
    tree_params = json.load(f)

@app.get("/generate_keys")
def generate_keys():
    client.keygen(force=False)
    return {"message": "Keys successfully created", "has_eval_key": True}

@app.get("/get_evaluation_keys")
def get_evaluation_keys():
    # Get the binary data of the keys directly
    eval_keys_bytes = client.evaluation_keys.serialize()
    
    # Return as a raw binary file stream to avoid memory bloat
    return Response(content=eval_keys_bytes, media_type="application/octet-stream")

@app.post("/encrypt")
async def encrypt_data(data: dict):
    features = [data["Cash_Q"], data["Debt_Q"], data["Income_Q"]]
    
    encrypted_tuple = client.encrypt(
        features,
        tree_params["enc_t"],
        tree_params["enc_f"],
        tree_params["enc_l"]
    )
    
    hex_list = [val.serialize().hex() for val in encrypted_tuple]
    combined_hex = ":".join(hex_list)
    
    return {"encrypted_payload": combined_hex}


class DecryptPayload(BaseModel):
    encrypted_result_hex: str

@app.post("/decrypt")
def decrypt_result(payload: DecryptPayload):
    print("1. Encrypted result received from React UI for decryption...")
    
    # Convert the hex string back to an FHE value
    serialized_bytes = bytes.fromhex(payload.encrypted_result_hex)
    encrypted_value = fhe.Value.deserialize(serialized_bytes)
    
    print("2. Decrypting the result using the local secret key...")
    
    # Decrypt the value (Only this local machine can do this!)
    decrypted_result = client.decrypt(encrypted_value)
    
    print(f"3. Decryption successful! Plain result: {decrypted_result}")
    
    # Return the plain integer result back to React
    return {"decrypted_result": int(decrypted_result)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)