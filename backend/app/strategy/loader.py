import yaml
import json
from typing import Dict, Any, List
from pathlib import Path


class StrategyConfig:
    """Represents a loaded strategy configuration."""

    def __init__(self, config_data: Dict[str, Any]):
        self.name = config_data.get("name")
        self.description = config_data.get("description", "")
        self.instruments = config_data.get("instruments", [])
        self.entry_logic = config_data.get("entry_logic", {})
        self.exit_logic = config_data.get("exit_logic", {})
        self.risk_params = config_data.get("risk_params", {})

    def validate(self) -> bool:
        """Validate strategy configuration."""
        if not self.name:
            raise ValueError("Strategy must have a name")
        if not self.instruments:
            raise ValueError("Strategy must have at least one instrument")
        if not self.entry_logic:
            raise ValueError("Strategy must have entry logic")
        if not self.exit_logic:
            raise ValueError("Strategy must have exit logic")
        return True

    def to_dict(self) -> Dict[str, Any]:
        """Convert strategy to dictionary."""
        return {
            "name": self.name,
            "description": self.description,
            "instruments": self.instruments,
            "entry_logic": self.entry_logic,
            "exit_logic": self.exit_logic,
            "risk_params": self.risk_params,
        }


class StrategyLoader:
    """Load strategies from YAML/JSON files."""

    @staticmethod
    def load_yaml(file_path: str) -> StrategyConfig:
        """Load strategy from YAML file."""
        with open(file_path, "r") as f:
            data = yaml.safe_load(f)
        config = StrategyConfig(data)
        config.validate()
        return config

    @staticmethod
    def load_json(file_path: str) -> StrategyConfig:
        """Load strategy from JSON file."""
        with open(file_path, "r") as f:
            data = json.load(f)
        config = StrategyConfig(data)
        config.validate()
        return config

    @staticmethod
    def load_from_dict(data: Dict[str, Any]) -> StrategyConfig:
        """Load strategy from dictionary."""
        config = StrategyConfig(data)
        config.validate()
        return config

    @staticmethod
    def load(file_path: str) -> StrategyConfig:
        """Load strategy from file (auto-detect format)."""
        path = Path(file_path)
        if path.suffix.lower() == ".yaml" or path.suffix.lower() == ".yml":
            return StrategyLoader.load_yaml(file_path)
        elif path.suffix.lower() == ".json":
            return StrategyLoader.load_json(file_path)
        else:
            raise ValueError(f"Unsupported file format: {path.suffix}")


# Example strategy YAML structure
EXAMPLE_STRATEGY = """
name: "Moving Average Crossover"
description: "Entry when SMA20 > SMA50, exit on SL/TP"

instruments:
  - symbol: RELIANCE
    quantity: 1
    market: NSE

entry_logic:
  condition: "sma_20 > sma_50"
  price_type: "market"

exit_logic:
  stop_loss_percent: 2.0
  profit_target_percent: 5.0
  time_based_exit: "16:00"  # IST time

risk_params:
  max_positions: 5
  position_size_percent: 10.0
"""
