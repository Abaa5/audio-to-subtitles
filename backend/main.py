import os
import shutil
import uuid
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from transcriber import VideoTranscriber

app = FastAPI(
    title="Video Transcription & Translation API (WhisperX)",
    description="Production-ready FastAPI backend for high-precision audio transcription, translation, and subtitle generation (SRT, VTT, TXT) using WhisperX.",
    version="1.0.0"
)

# Enable CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary directories for processing
UPLOAD_DIR = "/tmp/transcription_uploads"
OUTPUT_DIR = "/tmp/transcription_outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Store status of background tasks
tasks_db = {}


class TaskStatus(BaseModel):
    task_id: str
    status: str  # "pending", "processing", "completed", "failed"
    progress: float
    message: str
    language: Optional[str] = None
    results: Optional[dict] = None


def run_transcription_background(
    task_id: str,
    file_path: str,
    target_lang: Optional[str],
    extra_context: Optional[str],
    device: str
):
    try:
        tasks_db[task_id] = {
            "status": "processing",
            "progress": 10.0,
            "message": "Extracting audio track from video using FFmpeg...",
            "results": None
        }
        
        transcriber = VideoTranscriber(
            file_path=file_path,
            output_dir=OUTPUT_DIR,
            task_id=task_id,
            device=device
        )
        
        # Callback to update task progress
        def progress_callback(percentage: float, msg: str):
            tasks_db[task_id]["progress"] = percentage
            tasks_db[task_id]["message"] = msg

        # Transcribe & Translate
        result_files, detected_lang = transcriber.process(
            target_lang=target_lang,
            extra_context=extra_context,
            progress_fn=progress_callback
        )
        
        tasks_db[task_id].update({
            "status": "completed",
            "progress": 100.0,
            "message": "Transcription and formatting completed successfully!",
            "language": detected_lang,
            "results": {
                "txt_url": f"/api/download/{task_id}/txt",
                "srt_url": f"/api/download/{task_id}/srt",
                "vtt_url": f"/api/download/{task_id}/vtt",
                "segments": result_files["segments"]
            }
        })
    except Exception as e:
        tasks_db[task_id].update({
            "status": "failed",
            "progress": 100.0,
            "message": f"Error during processing: {str(e)}",
            "results": None
        })
    finally:
        # Clean up original upload
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass


@app.post("/api/transcribe")
async def start_transcription(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    target_language: Optional[str] = Form(None),
    extra_context: Optional[str] = Form(None),
    device: str = Form("cpu")  # "cuda" or "cpu"
):
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp4", ".mkv", ".mov", ".avi", ".mp3", ".wav", ".m4a"]:
        raise HTTPException(status_code=400, detail="Unsupported media format.")

    # Create distinct Task ID
    task_id = str(uuid.uuid4())
    temp_file_path = os.path.join(UPLOAD_DIR, f"{task_id}{ext}")
    
    # Save upload file
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    tasks_db[task_id] = {
        "status": "pending",
        "progress": 0.0,
        "message": "File received. Queueing transcription task...",
        "results": None
    }

    # Queue background processing
    background_tasks.add_task(
        run_transcription_background,
        task_id=task_id,
        file_path=temp_file_path,
        target_lang=target_language,
        extra_context=extra_context,
        device=device
    )

    return {"task_id": task_id, "status": "pending"}


@app.get("/api/status/{task_id}", response_model=TaskStatus)
async def get_status(task_id: str):
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Transcription task not found.")
    
    task_info = tasks_db[task_id]
    return TaskStatus(
        task_id=task_id,
        status=task_info["status"],
        progress=task_info["progress"],
        message=task_info["message"],
        language=task_info.get("language"),
        results=task_info["results"]
    )


@app.get("/api/download/{task_id}/{format_type}")
async def download_file(task_id: str, format_type: str):
    if format_type not in ["txt", "srt", "vtt"]:
        raise HTTPException(status_code=400, detail="Invalid format requested.")

    file_path = os.path.join(OUTPUT_DIR, f"{task_id}.{format_type}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Requested subtitle file was not found or is still generating.")

    filename = f"subtitle_{task_id}.{format_type}"
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


@app.get("/api/health")
async def health_check():
    import torch
    cuda_available = torch.cuda.is_available()
    return {
        "status": "healthy",
        "cuda_available": cuda_available,
        "device_count": torch.cuda.device_count() if cuda_available else 0,
        "current_device": torch.cuda.get_device_name(0) if cuda_available else "CPU"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
