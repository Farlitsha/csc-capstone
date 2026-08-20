from fastapi import FastAPI, Form, Request, File, UploadFile
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
import uvicorn

from fastapi.staticfiles import StaticFiles

#Defaults
DEFAULT_ADVERT_IMAGE = "/static/images/default_advert_image.png"


#Method so that we can display the first 2 adverts or services on the home page
def create_service(
    id,
    title,
    description,
    category,
    service_type,
    amount,
    posted_by,
    image=None
):
    if not image:
        image = "/static/images/default_advert.png"

    return {
        "id": id,
        "title": title,
        "description": description,
        "category": category,
        "service_type": service_type,
        "amount": amount,
        "image": image,
        "posted_by": posted_by
    }

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
def home_page(request: Request):

    username = request.session.get("username")

    if username is None:
        return RedirectResponse("/", status_code=303)

    offered_services = [
        create_service(
            1,
            "Free Maths Tutoring",
            "Free tutoring every Wednesday.",
            "education",
            "offering",
            0.00,
            "Tshepo Malepo"
        ),

        create_service(
            2,
            "Garden Maintenance",
            "Garden maintenance available on weekends.",
            "other",
            "offering",
            150.00,
            "Prince Adams",
            "/static/images/garden.jpg"
        )
    ]
    requested_services = [
        create_service(
            3,
            "Looking for a Physics Tutor",
            "Need help preparing for exams.",
            "education",
            "requesting",
            200.00,
            "Alice Charlie"
        ),

        create_service(
            4,
            "Need Help Painting",
            "Looking for someone to help paint a house.",
            "other",
            "requesting",
            500.00,
            "Malicious Miranda"
        )
    ]

    return templates.TemplateResponse(
        request=request,
        name="home.html",
        context={
            "username": username,
            "offered_services": offered_services[:2],
            "requested_services": requested_services[:2]
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
            "service_type": "offering",
            "category": "education",
            "description": "Provides meals every Tuesday.",
            "amount": 0.00,
            "posted_by": "Prince Adams"
        },
        {
            "title": "Tutoring",
            "service_type": "requesting",
            "category": "education",
            "description": "Free maths tutoring.",
            "amount": 0.00,
            "posted_by": "Malicious Miranda"
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
            "posted_by": "John Smith",
            "service_type": "offering",
            "amount": 0.00,
            "description": "Free tutoring every Wednesday.",
            "image": None
        },
        {
            "title": "Community Garden",
            "category": "Volunteering",
            "posted_by": "Sarah Williams",
            "service_type": "offering",
            "amount": 0.00,
            "description": "Volunteers needed this Saturday.",
            "image": None
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

@app.get("/post_advert")
def post_advert_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="post_advert.html",
        context={
            "message": ""
        }
    )

@app.post("/post_advert")
def post_advert(
    request: Request,
    service_type: str = Form(),
    title: str = Form(),
    content: str = Form(),
    category: str = Form(),
    amount: float | None = Form(None),
    image: UploadFile | None = File(None)
):

    title = title.strip()
    content = content.strip()

    # The image is optional
    if image is not None:
        print("Image uploaded:", image.filename)

    print("Title:", title)
    print("Content:", content)
    print("Category:", category)

    # Save advert to database here

    return templates.TemplateResponse(
        request=request,
        name="post_advert.html",
        context={
            "message": "Advert posted successfully."
        }
    )

if __name__ == "__main__":
    uvicorn.run(app)