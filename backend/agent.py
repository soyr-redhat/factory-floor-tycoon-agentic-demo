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
            if factory_state.pending_orders < units:
                # No orders to ship - should produce instead
                return {"valid": False, "reason": "No pending orders", "alternative": "work_assembly", "alt_arguments": {"units": 3}}
            if factory_state.inventory < units:
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
            if factory_state.inventory < units:
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
                if factory_state.inventory > 0 and factory_state.pending_orders > 0:
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
- Factory Inventory: {factory_state.inventory} items
- Pending Orders: {factory_state.pending_orders} orders waiting

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
                tool_choice="required",  # Force the model to use a tool
                temperature=0.7
            )

            message = response.choices[0].message

            # Extract reasoning
            reasoning = message.content or "Analyzing situation..."
            self.state.thinking = reasoning

            # Check if agent wants to use a tool
            if message.tool_calls:
                tool_call = message.tool_calls[0]
                action_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)

                print(f"LLM Decision: {self.name} wants {action_name} with args {arguments}")

                # GUARDRAILS: Validate and potentially adjust the LLM's decision
                validated = self._validate_action(action_name, arguments, factory_state)

                if validated["valid"]:
                    print(f"  ✓ Valid action")
                    return {
                        "action": validated["action"],
                        "arguments": validated["arguments"],
                        "reasoning": reasoning
                    }
                else:
                    print(f"  ✗ Invalid: {validated['reason']}. Suggesting: {validated['alternative']}")
                    return {
                        "action": validated["alternative"],
                        "arguments": validated["alt_arguments"],
                        "reasoning": f"{reasoning} [Adjusted: {validated['reason']}]"
                    }
            else:
                # Model doesn't support function calling properly
                # Use smart fallback based on factory state
                print(f"WARNING: {self.name} - No tool call returned (model doesn't support function calling), using fallback logic")
                print(f"  LLM Response: {reasoning[:100]}...")

                # PRIORITY 1: Critical energy - must rest or can't do anything
                if self.state.energy < 20:
                    return {
                        "action": "rest",
                        "arguments": {},
                        "reasoning": f"Fallback: Critical energy ({self.state.energy:.1f}%), must rest"
                    }

                # PRIORITY 2: Ship if we have inventory and orders (MAKE PROFIT!)
                if factory_state.inventory >= 1 and factory_state.pending_orders >= 1 and self.state.energy >= 4:
                    units_to_ship = min(5, factory_state.pending_orders, factory_state.inventory)
                    # Check if we have enough energy to ship
                    if self.state.energy >= units_to_ship * 4:
                        return {
                            "action": "ship_orders",
                            "arguments": {"units": units_to_ship},
                            "reasoning": f"Fallback: Shipping {units_to_ship} units to make profit!"
                        }

                # PRIORITY 3: Broken machines block workflow (if we have energy to fix)
                broken_machines = [m for m, status in factory_state.machine_status.items() if not status]
                if broken_machines and self.state.energy >= 20:
                    return {
                        "action": "repair_machine",
                        "arguments": {"machine": broken_machines[0]},
                        "reasoning": f"Fallback: Repairing {broken_machines[0]}"
                    }

                # PRIORITY 4: Low energy - rest before it's critical
                if self.state.energy < 40:
                    return {
                        "action": "rest",
                        "arguments": {},
                        "reasoning": f"Fallback: Low energy ({self.state.energy:.1f}%), resting"
                    }

                # PRIORITY 5: Produce more items if we have energy
                if self.state.energy >= 15:
                    return {
                        "action": "work_assembly",
                        "arguments": {"units": 3},
                        "reasoning": "Fallback: Producing items to build inventory"
                    }

                # Last resort - rest
                return {
                    "action": "rest",
                    "arguments": {},
                    "reasoning": "Fallback: Default to resting"
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
            result["message"] = f"Inventory: {factory_state.inventory}, Orders: {factory_state.pending_orders}"

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
                factory_state.inventory += units
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
            elif factory_state.inventory < units:
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
            elif factory_state.pending_orders < units:
                result["success"] = False
                result["message"] = "Not enough pending orders!"
            elif factory_state.inventory < units:
                result["success"] = False
                result["message"] = "Not enough inventory!"
            elif self.state.energy < energy_needed:
                result["success"] = False
                result["message"] = "Not enough energy!"
            else:
                self.state.energy -= energy_needed
                factory_state.inventory -= units
                factory_state.pending_orders -= units
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
