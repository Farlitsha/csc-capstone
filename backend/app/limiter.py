from slowapi import Limiter
from slowapi.util import get_remote_address

# Centralized rate limiter instance for CommHub API endpoints
limiter = Limiter(key_func=get_remote_address, default_limits=["300/minute"])

