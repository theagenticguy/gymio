import json
import os
import boto3
from datetime import datetime

EQUIPMENT = """
- Squat cage with dual pulley system (each pulley L/R up to 150lb)
- 2x Olympic barbells, 1x trap bar
- Leg press / hack squat combo (plate loaded)
- Treadmill, elliptical
- Olympic plates: 2.5, 5, 10, 25, 35, 45 lb
- Adjustable dumbbells: 8, 12, 23, 32, 41, 50 lb pairs
- Olympic plate-loadable dumbbell pair
- Punching bag, speed bag (bungee mounted)
- Dip bars
- Adjustable bench, adjustable bench with leg curl/extension (plate loaded)
- Resistance tubes, bands (can attach to barbells), chains
- Landmine attachment and row bars
"""

SYSTEM_PROMPT = f"""You are GYMIO Coach, an AI strength and conditioning coach built into a smart home gym system.

You have access to the user's training history, equipment, and real-time sensor data. Your role is to:
1. Suggest workouts based on training history, recovery, and goals
2. Recommend progressive overload (weight/rep increases)
3. Detect when a deload week is needed (accumulated fatigue, velocity decline, RPE creep)
4. Program for hypertrophy (volume-focused) or strength (intensity-focused)
5. Track weekly volume per muscle group and flag imbalances

Available equipment in this home gym:
{EQUIPMENT}

Guidelines:
- Be concise and actionable. This displays on a gym TV or phone screen.
- Use specific numbers: "Add 5 lbs to squat" not "increase weight"
- Reference the user's actual recent performance when making suggestions
- Format workout suggestions as structured lists
- Flag recovery concerns based on training frequency and volume trends
- Never suggest exercises that require equipment not listed above"""

MODEL_ID = "global.anthropic.claude-sonnet-4-6"

# Tool schema for structured 9-round output
NINE_ROUND_TOOL = {
    "name": "generate_nine_round_workout",
    "description": "Generate a structured 9-round kickboxing + strength circuit workout",
    "input_schema": {
        "type": "object",
        "properties": {
            "rounds": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "round": {"type": "integer", "description": "Round number 1-9"},
                        "station": {
                            "type": "string",
                            "enum": [
                                "Cardio Warmup",
                                "Heavy Bag - Boxing",
                                "Speed Bag / Rhythm",
                                "Heavy Bag - Kickboxing",
                                "Upper Body Weights",
                                "Lower Body Weights",
                                "Core / Abs",
                                "Conditioning",
                                "Burnout Finisher",
                            ],
                        },
                        "exercise": {"type": "string", "description": "Name of the exercise or drill"},
                        "notes": {
                            "type": "string",
                            "description": "Detailed coaching notes. For boxing/kickboxing: specific combos using 1=jab 2=cross 3=lead hook 4=rear hook 5=lead uppercut 6=rear uppercut notation, with defensive movement. For weights: reps, sets structure, weight guidance.",
                        },
                        "rest_exercise": {
                            "type": "string",
                            "description": "Active rest movement between rounds (e.g. jumping jacks, shadow boxing, high knees). Null for round 9.",
                        },
                    },
                    "required": ["round", "station", "exercise", "notes", "rest_exercise"],
                },
                "minItems": 9,
                "maxItems": 9,
            },
        },
        "required": ["rounds"],
    },
}

# Tool schema for structured workout suggestion
WORKOUT_SUGGEST_TOOL = {
    "name": "suggest_workout",
    "description": "Generate a structured workout plan with exercises, sets, reps, and target weights",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Short workout title, e.g. 'Push Day — Chest & Shoulders'"},
            "split": {"type": "string", "description": "Training split type, e.g. 'Push', 'Pull', 'Upper', 'Lower', 'Full Body', 'Arms', 'Legs'"},
            "summary": {"type": "string", "description": "2-3 sentence rationale: why this workout, what it targets, how it connects to recent training"},
            "target_muscles": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Primary muscle groups being trained, e.g. ['Chest', 'Shoulders', 'Triceps']",
            },
            "exercises": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "exercise": {"type": "string", "description": "Exercise name from the catalog"},
                        "equipment": {"type": "string", "description": "Equipment needed: Barbell, Dumbbell, Cable, Machine, Bodyweight, Landmine, Trap Bar"},
                        "sets": {"type": "integer"},
                        "reps": {"type": "string", "description": "e.g. '8-10', '5', '12-15', 'AMRAP'"},
                        "weight_lbs": {"type": "integer", "description": "Target weight in lbs. Use 0 for bodyweight. Base on the user's PR data."},
                        "rpe_target": {"type": "number", "description": "Target RPE for these sets (7-10 scale)"},
                        "rest_seconds": {"type": "integer", "description": "Rest between sets in seconds"},
                        "notes": {"type": "string", "description": "Coaching cue, tempo instruction, or progression note"},
                        "muscle_group": {"type": "string", "description": "Primary muscle group"},
                        "superset_with": {"type": "string", "description": "Name of exercise to superset with, or null"},
                    },
                    "required": ["exercise", "sets", "reps", "weight_lbs", "rpe_target", "rest_seconds", "muscle_group"],
                },
            },
            "estimated_duration_min": {"type": "integer", "description": "Estimated total workout duration in minutes"},
            "total_sets": {"type": "integer", "description": "Total sets in the workout"},
            "total_volume_lbs": {"type": "integer", "description": "Estimated total volume (weight x reps across all sets)"},
            "progressive_overload": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "exercise": {"type": "string"},
                        "last_performance": {"type": "string", "description": "e.g. '225 x 8 @ RPE 8'"},
                        "today_target": {"type": "string", "description": "e.g. '230 x 8 @ RPE 8' or '225 x 9'"},
                        "strategy": {"type": "string", "description": "e.g. 'Add 5 lbs', 'Add 1 rep', 'Reduce RPE'"},
                    },
                    "required": ["exercise", "today_target", "strategy"],
                },
                "description": "Specific progressive overload recommendations for exercises the user has done before",
            },
            "deload_note": {"type": "string", "description": "If a deload is needed, explain why. Null otherwise."},
            "warmup": {"type": "string", "description": "Brief warmup recommendation (2-3 sentences)"},
        },
        "required": ["title", "split", "summary", "target_muscles", "exercises", "estimated_duration_min", "total_sets", "progressive_overload"],
    },
}


PROGRAM_TOOL = {
    "name": "generate_program",
    "description": "Generate a structured multi-week periodized training program",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Program title, e.g. '4-Week Hypertrophy Block — Upper/Lower'"},
            "goal": {"type": "string"},
            "split_type": {"type": "string", "description": "e.g. 'Upper/Lower', 'Push/Pull/Legs', 'Full Body', 'Bro Split'"},
            "rationale": {"type": "string", "description": "2-3 sentences: why this program structure for this user"},
            "weekly_template": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "day_number": {"type": "integer", "description": "1-indexed training day within the week"},
                        "day_of_week": {"type": "string", "description": "e.g. Monday, Tuesday"},
                        "focus": {"type": "string", "description": "e.g. 'Upper A — Horizontal Push/Pull'"},
                        "target_muscles": {"type": "array", "items": {"type": "string"}},
                        "exercises": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "exercise": {"type": "string"},
                                    "equipment": {"type": "string"},
                                    "sets": {"type": "integer"},
                                    "reps": {"type": "string"},
                                    "week_1_weight": {"type": "integer", "description": "Target weight for week 1"},
                                    "progression": {"type": "string", "description": "How to progress across weeks, e.g. '+5 lbs/week'"},
                                    "rpe_target": {"type": "number"},
                                    "rest_seconds": {"type": "integer"},
                                    "notes": {"type": "string"},
                                    "muscle_group": {"type": "string"},
                                },
                                "required": ["exercise", "sets", "reps", "week_1_weight", "progression", "muscle_group"],
                            },
                        },
                        "volume_sets": {"type": "integer", "description": "Total working sets for this day"},
                        "estimated_duration_min": {"type": "integer"},
                    },
                    "required": ["day_number", "day_of_week", "focus", "target_muscles", "exercises", "volume_sets"],
                },
            },
            "progression_rules": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string", "description": "e.g. 'Compounds', 'Accessories', 'Isolation'"},
                        "rule": {"type": "string", "description": "e.g. 'Add 5 lbs/week if all sets at target RPE'"},
                    },
                    "required": ["category", "rule"],
                },
            },
            "weekly_volume_targets": {
                "type": "object",
                "description": "Target weekly sets per muscle group, e.g. {\"Chest\": 16, \"Back\": 18}",
                "additionalProperties": {"type": "integer"},
            },
            "deload_week": {"type": "integer", "description": "Which week is deload (0 for none)"},
            "deload_strategy": {"type": "string", "description": "How to deload: reduce volume, intensity, or both"},
        },
        "required": ["title", "goal", "split_type", "rationale", "weekly_template", "progression_rules", "weekly_volume_targets"],
    },
}


class GymCoach:
    def __init__(self, bearer_token: str | None = None):
        self.client = None
        if bearer_token:
            os.environ["AWS_BEARER_TOKEN_BEDROCK"] = bearer_token
        self._init_client()

    def _init_client(self):
        try:
            self.client = boto3.client(
                "bedrock-runtime",
                region_name="us-east-1",
            )
        except Exception as e:
            print(f"Bedrock client init failed: {e}")

    def _invoke_raw(self, system: str, messages: list, **kwargs) -> dict:
        """Low-level invoke_model call. Returns the full parsed response."""
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "system": system,
            "messages": messages,
            **kwargs,
        }
        response = self.client.invoke_model(
            modelId=MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(body),
        )
        return json.loads(response["body"].read())

    def _invoke_text(self, system: str, user_message: str) -> str:
        """Single call with extended thinking. Returns text."""
        if not self.client:
            return "AI coach not available. Check Bedrock credentials."
        try:
            result = self._invoke_raw(
                system=system,
                messages=[{"role": "user", "content": user_message}],
                max_tokens=16000,
                thinking={"type": "enabled", "budget_tokens": 10000},
            )
            for block in result.get("content", []):
                if block.get("type") == "text":
                    return block["text"]
            return str(result)
        except Exception as e:
            return f"AI coach error: {str(e)}"

    def _invoke_structured(self, system: str, user_message: str, tool: dict) -> dict | str:
        """Single pass with forced tool use for structured output."""
        if not self.client:
            return "AI coach not available. Check Bedrock credentials."
        try:
            result = self._invoke_raw(
                system=system,
                messages=[{"role": "user", "content": user_message}],
                max_tokens=8000,
                tools=[tool],
                tool_choice={"type": "tool", "name": tool["name"]},
            )

            for block in result.get("content", []):
                if block.get("type") == "tool_use":
                    return block.get("input", {})

            return "No structured output returned"
        except Exception as e:
            return f"AI coach error: {str(e)}"

    def _format_context(self, ctx: dict) -> str:
        """Format rich training context into a readable string for the prompt."""
        parts = []

        if ctx.get("training_days"):
            parts.append(f"Training days in period: {', '.join(ctx['training_days'])}")
            parts.append(f"Total sets: {ctx.get('total_sets', 0)}, Total volume: {ctx.get('total_volume', 0):,} lbs")

        if ctx.get("exercise_prs"):
            parts.append("\nExercise PRs (estimated 1RM):")
            for ex, pr in sorted(ctx["exercise_prs"].items(), key=lambda x: -x[1]["e1rm"]):
                parts.append(f"  {ex}: e1RM {pr['e1rm']} lbs (best set: {pr['best_set']}, {pr['date']})")

        if ctx.get("muscle_volume_14d"):
            parts.append("\n14-day volume per muscle group:")
            for group, vol in sorted(ctx["muscle_volume_14d"].items(), key=lambda x: -x[1]):
                parts.append(f"  {group}: {vol:,} lbs")

        if ctx.get("last_trained"):
            parts.append("\nLast trained each group:")
            for group, d in ctx["last_trained"].items():
                parts.append(f"  {group}: {d}")

        if ctx.get("history"):
            parts.append("\nDetailed set log:")
            parts.append(self._format_history(ctx["history"]))

        return "\n".join(parts) if parts else "No training data available."

    def suggest_workout(self, user: str, ctx: dict, goal: str = "hypertrophy") -> dict | str:
        today = datetime.now().strftime("%A, %B %d")
        context_text = self._format_context(ctx)

        user_message = f"""User: {user}
Goal: {goal}
Today: {today}

{context_text}

Design {user}'s workout for today. Consider:
- Which muscle groups haven't been trained recently (prioritize those)
- Progressive overload: for exercises the user has done before, increase weight by 2.5-5 lbs or add 1-2 reps
- For {goal}: {'higher volume (3-4 sets of 8-12 reps, shorter rest)' if goal == 'hypertrophy' else 'lower reps, heavier weight (4-5 sets of 3-6 reps, longer rest)'}
- RPE targets: 7-8 for working sets, 9 for top sets
- Include a warmup recommendation
- Use ONLY equipment from the available list
- Specify exact weights based on the PR data (not vague terms like "moderate")
- If the user is showing signs of fatigue (high RPE trend, declining performance), recommend a deload"""

        return self._invoke_structured(
            system=SYSTEM_PROMPT,
            user_message=user_message,
            tool=WORKOUT_SUGGEST_TOOL,
        )

    def analyze_progress(self, user: str, ctx: dict) -> str:
        context_text = self._format_context(ctx)

        user_message = f"""User: {user}

{context_text}

Analyze this training data. Provide:
1. Progressive overload progress — are weights/reps increasing per exercise?
2. Volume per muscle group per week — is it balanced? Any lagging groups?
3. Signs of fatigue (RPE creeping up at same weights, performance declining)
4. Deload recommendation — is one needed based on accumulated fatigue?
5. Specific actionable suggestions for next week with concrete numbers"""

        return self._invoke_text(system=SYSTEM_PROMPT, user_message=user_message)

    def generate_nine_round(
        self,
        user: str,
        training_history: list[dict],
        round_duration: int = 180,
        rest_duration: int = 30,
        liked_rounds: list[dict] | None = None,
        disliked_rounds: list[dict] | None = None,
    ) -> dict:
        if not self.client:
            return {"error": "AI coach not available."}

        history_text = self._format_history(training_history)

        liked_text = ""
        if liked_rounds:
            liked_text = "\n\nRounds the user LIKED previously (generate more like these):\n" + "\n".join(
                f"  - R{r.get('round')}: {r.get('station')} - {r.get('exercise')} ({r.get('notes')})"
                for r in liked_rounds
            )
        disliked_text = ""
        if disliked_rounds:
            disliked_text = "\n\nRounds the user DISLIKED (avoid these patterns):\n" + "\n".join(
                f"  - R{r.get('round')}: {r.get('station')} - {r.get('exercise')}"
                for r in disliked_rounds
            )

        user_message = f"""Generate a 9-Round kickboxing + strength circuit workout for {user}.

Each round: {round_duration}s work, {rest_duration}s active rest.

Station order (MUST follow exactly):
1. Cardio Warmup
2. Heavy Bag - Boxing
3. Speed Bag / Rhythm
4. Heavy Bag - Kickboxing
5. Upper Body Weights
6. Lower Body Weights
7. Core / Abs
8. Conditioning
9. Burnout Finisher

CRITICAL for boxing/kickboxing rounds:
- Use standard combo notation: 1=jab, 2=cross, 3=lead hook, 4=rear hook, 5=lead uppercut, 6=rear uppercut
- Write SPECIFIC multi-punch combos like "1-1-2-3-2 (double jab, cross, hook, cross)"
- Include defensive movement: slips, rolls, pivots between combos
- Layer combos from simple (start of round) to complex (end of round)
- For kickboxing: name specific kicks (rear roundhouse, lead teep, switch kick, knee strike)
- Mix head and body targets

For weight rounds: specify the exercise, rep scheme, and relative intensity.
For conditioning: specify work/rest intervals within the round.

Recent training: {history_text if history_text else "No recent data."}
{liked_text}{disliked_text}"""

        result = self._invoke_structured(
            system=SYSTEM_PROMPT,
            user_message=user_message,
            tool=NINE_ROUND_TOOL,
        )

        if isinstance(result, dict) and "rounds" in result:
            for r in result["rounds"]:
                r["duration"] = round_duration
                r["rest_duration"] = rest_duration if r["round"] < 9 else 0
                if r["round"] == 9:
                    r["rest_exercise"] = None

            total_time = (round_duration * 9) + (rest_duration * 8)
            return {
                "type": "nine_round",
                "rounds": result["rounds"],
                "round_duration": round_duration,
                "rest_duration": rest_duration,
                "total_time_seconds": total_time,
                "total_time_display": f"{total_time // 60}:{total_time % 60:02d}",
                "ai_generated": True,
            }

        return {"error": str(result)}

    def generate_session_narrative(self, user: str, session_data: dict) -> str:
        """Short post-workout coaching narrative (3-4 sentences)."""
        if not self.client:
            return "AI coach not available."
        try:
            prs_text = ""
            if session_data.get("prs"):
                prs_text = "\nNew PRs hit: " + ", ".join(
                    f"{pr['exercise']} ({pr['new_e1rm']} lbs e1RM, was {pr.get('previous_e1rm', '?')})"
                    for pr in session_data["prs"]
                )

            user_message = f"""User: {user}
Session completed today:
- Total sets: {session_data.get('total_sets', 0)}
- Total volume: {session_data.get('total_volume', 0):,} lbs
- Exercises: {', '.join(session_data.get('exercises', []))}
- Muscle groups: {', '.join(session_data.get('muscle_groups', []))}{prs_text}

Write a 3-4 sentence post-workout coaching summary. Be specific about accomplishments, highlight PRs if any, and give one actionable recovery or next-session tip. Encouraging but not cheesy."""

            result = self._invoke_raw(
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
                max_tokens=500,
            )
            for block in result.get("content", []):
                if block.get("type") == "text":
                    return block["text"]
            return str(result)
        except Exception as e:
            return f"AI coach error: {str(e)}"

    def generate_program(self, user: str, ctx: dict, goal: str, days_per_week: int, weeks: int, notes: str = "") -> dict | str:
        """Generate a multi-week periodized training program."""
        context_text = self._format_context(ctx)
        today = datetime.now().strftime("%A, %B %d")

        notes_text = f"\nUser notes/constraints: {notes}" if notes else ""

        user_message = f"""User: {user}
Goal: {goal}
Days per week: {days_per_week}
Program length: {weeks} weeks
Today: {today}
{notes_text}

{context_text}

Design a {weeks}-week {goal} program for {days_per_week} training days per week. Consider:
- The user's current strength levels from their PR data
- Muscle groups that need more volume based on recent training
- Progressive overload: plan weight/rep increases across weeks
- Include a deload in the final week if program is 4+ weeks
- Use ONLY equipment from the available list
- Assign specific days of the week based on {days_per_week} days
- Each day should have a clear focus (e.g. Upper A, Lower B, Push, Pull)
- Provide concrete weight targets based on PR data"""

        return self._invoke_structured(
            system=SYSTEM_PROMPT,
            user_message=user_message,
            tool=PROGRAM_TOOL,
        )

    def _format_history(self, history: list[dict]) -> str:
        if not history:
            return ""
        lines = []
        current_date = None
        for entry in history:
            date = entry.get("session_date", "")
            if date != current_date:
                current_date = date
                lines.append(f"\n## {date}")
            exercise = entry.get("exercise", "?")
            weight = entry.get("weight", 0)
            reps = entry.get("reps", 0)
            set_num = entry.get("set_number", 0)
            rpe = entry.get("rpe")
            rpe_str = f" RPE {rpe}" if rpe else ""
            lines.append(f"  {exercise}: Set {set_num} - {weight}lbs x {reps}{rpe_str}")
        return "\n".join(lines)
