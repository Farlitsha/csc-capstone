from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_hostname:str
    database_port:str
    database_password:str = "localhost"
    database_name:str
    database_username:str="root"
    secret_key:str =""
    algorithm:str
    access_token_expire_minutes:int

    # LimeSurvey (survey support for research studies)
    limesurvey_rpc_url: str = ""     # e.g. https://survey.example.org/index.php/admin/remotecontrol
    limesurvey_public_url: str = ""  # e.g. https://survey.example.org  (used to build participant links)
    limesurvey_username: str = ""
    limesurvey_password: str = ""

    # Comma-separated list of allowed frontend origins, e.g. "http://localhost:5173,https://commhub.example.org"
    cors_origins: str = ""

    class Config:
        env_file= ".env"

settings= Settings()