from fastapi import FastAPI, Form, Request, File, UploadFile
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
import uvicorn

from fastapi.staticfiles import StaticFiles
from translations import get_translator

# Defaults
DEFAULT_ADVERT_IMAGE = "/static/images/default_advert_image.png"


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


def _lang(request: Request) -> str:
    """Return the current language code stored in the session (default 'en')."""
    return request.session.get("lang", "en")


def _ctx(request: Request, extra: dict = None) -> dict:
    """
    Build a base template context that always includes:
      - t        : translation callable  e.g. {{ t("nav.home") }}
      - lang     : current language code ("en" or "af")
    Then merge in any page-specific extras.
    """
    lang = _lang(request)
    ctx = {
        "t": get_translator(lang),
        "lang": lang,
    }
    if extra:
        ctx.update(extra)
    return ctx


app = FastAPI()

app.add_middleware(
    SessionMiddleware,
    secret_key="some-long-secure-secret-key"  # TODO: replace with a real secret
)

templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")


# Language toggle

@app.get("/set-language/{lang_code}")
def set_language(lang_code: str, request: Request):
    """Switch the session language and redirect back to where the user was."""
    if lang_code in ("en", "af", "xh", "zu"):
        request.session["lang"] = lang_code
    referer = request.headers.get("referer", "/")
    return RedirectResponse(referer, status_code=303)


@app.get("/")
def login_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="login.html",
        context=_ctx(request, {"error": ""})
    )


@app.get("/login")
def login_get(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="login.html",
        context=_ctx(request, {"message": ""})
    )


@app.post("/login")
def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
):
    if username == "admin" and password == "password":
        request.session["username"] = username
        return RedirectResponse("/home", status_code=303)

    return templates.TemplateResponse(
        request=request,
        name="login.html",
        context=_ctx(request, {"error": "Incorrect username or password."})
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
        create_service(1, "Free Maths Tutoring", "Free tutoring every Wednesday.",
                       "education", "offering", 0.00, "Tshepo Malepo"),
        create_service(2, "Garden Maintenance", "Garden maintenance available on weekends.",
                       "other", "offering", 150.00, "Prince Adams",
                       "/static/images/garden.jpg"),
    ]
    requested_services = [
        create_service(3, "Looking for a Physics Tutor", "Need help preparing for exams.",
                       "education", "requesting", 200.00, "Alice Charlie"),
        create_service(4, "Need Help Painting", "Looking for someone to help paint a house.",
                       "other", "requesting", 500.00, "Malicious Miranda"),
    ]

    return templates.TemplateResponse(
        request=request,
        name="home.html",
        context=_ctx(request, {
            "username": username,
            "offered_services": offered_services[:2],
            "requested_services": requested_services[:2],
        })
    )


@app.get("/search")
def search_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="search.html",
        context=_ctx(request, {"results": [], "query": ""})
    )


@app.post("/search")
def do_search(request: Request, query: str = Form("")):
    query = query.strip()
    if not query:
        return templates.TemplateResponse(
            request=request,
            name="search.html",
            context=_ctx(request, {
                "query": "",
                "results": [],
                "message": "Please enter something to search.",
            })
        )

    results = [
        {"title": "Food Bank", "service_type": "offering", "category": "education",
         "description": "Provides meals every Tuesday.", "amount": 0.00, "posted_by": "Prince Adams"},
        {"title": "Tutoring", "service_type": "requesting", "category": "education",
         "description": "Free maths tutoring.", "amount": 0.00, "posted_by": "Malicious Miranda"},
    ]

    return templates.TemplateResponse(
        request=request,
        name="search.html",
        context=_ctx(request, {"query": query, "results": results})
    )



@app.get("/adverts")
def adverts_page(request: Request):
    adverts = [
        {"title": "Free Maths Tutoring", "category": "Education",
         "posted_by": "John Smith", "service_type": "offering",
         "amount": 0.00, "description": "Free tutoring every Wednesday.", "image": None},
        {"title": "Community Garden", "category": "Volunteering",
         "posted_by": "Sarah Williams", "service_type": "offering",
         "amount": 0.00, "description": "Volunteers needed this Saturday.", "image": None},
    ]

    for advert in adverts:
        if not advert.get("image"):
            advert["image"] = DEFAULT_ADVERT_IMAGE

    return templates.TemplateResponse(
        request=request,
        name="adverts.html",
        context=_ctx(request, {"adverts": adverts})
    )



@app.get("/register")
def register_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="register.html",
        context=_ctx(request, {"message": ""})
    )


@app.post("/register")
def register_user(
    request: Request,
    Name: str = Form(),
    Surname: str = Form(),
    email: str = Form(),
    password: str = Form(),
):
    username = Name.strip()
    email = email.strip()

    new_user = {"username": username, "email": email, "password": password, "role": "user"}
    # Add new_user to database here

    return templates.TemplateResponse(
        request=request,
        name="login.html",
        context=_ctx(request, {"message": "Account created successfully. Please log in."})
    )


@app.get("/profile")
def profile_page(request: Request):
    username = request.session.get("username")

    user = {
        "name": "Kholo",
        "surname": "guess",
        "email": "zndkho003@myuct.ac.za",
        "role": "user",
    }

    my_services = [
        create_service(1, "Free Maths Tutoring", "Free tutoring every Wednesday.",
                       "education", "offering", 0, user["name"], 1),
        create_service(2, "Need Physics Tutor", "Need help with mechanics.",
                       "education", "requesting", 200, user["name"], 1),
    ]

    return templates.TemplateResponse(
        request=request,
        name="profile.html",
        context=_ctx(request, {"user": user, "my_services": my_services})
    )


# ---------------------------------------------------------------------------
# Post advert
# ---------------------------------------------------------------------------

@app.get("/post_advert")
def post_advert_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="post_advert.html",
        context=_ctx(request, {"message": ""})
    )


@app.post("/post_advert")
def post_advert(
    request: Request,
    service_type: str = Form(),
    title: str = Form(),
    content: str = Form(),
    category: str = Form(),
    amount: float | None = Form(None),
    image: UploadFile | None = File(None),
):
    title = title.strip()
    content = content.strip()

    if image is not None:
        print("Image uploaded:", image.filename)

    # Save advert to database here

    return templates.TemplateResponse(
        request=request,
        name="post_advert.html",
        context=_ctx(request, {"message": "Advert posted successfully."})
    )


if __name__ == "__main__":
    uvicorn.run(app)
