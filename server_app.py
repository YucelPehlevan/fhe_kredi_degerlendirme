from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from concrete import fhe
import uvicorn

app = FastAPI(title="Remote Bank Server (Untrusted Zone)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The server only knows the server.zip file, it has no access to secret keys or parameters
SERVER_DIR = "./deployment"
server = fhe.Server.load(f"{SERVER_DIR}/server.zip")

@app.post("/run_fhe")
async def run_fhe_model(
    encrypted_hex: str = Form(...),
    evaluation_keys: UploadFile = File(...)
):
    print("1. Encrypted payload and Evaluation Keys file received via Form-Data...")
    
    # Read the uploaded binary file directly into memory without hex conversion
    keys_data = await evaluation_keys.read()
    eval_keys = fhe.EvaluationKeys.deserialize(keys_data)
    
    # Process the encrypted text inputs
    hex_list = encrypted_hex.split(":")
    encrypted_inputs = tuple(fhe.Value.deserialize(bytes.fromhex(h)) for h in hex_list)
    
    print("2. Running the FHE model using evaluation keys...")
    encrypted_result = server.run(*encrypted_inputs, evaluation_keys=eval_keys)
    
    print("3. Encrypted result computed successfully!")
    return {"encrypted_result_hex": encrypted_result.serialize().hex()}

if __name__ == "__main__":
    # Running our untrusted server on port 8001 (Our local vault is on 8000)
    uvicorn.run("server_app:app", host="0.0.0.0", port=8001, reload=True)