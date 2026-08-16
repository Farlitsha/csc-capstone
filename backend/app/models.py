from sqlalchemy import Column, DateTime, Integer, String, Boolean, TIMESTAMP, func, text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), nullable = False, unique = True)
    email = Column(String(255), nullable = False, unique = True)
    password = Column(String(255), nullable = False)
    role = Column(String(20), nullable = False, default='user')
    time = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(String(255), nullable=False)
    published = Column(Boolean, nullable=False, default=True) 
    time = Column(DateTime(timezone=True),server_default=func.now(),nullable=False)