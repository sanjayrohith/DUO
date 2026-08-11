from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    duo_model: str = "llama3.2:3b"
    duo_embed_model: str = "nomic-embed-text"
    ollama_base_url: str = "http://localhost:11434/v1"
    duo_db_path: str = "./duo.db"
    duo_server_host: str = "0.0.0.0"
    duo_server_port: int = 8000
    duo_persona_prompt_path: str = "duo_server/persona/duo_system_prompt.md"
    duo_persona_few_shot_path: str = "duo_server/persona/few_shot.json"


settings = Settings()
