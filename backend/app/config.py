from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    railway_token: str
    railway_project_id: str
    railway_partida_service_id: str

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()