import json
import os
from typing import Dict, List
from openai import OpenAI
from dotenv import load_dotenv
from models import TaskType, AgentState, FactoryState, FactoryEvent

# Load environment variables from .env file
load_dotenv()

class FactoryAgent:
    def __init__(self, name: str, system_prompt: str, color: str = "#EE0000"):
        self.name = name
        self.system_prompt = system_prompt
        self.color = color
        self.state = AgentState(name=name)

        # Initialize OpenAI client with MAAS endpoint
        self.client = OpenAI(
            api_key=os.getenv("LLM_API_KEY", ""),
            base_url=os.getenv("LLM_API_URL", "https://api.openai.com/v1")
        )
        self.model = os.getenv("MODEL_NAME", "gpt-3.5-turbo")

    def get_available_tools(self) -> List[Dict]:
        """Define tools the agent can use"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "check_inventory",
                    "description": "Check current inventory levels and pending orders. Use this sparingly as it provides no profit.",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "work_assembly",
                    "description": "Produce new items at the assembly station. Costs energy, produces items.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "units": {"type": "integer", "description": "Number of units to produce"}
                        },
                        "required": ["units"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "quality_check",
                    "description": "Inspect items for quality. Improves quality score but takes time.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "units": {"type": "integer", "description": "Number of units to inspect"}
                        },
                        "required": ["units"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "package_items",
                    "description": "Package items for shipping. Required before shipping.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "units": {"type": "integer", "description": "Number of units to package"}
                        },
                        "required": ["units"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "ship_orders",
                    "description": "Ship packaged items to fulfill orders. Generates profit.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "units": {"type": "integer", "description": "Number of units to ship"}
                        },
                        "required": ["units"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "repair_machine",
                    "description": "Repair a broken machine to restore functionality",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "machine": {"type": "string", "enum": ["assembly", "qc", "packaging", "shipping"]}
                        },
                        "required": ["machine"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "rest",
                    "description": "Rest to restore +30 energy. Generates no profit. Without energy, you cannot produce, package, ship, repair, or perform quality checks.",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "buy_powerup",
                    "description": "Purchase a power-up with profit. Options: 'quality_boost' ($30, +20% quality), 'energy_drink' ($20, +50 energy), 'efficiency_upgrade' ($50, permanent -20% energy costs)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "powerup": {"type": "string", "enum": ["quality_boost", "energy_drink", "efficiency_upgrade"]}
                        },
                        "required": ["powerup"]
                    }
                }
            }
        ]

    def _validate_action(self, action: str, arguments: Dict, factory_state: FactoryState) -> Dict:
        """Validate if an action is feasible and suggest alternatives if not"""

        units = arguments.get("units", 1)

        # Check energy requirements
        energy_costs = {
            "work_assembly": units * 5,
            "quality_check": units * 3,
            "package_items": units * 2,
            "ship_orders": units * 4,
            "repair_machine": 20,
            "rest": 0,
            "check_inventory": 0
        }

        energy_needed = energy_costs.get(action, 0)

        # Validate by action type
        if action == "work_assembly":
            if not factory_state.machine_status["assembly"]:
                return {"valid": False, "reason": "Assembly broken", "alternative": "repair_machine", "alt_arguments": {"machine": "assembly"}}
            if self.state.energy < energy_needed:
                return {"valid": False, "reason": "Low energy", "alternative": "rest", "alt_arguments": {}}
            return {"valid": True, "action": action, "arguments": arguments}

        elif action == "ship_orders":
            if self.state.pending_orders < units:
                # No orders to ship - should produce instead
                return {"valid": False, "reason": "No pending orders", "alternative": "work_assembly", "alt_arguments": {"units": 3}}
            if self.state.inventory < units:
                # Not enough inventory - produce more
                return {"valid": False, "reason": "Insufficient inventory", "alternative": "work_assembly", "alt_arguments": {"units": 3}}
            if not factory_state.machine_status["shipping"]:
                return {"valid": False, "reason": "Shipping broken", "alternative": "repair_machine", "alt_arguments": {"machine": "shipping"}}
            if self.state.energy < energy_needed:
                return {"valid": False, "reason": "Low energy", "alternative": "rest", "alt_arguments": {}}
            return {"valid": True, "action": action, "arguments": arguments}

        elif action == "quality_check":
            if not factory_state.machine_status["qc"]:
                return {"valid": False, "reason": "QC broken", "alternative": "repair_machine", "alt_arguments": {"machine": "qc"}}
            if self.state.energy < energy_needed:
                return {"valid": False, "reason": "Low energy", "alternative": "rest", "alt_arguments": {}}
            return {"valid": True, "action": action, "arguments": arguments}

        elif action == "package_items":
            if self.state.inventory < units:
                return {"valid": False, "reason": "Nothing to package", "alternative": "work_assembly", "alt_arguments": {"units": 3}}
            if not factory_state.machine_status["packaging"]:
                return {"valid": False, "reason": "Packaging broken", "alternative": "repair_machine", "alt_arguments": {"machine": "packaging"}}
            if self.state.energy < energy_needed:
                return {"valid": False, "reason": "Low energy", "alternative": "rest", "alt_arguments": {}}
            return {"valid": True, "action": action, "arguments": arguments}

        elif action == "repair_machine":
            machine = arguments.get("machine", "assembly")
            if factory_state.machine_status.get(machine, True):
                # Machine not broken - do something else
                if self.state.inventory > 0 and self.state.pending_orders > 0:
                    return {"valid": False, "reason": "Machine not broken", "alternative": "ship_orders", "alt_arguments": {"units": 1}}
                else:
                    return {"valid": False, "reason": "Machine not broken", "alternative": "work_assembly", "alt_arguments": {"units": 3}}
            if self.state.energy < 20:
                return {"valid": False, "reason": "Low energy", "alternative": "rest", "alt_arguments": {}}
            return {"valid": True, "action": action, "arguments": arguments}

        elif action == "rest":
            # Always valid
            return {"valid": True, "action": action, "arguments": arguments}

        elif action == "check_inventory":
            # Always valid but maybe not the best use of time
            return {"valid": True, "action": action, "arguments": arguments}

        elif action == "buy_powerup":
            powerup = arguments.get("powerup", "energy_drink")
            powerup_costs = {"quality_boost": 30, "energy_drink": 20, "efficiency_upgrade": 50}
            cost = powerup_costs.get(powerup, 0)

            if self.state.profit < cost:
                return {"valid": False, "reason": f"Can't afford ${cost}", "alternative": "work_assembly", "alt_arguments": {"units": 3}}

            # Don't buy efficiency upgrade if already have it
            if powerup == "efficiency_upgrade" and self.state.energy_cost_multiplier < 1.0:
                return {"valid": False, "reason": "Already have efficiency upgrade", "alternative": "work_assembly", "alt_arguments": {"units": 3}}

            return {"valid": True, "action": action, "arguments": arguments}

        # Unknown action
        return {"valid": False, "reason": "Unknown action", "alternative": "rest", "alt_arguments": {}}

    def decide_action(self, factory_state: FactoryState, recent_events: List[FactoryEvent]) -> Dict:
        """Use LLM to decide next action based on factory state"""

        # Build context about factory state
        context = f"""
Current Factory Status:
- Your Profit: ${self.state.profit:.2f} (Operating costs: $2/round + energy decay)
- Your Energy: {self.state.energy:.1f}%
- Your Quality Score: {self.state.quality_score:.1f}%
- Items Produced: {self.state.items_produced}
- Items Shipped: {self.state.items_shipped}
- Your Inventory: {self.state.inventory} items
- Your Pending Orders: {self.state.pending_orders} orders waiting

CRITICAL: SHIPPING ORDERS IS THE ONLY WAY TO MAKE PROFIT!
Workflow: Produce → (Optional: Quality Check) → Package → SHIP ORDERS
If inventory > 0 AND pending_orders > 0, you should SHIP to make money!

Machine Status:
- Assembly: {'✓' if factory_state.machine_status['assembly'] else '✗ BROKEN'}
- Quality Control: {'✓' if factory_state.machine_status['qc'] else '✗ BROKEN'}
- Packaging: {'✓' if factory_state.machine_status['packaging'] else '✗ BROKEN'}
- Shipping: {'✓' if factory_state.machine_status['shipping'] else '✗ BROKEN'}

Recent Events:
"""
        for event in recent_events[-3:]:
            context += f"- {event.description}\n"

        context += "\nCompetitor Status:\n"
        for agent in factory_state.agents:
            if agent.name != self.name:
                context += f"- {agent.name}: ${agent.profit:.2f} profit, {agent.items_shipped} shipped\n"

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": context + "\n\nWhat action should you take next to maximize profit?"}
        ]

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=self.get_available_tools(),
                tool_choice="auto",  # Let model decide whether to use a tool
                temperature=0.7
            )

            message = response.choices[0].message

            # Extract reasoning from the model's response
            reasoning = message.content or "Making decision..."
            self.state.thinking = reasoning

            # Check if agent wants to use a tool
            if message.tool_calls:
                tool_call = message.tool_calls[0]
                action_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)

                print(f"LLM Decision: {self.name} wants {action_name} with args {arguments}")
                print(f"  Reasoning: {reasoning[:100]}...")

                # Let the LLM's decision go through directly - it will learn from failures
                return {
                    "action": action_name,
                    "arguments": arguments,
                    "reasoning": reasoning
                }
            else:
                # Model didn't make a tool call - this shouldn't happen with Mistral
                print(f"WARNING: {self.name} - No tool call returned")
                print(f"  LLM Response: {reasoning}")

                # Default to a safe action
                return {
                    "action": "check_inventory",
                    "arguments": {},
                    "reasoning": reasoning or "No tool call made"
                }

        except Exception as e:
            print(f"Error in agent decision: {e}")
            # Fallback: rest if low energy, otherwise work assembly
            if self.state.energy < 30:
                return {"action": "rest", "arguments": {}, "reasoning": "Low energy, resting"}
            return {"action": "work_assembly", "arguments": {"units": 1}, "reasoning": "Default action"}

    def execute_action(self, action: str, arguments: Dict, factory_state: FactoryState) -> Dict:
        """Execute the chosen action and update state"""
        result = {"success": True, "message": ""}

        if action == "check_inventory":
            result["message"] = f"Inventory: {self.state.inventory}, Orders: {self.state.pending_orders}"

        elif action == "work_assembly":
            units = arguments.get("units", 1)
            energy_needed = int(units * 5 * self.state.energy_cost_multiplier)
            print(f"DEBUG {self.name}: work_assembly - units={units}, energy_needed={energy_needed}, current_energy={self.state.energy}")
            if not factory_state.machine_status["assembly"]:
                result["success"] = False
                result["message"] = "Assembly machine is broken!"
            elif self.state.energy < energy_needed:
                result["success"] = False
                result["message"] = f"Not enough energy! Need {energy_needed}, have {self.state.energy:.1f}"
            else:
                self.state.energy -= energy_needed
                self.state.items_produced += units
                self.state.inventory += units
                result["message"] = f"Produced {units} units"

        elif action == "quality_check":
            units = arguments.get("units", 1)
            energy_needed = int(units * 3 * self.state.energy_cost_multiplier)
            if not factory_state.machine_status["qc"]:
                result["success"] = False
                result["message"] = "QC machine is broken!"
            elif self.state.energy < energy_needed:
                result["success"] = False
                result["message"] = "Not enough energy!"
            else:
                self.state.energy -= energy_needed
                self.state.quality_score = min(100, self.state.quality_score + units * 2)
                result["message"] = f"Inspected {units} units, quality improved"

        elif action == "package_items":
            units = arguments.get("units", 1)
            energy_needed = int(units * 2 * self.state.energy_cost_multiplier)
            if not factory_state.machine_status["packaging"]:
                result["success"] = False
                result["message"] = "Packaging machine is broken!"
            elif self.state.inventory < units:
                result["success"] = False
                result["message"] = "Not enough inventory!"
            elif self.state.energy < energy_needed:
                result["success"] = False
                result["message"] = "Not enough energy!"
            else:
                self.state.energy -= energy_needed
                self.state.items_packaged += units
                result["message"] = f"Packaged {units} units (Total packaged: {self.state.items_packaged})"

        elif action == "ship_orders":
            units = arguments.get("units", 1)
            energy_needed = int(units * 4 * self.state.energy_cost_multiplier)
            if not factory_state.machine_status["shipping"]:
                result["success"] = False
                result["message"] = "Shipping machine is broken!"
            elif self.state.pending_orders < units:
                result["success"] = False
                result["message"] = "Not enough pending orders!"
            elif self.state.inventory < units:
                result["success"] = False
                result["message"] = "Not enough inventory!"
            elif self.state.energy < energy_needed:
                result["success"] = False
                result["message"] = "Not enough energy!"
            else:
                self.state.energy -= energy_needed
                self.state.inventory -= units
                self.state.pending_orders -= units
                self.state.items_shipped += units
                # Profit depends on quality score
                profit_per_unit = 10 * (self.state.quality_score / 100)
                earned = units * profit_per_unit
                self.state.profit += earned
                result["message"] = f"Shipped {units} units, earned ${earned:.2f}"

        elif action == "repair_machine":
            machine = arguments.get("machine", "assembly")
            energy_needed = int(20 * self.state.energy_cost_multiplier)
            if self.state.energy < energy_needed:
                result["success"] = False
                result["message"] = "Not enough energy!"
            else:
                self.state.energy -= energy_needed
                factory_state.machine_status[machine] = True
                result["message"] = f"Repaired {machine} machine"

        elif action == "rest":
            self.state.energy = min(100, self.state.energy + 30)
            result["message"] = "Rested and restored energy"

        elif action == "buy_powerup":
            powerup = arguments.get("powerup", "energy_drink")
            powerup_costs = {
                "quality_boost": 30,
                "energy_drink": 20,
                "efficiency_upgrade": 50
            }

            cost = powerup_costs.get(powerup, 0)

            if self.state.profit < cost:
                result["success"] = False
                result["message"] = f"Not enough profit! Need ${cost}, have ${self.state.profit:.2f}"
            else:
                self.state.profit -= cost

                if powerup == "quality_boost":
                    self.state.quality_score = min(100, self.state.quality_score + 20)
                    result["message"] = f"Bought Quality Boost for ${cost}! Quality now {self.state.quality_score:.0f}%"

                elif powerup == "energy_drink":
                    self.state.energy = min(100, self.state.energy + 50)
                    result["message"] = f"Bought Energy Drink for ${cost}! Energy now {self.state.energy:.0f}%"

                elif powerup == "efficiency_upgrade":
                    if self.state.energy_cost_multiplier < 1.0:
                        result["success"] = False
                        result["message"] = "Already have efficiency upgrade!"
                    else:
                        self.state.energy_cost_multiplier = 0.8
                        result["message"] = f"Bought Efficiency Upgrade for ${cost}! All actions now cost 20% less energy"

        return result
