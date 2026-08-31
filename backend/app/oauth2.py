from jose import JWTError, jwt
from datetime import datetime, timedelta
from . import schemas, database, models
from fastapi import Depends, status, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .config import settings

ouath2_scheme = OAuth2PasswordBearer(tokenUrl = 'users/login')

#scret key
#algorithm
#experiation time 

SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow()+ timedelta(minutes= ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp":expire})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm = ALGORITHM)
    return token

def verify_access_token(token:str, credentials_exception):
    try:
        payload =jwt.decode(token, SECRET_KEY, algorithms =[ALGORITHM])
        id = payload.get("user_id")

        if id is None:
            raise credentials_exception
        token_data = schemas.TokenData(id=str(id))
    except JWTError:
        raise credentials_exception
    return token_data
    
def get_current_user(token: str = Depends(ouath2_scheme),db: Session = Depends(database.get_db)):

    credentials_exception = HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail= f"could not validate credntials", headers = {"WWW-Authenticate":"Bearer"})
    token = verify_access_token(token, credentials_exception)
    user = db.query(models.User).filter(models.User.id == token.id).first()
    
    return user


def require_admin(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)) -> models.User:
    if current_user.role == models.UserRole.ADMIN:
        return current_user
    admin_exists = db.query(models.User).filter(models.User.role == models.UserRole.ADMIN).first()
    if admin_exists is None:
        return current_user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")