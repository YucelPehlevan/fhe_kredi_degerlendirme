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

SERVER_DIR = "./deployment"
server = fhe.Server.load(f"{SERVER_DIR}/server.zip")


@app.post("/run_fhe")
async def run_fhe_model(
    encrypted_hex: str = Form(...),
    evaluation_keys: UploadFile = File(...)
):
    keys_data = await evaluation_keys.read()
    eval_keys = fhe.EvaluationKeys.deserialize(keys_data)

    if ":" in encrypted_hex:
        encrypted_inputs = tuple(fhe.Value.deserialize(bytes.fromhex(h)) for h in encrypted_hex.split(":"))
        encrypted_result = server.run(*encrypted_inputs, evaluation_keys=eval_keys)
    else:
        encrypted_input = fhe.Value.deserialize(bytes.fromhex(encrypted_hex))
        encrypted_result = server.run(encrypted_input, evaluation_keys=eval_keys)

    return {"encrypted_result_hex": encrypted_result.serialize().hex()}


if __name__ == "__main__":
    uvicorn.run("server_app:app", host="0.0.0.0", port=8001, reload=True)