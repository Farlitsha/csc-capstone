from pydantic import BaseModel

class PostBase(BaseModel):
    title: str
    content: str
    published: bool = True

class PostCreate(PostBase):
    pass

class UserBase(BaseModel):
    username: str
    email: str
    password: str