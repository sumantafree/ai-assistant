"""
Voice command routes.
"""
import os
import tempfile
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from database import models, schemas
from core.dependencies import get_current_user

router = APIRouter(prefix="/voice", tags=["Voice"])


@router.post("/command", response_model=schemas.VoiceCommandResponse)
def process_voice_command(
    body: schemas.VoiceCommandRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Process a text command through the AI pipeline.
    (Text has already been transcribed on the client side or typed directly.)
    """
    from ai_agents.agent_executor import process_command

    result = process_command(body.text)

    # Log to DB
    log = models.CommandLog(
        user_id=current_user.id,
        command_text=body.text,
        command_type="voice" if body.execute_action else "text",
        ai_response=result.get("ai_response", ""),
        action_taken=str(result.get("classification", {}).get("action", "")),
        success=result.get("success", True),
    )
    db.add(log)
    db.commit()

    return schemas.VoiceCommandResponse(
        command=body.text,
        ai_response=result.get("ai_response", ""),
        action=str(result.get("classification", {}).get("action")),
        action_result=result.get("action_result", ""),
        success=result.get("success", True),
    )


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    """
    Accept an audio file upload and transcribe it using Whisper.
    Frontend records audio and POSTs it here.
    """
    try:
        from voice.speech_to_text import transcribe_audio_file

        # Save uploaded audio to temp file
        suffix = os.path.splitext(file.filename)[1] or ".wav"
        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        content = await file.read()
        tmp.write(content)
        tmp.close()

        # Transcribe
        text = transcribe_audio_file(tmp.name)
        os.unlink(tmp.name)

        return {"text": text, "success": True}
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {e}")


@router.get("/history", response_model=list)
def command_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get recent command history for the current user."""
    logs = (
        db.query(models.CommandLog)
        .filter(models.CommandLog.user_id == current_user.id)
        .order_by(models.CommandLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "command": l.command_text,
            "type": l.command_type,
            "response": l.ai_response,
            "action": l.action_taken,
            "success": l.success,
            "time": l.created_at.isoformat(),
        }
        for l in logs
    ]


@router.get("/status")
def voice_status():
    """Check if voice manager is running."""
    try:
        from voice.voice_manager import get_voice_manager
        vm = get_voice_manager()
        return {"running": vm.is_running, "wake_word": vm.wake_word}
    except Exception as e:
        return {"running": False, "error": str(e)}


@router.post("/start")
def start_voice(current_user: models.User = Depends(get_current_user)):
    """Start the continuous voice listener."""
    from voice.voice_manager import get_voice_manager
    vm = get_voice_manager()
    if not vm.is_running:
        vm.start()
    return {"status": "started"}


@router.post("/stop")
def stop_voice(current_user: models.User = Depends(get_current_user)):
    """Stop the continuous voice listener."""
    from voice.voice_manager import get_voice_manager
    vm = get_voice_manager()
    vm.stop()
    return {"status": "stopped"}
