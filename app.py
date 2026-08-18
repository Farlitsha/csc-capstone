from fastapi import FastAPI, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
import uvicorn

from fastapi.staticfiles import StaticFiles

app = FastAPI()

templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def login_page(request: Request):
    return templates.TemplateResponse(   ###WHY AREN'T YOU WORKING
        "login.html",
        {
            "request": request,
            "error": ""
        }
    )


@app.post("/login")
def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...)
):

    # We'll replace this with your real authentication
    if username == "admin" and password == "password":
        return RedirectResponse("/home", status_code=303)

    return templates.TemplateResponse(
        "login.html",
        {
            "request": request,
            "error": "Incorrect username or password."
        }
    )


@app.get("/home")
def home(request: Request):
    return templates.TemplateResponse(
        "home.html",
        {
            "request": request,
            "username": "Kholo"
        }
    )


if __name__ == "__main__":
    uvicorn.run(app)