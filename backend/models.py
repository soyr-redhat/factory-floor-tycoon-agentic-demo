from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum

class TaskType(str, Enum):
    ASSEMBLY = "assembly"
    QUALITY_CONTROL = "quality_control"
    PACKAGING = "packaging"
    SHIPPING = "shipping"
    REPAIR = "repair"
    INVENTORY = "inventory"

class EventType(str, Enum):
    MACHINE_BREAKDOWN = "machine_breakdown"
    RUSH_ORDER = "rush_order"
    QUALITY_ISSUE = "quality_issue"
    SUPPLIER_DELAY = "supplier_delay"
    BONUS_ORDER = "bonus_order"

class AgentConfig(BaseModel):
    name: str
    system_prompt: str
    color: str = "#EE0000"  # Red Hat red

class FactoryEvent(BaseModel):
    type: EventType
    description: str
    timestamp: float
    severity: int = 1  # 1-3

class AgentAction(BaseModel):
    agent_name: str
    action: TaskType
    reasoning: str
    timestamp: float
    success: bool = True

class AgentState(BaseModel):
    name: str
    position: Dict[str, int] = {"x": 0, "y": 0}
    current_task: Optional[TaskType] = None
    profit: float = 0.0
    efficiency: float = 100.0
    quality_score: float = 100.0
    items_produced: int = 0
    items_packaged: int = 0
    items_shipped: int = 0
    energy: float = 100.0
    thinking: str = ""
    powerups: Dict[str, int] = {}  # powerup_name -> uses remaining
    energy_cost_multiplier: float = 1.0  # Modified by upgrades
    inventory: int = 10  # Each agent has their own inventory
    pending_orders: int = 3  # Each agent has their own orders

class FactoryState(BaseModel):
    agents: List[AgentState]
    events: List[FactoryEvent] = []
    machine_status: Dict[str, bool] = {
        "assembly": True,
        "qc": True,
        "packaging": True,
        "shipping": True
    }
    inventory: int = 100
    pending_orders: int = 5
    game_time: float = 0.0
    is_running: bool = False

class GameConfig(BaseModel):
    num_rounds: int = Field(default=50, ge=10, le=200)
    event_frequency: float = Field(default=0.15, ge=0.0, le=1.0)
    starting_inventory: int = 10
    starting_orders: int = 3
