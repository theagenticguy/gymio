"""
9-Round Workout Generator

Inspired by the 9Round franchise: 9 stations mixing kickboxing, weights,
cardio, and core with active rest periods between rounds.

Station types:
  1. Cardio Warmup (jump rope, shadowboxing, footwork)
  2. Heavy Bag - Boxing (punch combos)
  3. Speed Bag / Rhythm
  4. Heavy Bag - Kickboxing (kicks + punches)
  5. Upper Body Weights
  6. Lower Body Weights
  7. Core / Abs
  8. Conditioning (HIIT bursts)
  9. Burnout Finisher (full body)

Each round: 3 min work + 30s active rest (jumping jacks, high knees, etc.)
"""
import random

STATION_POOLS = {
    1: {
        "name": "Cardio Warmup",
        "exercises": [
            {"move": "Jump Rope", "notes": "Light pace, find your rhythm"},
            {"move": "Shadow Boxing", "notes": "Jab-cross combos, stay loose"},
            {"move": "High Knees", "notes": "Pump arms, stay on toes"},
            {"move": "Lateral Shuffles", "notes": "Athletic stance, quick feet"},
            {"move": "Jumping Jacks to Squat", "notes": "3 jacks then 1 squat, repeat"},
            {"move": "Boxing Footwork Drill", "notes": "Forward-back, side-side, pivot"},
        ],
    },
    2: {
        "name": "Heavy Bag - Boxing",
        "exercises": [
            {"move": "Jab-Cross Combos", "notes": "1-2, 1-1-2, 1-2-1-2. Power on the cross"},
            {"move": "3-Punch Combos", "notes": "1-2-3 (jab-cross-hook). Rotate hips on the hook"},
            {"move": "4-Punch Combos", "notes": "1-2-3-2 (jab-cross-hook-cross). Keep hands up"},
            {"move": "Body Shots", "notes": "Alternate head and body. Bend knees for body shots"},
            {"move": "Speed Rounds", "notes": "Fast jab-cross for 20s, rest 10s, repeat"},
            {"move": "Power Shots", "notes": "Single hard crosses and hooks. Reset between each"},
        ],
    },
    3: {
        "name": "Speed Bag / Rhythm",
        "exercises": [
            {"move": "Speed Bag - Alternating", "notes": "Standard alternating rhythm. Keep elbows up"},
            {"move": "Speed Bag - Singles", "notes": "One hand at a time, 30s each"},
            {"move": "Speed Bag - Double Hits", "notes": "Two hits per hand before switching"},
            {"move": "Speed Bag Burnout", "notes": "As fast as possible for 30s, rest 15s, repeat"},
            {"move": "Shadow Boxing - Combos", "notes": "If speed bag isn't available. Fast hands, light feet"},
        ],
    },
    4: {
        "name": "Heavy Bag - Kickboxing",
        "exercises": [
            {"move": "Roundhouse Kick Combos", "notes": "Jab-cross then rear roundhouse. 5 each side"},
            {"move": "Front Kick + Punches", "notes": "Front kick to create distance, follow with 1-2"},
            {"move": "Knee Strikes", "notes": "Clinch the bag, alternating knees. Drive hips"},
            {"move": "Kick-Punch Combos", "notes": "Rear kick, 1-2-3, lead kick. Repeat"},
            {"move": "Teep (Push Kick) Drill", "notes": "Push kick to the bag, reset stance, repeat"},
            {"move": "Switch Kick Drill", "notes": "Switch stance roundhouse kicks. 10 each side"},
        ],
    },
    5: {
        "name": "Upper Body Weights",
        "exercises": [
            {"move": "Dumbbell Shoulder Press", "notes": "12 reps. Moderate weight, controlled"},
            {"move": "Dumbbell Curl to Press", "notes": "10 reps. Curl then press overhead"},
            {"move": "Push Ups", "notes": "AMRAP in 45s, rest 15s, repeat 3x"},
            {"move": "Dumbbell Lateral Raise", "notes": "15 reps light weight, slow negative"},
            {"move": "Dumbbell Row (each arm)", "notes": "12 each side. Squeeze at top"},
            {"move": "Dumbbell Bench Press", "notes": "12 reps. Moderate weight"},
            {"move": "Cable Face Pull", "notes": "15 reps. Pause at contraction"},
            {"move": "Dumbbell Front Raise to Lateral", "notes": "10 reps. Light weight, L-pattern"},
            {"move": "Landmine Press (each arm)", "notes": "10 each side"},
        ],
    },
    6: {
        "name": "Lower Body Weights",
        "exercises": [
            {"move": "Goblet Squat", "notes": "15 reps. Hold dumbbell at chest"},
            {"move": "Dumbbell Walking Lunge", "notes": "12 each leg. Long stride"},
            {"move": "Dumbbell Romanian Deadlift", "notes": "12 reps. Squeeze hamstrings"},
            {"move": "Dumbbell Sumo Squat", "notes": "15 reps. Wide stance, toes out"},
            {"move": "Bulgarian Split Squat", "notes": "10 each leg. Rear foot on bench"},
            {"move": "Dumbbell Step-Up", "notes": "12 each leg on bench"},
            {"move": "Jump Squat", "notes": "10 reps bodyweight, explosive"},
            {"move": "Dumbbell Calf Raise", "notes": "20 reps. Pause at top"},
            {"move": "Landmine Squat", "notes": "12 reps. Hold end of barbell at chest"},
        ],
    },
    7: {
        "name": "Core / Abs",
        "exercises": [
            {"move": "Cable Woodchop", "notes": "12 each side. Rotate from hips"},
            {"move": "Hanging Leg Raise", "notes": "12 reps. Control the swing"},
            {"move": "Plank Hold", "notes": "45s on, 15s off, 3 rounds"},
            {"move": "Russian Twist", "notes": "20 total (10 each side) with dumbbell"},
            {"move": "Cable Crunch", "notes": "15 reps. Squeeze abs at bottom"},
            {"move": "Mountain Climbers", "notes": "30s fast, 15s rest, 4 rounds"},
            {"move": "Dead Bug", "notes": "10 each side. Slow and controlled"},
            {"move": "Landmine Rotation", "notes": "10 each side. Athletic stance"},
            {"move": "Ab Rollout", "notes": "10 reps. Don't collapse at the bottom"},
        ],
    },
    8: {
        "name": "Conditioning",
        "exercises": [
            {"move": "Burpees", "notes": "AMRAP 30s, rest 15s, 4 rounds"},
            {"move": "Battle Ropes (if available) or Shadow Boxing Sprint", "notes": "20s max effort, 10s rest, 6 rounds"},
            {"move": "Treadmill Sprints", "notes": "20s sprint, 40s jog, 3 rounds"},
            {"move": "Dumbbell Thrusters", "notes": "Light weight, 15 reps, rest 20s, repeat 3x"},
            {"move": "Box Jumps (onto bench)", "notes": "10 reps, rest 20s, 3 rounds"},
            {"move": "Dumbbell Man Makers", "notes": "6 reps. Push up, row each arm, clean, press"},
            {"move": "Sled Push Simulation (Treadmill Off)", "notes": "Push against belt for 20s, rest 20s, 4 rounds"},
        ],
    },
    9: {
        "name": "Burnout Finisher",
        "exercises": [
            {"move": "Heavy Bag Flurry", "notes": "All-out punches for 30s, rest 10s, repeat until round ends"},
            {"move": "Tabata Bodyweight", "notes": "20s work / 10s rest: push ups, squats, sit ups, burpees"},
            {"move": "100 Punch Challenge", "notes": "100 straight punches on the bag AFAP. Rest. Repeat"},
            {"move": "Dumbbell Complex", "notes": "5 deadlifts, 5 rows, 5 cleans, 5 presses. No rest between moves"},
            {"move": "Sprint + Slam", "notes": "10s treadmill sprint, jump off, 5 push ups. Repeat"},
            {"move": "Shadow Boxing Burnout", "notes": "Max effort combos. Every 30s drop for 5 push ups"},
        ],
    },
}

ACTIVE_REST_OPTIONS = [
    "Jumping Jacks",
    "High Knees (light pace)",
    "Shadow Boxing (easy)",
    "Lateral Shuffles",
    "Bodyweight Squats (slow)",
    "Arm Circles + Shoulder Shrugs",
    "Light Jump Rope",
    "Walking in Place + Deep Breaths",
]


def generate_nine_round(
    round_duration: int = 180,
    rest_duration: int = 30,
    difficulty: str = "intermediate",
) -> dict:
    """Generate a 9-round workout.

    Args:
        round_duration: seconds per round (default 180 = 3 min)
        rest_duration: seconds of active rest between rounds (default 30)
        difficulty: "beginner", "intermediate", or "advanced"

    Returns:
        dict with rounds list and metadata
    """
    rounds = []
    used_rest = []

    for station_num in range(1, 10):
        pool = STATION_POOLS[station_num]
        exercise = random.choice(pool["exercises"])

        # Pick a unique active rest
        available_rest = [r for r in ACTIVE_REST_OPTIONS if r not in used_rest]
        if not available_rest:
            available_rest = ACTIVE_REST_OPTIONS
        rest_exercise = random.choice(available_rest)
        used_rest.append(rest_exercise)

        rounds.append({
            "round": station_num,
            "station": pool["name"],
            "exercise": exercise["move"],
            "notes": exercise["notes"],
            "duration": round_duration,
            "rest_duration": rest_duration if station_num < 9 else 0,
            "rest_exercise": rest_exercise if station_num < 9 else None,
        })

    total_time = (round_duration * 9) + (rest_duration * 8)

    return {
        "type": "nine_round",
        "rounds": rounds,
        "round_duration": round_duration,
        "rest_duration": rest_duration,
        "total_time_seconds": total_time,
        "total_time_display": f"{total_time // 60}:{total_time % 60:02d}",
        "difficulty": difficulty,
    }


if __name__ == "__main__":
    import json
    workout = generate_nine_round()
    print(json.dumps(workout, indent=2))
