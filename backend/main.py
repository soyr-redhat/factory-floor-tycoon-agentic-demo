from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from models import AgentConfig, GameConfig, LeaderboardEntry
from agent import FactoryAgent
from factory import FactorySimulation

app = FastAPI(title="Factory Floor Tycoon API")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active games
active_games: Dict[str, FactorySimulation] = {}

# Leaderboard storage (can be mounted to PVC in OpenShift)
LEADERBOARD_FILE = Path(os.getenv("LEADERBOARD_PATH", "./data/leaderboard.json"))
LEADERBOARD_FILE.parent.mkdir(parents=True, exist_ok=True)

def load_leaderboard() -> List[Dict]:
    """Load leaderboard from file"""
    if not LEADERBOARD_FILE.exists():
        return []
    try:
        with open(LEADERBOARD_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading leaderboard: {e}")
        return []

def save_leaderboard(entries: List[Dict]):
    """Save leaderboard to file"""
    try:
        with open(LEADERBOARD_FILE, 'w') as f:
            json.dump(entries, f, indent=2)
    except Exception as e:
        print(f"Error saving leaderboard: {e}")

# Preset agent prompts
PRESET_PROMPTS = {
    "aggressive": """You are an aggressive factory worker focused on MAXIMUM PRODUCTION at all costs.
Your strategy: Produce as many items as possible, ship quickly, don't worry too much about quality.
Only rest when absolutely necessary (below 20% energy). Ignore most quality checks.
Speed and volume are your priorities. Take risks!
When you have profit, buy Energy Drinks ($20) to keep working instead of resting.""",

    "quality_focused": """You are a quality-focused factory worker who believes "quality over quantity".
Your strategy: Always maintain high quality scores (above 80%). Regularly perform quality checks.
Only ship items when quality is excellent. Rest when needed to maintain consistent performance.
Your reputation for quality will lead to higher profits per item.
Invest in Quality Boosts ($30) when you have the profit to maintain premium standards.""",

    "balanced": """You are a balanced factory worker who optimizes for sustainable profit.
Your strategy: Balance production, quality, and energy management.
Perform quality checks regularly but not excessively. Rest when energy drops below 40%.
Fix machines promptly when they break. Aim for steady, consistent profit growth.
Once you've earned $50+, buy the Efficiency Upgrade for permanent -20% energy costs on all actions.""",

    "opportunistic": """You are an opportunistic factory worker who adapts to events.
Your strategy: React quickly to events - fix broken machines immediately, capitalize on rush orders,
maintain medium quality. Energy management is key. Take advantage of bonus opportunities.
Be flexible and adaptive to changing conditions.
Use powerups strategically: Energy Drinks ($20) for rush orders, Quality Boosts ($30) when quality drops.""",

    "energy_efficient": """You are an energy-efficient factory worker who minimizes waste.
Your strategy: Conserve energy for maximum long-term output. Rest frequently to maintain high energy.
Work in short bursts rather than long sessions. Prioritize low-energy tasks like packaging.
Sustainable operation leads to winning the marathon, not the sprint.
Save up for the Efficiency Upgrade ($50) early - it reduces all energy costs by 20% permanently."""
}

@app.get("/")
async def root():
    return {
        "service": "Factory Floor Tycoon",
        "status": "running",
        "demo_type": "Agentic AI"
    }

@app.get("/presets")
async def get_presets():
    """Get preset agent prompts"""
    return {
        "presets": {
            name: {"name": name.replace("_", " ").title(), "prompt": prompt}
            for name, prompt in PRESET_PROMPTS.items()
        }
    }

@app.post("/game/start")
async def start_game(agents: List[AgentConfig], config: GameConfig = GameConfig()):
    """Start a new game with the given agents"""
    game_id = f"game_{len(active_games) + 1}"

    # Create agent instances
    agent_instances = []
    for agent_config in agents:
        agent = FactoryAgent(
            name=agent_config.name,
            system_prompt=agent_config.system_prompt,
            color=agent_config.color
        )
        agent_instances.append(agent)

    # Create simulation
    simulation = FactorySimulation(agent_instances, config)
    active_games[game_id] = simulation

    return {
        "game_id": game_id,
        "agents": [a.name for a in agents],
        "config": config.model_dump()
    }

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    """WebSocket endpoint for real-time game updates"""
    await websocket.accept()

    if game_id not in active_games:
        await websocket.send_json({"error": "Game not found"})
        await websocket.close()
        return

    simulation = active_games[game_id]

    async def handle_control_messages():
        """Listen for control messages from client"""
        try:
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)

                if message.get("type") == "pause":
                    simulation.paused = True
                elif message.get("type") == "resume":
                    simulation.paused = False
                elif message.get("type") == "speed":
                    simulation.speed = message.get("speed", 1.0)
        except:
            pass

    # Start listening for control messages
    control_task = asyncio.create_task(handle_control_messages())

    try:
        # Send initial state
        await websocket.send_json({
            "type": "init",
            "state": simulation.state.model_dump()
        })

        # Run simulation
        while not simulation.is_game_over():
            # Check if paused
            if simulation.paused:
                await asyncio.sleep(0.5)
                continue

            # Run one round
            print(f"=== Starting Round {simulation.round_num + 1}/{simulation.config.num_rounds} ===")
            import time
            round_start = time.time()

            round_data = await simulation.run_round()

            round_elapsed = time.time() - round_start
            print(f"=== Round {simulation.round_num} completed in {round_elapsed:.2f}s ===")

            # Send update to client
            await websocket.send_json({
                "type": "round_update",
                "data": round_data
            })

            # Wait before next round (adjusted by speed)
            base_delay = 2.0
            delay = base_delay / simulation.speed
            await asyncio.sleep(delay)

        # Game over
        leaderboard = simulation.get_leaderboard()
        await websocket.send_json({
            "type": "game_over",
            "leaderboard": leaderboard
        })

    except WebSocketDisconnect:
        print(f"Client disconnected from game {game_id}")
    except Exception as e:
        import traceback
        print(f"Error in WebSocket for game {game_id}: {e}")
        print(traceback.format_exc())
        # Try to send error, but don't crash if websocket already closed
        try:
            await websocket.send_json({"type": "error", "error": str(e)})
        except:
            pass  # Websocket already closed
    finally:
        # Clean up
        control_task.cancel()  # Cancel the control message listener
        if game_id in active_games:
            del active_games[game_id]
            print(f"Cleaned up game {game_id}")

@app.get("/game/{game_id}/leaderboard")
async def get_leaderboard(game_id: str):
    """Get current leaderboard for a game"""
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    simulation = active_games[game_id]
    return {"leaderboard": simulation.get_leaderboard()}

@app.get("/leaderboard")
async def get_leaderboard(limit: int = 50):
    """Get top entries from the leaderboard"""
    entries = load_leaderboard()
    # Sort by profit descending
    entries.sort(key=lambda x: x.get('profit', 0), reverse=True)
    return {"leaderboard": entries[:limit]}

@app.post("/leaderboard")
async def post_to_leaderboard(entry: LeaderboardEntry):
    """Submit an agent result to the leaderboard"""
    entries = load_leaderboard()

    # Add timestamp
    entry_dict = entry.model_dump()
    entry_dict['timestamp'] = datetime.utcnow().isoformat()

    # Check for near-duplicate submissions (same agent, user, and stats within 5 minutes)
    cutoff_time = datetime.utcnow()
    is_duplicate = False
    for existing in entries:
        # Parse existing timestamp
        try:
            existing_time = datetime.fromisoformat(existing.get('timestamp', ''))
            time_diff = (cutoff_time - existing_time).total_seconds()
        except:
            time_diff = float('inf')

        # Check if this is a duplicate (same agent, user, and nearly identical results within 5 min)
        if (existing.get('agent_name') == entry_dict['agent_name'] and
            existing.get('user_name') == entry_dict['user_name'] and
            abs(existing.get('profit', 0) - entry_dict['profit']) < 0.01 and
            existing.get('items_shipped') == entry_dict['items_shipped'] and
            time_diff < 300):  # 5 minutes
            is_duplicate = True
            print(f"Duplicate submission detected: {entry_dict['agent_name']} by {entry_dict['user_name']}")
            break

    if not is_duplicate:
        # Add to leaderboard
        entries.append(entry_dict)

        # Keep only top 1000 entries to prevent unbounded growth
        entries.sort(key=lambda x: x.get('profit', 0), reverse=True)
        entries = entries[:1000]

        save_leaderboard(entries)

        return {"success": True, "rank": entries.index(entry_dict) + 1, "duplicate": False}
    else:
        return {"success": True, "rank": -1, "duplicate": True, "message": "Duplicate submission ignored"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
