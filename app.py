from fastapi import FastAPI, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
import uvicorn

from fastapi.staticfiles import StaticFiles

#Defaults
DEFAULT_ADVERT_IMAGE = "/static/images/default_advert_image.png"


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

#For "Back to login" GET request
@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="login.html",
        context={
            "message": ""
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
    query: str = Form("") #no ... cause field is not required
):
    #if they press the button without entering search
    query = query.strip()
    print(type(query))
    if not query:
        return templates.TemplateResponse(
            request=request,
            name="search.html",
            context={
                "query": "",
                "results": [],
                "message": "Please enter something to search."
            }
        )
    # Placeholder results for now
    results = [ { "title": "No results found", "description": " "}] #Placeholder for no results
    results = [
        {
            "title": "Food Baank",
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

@app.get("/adverts")
def adverts_page(request: Request):

    adverts = [
        {
            "title": "Free Maths Tutoring",
            "category": "Education",
            "poster": "John Smith",
            "description": "Free tutoring every Wednesday.",
            "image": None
        },
        {
            "title": "Community Garden",
            "category": "Volunteering",
            "poster": "Sarah Williams",
            "description": "Volunteers needed this Saturday.",
            "image": "/static/images/garden.jpg"
        }
    ]

    # Give adverts without an image the default image
    for advert in adverts:
        if not advert.get("image"):
            advert["image"] = DEFAULT_ADVERT_IMAGE

    return templates.TemplateResponse(
        request=request,
        name="adverts.html",
        context={
            "adverts": adverts
        }
    )

@app.get("/register")
def register_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="register.html",
        context={
            "message": ""
        }
    )

@app.post("/register")
def register_user(
    request: Request,
    username: str = Form(),
    email: str = Form(),
    password: str = Form()
):
    username = username.strip()
    email = email.strip()

    # Create the new user
    new_user = {
        "username": username,
        "email": email,
        "password": password,
        "role": "user"
    }

    # Add new_user to database here

    return templates.TemplateResponse(
        request=request,
        name="login.html",
        context={
            "message": "Account created successfully. Please log in."
        }
    )


if __name__ == "__main__":
    uvicorn.run(app)