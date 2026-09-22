"""
normalization/units.py — Unit canonicalization preserving original
"""
from __future__ import annotations

from typing import Optional

CANONICAL = {
    "mm": "mm", "MM": "mm",
    "cm": "cm", "CM": "cm",
    "m": "m",
    "µm": "µm", "um": "µm", "uM": "µm",
    "nm": "nm",
    "kg": "kg", "KG": "kg", "Kg": "kg",
    "g": "g", "G": "g",
    "L": "L", "l": "L", "ML": "mL", "ml": "mL", "mL": "mL",
    "Pa": "Pa", "KPA": "kPa", "kPa": "kPa", "MPA": "MPa", "MPa": "MPa", "bar": "bar",
    "°C": "°C", "C": "°C", "c": "°C", "°F": "°F",
    "V": "V", "v": "V", "kV": "kV", "A": "A", "mA": "mA", "W": "W", "kW": "kW", "Hz": "Hz",
    "kHz": "kHz", "MHz": "MHz", "N": "N", "kN": "kN", "%": "%", "ppm": "ppm",
    "Ω": "Ω", "ohm": "Ω", "Ohm": "Ω",
}

def normalize_unit(unit: Optional[str]) -> Optional[str]:
    if not unit:
        return None
    return CANONICAL.get(unit.strip(), unit.strip())

def normalize_value_unit(value: float, unit: Optional[str]) -> tuple[float, Optional[str]]:
    """Hook for future conversions (currently preserves, just normalizes name)."""
    return value, normalize_unit(unit)
