from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import asyncio
import json
from models import AgentConfig, GameConfig
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

# Preset agent prompts
PRESET_PROMPTS = {
    "aggressive": """You are an aggressive factory worker focused on MAXIMUM PRODUCTION at all costs.
Your strategy: Produce as many items as possible, ship quickly, don't worry too much about quality.
Only rest when absolutely necessary (below 20% energy). Ignore most quality checks.
Speed and volume are your priorities. Take risks!""",

    "quality_focused": """You are a quality-focused factory worker who believes "quality over quantity".
Your strategy: Always maintain high quality scores (above 80%). Regularly perform quality checks.
Only ship items when quality is excellent. Rest when needed to maintain consistent performance.
Your reputation for quality will lead to higher profits per item.""",

    "balanced": """You are a balanced factory worker who optimizes for sustainable profit.
Your strategy: Balance production, quality, and energy management.
Perform quality checks regularly but not excessively. Rest when energy drops below 40%.
Fix machines promptly when they break. Aim for steady, consistent profit growth.""",

    "opportunistic": """You are an opportunistic factory worker who adapts to events.
Your strategy: React quickly to events - fix broken machines immediately, capitalize on rush orders,
maintain medium quality. Energy management is key. Take advantage of bonus opportunities.
Be flexible and adaptive to changing conditions.""",

    "energy_efficient": """You are an energy-efficient factory worker who minimizes waste.
Your strategy: Conserve energy for maximum long-term output. Rest frequently to maintain high energy.
Work in short bursts rather than long sessions. Prioritize low-energy tasks like packaging.
Sustainable operation leads to winning the marathon, not the sprint."""
}

@app.get("/")
async def root():
    return {
        "service": "Factory Floor Tycoon",
        "status": "running",
        "pillar": "Agentic AI"
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
            round_data = await simulation.run_round()

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
        print(f"Error in WebSocket: {e}")
        await websocket.send_json({"error": str(e)})
    finally:
        # Clean up
        if game_id in active_games:
            del active_games[game_id]

@app.get("/game/{game_id}/leaderboard")
async def get_leaderboard(game_id: str):
    """Get current leaderboard for a game"""
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    simulation = active_games[game_id]
    return {"leaderboard": simulation.get_leaderboard()}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
