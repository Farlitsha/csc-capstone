import re
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(password: str, hashed_password: str):
    return pwd_context.verify(password, hashed_password)

def sanitize_text(text: str) -> str:
    """Sanitize user input by stripping <script> tags and raw HTML to prevent XSS."""
    if not text:
        return text
    # Strip <script>...</script> tags and contents (case-insensitive)
    cleaned = re.sub(r"(?is)<script.*?>.*?</script>", "", text)
    # Strip remaining HTML tags
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    return cleaned.strip()