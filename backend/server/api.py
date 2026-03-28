import asyncio
import json
import os
import platform

from my_types import Workout
from trainer import Trainer
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from database.models import ButtonRestDuration, Base
from database.database import SessionLocal, engine
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from server.connection_manager import manager

is_pi = platform.system() == "Linux" and (platform.machine().startswith("aarch64") or platform.machine().startswith("arm"))
if is_pi:
    from button.button import Button

Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://192.168.248.65:5173",
    "http://gymio.lan:5173",
    "http://gymio.me",
    "https://gymio.me",
    "*",  # Allow all for development
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = BackgroundScheduler()
trainer = Trainer(scheduler, broadcast=manager.broadcast_sync)

_button = None
if is_pi:
    try:
        _button = Button(lights=trainer.lights, broadcast=manager.broadcast_sync)
    except Exception as e:
        print(f"GPIO button init failed (pin 21): {e}")

# Sonos controller (lazy init)
sonos_controller = None

# Heart rate service
from ble_system.hr_service import HeartRateService
hr_service = HeartRateService(broadcast_fn=manager.broadcast, max_hr=190)


def get_sonos():
    global sonos_controller
    if sonos_controller is None:
        try:
            from sonos import SonosController
            sonos_controller = SonosController()
            sonos_controller.discover()
        except Exception as e:
            print(f"Sonos init failed: {e}")
    return sonos_controller


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- WebSocket ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Store the event loop reference for sync broadcasts
    manager._loop = asyncio.get_event_loop()

    # Send current state to newly connected client
    # Timer + lights (use get_remaining() for accurate mid-phase time)
    await websocket.send_json({
        "type": "timer",
        "remaining": trainer.get_remaining(),
        "duration": trainer._phase_duration,
        "phase": trainer._current_phase,
        "round": trainer._current_round,
        "total_rounds": trainer._total_rounds,
    })
    await websocket.send_json({
        "type": "lights",
        "color": trainer._current_color,
        "mode": "solid",
    })
    # Now playing
    sonos = get_sonos()
    if sonos and sonos.available:
        track = sonos.get_now_playing()
        if track.get("title"):
            await websocket.send_json({"type": "now_playing", **track})
    # Button mode (freeform training)
    if _button is not None and _button.session_active:
        await websocket.send_json(_button.get_status())
    # HR
    if hr_service.connected:
        status = hr_service.get_status()
        await websocket.send_json({"type": "hr_status", "connected": True, "address": status.get("address")})
        if status.get("last_bpm", 0) > 0:
            await websocket.send_json({"type": "hr", "bpm": status["last_bpm"], "zone": 0, "zone_name": "", "zone_color": "#6b7280", "zone_pct": 0})

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "set_tab":
                    await manager.broadcast({"type": "set_tab", "tab": msg["tab"]})
            except (json.JSONDecodeError, KeyError):
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# --- Sonos background polling ---

async def poll_sonos():
    """Polls Sonos every 2 seconds for now-playing changes."""
    while True:
        sonos = get_sonos()
        if sonos and sonos.available:
            changed, track_info = sonos.has_track_changed()
            if changed and track_info:
                await manager.broadcast({"type": "now_playing", **track_info})
        await asyncio.sleep(2)


@app.on_event("startup")
async def startup_event():
    manager._loop = asyncio.get_event_loop()
    asyncio.create_task(poll_sonos())


@app.on_event("shutdown")
async def shutdown_event():
    if _button is not None:
        _button.close()
    if trainer.lights is not None:
        trainer.lights.close()


# --- Workout control ---

@app.post("/start")
async def start(workout: Workout):
    # Stop button mode if active (HIIT takes priority)
    if _button is not None and _button.session_active:
        _button.stop_session()
    trainer.post_schedule(workout)
    return {"succeeded": True}


# --- 9-Round workout ---

from trainer.nine_round import generate_nine_round

class NineRoundRequest(BaseModel):
    round_duration: int = Field(default=180, ge=60, le=300)
    rest_duration: int = Field(default=30, ge=15, le=60)
    mode: str = "ai"  # "ai" or "quick"
    user: str = "laith"


class RoundReactionRequest(BaseModel):
    round_data: dict
    reaction: str  # "liked" or "disliked"
    user: str = "laith"


def _get_latest_log_id(user: str, db: Session) -> int:
    """Get the ID of the most recent workout log entry for cache invalidation."""
    latest = db.query(WorkoutLog.id).filter(WorkoutLog.user == user).order_by(desc(WorkoutLog.id)).first()
    return latest[0] if latest else 0


@app.post("/nine-round/generate")
async def nine_round_generate(req: NineRoundRequest, db: Session = Depends(get_db)):
    if req.mode == "quick":
        result = generate_nine_round(req.round_duration, req.rest_duration)
        # Store quick randoms too so they survive page refresh
        entry = GeneratedWorkout(
            user=req.user, workout_type="nine_round", goal=None,
            payload=result, ai_generated=False,
            context_log_id=None,
            created_at=datetime.now(timezone.utc),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return {**result, "id": entry.id}

    # AI mode — use Sonnet with structured output
    cutoff = date.today() - timedelta(days=7)
    logs = db.query(WorkoutLog).filter(
        WorkoutLog.user == req.user,
        WorkoutLog.session_date >= cutoff,
    ).order_by(WorkoutLog.timestamp).all()

    history = [
        {"exercise": log.exercise, "weight": log.weight, "reps": log.reps,
         "set_number": log.set_number, "rpe": log.rpe, "session_date": str(log.session_date)}
        for log in logs
    ]

    # Load persisted reactions for AI context
    liked = db.query(RoundReactionModel).filter(
        RoundReactionModel.user == req.user, RoundReactionModel.reaction == "liked"
    ).order_by(desc(RoundReactionModel.created_at)).limit(20).all()
    disliked = db.query(RoundReactionModel).filter(
        RoundReactionModel.user == req.user, RoundReactionModel.reaction == "disliked"
    ).order_by(desc(RoundReactionModel.created_at)).limit(20).all()

    result = gym_coach.generate_nine_round(
        user=req.user,
        training_history=history,
        round_duration=req.round_duration,
        rest_duration=req.rest_duration,
        liked_rounds=[r.round_data for r in liked],
        disliked_rounds=[r.round_data for r in disliked],
    )

    # Cache the generated workout
    entry = GeneratedWorkout(
        user=req.user, workout_type="nine_round", goal=None,
        payload=result, ai_generated=True,
        context_log_id=_get_latest_log_id(req.user, db),
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {**result, "id": entry.id}


@app.get("/nine-round/latest")
async def nine_round_latest(user: str = "laith", db: Session = Depends(get_db)):
    """Load the most recent 9-round workout for this user."""
    cached = db.query(GeneratedWorkout).filter(
        GeneratedWorkout.user == user,
        GeneratedWorkout.workout_type == "nine_round",
    ).order_by(desc(GeneratedWorkout.created_at)).first()
    if cached:
        return {"workout": cached.payload, "id": cached.id, "created_at": str(cached.created_at)}
    return {"workout": None}


@app.get("/nine-round/{workout_id}")
async def nine_round_by_id(workout_id: int, db: Session = Depends(get_db)):
    """Load a specific 9-round workout by ID."""
    entry = db.query(GeneratedWorkout).filter(
        GeneratedWorkout.id == workout_id,
        GeneratedWorkout.workout_type == "nine_round",
    ).first()
    if entry:
        return {"workout": entry.payload, "id": entry.id, "created_at": str(entry.created_at)}
    return {"workout": None}


@app.post("/nine-round/react")
async def nine_round_react(reaction: RoundReactionRequest, db: Session = Depends(get_db)):
    """Save a thumbs up/down reaction on a round — persisted in DB."""
    if reaction.reaction in ("liked", "disliked"):
        entry = RoundReactionModel(
            user=reaction.user,
            round_data=reaction.round_data,
            reaction=reaction.reaction,
            created_at=datetime.now(timezone.utc),
        )
        db.add(entry)
        db.commit()

    # Return current counts
    liked_count = db.query(RoundReactionModel).filter(
        RoundReactionModel.user == reaction.user, RoundReactionModel.reaction == "liked"
    ).count()
    disliked_count = db.query(RoundReactionModel).filter(
        RoundReactionModel.user == reaction.user, RoundReactionModel.reaction == "disliked"
    ).count()
    return {"succeeded": True, "counts": {"liked": liked_count, "disliked": disliked_count}}


@app.post("/nine-round/start")
async def nine_round_start(req: NineRoundRequest):
    """Start a 9-round workout on the trainer/lights."""
    if _button is not None and _button.session_active:
        _button.stop_session()
    manager.broadcast_sync({"type": "nine_round_start"})
    hiit = Workout(rounds=9, train=req.round_duration, rest=req.rest_duration)
    trainer.post_schedule(hiit)
    return {"succeeded": True}


@app.get("/pause")
async def pause():
    trainer.pause()
    return {"succeeded": True}


@app.get("/resume")
async def resume():
    trainer.resume()
    return {"succeeded": True}


@app.get("/stop")
async def stop():
    trainer.stop()
    return {"succeeded": True}


# --- Button rest duration ---

class ButtonRestDurationRequest(BaseModel):
    duration: int = Field(..., ge=30, le=300)


@app.post("/button_duration")
async def button_duration(duration: ButtonRestDurationRequest, db: Session = Depends(get_db)):
    try:
        button_rest_duration = ButtonRestDuration(id=1, duration=duration.duration)
        db.merge(button_rest_duration)
        db.commit()
        return {"succeeded": True}
    except Exception as e:
        db.rollback()
        return {"succeeded": False, "error": str(e)}


@app.get("/button_duration")
async def get_button_duration(db: Session = Depends(get_db)):
    button_rest_duration = db.query(ButtonRestDuration).filter(ButtonRestDuration.id == 1).first()
    if button_rest_duration:
        return {"duration": button_rest_duration.duration}
    return {"duration": 60}


@app.post("/button/stop")
async def button_stop():
    """Stop the freeform button training session."""
    if _button is not None:
        _button.stop_session()
        return {"succeeded": True}
    return {"succeeded": False, "error": "Button not available"}


@app.get("/button/status")
async def button_status():
    """Get current button mode status."""
    if _button is not None:
        return _button.get_status()
    return {"active": False, "state": "idle", "set": 0, "remaining": 0, "duration": 0}


# --- Sonos control ---

class VolumeRequest(BaseModel):
    volume: int = Field(..., ge=0, le=100)


@app.get("/sonos/now-playing")
async def sonos_now_playing():
    sonos = get_sonos()
    if sonos and sonos.available:
        return sonos.get_now_playing()
    return {"error": "Sonos not available"}


@app.post("/sonos/play")
async def sonos_play():
    sonos = get_sonos()
    if sonos and sonos.available:
        sonos.play()
        return {"succeeded": True}
    return {"succeeded": False, "error": "Sonos not available"}


@app.post("/sonos/pause")
async def sonos_pause():
    sonos = get_sonos()
    if sonos and sonos.available:
        sonos.pause()
        return {"succeeded": True}
    return {"succeeded": False, "error": "Sonos not available"}


@app.post("/sonos/next")
async def sonos_next():
    sonos = get_sonos()
    if sonos and sonos.available:
        sonos.next_track()
        return {"succeeded": True}
    return {"succeeded": False, "error": "Sonos not available"}


@app.post("/sonos/volume")
async def sonos_volume(req: VolumeRequest):
    sonos = get_sonos()
    if sonos and sonos.available:
        sonos.set_volume(req.volume)
        return {"succeeded": True, "volume": req.volume}
    return {"succeeded": False, "error": "Sonos not available"}


@app.get("/sonos/volume")
async def sonos_get_volume():
    sonos = get_sonos()
    if sonos and sonos.available:
        return {"volume": sonos.get_volume()}
    return {"volume": 0, "error": "Sonos not available"}


# --- Heart rate (BLE) ---

class HrConnectRequest(BaseModel):
    address: str | None = None
    max_hr: int = 190


@app.post("/hr/connect")
async def hr_connect(req: HrConnectRequest):
    hr_service.max_hr = req.max_hr
    return await hr_service.connect(req.address)


@app.post("/hr/disconnect")
async def hr_disconnect():
    return await hr_service.disconnect()


@app.get("/hr/status")
async def hr_status():
    return hr_service.get_status()


# --- Workout journal ---

from database.models import WorkoutLog, ExerciseCatalog, GeneratedWorkout, RoundReaction as RoundReactionModel, PersonalRecord, Program
from datetime import datetime, timedelta, date, timezone
from sqlalchemy import func, desc

class SetLogRequest(BaseModel):
    exercise: str
    weight: float
    reps: int
    set_number: int = 1
    rpe: float | None = None
    velocity: str | None = None
    notes: str | None = None
    user: str = "laith"


@app.post("/workouts/log")
async def log_set(set_data: SetLogRequest, db: Session = Depends(get_db)):
    log_entry = WorkoutLog(
        user=set_data.user,
        exercise=set_data.exercise,
        weight=int(set_data.weight),
        reps=set_data.reps,
        set_number=set_data.set_number,
        rpe=int(set_data.rpe) if set_data.rpe else None,
        velocity=set_data.velocity,
        notes=set_data.notes,
        timestamp=datetime.now(timezone.utc),
        session_date=date.today(),
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    # PR detection — check if this set is a new estimated 1RM
    pr_hit = None
    if set_data.weight > 0 and set_data.reps > 0:
        new_e1rm = round(set_data.weight * (1 + set_data.reps / 30))
        existing_pr = db.query(PersonalRecord).filter(
            PersonalRecord.user == set_data.user,
            PersonalRecord.exercise == set_data.exercise,
        ).order_by(desc(PersonalRecord.estimated_1rm)).first()

        old_e1rm = existing_pr.estimated_1rm if existing_pr else 0
        if new_e1rm > old_e1rm:
            pr_entry = PersonalRecord(
                user=set_data.user,
                exercise=set_data.exercise,
                weight=int(set_data.weight),
                reps=set_data.reps,
                estimated_1rm=new_e1rm,
                previous_1rm=old_e1rm if old_e1rm > 0 else None,
                session_date=date.today(),
                created_at=datetime.now(timezone.utc),
            )
            db.add(pr_entry)
            db.commit()
            pr_hit = {
                "exercise": set_data.exercise,
                "new_e1rm": new_e1rm,
                "previous_e1rm": old_e1rm if old_e1rm > 0 else None,
                "weight": int(set_data.weight),
                "reps": set_data.reps,
            }
            # Broadcast PR to all connected clients
            await manager.broadcast({
                "type": "pr",
                "exercise": set_data.exercise,
                "new_e1rm": new_e1rm,
                "previous_e1rm": old_e1rm if old_e1rm > 0 else None,
            })

    return {"succeeded": True, "id": log_entry.id, "pr": pr_hit}


@app.get("/workouts/history")
async def workout_history(user: str = "laith", exercise: str | None = None, days: int = 30, db: Session = Depends(get_db)):
    cutoff = date.today() - timedelta(days=days)
    query = db.query(WorkoutLog).filter(
        WorkoutLog.user == user,
        WorkoutLog.session_date >= cutoff,
    )
    if exercise:
        query = query.filter(WorkoutLog.exercise == exercise)
    logs = query.order_by(desc(WorkoutLog.timestamp)).all()
    return {
        "history": [
            {
                "id": log.id,
                "exercise": log.exercise,
                "weight": log.weight,
                "reps": log.reps,
                "set_number": log.set_number,
                "rpe": log.rpe,
                "velocity": log.velocity,
                "notes": log.notes,
                "session_date": str(log.session_date),
                "timestamp": str(log.timestamp),
            }
            for log in logs
        ],
        "user": user,
        "days": days,
    }


@app.get("/workouts/stats")
async def workout_stats(user: str = "laith", days: int = 7, db: Session = Depends(get_db)):
    cutoff = date.today() - timedelta(days=days)
    logs = db.query(WorkoutLog).filter(
        WorkoutLog.user == user,
        WorkoutLog.session_date >= cutoff,
    ).all()

    total_sets = len(logs)
    total_volume = sum(log.weight * log.reps for log in logs)

    # Estimate 1RM per exercise using Epley formula: 1RM = weight * (1 + reps/30)
    exercise_bests = {}
    for log in logs:
        estimated_1rm = log.weight * (1 + log.reps / 30)
        if log.exercise not in exercise_bests or estimated_1rm > exercise_bests[log.exercise]:
            exercise_bests[log.exercise] = round(estimated_1rm)

    # Exercises performed
    exercises = list(set(log.exercise for log in logs))

    return {
        "total_sets": total_sets,
        "total_volume": round(total_volume),
        "estimated_1rm": exercise_bests,
        "exercises": exercises,
        "days": days,
    }


@app.get("/workouts/exercises")
async def list_exercises(db: Session = Depends(get_db)):
    """Get distinct exercises from the workout log."""
    exercises = db.query(WorkoutLog.exercise).distinct().all()
    return {"exercises": [e[0] for e in exercises]}


# --- Exercise catalog ---

@app.get("/exercises/catalog")
async def exercise_catalog(
    q: str | None = None,
    muscle_group: str | None = None,
    equipment: str | None = None,
    db: Session = Depends(get_db),
):
    """Search the exercise catalog. Supports text search, muscle group, and equipment filters."""
    query = db.query(ExerciseCatalog)
    if q:
        query = query.filter(ExerciseCatalog.name.ilike(f"%{q}%"))
    if muscle_group:
        query = query.filter(ExerciseCatalog.muscle_group == muscle_group)
    if equipment:
        query = query.filter(ExerciseCatalog.equipment == equipment)
    exercises = query.order_by(ExerciseCatalog.name).limit(50).all()
    return {
        "exercises": [
            {
                "id": ex.id,
                "name": ex.name,
                "muscle_group": ex.muscle_group,
                "equipment": ex.equipment,
                "pattern": ex.pattern,
            }
            for ex in exercises
        ]
    }


@app.get("/exercises/muscle-groups")
async def exercise_muscle_groups(db: Session = Depends(get_db)):
    groups = db.query(ExerciseCatalog.muscle_group).distinct().order_by(ExerciseCatalog.muscle_group).all()
    return {"muscle_groups": [g[0] for g in groups]}


@app.post("/exercises/seed")
async def seed_exercises(db: Session = Depends(get_db)):
    """Seed the exercise catalog from the built-in list."""
    from database.seed_exercises import get_exercises

    existing = db.query(ExerciseCatalog).count()
    if existing > 0:
        return {"message": f"Catalog already has {existing} exercises. Skipping seed.", "count": existing}

    exercises = get_exercises()
    for ex in exercises:
        db.add(ExerciseCatalog(
            name=ex["name"],
            muscle_group=ex["muscle_group"],
            equipment=ex["equipment"],
            pattern=ex["pattern"],
        ))
    db.commit()
    return {"message": f"Seeded {len(exercises)} exercises", "count": len(exercises)}


# --- AI Coach (Bedrock Claude Sonnet) ---

import os
from ai.coach import GymCoach

BEDROCK_TOKEN = os.environ.get("AWS_BEARER_TOKEN_BEDROCK", "")
gym_coach = GymCoach(bearer_token=BEDROCK_TOKEN if BEDROCK_TOKEN else None)


class AiSuggestRequest(BaseModel):
    goal: str = "hypertrophy"
    user: str = "laith"


class AiAnalyzeRequest(BaseModel):
    user: str = "laith"


def _build_training_context(user: str, db: Session, days: int = 14) -> dict:
    """Build a rich training context for the AI coach."""
    cutoff = date.today() - timedelta(days=days)
    logs = db.query(WorkoutLog).filter(
        WorkoutLog.user == user,
        WorkoutLog.session_date >= cutoff,
    ).order_by(WorkoutLog.timestamp).all()

    history = [
        {"exercise": log.exercise, "weight": log.weight, "reps": log.reps,
         "set_number": log.set_number, "rpe": log.rpe, "session_date": str(log.session_date)}
        for log in logs
    ]

    # Compute per-exercise PRs (estimated 1RM via Epley)
    exercise_prs = {}
    for log in logs:
        e1rm = log.weight * (1 + log.reps / 30)
        if log.exercise not in exercise_prs or e1rm > exercise_prs[log.exercise]["e1rm"]:
            exercise_prs[log.exercise] = {
                "e1rm": round(e1rm),
                "best_set": f"{log.weight}x{log.reps}",
                "date": str(log.session_date),
            }

    # Weekly volume per muscle group (join with exercise catalog)
    muscle_volume = {}
    for log in logs:
        cat = db.query(ExerciseCatalog).filter(ExerciseCatalog.name == log.exercise).first()
        group = cat.muscle_group if cat else "Unknown"
        vol = log.weight * log.reps
        muscle_volume[group] = muscle_volume.get(group, 0) + vol

    # Days since each muscle group was last trained
    last_trained = {}
    for log in reversed(logs):
        cat = db.query(ExerciseCatalog).filter(ExerciseCatalog.name == log.exercise).first()
        group = cat.muscle_group if cat else "Unknown"
        if group not in last_trained:
            last_trained[group] = str(log.session_date)

    # Training days (unique dates)
    training_days = sorted(set(str(log.session_date) for log in logs))

    return {
        "history": history,
        "exercise_prs": exercise_prs,
        "muscle_volume_14d": muscle_volume,
        "last_trained": last_trained,
        "training_days": training_days,
        "total_sets": len(logs),
        "total_volume": sum(log.weight * log.reps for log in logs),
    }


class AiForceRequest(AiSuggestRequest):
    force: bool = False  # Skip cache and regenerate


@app.post("/ai/suggest")
async def ai_suggest(req: AiForceRequest, db: Session = Depends(get_db)):
    latest_log_id = _get_latest_log_id(req.user, db)
    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)

    if not req.force:
        # Check cache: same user + goal, created today, training context unchanged
        cached = db.query(GeneratedWorkout).filter(
            GeneratedWorkout.user == req.user,
            GeneratedWorkout.goal == req.goal,
            GeneratedWorkout.workout_type == "suggest",
            GeneratedWorkout.context_log_id == latest_log_id,
            GeneratedWorkout.created_at >= today_start,
        ).order_by(desc(GeneratedWorkout.created_at)).first()

        if cached:
            return {"workout": cached.payload, "cached": True, "id": cached.id}

    # Generate fresh
    ctx = _build_training_context(req.user, db, days=14)
    result = gym_coach.suggest_workout(req.user, ctx, req.goal)

    # Cache it (only if it's a valid structured response)
    if isinstance(result, dict) and result.get("exercises"):
        entry = GeneratedWorkout(
            user=req.user, workout_type="suggest", goal=req.goal,
            payload=result, ai_generated=True,
            context_log_id=latest_log_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return {"workout": result, "cached": False, "id": entry.id}

    return {"workout": result}


@app.get("/ai/suggest/latest")
async def ai_suggest_latest(user: str = "laith", goal: str | None = None, db: Session = Depends(get_db)):
    """Load the most recent cached workout suggestion for this user."""
    query = db.query(GeneratedWorkout).filter(
        GeneratedWorkout.user == user,
        GeneratedWorkout.workout_type == "suggest",
    )
    if goal:
        query = query.filter(GeneratedWorkout.goal == goal)
    cached = query.order_by(desc(GeneratedWorkout.created_at)).first()
    if cached:
        return {"workout": cached.payload, "id": cached.id, "goal": cached.goal, "created_at": str(cached.created_at)}
    return {"workout": None}


class AiAnalyzeForceRequest(AiAnalyzeRequest):
    force: bool = False


@app.post("/ai/analyze")
async def ai_analyze(req: AiAnalyzeForceRequest, db: Session = Depends(get_db)):
    latest_log_id = _get_latest_log_id(req.user, db)
    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)

    if not req.force:
        cached = db.query(GeneratedWorkout).filter(
            GeneratedWorkout.user == req.user,
            GeneratedWorkout.workout_type == "analyze",
            GeneratedWorkout.context_log_id == latest_log_id,
            GeneratedWorkout.created_at >= today_start,
        ).order_by(desc(GeneratedWorkout.created_at)).first()

        if cached:
            return {"analysis": cached.payload.get("text", ""), "cached": True, "id": cached.id}

    ctx = _build_training_context(req.user, db, days=30)
    result = gym_coach.analyze_progress(req.user, ctx)

    # Cache (even text responses)
    if isinstance(result, str) and not result.startswith("AI coach error"):
        entry = GeneratedWorkout(
            user=req.user, workout_type="analyze", goal=None,
            payload={"text": result}, ai_generated=True,
            context_log_id=latest_log_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(entry)
        db.commit()

    return {"analysis": result}


@app.get("/ai/analyze/latest")
async def ai_analyze_latest(user: str = "laith", db: Session = Depends(get_db)):
    """Load the most recent cached analysis for this user."""
    cached = db.query(GeneratedWorkout).filter(
        GeneratedWorkout.user == user,
        GeneratedWorkout.workout_type == "analyze",
    ).order_by(desc(GeneratedWorkout.created_at)).first()
    if cached:
        return {"analysis": cached.payload.get("text", ""), "id": cached.id, "created_at": str(cached.created_at)}
    return {"analysis": None}


# --- Session Recap ---

@app.get("/workouts/session-recap")
async def session_recap(user: str = "laith", session_date: str | None = None, db: Session = Depends(get_db)):
    """Compute a full session recap: stats, PRs, muscle groups, AI narrative."""
    target_date = date.fromisoformat(session_date) if session_date else date.today()

    logs = db.query(WorkoutLog).filter(
        WorkoutLog.user == user,
        WorkoutLog.session_date == target_date,
    ).order_by(WorkoutLog.timestamp).all()

    if not logs:
        return {"session": None}

    # Basic stats
    total_sets = len(logs)
    total_volume = sum(log.weight * log.reps for log in logs)
    exercises = list(dict.fromkeys(log.exercise for log in logs))  # ordered unique

    # Muscle groups from catalog
    muscle_groups = {}
    for log in logs:
        cat = db.query(ExerciseCatalog).filter(ExerciseCatalog.name == log.exercise).first()
        group = cat.muscle_group if cat else "Other"
        if group not in muscle_groups:
            muscle_groups[group] = {"sets": 0, "volume": 0}
        muscle_groups[group]["sets"] += 1
        muscle_groups[group]["volume"] += log.weight * log.reps

    # Per-exercise breakdown
    exercise_breakdown = {}
    for log in logs:
        if log.exercise not in exercise_breakdown:
            exercise_breakdown[log.exercise] = {"sets": 0, "volume": 0, "best_e1rm": 0, "best_set": ""}
        eb = exercise_breakdown[log.exercise]
        eb["sets"] += 1
        eb["volume"] += log.weight * log.reps
        e1rm = round(log.weight * (1 + log.reps / 30))
        if e1rm > eb["best_e1rm"]:
            eb["best_e1rm"] = e1rm
            eb["best_set"] = f"{log.weight}x{log.reps}"

    # PRs hit today
    prs_today = db.query(PersonalRecord).filter(
        PersonalRecord.user == user,
        PersonalRecord.session_date == target_date,
    ).all()
    prs = [
        {
            "exercise": pr.exercise,
            "new_e1rm": pr.estimated_1rm,
            "previous_e1rm": pr.previous_1rm,
            "weight": pr.weight,
            "reps": pr.reps,
        }
        for pr in prs_today
    ]

    # AI narrative (cached in generated_workouts)
    narrative = None
    cached_narrative = db.query(GeneratedWorkout).filter(
        GeneratedWorkout.user == user,
        GeneratedWorkout.workout_type == "session_narrative",
        GeneratedWorkout.created_at >= datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc),
    ).first()

    if cached_narrative:
        narrative = cached_narrative.payload.get("text", "")
    elif total_sets > 0:
        # Generate fresh narrative
        narrative_data = {
            "total_sets": total_sets,
            "total_volume": total_volume,
            "exercises": exercises,
            "muscle_groups": list(muscle_groups.keys()),
            "prs": prs,
        }
        narrative = gym_coach.generate_session_narrative(user, narrative_data)
        if narrative and not narrative.startswith("AI coach"):
            entry = GeneratedWorkout(
                user=user, workout_type="session_narrative", goal=None,
                payload={"text": narrative}, ai_generated=True,
                context_log_id=_get_latest_log_id(user, db),
                created_at=datetime.now(timezone.utc),
            )
            db.add(entry)
            db.commit()

    # Duration estimate (from first to last log timestamp)
    duration_min = None
    if len(logs) >= 2 and logs[0].timestamp and logs[-1].timestamp:
        delta = logs[-1].timestamp - logs[0].timestamp
        duration_min = round(delta.total_seconds() / 60)

    return {
        "session": {
            "date": str(target_date),
            "total_sets": total_sets,
            "total_volume": round(total_volume),
            "total_exercises": len(exercises),
            "duration_min": duration_min,
            "exercises": [
                {"name": ex, **exercise_breakdown[ex]}
                for ex in exercises
            ],
            "muscle_groups": [
                {"name": g, **data}
                for g, data in sorted(muscle_groups.items(), key=lambda x: -x[1]["volume"])
            ],
            "prs": prs,
            "narrative": narrative,
        },
    }


@app.get("/workouts/prs")
async def get_personal_records(user: str = "laith", db: Session = Depends(get_db)):
    """Get all-time PR board — best e1RM per exercise."""
    from sqlalchemy import and_
    # Subquery: max e1RM per exercise
    subq = db.query(
        PersonalRecord.exercise,
        func.max(PersonalRecord.estimated_1rm).label("best_e1rm"),
    ).filter(PersonalRecord.user == user).group_by(PersonalRecord.exercise).subquery()

    prs = db.query(PersonalRecord).join(
        subq,
        and_(
            PersonalRecord.exercise == subq.c.exercise,
            PersonalRecord.estimated_1rm == subq.c.best_e1rm,
        ),
    ).filter(PersonalRecord.user == user).all()

    return {
        "prs": [
            {
                "exercise": pr.exercise,
                "estimated_1rm": pr.estimated_1rm,
                "weight": pr.weight,
                "reps": pr.reps,
                "date": str(pr.session_date),
            }
            for pr in prs
        ],
    }


# --- Program Builder ---

class ProgramRequest(BaseModel):
    user: str = "laith"
    goal: str = "hypertrophy"
    days_per_week: int = Field(default=4, ge=2, le=6)
    weeks: int = Field(default=4, ge=2, le=8)
    notes: str = ""


@app.post("/programs/generate")
async def generate_program(req: ProgramRequest, db: Session = Depends(get_db)):
    """Generate a new multi-week training program via AI."""
    # Deactivate any existing active programs for this user
    db.query(Program).filter(
        Program.user == req.user,
        Program.active == True,
    ).update({"active": False})

    ctx = _build_training_context(req.user, db, days=30)
    result = gym_coach.generate_program(
        user=req.user, ctx=ctx, goal=req.goal,
        days_per_week=req.days_per_week, weeks=req.weeks, notes=req.notes,
    )

    if isinstance(result, dict) and result.get("weekly_template"):
        program = Program(
            user=req.user,
            goal=req.goal,
            days_per_week=req.days_per_week,
            weeks=req.weeks,
            payload=result,
            active=True,
            notes=req.notes or None,
            created_at=datetime.now(timezone.utc),
        )
        db.add(program)
        db.commit()
        db.refresh(program)
        return {"program": result, "id": program.id}

    return {"error": str(result)}


@app.get("/programs/active")
async def get_active_program(user: str = "laith", db: Session = Depends(get_db)):
    """Get the user's currently active program."""
    program = db.query(Program).filter(
        Program.user == user,
        Program.active == True,
    ).order_by(desc(Program.created_at)).first()

    if program:
        return {
            "program": program.payload,
            "id": program.id,
            "goal": program.goal,
            "weeks": program.weeks,
            "days_per_week": program.days_per_week,
            "created_at": str(program.created_at),
        }
    return {"program": None}


@app.get("/programs/{program_id}")
async def get_program(program_id: int, db: Session = Depends(get_db)):
    program = db.query(Program).filter(Program.id == program_id).first()
    if program:
        return {
            "program": program.payload,
            "id": program.id,
            "goal": program.goal,
            "weeks": program.weeks,
            "days_per_week": program.days_per_week,
            "created_at": str(program.created_at),
        }
    return {"program": None}


@app.get("/programs/{program_id}/compliance")
async def program_compliance(program_id: int, db: Session = Depends(get_db)):
    """Compare actual training against program prescription."""
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        return {"error": "Program not found"}

    payload = program.payload
    program_start = program.created_at.date() if program.created_at else date.today()
    total_weeks = payload.get("weeks", program.weeks) or program.weeks

    # Gather all logs since program start
    logs = db.query(WorkoutLog).filter(
        WorkoutLog.user == program.user,
        WorkoutLog.session_date >= program_start,
    ).order_by(WorkoutLog.session_date).all()

    # Group logs by date
    logs_by_date = {}
    for log in logs:
        d = str(log.session_date)
        if d not in logs_by_date:
            logs_by_date[d] = []
        logs_by_date[d].append({
            "exercise": log.exercise,
            "weight": log.weight,
            "reps": log.reps,
            "sets": log.set_number,
        })

    # Compute weekly compliance
    weeks_data = []
    for week_num in range(total_weeks):
        week_start = program_start + timedelta(weeks=week_num)
        week_end = week_start + timedelta(days=6)
        training_days_in_week = sum(
            1 for d in logs_by_date
            if week_start <= date.fromisoformat(d) <= week_end
        )
        prescribed = program.days_per_week
        compliance = round((training_days_in_week / prescribed) * 100) if prescribed else 0
        weeks_data.append({
            "week": week_num + 1,
            "start": str(week_start),
            "end": str(week_end),
            "training_days": training_days_in_week,
            "prescribed_days": prescribed,
            "compliance_pct": min(compliance, 100),
            "is_current": week_start <= date.today() <= week_end,
        })

    total_training_days = len(logs_by_date)
    total_prescribed = program.days_per_week * total_weeks
    overall = round((total_training_days / total_prescribed) * 100) if total_prescribed else 0

    return {
        "program_id": program_id,
        "overall_compliance_pct": min(overall, 100),
        "weeks": weeks_data,
        "training_dates": sorted(logs_by_date.keys()),
    }


@app.delete("/programs/{program_id}")
async def deactivate_program(program_id: int, db: Session = Depends(get_db)):
    db.query(Program).filter(Program.id == program_id).update({"active": False})
    db.commit()
    return {"succeeded": True}
