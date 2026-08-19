from fastapi import FastAPI, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
import uvicorn

from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.add_middleware(
    SessionMiddleware,
    secret_key="some-long-secure-secret-key"  #TODO TRACE replace with some long super secret key
)

templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def login_page(request: Request):
    return templates.TemplateResponse(   ###WHY AREN'T YOU WORKING
        request=request,
        name = "login.html",
        context={
            "error": ""
        }
    )


@app.post("/login")
def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...)
):

    # replace this with real authentication
    if username == "admin" and password == "password":
        print("TRACE: ","user: ",username,password)
        request.session["username"] = username
        return RedirectResponse("/home", status_code=303)

    return templates.TemplateResponse(
        request= request,
        name="login.html",
        context= {
            "error": "Incorrect username or password."
        }
    )

@app.get("/logout")
def logout(request: Request):

    request.session.clear()

    return RedirectResponse("/", status_code=303)

@app.get("/home")
def home(request: Request):

    username = request.session.get("username")

    if username is None:
        return RedirectResponse("/", status_code=303)

    return templates.TemplateResponse(
        request=request,
        name="home.html",
        context={
            "username": username
        }
    )


@app.get("/search")
def search_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="search.html",
        context={
            "results": [],
            "query": ""
        }
    )

@app.post("/search")
def do_search(
    request: Request,
    query: str = Form(...)
):

    # Placeholder results for now
    results = [
        {
            "title": "Food Bank",
            "description": "Provides meals every Tuesday."
        },
        {
            "title": "Tutoring",
            "description": "Free maths tutoring."
        }
    ]

    return templates.TemplateResponse(
        request=request,
        name="search.html",
        context={
            "query": query,
            "results": results
        }
    )

if __name__ == "__main__":
    uvicorn.run(app)