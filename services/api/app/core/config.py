from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    api_cors_origins: str = "http://localhost:3000,http://localhost:8081"
    require_auth: bool = False
    auth_provider: str = "cognito"
    voice_role_play_enabled: bool = False
    external_sharing_enabled: bool = False
    coach_model_provider: str = "deterministic"
    coach_model_name: str | None = None
    coach_model_api_key: str | None = None
    aws_region: str | None = None
    aws_cognito_user_pool_id: str | None = None
    aws_cognito_user_pool_client_id: str | None = None
    database_url: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.api_cors_origins.split(",") if origin.strip()]

    @property
    def cognito_issuer(self) -> str | None:
        if not self.aws_region or not self.aws_cognito_user_pool_id:
            return None
        return (
            f"https://cognito-idp.{self.aws_region}.amazonaws.com/"
            f"{self.aws_cognito_user_pool_id}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
