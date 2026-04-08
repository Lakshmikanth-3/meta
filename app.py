from fastapi import FastAPI
from pydantic import BaseModel
import os
from openai import OpenAI

app = FastAPI()

client = OpenAI(
    base_url=os.getenv("API_BASE_URL", "https://router.huggingface.co/v1"),
    api_key=os.getenv("HF_TOKEN"),
)

class InferenceRequest(BaseModel):
    prompt: str

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/reset")
def reset():
    return {"status": "ok"}

@app.post("/infer")
def infer(request: InferenceRequest):
    response = client.chat.completions.create(
        model=os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct"),
        messages=[{"role": "user", "content": request.prompt}],
    )
    return {"response": response.choices[0].message.content}