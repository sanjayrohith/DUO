import json
from pathlib import Path

from duo_server.config import settings

SYSTEM_PROMPT = Path(settings.duo_persona_prompt_path).read_text()
FEW_SHOT_TURNS = json.loads(Path(settings.duo_persona_few_shot_path).read_text())
