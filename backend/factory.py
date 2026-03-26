import random
import asyncio
from typing import List, Dict
from models import FactoryState, FactoryEvent, EventType, AgentAction, GameConfig
from agent import FactoryAgent

class FactorySimulation:
    def __init__(self, agents: List[FactoryAgent], config: GameConfig):
        self.agents = agents
        self.config = config
        self.state = FactoryState(
            agents=[agent.state for agent in agents],
            inventory=config.starting_inventory,
            pending_orders=config.starting_orders
        )
        self.round_num = 0
        self.actions_log: List[AgentAction] = []
        self.paused = False
        self.speed = 1.0  # 0.5 = slow, 1.0 = normal, 2.0 = fast

    def generate_random_event(self) -> FactoryEvent:
        """Generate a random factory event"""
        if random.random() > self.config.event_frequency:
            return None

        event_types = [
            (EventType.MACHINE_BREAKDOWN, "A machine has broken down!", 2),
            (EventType.RUSH_ORDER, "Rush order received! +5 pending orders", 1),
            (EventType.QUALITY_ISSUE, "Quality issue detected! Standards raised", 2),
            (EventType.SUPPLIER_DELAY, "Supplier delay - production costs increased", 1),
            (EventType.BONUS_ORDER, "Bonus order! Double profit for next shipment", 1),
        ]

        event_type, description, severity = random.choice(event_types)
        event = FactoryEvent(
            type=event_type,
            description=description,
            timestamp=self.state.game_time,
            severity=severity
        )

        # Apply event effects
        if event_type == EventType.MACHINE_BREAKDOWN:
            machines = ["assembly", "qc", "packaging", "shipping"]
            working_machines = [m for m in machines if self.state.machine_status[m]]
            if working_machines:
                broken = random.choice(working_machines)
                self.state.machine_status[broken] = False
                event.description = f"The {broken} machine has broken down!"

        elif event_type == EventType.RUSH_ORDER:
            self.state.pending_orders += 5

        elif event_type == EventType.QUALITY_ISSUE:
            for agent in self.agents:
                agent.state.quality_score = max(50, agent.state.quality_score - 10)

        return event

    def add_periodic_orders(self):
        """Add new orders periodically"""
        # Every 3 rounds: regular orders
        if self.round_num % 3 == 0:
            new_orders = random.randint(2, 5)
            for agent in self.agents:
                agent.state.pending_orders += new_orders

        # Every 10 rounds: bonus batch of orders
        if self.round_num % 10 == 0:
            bonus_orders = 10
            for agent in self.agents:
                agent.state.pending_orders += bonus_orders
            # Log this as an event
            event = FactoryEvent(
                type=EventType.RUSH_ORDER,
                description=f"Large order batch! +{bonus_orders} orders",
                timestamp=self.state.game_time,
                severity=2
            )
            self.state.events.append(event)

    async def run_round(self) -> Dict:
        """Run one round of the simulation"""
        self.round_num += 1
        self.state.game_time += 1

        round_data = {
            "round": self.round_num,
            "events": [],
            "actions": [],
            "profit_snapshot": {}  # Track profit per agent per round for charting
        }

        # Deduct operating costs from all agents
        operating_cost = 2.0  # $2 per round to keep factory running
        for agent in self.agents:
            agent.state.profit -= operating_cost
            # Small energy decay (1% per round)
            agent.state.energy = max(0, agent.state.energy - 1)
            # Quality naturally degrades over time (production wear and tear)
            agent.state.quality_score = max(50, agent.state.quality_score - 0.5)

        # Generate random event
        event = self.generate_random_event()
        if event:
            self.state.events.append(event)
            round_data["events"].append(event.model_dump())

        # Add periodic orders
        self.add_periodic_orders()

        # Each agent decides and executes an action
        # Run decisions in parallel to speed up rounds
        async def process_agent(agent):
            try:
                print(f"[Round {self.round_num}] {agent.name} deciding...")
                # Agent decides what to do (synchronous LLM call)
                decision = await asyncio.to_thread(
                    agent.decide_action,
                    self.state,
                    self.state.events[-5:]
                )
                print(f"[Round {self.round_num}] {agent.name} decided: {decision['action']}")

                # Execute the action
                result = agent.execute_action(
                    decision["action"],
                    decision.get("arguments", {}),
                    self.state
                )

                # Track action in agent's history for memory
                agent.action_history.append({
                    "action": decision["action"],
                    "arguments": decision.get("arguments", {}),
                    "reasoning": decision.get("reasoning", ""),
                    "result": result["message"]
                })
                # Keep only last 10 actions to avoid context bloat
                if len(agent.action_history) > 10:
                    agent.action_history.pop(0)

                # Map function names to TaskType for logging
                action_map = {
                    "work_assembly": "assembly",
                    "quality_check": "quality_control",
                    "package_items": "packaging",
                    "ship_orders": "shipping",
                    "repair_machine": "repair",
                    "rest": "assembly",
                    "buy_powerup": "powerup"
                }

                # Log the action (skip model validation, just log to actions list)
                return {
                    "agent": agent.name,
                    "action": decision["action"],
                    "reasoning": decision.get("reasoning", ""),
                    "result": result["message"],
                    "success": result["success"]
                }

            except Exception as e:
                import traceback
                print(f"ERROR in agent {agent.name}: {e}")
                print(traceback.format_exc())
                return {
                    "agent": agent.name,
                    "action": "error",
                    "reasoning": str(e),
                    "result": f"Action failed: {type(e).__name__}",
                    "success": False
                }

        # Process all agents in parallel
        print(f"[Round {self.round_num}] Starting parallel agent decisions...")
        agent_results = await asyncio.gather(*[process_agent(agent) for agent in self.agents])
        round_data["actions"].extend(agent_results)
        print(f"[Round {self.round_num}] All agents completed")

        # Update state
        self.state.agents = [agent.state for agent in self.agents]
        round_data["state"] = self.state.model_dump()

        # Capture profit snapshot for charting
        for agent in self.agents:
            round_data["profit_snapshot"][agent.name] = agent.state.profit

        return round_data

    def get_leaderboard(self) -> List[Dict]:
        """Get current leaderboard"""
        leaderboard = []
        for agent in self.agents:
            leaderboard.append({
                "name": agent.name,
                "profit": agent.state.profit,
                "items_produced": agent.state.items_produced,
                "items_shipped": agent.state.items_shipped,
                "quality_score": agent.state.quality_score,
                "efficiency": agent.state.efficiency
            })

        return sorted(leaderboard, key=lambda x: x["profit"], reverse=True)

    def is_game_over(self) -> bool:
        """Check if game is complete"""
        return self.round_num >= self.config.num_rounds
