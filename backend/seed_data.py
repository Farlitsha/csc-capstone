"""
Database Seed Script for CommHub
================================
Populates the MySQL database with rich, realistic mock data for demonstrations and development:
- 3 User Personas for Admins (Chief Admin, Community Admin, Tech Admin)
- 10 Researchers (Verified, Pending, Downgraded) across diverse research areas
- 50 Community Members with authentic local South African personas, bios, phone numbers, and struggles
- 65+ Services (Offers & Requests) matching frontend categories ("Home repair", "Tutoring", "Food", "Other")
  utilizing available service photos in backend/uploads/services (plumbing.jpg, Tutoring.png, catering.png)
- 80+ Peer Service Ratings & Reviews with genuine feedback comments
- 35+ Direct Service Applications / Inquiries
- 12+ Research Studies (Live, Closed, Draft) with In-House Surveys & Questions
- 40+ Study Applications, Acceptances, and Completed Survey Responses
- 14 Community Workshops (Scheduled, Completed, Cancelled) with 60+ Registrations
- 50 Community Demographic Census Records driving live chart visualizations
- System Announcements, Moderation Reports, and an Audit Trail

All accounts use PIN: "12345"

Usage:
  python backend/seed_data.py
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
import random

if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=backend_dir / ".env")

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base, sync_db_schema
from app import models, utils


def get_engine():
    # Try standard database URL first
    db_url = f"mysql+pymysql://{settings.database_username}:{settings.database_password}@{settings.database_hostname}:{settings.database_port}/{settings.database_name}"
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return engine
    except Exception:
        # Fallback to Docker host port 3307 if localhost 3306 was not reachable
        alt_url = f"mysql+pymysql://{settings.database_username}:{settings.database_password}@127.0.0.1:3307/{settings.database_name}"
        try:
            engine = create_engine(alt_url)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"Connected via Docker mapped port 3307 ({alt_url})")
            return engine
        except Exception as e:
            print(f"Could not connect to MySQL at {db_url} or {alt_url}: {e}")
            raise


def seed_database():
    # Fix seed for reproducible, high-quality mock data
    random.seed(42)

    engine = get_engine()
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = Session()

    print("Ensuring all database tables and schema exist...")
    sync_db_schema(engine)

    print("Clearing old seed data...")
    with engine.connect() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(text(f"TRUNCATE TABLE `{table.name}`;"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    hashed_pin = utils.hash_password("12345")

    def to_naive(dt):
        if dt is not None and getattr(dt, "tzinfo", None) is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt

    # Verify service images in backend/uploads/services
    services_upload_dir = backend_dir / "uploads" / "services"
    plumbing_path = services_upload_dir / "plumbing.jpg"
    tutoring_path = services_upload_dir / "Tutoring.png"
    catering_path = services_upload_dir / "catering.png"

    plumbing_size = plumbing_path.stat().st_size if plumbing_path.exists() else 308151
    tutoring_size = tutoring_path.stat().st_size if tutoring_path.exists() else 389089
    catering_size = catering_path.stat().st_size if catering_path.exists() else 132448

    # ==========================================
    # 1. SEED ADMINISTRATORS (3)
    # ==========================================
    print("Seeding 3 Administrators (PIN: 12345)...")
    admins_data = [
        {
            "username": "chief_admin",
            "email": "chief.admin@commhub.org",
            "display_name": "Platform Administrator",
            "bio": "CommHub head coordinator and community systems administrator.",
            "phone": "0821110001",
        },
        {
            "username": "community_admin",
            "email": "community.admin@commhub.org",
            "display_name": "Community Liaison Officer",
            "bio": "Ocean View community liaison, content moderation, and local workshop coordinator.",
            "phone": "0821110002",
        },
        {
            "username": "tech_admin",
            "email": "tech.admin@commhub.org",
            "display_name": "iNethi Mesh Ops Admin",
            "bio": "Community mesh network systems operator and offline cache sync administrator.",
            "phone": "0821110003",
        },
    ]

    admins = []
    for a in admins_data:
        admin_user = models.User(
            username=a["username"],
            email=a["email"],
            password=hashed_pin,
            role=models.UserRole.ADMIN,
            verification_status=models.VerificationStatus.NONE,
            display_name=a["display_name"],
            bio=a["bio"],
            phone=a["phone"],
            contact_phone=a["phone"],
            contact_email=a["email"],
            time=now - timedelta(days=90),
        )
        admins.append(admin_user)

    db.add_all(admins)
    db.commit()
    for a in admins:
        db.refresh(a)

    chief_admin = admins[0]
    community_admin = admins[1]
    tech_admin = admins[2]

    # ==========================================
    # 2. SEED RESEARCHERS (10)
    # ==========================================
    print("Seeding 10 Researchers (7 Verified, 2 Pending, 1 Downgraded)...")
    researchers_data = [
        # Verified (7)
        {
            "username": "dr_nomvula",
            "email": "nomvula.zondo@uct.ac.za",
            "display_name": "Dr. Nomvula Zondo",
            "bio": "UCT Health Sciences & Community Nutrition Researcher specializing in coastal food systems.",
            "phone": "0822220001",
            "status": models.VerificationStatus.VERIFIED,
            "downgraded_at": None,
        },
        {
            "username": "prof_khalid",
            "email": "khalid.patel@uct.ac.za",
            "display_name": "Prof. Khalid Patel",
            "bio": "Digital Inclusion & Mesh Network Researcher investigating low-cost connectivity and intranet architectures.",
            "phone": "0822220002",
            "status": models.VerificationStatus.VERIFIED,
            "downgraded_at": None,
        },
        {
            "username": "dr_tariq",
            "email": "tariq.abrahams@uwc.ac.za",
            "display_name": "Dr. Tariq Abrahams",
            "bio": "UWC Renewable Energy & Community Microgrids Researcher focusing on decentralized solar access.",
            "phone": "0822220003",
            "status": models.VerificationStatus.VERIFIED,
            "downgraded_at": None,
        },
        {
            "username": "dr_lindiwe",
            "email": "lindiwe.sithole@uct.ac.za",
            "display_name": "Dr. Lindiwe Sithole",
            "bio": "Early Childhood Development & Multilingual Literacy specialist at UCT School of Education.",
            "phone": "0822220004",
            "status": models.VerificationStatus.VERIFIED,
            "downgraded_at": None,
        },
        {
            "username": "prof_marcus",
            "email": "marcus.vdmerwe@sun.ac.za",
            "display_name": "Prof. Marcus van der Merwe",
            "bio": "Stellenbosch University Department of Economics - Informal Enterprise & Spaza Shop resilience.",
            "phone": "0822220005",
            "status": models.VerificationStatus.VERIFIED,
            "downgraded_at": None,
        },
        {
            "username": "dr_fatima",
            "email": "fatima.cassim@uwc.ac.za",
            "display_name": "Dr. Fatima Cassim",
            "bio": "Public Health & Chronic Disease Care Researcher studying community-level clinic adherence.",
            "phone": "0822220006",
            "status": models.VerificationStatus.VERIFIED,
            "downgraded_at": None,
        },
        {
            "username": "dr_sipho_research",
            "email": "sipho.mthembu.sci@uct.ac.za",
            "display_name": "Dr. Sipho Mthembu",
            "bio": "Civil Engineering & Water Resilience Institute - Sustainable rainwater harvesting & sanitation.",
            "phone": "0822220007",
            "status": models.VerificationStatus.VERIFIED,
            "downgraded_at": None,
        },
        # Pending (2)
        {
            "username": "dr_anele",
            "email": "anele.gcaba@cput.ac.za",
            "display_name": "Dr. Anele Gcaba",
            "bio": "CPUT Informatics Researcher studying youth gig-work and digital freelancing pathways.",
            "phone": "0822220008",
            "status": models.VerificationStatus.PENDING,
            "downgraded_at": None,
        },
        {
            "username": "dr_corne",
            "email": "corne.venter@sun.ac.za",
            "display_name": "Dr. Corne Venter",
            "bio": "Agri-Sciences Researcher assessing urban permaculture and community vegetable micro-gardens.",
            "phone": "0822220009",
            "status": models.VerificationStatus.PENDING,
            "downgraded_at": None,
        },
        # Downgraded (1)
        {
            "username": "prof_johan",
            "email": "johan.steyn@uct.ac.za",
            "display_name": "Prof. Johan Steyn",
            "bio": "Environmental Monitoring & Citizen Science lead (Voluntarily downgraded status).",
            "phone": "0822220010",
            "status": models.VerificationStatus.NONE,
            "downgraded_at": now - timedelta(days=25),
        },
    ]

    researchers = []
    for r in researchers_data:
        res_user = models.User(
            username=r["username"],
            email=r["email"],
            password=hashed_pin,
            role=models.UserRole.RESEARCHER,
            verification_status=r["status"],
            researcher_downgraded_at=r["downgraded_at"],
            display_name=r["display_name"],
            bio=r["bio"],
            phone=r["phone"],
            contact_phone=r["phone"],
            contact_email=r["email"],
            time=now - timedelta(days=60),
        )
        researchers.append(res_user)

    db.add_all(researchers)
    db.commit()
    for r in researchers:
        db.refresh(r)

    # ==========================================
    # 3. SEED COMMUNITY MEMBERS (50)
    # ==========================================
    print("Seeding 50 Community Members with Census & Profile details...")
    community_member_names = [
        ("Sipho Khumalo", "sipho_member", "sipho.khumalo@gmail.com", "Experienced carpenter, woodwork craftsman, and community garden volunteer.", ["employment", "internet_access"]),
        ("Ayanda Mthembu", "ayanda_m", "ayanda.m@gmail.com", "Local home baker, catering coordinator, and sewing enthusiast in Sector 3.", ["food_security", "housing"]),
        ("Thabo Koen", "thabo_k", "thabo.k@gmail.com", "Grade 8-12 Mathematics & Physical Science tutor. Studying Computer Science online.", ["employment", "transport"]),
        ("Lungile Dlamini", "lungile_d", "lungile.d@gmail.com", "Certified apprentice plumber, pipe repair specialist, and general handyman.", ["food_security", "employment"]),
        ("Zanele Ndlovu", "zanele_n", "zanele.ndlovu@gmail.com", "Home-based hair stylist, braiding artist, and nail care specialist.", ["housing", "employment"]),
        ("Bongani Sithole", "bongani_s", "bongani.sithole@gmail.com", "Welder, security gate builder, and metal fabrication craftsman.", ["employment", "electricity"]),
        ("Nandi Cele", "nandi_c", "nandi.cele@gmail.com", "Primary school reading tutor and after-school homework supervisor.", ["education", "transport"]),
        ("Mandla Mokoena", "mandla_m", "mandla.mokoena@gmail.com", "Domestic electrical repair, appliance fixing, and solar lamp installer.", ["employment", "internet_access"]),
        ("Kelebogile Phiri", "kelebogile_p", "kelebogile.p@gmail.com", "Vegetable grower, seedling vendor, and community soup kitchen coordinator.", ["food_security", "water"]),
        ("Chantal van Wyk", "chantal_vw", "chantal.vanwyk@gmail.com", "Professional seamstress, school uniform alterations, and dressmaker.", ["employment", "housing"]),
        ("Heinrich Adams", "heinrich_a", "heinrich.adams@gmail.com", "Motor mechanic assistant, bicycle repair, and scooter servicing.", ["employment", "transport"]),
        ("Fatima Davids", "fatima_d", "fatima.davids@gmail.com", "Traditional Cape Malay catering, samosa maker, and weekend food stall owner.", ["food_security", "employment"]),
        ("Ebrahim Isaacs", "ebrahim_i", "ebrahim.isaacs@gmail.com", "Bricklaying, plastering, tiling, and paving contractor.", ["employment", "housing"]),
        ("Lindiwe Buthelezi", "lindiwe_b", "lindiwe.buthelezi@gmail.com", "ECD daycare assistant, babysitter, and child minder in Sector 2.", ["childcare", "healthcare"]),
        ("David Petersen", "david_p", "david.petersen@gmail.com", "House painter, waterproofing expert, and roof repairer.", ["employment", "safety"]),
        ("Lerato Molefe", "lerato_m", "lerato.molefe@gmail.com", "Matric English and Life Sciences peer tutor and CV helper.", ["employment", "internet_access"]),
        ("Sibusiso Radebe", "sibusiso_r", "sibusiso.radebe@gmail.com", "Local transport driver, moving goods, and township parcel delivery.", ["transport", "fuel_costs"]),
        ("Priscilla Daniels", "priscilla_d", "priscilla.daniels@gmail.com", "Home cleaning, laundry, and ironing service specialist.", ["employment", "housing"]),
        ("Gugulethu Hlongwane", "gugu_h", "gugu.hlongwane@gmail.com", "Cell phone screen replacement, software flash, and audio speaker repairs.", ["internet_access", "employment"]),
        ("Trevor Hendricks", "trevor_h", "trevor.hendricks@gmail.com", "Pest control, garden clearance, tree trimming, and grass cutting.", ["employment", "safety"]),
        ("Nompumelelo Zulu", "mpumi_z", "mpumi.zulu@gmail.com", "Home health caregiver for elderly residents and clinic medication collector.", ["healthcare", "transport"]),
        ("Willem Cloete", "willem_c", "willem.cloete@gmail.com", "Roof leak sealer, gutter cleaning, and zinc roof specialist.", ["housing", "employment"]),
        ("Kwanele Bhengu", "kwanele_b", "kwanele.bhengu@gmail.com", "Sound system hire, DJ services for events, and microphone setups.", ["employment", "electricity"]),
        ("Rochelle Swarts", "rochelle_s", "rochelle.swarts@gmail.com", "Handmade beaded jewellery, craft maker, and market trader.", ["employment", "food_security"]),
        ("Vuyani Gqirana", "vuyani_g", "vuyani.gqirana@gmail.com", "Soccer coach, youth sports mentor, and community hall volunteer.", ["safety", "education"]),
        ("Nomsa Sibeko", "nomsa_s", "nomsa.sibeko@gmail.com", "Soup kitchen helper, fresh bread baker, and parish community worker.", ["food_security", "housing"]),
        ("Clinton Fredericks", "clinton_f", "clinton.fredericks@gmail.com", "Tiler, laminate flooring installer, and bathroom renovations.", ["employment", "transport"]),
        ("Asanda Majola", "asanda_m", "asanda.majola@gmail.com", "Graphic designer, CV formatting, print service, and internet helper.", ["internet_access", "employment"]),
        ("Kagiso Motsepe", "kagiso_m", "kagiso.motsepe@gmail.com", "Solar inverter installer, battery maintenance, and LED lighting setup.", ["employment", "electricity"]),
        ("Denise Cupido", "denise_c", "denise.cupido@gmail.com", "Knitting, crochet blankets, baby wear, and winter clothing maker.", ["housing", "food_security"]),
        ("Simphiwe Ngcobo", "simphiwe_n", "simphiwe.ngcobo@gmail.com", "General logistics, heavy lifting, moving assistance, and rubble removal.", ["employment", "transport"]),
        ("Ashwin Fortuin", "ashwin_f", "ashwin.fortuin@gmail.com", "Car wash operator, interior car detailing, and upholstery cleaner.", ["employment", "water"]),
        ("Thembi Nkosi", "thembi_n", "thembi.nkosi@gmail.com", "Community health worker, prenatal advice, and family nutrition advocate.", ["healthcare", "food_security"]),
        ("Chadwick Abrahams", "chadwick_a", "chadwick.abrahams@gmail.com", "Computer repairs, Windows installation, and router setup technician.", ["internet_access", "employment"]),
        ("Nthabiseng More", "nthabiseng_m", "nthabiseng.more@gmail.com", "Bookkeeping for spaza shops, receipts organizer, and spreadsheet helper.", ["employment", "education"]),
        ("Mthunzi Shabalala", "mthunzi_s", "mthunzi.shabalala@gmail.com", "Security guard, night watchman, and neighborhood patrol volunteer.", ["safety", "employment"]),
        ("Bianca Solomons", "bianca_s", "bianca.solomons@gmail.com", "Cake decorator, cupcakes, birthday treats, and party snack platters.", ["food_security", "employment"]),
        ("Jabulani Mavuso", "jabulani_m", "jabulani.mavuso@gmail.com", "Shoe repair, leather work, sneaker cleaning, and bag zip repairs.", ["employment", "housing"]),
        ("Shireen Jacobs", "shireen_j", "shireen.jacobs@gmail.com", "Curtain making, cushion covers, upholstery repair, and home decor.", ["housing", "employment"]),
        ("Siyabonga Mabena", "siyabonga_m", "siyabonga.mabena@gmail.com", "High school Accounting and Business Studies tutor.", ["education", "internet_access"]),
        ("Melanie Arendse", "melanie_a", "melanie.arendse@gmail.com", "Flower arrangements, funeral wreaths, and church event decorations.", ["employment", "food_security"]),
        ("Khaya Mthembu", "khaya_m", "khaya.mthembu@gmail.com", "Fence repairs, razor wire installation, and yard security fixtures.", ["safety", "employment"]),
        ("Patricia van Noie", "patricia_vn", "patricia.vannoie@gmail.com", "Elderly companion, medication pickup, and grocery shopping assistant.", ["healthcare", "transport"]),
        ("Unathi Maphisa", "unathi_m", "unathi.maphisa@gmail.com", "Barber, men's haircuts, fade styles, and beard grooming.", ["employment", "electricity"]),
        ("Gary Philander", "gary_p", "gary.philander@gmail.com", "Masonry, retaining wall builder, and concrete mix specialist.", ["employment", "housing"]),
        ("Busisiwe Radebe", "busisiwe_r", "busisiwe.radebe@gmail.com", "Traditional beadwork, Xhosa attire making, and cultural wear.", ["employment", "food_security"]),
        ("Dillon Louw", "dillon_l", "dillon.louw@gmail.com", "Wi-Fi antenna alignment, outdoor cable routing, and networking handyman.", ["internet_access", "employment"]),
        ("Phumzile Mtshali", "phumzile_m", "phumzile.mtshali@gmail.com", "Home herbal tea maker, garden herbs, and traditional wellness remedies.", ["healthcare", "food_security"]),
        ("Darren October", "darren_o", "darren.october@gmail.com", "Drywall partitioning, ceiling board fixing, and cornices installer.", ["employment", "housing"]),
        ("Noluthando Ndaba", "noluthando_n", "noluthando.ndaba@gmail.com", "Early childhood storyteller, phonics educator, and reading coach.", ["education", "transport"]),
    ]

    members = []
    for i, (name, username, email, bio, struggles) in enumerate(community_member_names, start=1):
        phone_num = f"08{random.randint(1, 8)}{random.randint(1000000, 9999999)}"
        created_time = now - timedelta(days=random.randint(5, 75))
        member = models.User(
            username=username,
            email=email,
            password=hashed_pin,
            role=models.UserRole.COMMUNITY_MEMBER,
            verification_status=models.VerificationStatus.NONE,
            display_name=name,
            bio=bio,
            phone=phone_num,
            contact_phone=phone_num,
            contact_email=email,
            struggles=struggles,
            time=created_time,
        )
        members.append(member)

    db.add_all(members)
    db.commit()
    for m in members:
        db.refresh(m)

    # ==========================================
    # 4. SEED DEMOGRAPHIC CENSUS DATA (50)
    # ==========================================
    print("Seeding Community Demographic Census entries for all 50 members...")
    employment_choices = [
        "Job Seeker (Unemployed)",
        "Employed (Part-Time / Casual)",
        "Self-Employed / Entrepreneur",
        "Employed (Full-Time)",
        "Student / In Training",
    ]
    employment_weights = [0.42, 0.26, 0.16, 0.08, 0.08]

    income_choices = [
        "Under R1,500",
        "R1,500 - R3,500",
        "R3,501 - R6,000",
        "R6,001 - R12,000",
        "R12,001 - R25,000",
        "Over R25,000",
    ]
    income_weights = [0.35, 0.28, 0.20, 0.11, 0.04, 0.02]

    education_choices = [
        "Matric / Grade 12",
        "Some High School (Grades 8-11)",
        "Vocational / TVET Certificate",
        "Primary School",
        "Diploma or Degree",
    ]
    education_weights = [0.46, 0.28, 0.14, 0.08, 0.04]

    all_skills_pool = [
        "Carpentry & Construction",
        "Cooking & Catering",
        "Retail & Cashiering",
        "Plumbing & Electrical",
        "Computer & Digital Skills",
        "Childcare & Domestic",
        "Driving & Delivery",
        "Caregiving & Healthcare",
        "Welding & Metalwork",
        "Sewing & Tailoring",
    ]

    all_support_pool = [
        "Ready to work immediately",
        "Need CV / Resume writing help",
        "Want skills training courses",
        "Need internet / computer access",
        "Looking for apprenticeship / learnership",
        "Need interview preparation",
        "Tool and equipment access",
        "Small business starter grant",
    ]

    census_records = []
    for member in members:
        emp = random.choices(employment_choices, weights=employment_weights)[0]
        inc = random.choices(income_choices, weights=income_weights)[0]
        edu = random.choices(education_choices, weights=education_weights)[0]
        skills = random.sample(all_skills_pool, k=random.randint(1, 3))
        needs = random.sample(all_support_pool, k=random.randint(1, 3))

        c = models.CommunityCensus(
            user_id=member.id,
            employment_status=emp,
            income_bracket=inc,
            education_level=edu,
            job_skills=skills,
            job_support_needs=needs,
        )
        census_records.append(c)

    db.add_all(census_records)
    db.commit()

    # ==========================================
    # 5. SEED SERVICES (ADVERTS) (65+)
    # ==========================================
    print("Seeding 65+ Services (matching Home repair, Tutoring, Food, Other with photos)...")
    # Using photos:
    # Home repair -> plumbing.jpg
    # Tutoring    -> Tutoring.png
    # Food        -> catering.png

    services_catalog = [
        # --- HOME REPAIR (Plumbing, carpentry, electrical, roof, masonry) ---
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Emergency Plumbing & Pipe Leak Repairs",
            "description": "24/7 fast local leak fixes, blocked drain clearing, tap installations, and geyser valve repairs in Ocean View.",
            "price": "R150 / hr",
            "image_url": "/uploads/services/plumbing.jpg",
            "image_size": plumbing_size,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Bathroom & Kitchen Plumbing Installations",
            "description": "Reliable sink pipe fitting, toilet cistern repairs, shower drain clearance, and outdoor tap extensions.",
            "price": "R200 / visit",
            "image_url": "/uploads/services/plumbing.jpg",
            "image_size": plumbing_size,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Corrugated Iron Roof Sealing & Gutter Repair",
            "description": "Stop winter ceiling leaks! Flashing sealant, rust treatment, zinc sheet re-nailing, and downpipe cleaning.",
            "price": "R350 / day",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Custom Woodwork, Door Hanging & Shelving",
            "description": "Solid wood carpentry, kitchen cupboards, door alignment, security latch fitting, and bespoke timber benches.",
            "price": "R180 / hr",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Emergency Tap & Pipe Burst Repair Service",
            "description": "Fast response for burst main pipes, garden hose bibs, pressure valves, and water tank connections.",
            "price": "R180 call-out",
            "image_url": "/uploads/services/plumbing.jpg",
            "image_size": plumbing_size,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Domestic Electrical Appliance Fixing & Plugs",
            "description": "Safe diagnosis and repairs for kettles, irons, light switches, wall plug points, and circuit breakers.",
            "price": "R120 / unit",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Security Gate Welding & Metal Fence Repair",
            "description": "Burglar bars welding, lock box installations, security gate hinge reinforcements, and fence repair.",
            "price": "R450 / job",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Drain Snake Unblocking & Sewer Line Clearing",
            "description": "Heavy-duty drain snake unblocking for blocked yard drains, grease traps, and stormwater channels.",
            "price": "R250 / service",
            "image_url": "/uploads/services/plumbing.jpg",
            "image_size": plumbing_size,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "House Interior Painting & Wall Plastering",
            "description": "Clean interior and exterior wall coating, crack filling, moisture sealant, and ceiling repainting.",
            "price": "R220 / room",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Solar Lamp & Off-Grid Battery Wiring",
            "description": "Affordable low-voltage 12V LED lighting setup, solar charge controller wiring, and battery safety checks.",
            "price": "R200 / setup",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Drywall Partitioning & Ceiling Board Replacement",
            "description": "Room dividing drywall studs, rhino board ceiling installation, and cornice adhesive styling.",
            "price": "R300 / sheet",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.REQUEST,
            "title": "Need Help Replacing Corrugated Roof Sheets",
            "description": "Looking for an experienced carpenter or handyman to assist replacing 6 corrugated iron roof sheets before rains.",
            "price": "R300 budget",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.REQUEST,
            "title": "Seeking Electrician to Wire 2 Ceiling Light Points",
            "description": "Need a qualified or experienced person to safely wire 2 ceiling lights and a double switch in Sector 4.",
            "price": "R250 cash",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.REQUEST,
            "title": "Looking for Broken Yard Drain Pipe Replacement",
            "description": "Our greywater yard pipe cracked after recent ground settling. Need quick replacement and unblocking.",
            "price": "R350 negotiable",
            "image_url": "/uploads/services/plumbing.jpg",
            "image_size": plumbing_size,
        },

        # --- TUTORING (Maths, Science, English, Digital, Literacy) ---
        {
            "category": "Tutoring",
            "type": models.ServiceType.OFFER,
            "title": "Grade 10-12 Mathematics Exam Prep & Past Papers",
            "description": "Master algebra, trigonometry, and calculus! Weekend group sessions with step-by-step past exam breakdown.",
            "price": "R100 / session",
            "image_url": "/uploads/services/Tutoring.png",
            "image_size": tutoring_size,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.OFFER,
            "title": "Physical Science & Chemistry High School Tutoring",
            "description": "Newton's laws, electric circuits, organic chemistry, and stoichiometry made simple. Hands-on exercises.",
            "price": "R120 / session",
            "image_url": "/uploads/services/Tutoring.png",
            "image_size": tutoring_size,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.OFFER,
            "title": "Foundation Phase English Reading & Phonics Tutoring",
            "description": "Patient reading coach helping Grade 1 to 4 learners build vocabulary, pronunciation, and reading confidence.",
            "price": "R75 / hr",
            "image_url": "/uploads/services/Tutoring.png",
            "image_size": tutoring_size,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.OFFER,
            "title": "Coding & Web Development for Beginners (HTML/JS/Python)",
            "description": "Practical computer skills: build your first website or script using open-source tools. Laptops provided in class.",
            "price": "R80 / session",
            "image_url": "/uploads/services/Tutoring.png",
            "image_size": tutoring_size,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.OFFER,
            "title": "High School Accounting & Business Studies Coaching",
            "description": "Balance sheets, ledgers, and financial statements explained clearly for Grade 11 and 12 learners.",
            "price": "R90 / session",
            "image_url": "/uploads/services/Tutoring.png",
            "image_size": tutoring_size,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.OFFER,
            "title": "Afrikaans & isiXhosa Second Additional Language Tutoring",
            "description": "Speaking practice, grammar drills, essay writing, and set-book literature assistance for high schoolers.",
            "price": "R70 / session",
            "image_url": "/uploads/services/Tutoring.png",
            "image_size": tutoring_size,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.OFFER,
            "title": "Basic Computer Literacy & Microsoft Office Mentorship",
            "description": "Learn typing, Word documents, Excel spreadsheets, Google search, and safe email sending on laptop or desktop.",
            "price": "R60 / hr",
            "image_url": "/uploads/services/Tutoring.png",
            "image_size": tutoring_size,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.OFFER,
            "title": "Grade 8-9 Senior Phase Natural Sciences Assistance",
            "description": "Preparation for cycle tests and exams. Simplifying ecosystems, energy, matter, and scientific method.",
            "price": "R80 / session",
            "image_url": "/uploads/services/Tutoring.png",
            "image_size": tutoring_size,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.REQUEST,
            "title": "Looking for Grade 11 Pure Maths Tutor for 2 Learners",
            "description": "Seeking an after-school tutor to help two learners with Euclidean Geometry and analytical maths on weekdays.",
            "price": "R150 / hr budget",
            "image_url": "/uploads/services/Tutoring.png",
            "image_size": tutoring_size,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.REQUEST,
            "title": "Need Help Learning Smartphone Digital Banking",
            "description": "Pensioner looking for a patient tutor to teach Capitec and Standard Bank phone app usage securely.",
            "price": "R50 / lesson",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.REQUEST,
            "title": "Seeking isiXhosa Language Tutor for Adults",
            "description": "Looking for an adult conversational tutor to practice everyday isiXhosa dialogue and pronunciation.",
            "price": "R100 / hr",
            "image_url": None,
            "image_size": None,
        },

        # --- FOOD (Catering, Baking, Stews, Spaza, Preserves) ---
        {
            "category": "Food",
            "type": models.ServiceType.OFFER,
            "title": "Traditional Potjiekos & Beef Stew for Events",
            "description": "Rich traditional beef stew, potjiekos, and steaming dombolo steamed bread for community functions & funerals.",
            "price": "R850 / pot",
            "image_url": "/uploads/services/catering.png",
            "image_size": catering_size,
        },
        {
            "category": "Food",
            "type": models.ServiceType.OFFER,
            "title": "Fresh Baked Scones, Muffins & Afternoon Tea Platters",
            "description": "Home-baked golden scones with jam and cream, sweet muffins, and savory finger bites for local meetings.",
            "price": "R180 / dozen",
            "image_url": "/uploads/services/catering.png",
            "image_size": catering_size,
        },
        {
            "category": "Food",
            "type": models.ServiceType.OFFER,
            "title": "Cape Malay Samosas, Spring Rolls & Half-Moons",
            "description": "Crispy mince and cheese-and-corn samosas, vegetarian spring rolls, and spicy daltjies. Frozen or fried.",
            "price": "R120 / 20 pack",
            "image_url": "/uploads/services/catering.png",
            "image_size": catering_size,
        },
        {
            "category": "Food",
            "type": models.ServiceType.OFFER,
            "title": "Full Event Catering & Spit Braai Coordination",
            "description": "Complete meal service for 20 to 100 guests: braaied meats, chakalaka, potato salad, rolls, and fruit punch.",
            "price": "R95 / person",
            "image_url": "/uploads/services/catering.png",
            "image_size": catering_size,
        },
        {
            "category": "Food",
            "type": models.ServiceType.OFFER,
            "title": "Custom Birthday Cakes & Themed Cupcake Sets",
            "description": "Moist chocolate and vanilla sponge cakes decorated to your theme. Budget-friendly celebration cakes.",
            "price": "From R350",
            "image_url": "/uploads/services/catering.png",
            "image_size": catering_size,
        },
        {
            "category": "Food",
            "type": models.ServiceType.OFFER,
            "title": "Organic Spinach, Cabbage & Seedling Bundles",
            "description": "Pesticide-free leafy greens and hardy vegetable seedlings harvested directly from our Sector 2 community garden.",
            "price": "R20 / bunch",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Food",
            "type": models.ServiceType.OFFER,
            "title": "Hearty Vegetable Soup & Vetkoek Lunch Delivery",
            "description": "Nutritious vegetable lentil soup with warm crispy vetkoek delivered to workplaces and homes at lunchtime.",
            "price": "R35 / meal",
            "image_url": "/uploads/services/catering.png",
            "image_size": catering_size,
        },
        {
            "category": "Food",
            "type": models.ServiceType.REQUEST,
            "title": "Catering Quote Needed for 30-Person Church Gathering",
            "description": "Looking for local caterer to prepare a Sunday meal of chicken, yellow rice, butternut, and beetroot salad.",
            "price": "R2,500 total budget",
            "image_url": "/uploads/services/catering.png",
            "image_size": catering_size,
        },
        {
            "category": "Food",
            "type": models.ServiceType.REQUEST,
            "title": "Seeking 40 Fresh Dombolo Steamed Buns for Thursday",
            "description": "Need fresh traditional dombolo buns for a family gathering this Thursday afternoon.",
            "price": "R200 cash",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Food",
            "type": models.ServiceType.REQUEST,
            "title": "Looking for Surplus Vegetable Cuttings & Fertilizer",
            "description": "Community garden needs clean manure, compost, or surplus seed packets to expand our winter crop.",
            "price": "Barter or R100",
            "image_url": None,
            "image_size": None,
        },

        # --- OTHER (Beauty, Transport, Sewing, Tech, Gardening, Caregiving, Moving) ---
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Braiding, Cornrows & Hair Styling at Home",
            "description": "Knotless braids, cornrows, box braids, wash, and blow dry. Gentle on hair with natural oils provided.",
            "price": "From R200",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Professional Dressmaking & School Uniform Hemming",
            "description": "Shortening trousers, dress alterations, replacing broken zippers, and tailor-made traditional attire.",
            "price": "From R50",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Local Bakkie Hire for Furniture Moving & Rubble Removal",
            "description": "1-ton bakkie with driver available for moving fridges, beds, building sand, and general rubbish cartage.",
            "price": "R350 / trip",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Smartphone Screen Repairs & Battery Replacement",
            "description": "Quick screen replacement, charging port fixing, and battery installation for Samsung, Huawei, and Redmi.",
            "price": "R180 + parts",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Professional Lawn Mowing & Garden Clearance",
            "description": "Trimming overgrown hedges, weeding flower beds, lawn mowing, and green waste bag removal.",
            "price": "R150 / yard",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Elderly Care Companion & Clinic Medication Pickups",
            "description": "Certified care assistant helping senior citizens collect chronic medication from clinic, cooking, and company.",
            "price": "R120 / half-day",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Men's Barber Haircuts & Beard Trims",
            "description": "Fresh fades, brush cuts, line-ups, and scissor trims. Home visits or pop by our backyard barbershop.",
            "price": "R60 / cut",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Carpet & Couch Deep Steam Cleaning",
            "description": "Stain removal and upholstery deep shampoo for lounge suites, car seats, and bedroom carpets.",
            "price": "R300 / suite",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Handmade African Beaded Jewellery & Keyrings",
            "description": "Beautiful traditional bead necklaces, South African flag bracelets, earrings, and custom name keyrings.",
            "price": "From R30",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "PA Sound System & Mic Hire for Community Events",
            "description": "2 powered 12-inch speakers, 2 wireless microphones, Bluetooth mixer, and speaker stands for hire.",
            "price": "R400 / day",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Professional CV Formatting & Online Application Assistance",
            "description": "Turn your handwritten notes into a clean, modern PDF CV. Help with uploading to learnership portals.",
            "price": "R50 / CV",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Shoe & Sneaker Repair, Sole Gluing & Zip Fixing",
            "description": "Give your favorite shoes a second life! Heavy-duty sole stitching, heel repair, and zipper replacement.",
            "price": "From R40",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.REQUEST,
            "title": "Looking for Second-Hand Working Android Smartphone",
            "description": "Searching for an affordable used phone with WhatsApp and camera for high school homework and research.",
            "price": "R500 max",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.REQUEST,
            "title": "Bakkie Needed to Transport Double Bed & Wardrobe",
            "description": "Moving bedroom furniture from Sector 1 to Sector 3 on Saturday morning. Need loading assistance.",
            "price": "R300 cash",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.REQUEST,
            "title": "Seeking Reliable Babysitter for 2 Children on Weekday Afternoons",
            "description": "Looking for a warm, trustworthy neighbor to watch a 4-year-old and 7-year-old from 14:00 to 17:30.",
            "price": "R80 / day",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.REQUEST,
            "title": "Looking for Second-Hand Sewing Machine in Working Order",
            "description": "Want to buy an electric or pedal Singer/Brother sewing machine for home dressmaking business.",
            "price": "R650 negotiable",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.REQUEST,
            "title": "Seeking Used Wheelbarrow and Garden Spade",
            "description": "Need sturdy garden tools for clearing yard stones and rubble this weekend.",
            "price": "R200 cash",
            "image_url": None,
            "image_size": None,
        },
        # Additional listings across categories
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Kitchen Sink Tap Re-Seating & Washer Replacement",
            "description": "Stop that dripping tap! Washer replacement, mixer tap tightening, and flexible hose replacement.",
            "price": "R120 / call-out",
            "image_url": "/uploads/services/plumbing.jpg",
            "image_size": plumbing_size,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Bathroom Tile Grouting & Shower Floor Sealing",
            "description": "Waterproof re-grouting of cracked shower tiles, silicone sealing, and mold prevention.",
            "price": "R250 / job",
            "image_url": "/uploads/services/plumbing.jpg",
            "image_size": plumbing_size,
        },
        {
            "category": "Home repair",
            "type": models.ServiceType.OFFER,
            "title": "Security Fence Gate Latch & Heavy Padlock Fitting",
            "description": "Reinforce yard gates with steel slide bolts, drop pins, and heavy-duty padlock shrouds.",
            "price": "R180 / gate",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.OFFER,
            "title": "Primary School Maths & Times Tables Practice",
            "description": "Fun, encouraging multiplication, fractions, and word sums practice for Grades 4-7 learners.",
            "price": "R70 / hr",
            "image_url": "/uploads/services/Tutoring.png",
            "image_size": tutoring_size,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.OFFER,
            "title": "Grade 12 Life Sciences Exam Revision & Genetics",
            "description": "Comprehensive matric revision covering DNA, genetics, human reproduction, and evolution past papers.",
            "price": "R110 / session",
            "image_url": "/uploads/services/Tutoring.png",
            "image_size": tutoring_size,
        },
        {
            "category": "Tutoring",
            "type": models.ServiceType.OFFER,
            "title": "Conversational English Coaching for Job Interviews",
            "description": "Mock interviews, formal phone call practice, and workplace English communication coaching.",
            "price": "R80 / session",
            "image_url": "/uploads/services/Tutoring.png",
            "image_size": tutoring_size,
        },
        {
            "category": "Food",
            "type": models.ServiceType.OFFER,
            "title": "Traditional Chakalaka, Potato Salad & Coleslaw Tubs",
            "description": "Freshly prepared homemade chakalaka (mild or spicy), creamy potato salad, and crisp coleslaw for braais.",
            "price": "R60 / 1L tub",
            "image_url": "/uploads/services/catering.png",
            "image_size": catering_size,
        },
        {
            "category": "Food",
            "type": models.ServiceType.OFFER,
            "title": "Sunday Roast Chicken & Savory Yellow Rice Lunches",
            "description": "Order your Sunday family feast: herb roasted chicken quarters, turmeric yellow rice, sweet butternut, and gravy.",
            "price": "R65 / plate",
            "image_url": "/uploads/services/catering.png",
            "image_size": catering_size,
        },
        {
            "category": "Food",
            "type": models.ServiceType.OFFER,
            "title": "Mini Milk Tart & Spiced Koeksister Platters",
            "description": "Authentic Cape Dutch milk tarts and syrupy ginger-cinnamon koeksisters for parties and teas.",
            "price": "R150 / platter",
            "image_url": "/uploads/services/catering.png",
            "image_size": catering_size,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "House Window Cleaning & High Reach Glass Washing",
            "description": "Streak-free window washing inside and outside, sliding doors, and burglar bar dusting.",
            "price": "R120 / house",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Sneaker Deep Clean, De-yellowing & Whitening",
            "description": "Professional sneaker revive: shoe foam wash, sole whitening, lace replacement, and odor treatment.",
            "price": "R50 / pair",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Car Battery Jump Start & Emergency Alternator Check",
            "description": "Flat battery assistance in Ocean View and Kommetjie. Heavy jumper cables and portable booster pack.",
            "price": "R100 call-out",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Warm Hand-Knitted Baby Booties & Toddler Beanies",
            "description": "Soft acrylic yarn baby booties, winter beanies, and baby blankets in custom colors.",
            "price": "From R35",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Garden Soil Turning, Compost Spreading & Bed Edging",
            "description": "Prepare your flower beds and vegetable plots for winter. Heavy spade digging and organic manure mixing.",
            "price": "R180 / day",
            "image_url": None,
            "image_size": None,
        },
        {
            "category": "Other",
            "type": models.ServiceType.OFFER,
            "title": "Curtain Alterations, Heading Tape & Cushion Covers",
            "description": "Hemming oversized curtains, sewing gathering heading tape, and stitching durable zip-up cushion covers.",
            "price": "From R60",
            "image_url": None,
            "image_size": None,
        },
    ]

    # Assign posters from members across the catalog
    services = []
    for idx, s_data in enumerate(services_catalog):
        poster = members[idx % len(members)]
        # Make a few closed for realistic variety
        srv_status = models.ServiceStatus.CLOSED if idx in (11, 23, 38) else models.ServiceStatus.OPEN
        created_time = now - timedelta(days=random.randint(1, 35), hours=random.randint(1, 23))

        service = models.Service(
            poster_id=poster.id,
            type=s_data["type"],
            status=srv_status,
            category=s_data["category"],
            title=s_data["title"],
            description=s_data["description"],
            price=s_data["price"],
            image_url=s_data["image_url"],
            image_size=s_data["image_size"],
            created_at=created_time,
        )
        services.append(service)

    db.add_all(services)
    db.commit()
    for s in services:
        db.refresh(s)

    # ==========================================
    # 6. SEED SERVICE APPLICATIONS (INQUIRIES) (35+)
    # ==========================================
    print("Seeding 35+ Service Inquiries & Applications...")
    inquiry_messages = [
        "Hi! Are you available this Thursday afternoon to take a look at our pipes?",
        "Good day, my daughter needs extra lessons before her exams. Can we schedule a lesson this weekend?",
        "Hello! Could we discuss ordering a 3-course potjie for our family gathering next month?",
        "Hi there, is this service still available? I need help with an urgent fix.",
        "Hello! Are you able to travel to Sector 3 or do we bring the item to you?",
        "Good day, what is your rate if we book for 3 hours?",
        "Hi! I saw your advert on CommHub. Can you assist me with emergency repairs tomorrow?",
        "Hello neighbor! I can assist with this request. Please call or WhatsApp me.",
        "Hi, do you bring your own tools and parts or should I purchase them in advance?",
        "Good day, do you have any references or examples of your previous work?",
    ]

    service_apps = []
    # Avoid duplicate (service_id, applicant_id) pairs
    seen_service_applicants = set()
    for srv in services[:35]:
        candidate_members = [m for m in members if m.id != srv.poster_id]
        num_apps = random.randint(1, 2)
        selected_applicants = random.sample(candidate_members, k=num_apps)
        for applicant in selected_applicants:
            pair = (srv.id, applicant.id)
            if pair in seen_service_applicants:
                continue
            seen_service_applicants.add(pair)
            msg = random.choice(inquiry_messages)
            app = models.ServiceApplication(
                service_id=srv.id,
                applicant_id=applicant.id,
                message=msg,
                applied_at=to_naive(srv.created_at) + timedelta(hours=random.randint(2, 48)),
            )
            service_apps.append(app)

    db.add_all(service_apps)
    db.commit()

    # ==========================================
    # 7. SEED SERVICE RATINGS & REVIEWS (80+)
    # ==========================================
    print("Seeding 80+ Peer Service Ratings & Reviews...")
    positive_comments = [
        "Excellent service! Arrived right on time and solved the issue quickly.",
        "Very respectful and skilled craftsman. Highly recommended to everyone in the area!",
        "Great tutor! My son understood the maths syllabus so much better after just two sessions.",
        "The food was absolutely delicious and portions were very generous. Everyone loved it.",
        "Clean, professional, and very honest pricing. Will definitely use again!",
        "Fast response and quality workmanship. Fixed our burst pipe in under an hour.",
        "Patient, polite, and very knowledgeable. Thank you for helping our household.",
        "Affordable and high quality. A great asset to our Ocean View community network!",
    ]
    neutral_comments = [
        "Good service overall, arrived a bit later than scheduled but communicated well.",
        "Did a solid job on the repair. Fair price.",
        "Good tutoring, helped clarify several tricky past paper questions.",
        "Tasty meals, everyone was satisfied.",
    ]

    service_ratings = []
    seen_rating_pairs = set()
    for srv in services:
        if srv.type != models.ServiceType.OFFER:
            continue
        candidate_raters = [m for m in members if m.id != srv.poster_id]
        # 1 to 4 reviews per offer
        num_ratings = random.randint(1, 4)
        chosen_raters = random.sample(candidate_raters, k=num_ratings)

        for rater in chosen_raters:
            pair = (srv.id, rater.id)
            if pair in seen_rating_pairs:
                continue
            seen_rating_pairs.add(pair)

            score = random.choices([5, 4, 3], weights=[0.65, 0.25, 0.10])[0]
            comment = random.choice(positive_comments if score >= 4 else neutral_comments)
            rating_time = to_naive(srv.created_at) + timedelta(days=random.randint(1, 10))
            if rating_time > now:
                rating_time = now - timedelta(hours=2)

            r = models.ServiceRating(
                service_id=srv.id,
                user_id=rater.id,
                score=score,
                comment=comment,
                created_at=rating_time,
            )
            service_ratings.append(r)

    db.add_all(service_ratings)
    db.commit()

    # ==========================================
    # 8. SEED RESEARCH STUDIES & SURVEYS (12+)
    # ==========================================
    print("Seeding 12+ Research Studies with In-House Surveys...")
    # Map studies to verified researchers
    verified_researchers = [r for r in researchers if r.verification_status == models.VerificationStatus.VERIFIED]

    studies_catalog = [
        {
            "researcher": verified_researchers[0],  # Dr. Nomvula Zondo
            "title": "Ocean View Food Security & Nutrition Access Study",
            "description": "Investigating household grocery access, reliance on spaza shops, and local feeding scheme nutrition. Accepted participants receive a supermarket grocery voucher.",
            "honorarium": "R100 Grocery Voucher",
            "participant_limit": 30,
            "state": models.StudyState.LIVE,
            "days_ago": 25,
            "survey": [
                {
                    "prompt": "Where does your household buy the majority of its weekly groceries?",
                    "type": models.QuestionType.MULTIPLE_CHOICE,
                    "required": True,
                    "options": ["Local Spaza Shop", "Supermarket in Fish Hoek / Simon's Town", "Community Feeding Scheme", "Informal Street Vendors"],
                },
                {
                    "prompt": "On a scale of 1 to 5, how accessible are affordable fresh vegetables in your area?",
                    "type": models.QuestionType.RATING,
                    "required": True,
                },
                {
                    "prompt": "Have you or anyone in your household participated in a community food garden?",
                    "type": models.QuestionType.YES_NO,
                    "required": True,
                },
                {
                    "prompt": "What is the single biggest barrier your household faces regarding food security?",
                    "type": models.QuestionType.LONG_TEXT,
                    "required": False,
                },
            ],
        },
        {
            "researcher": verified_researchers[1],  # Prof. Khalid Patel
            "title": "Digital Inclusion & Mesh Network Intranet Adoption",
            "description": "Evaluating digital skills, mobile data affordability, and local intranet community service usage across Ocean View.",
            "honorarium": "R50 Airtime Voucher",
            "participant_limit": 40,
            "state": models.StudyState.LIVE,
            "days_ago": 20,
            "survey": [
                {
                    "prompt": "How much does your household spend on mobile airtime and data per month?",
                    "type": models.QuestionType.MULTIPLE_CHOICE,
                    "required": True,
                    "options": ["Under R50", "R50 - R150", "R151 - R300", "More than R300"],
                },
                {
                    "prompt": "What devices do members of your household use to access the internet?",
                    "type": models.QuestionType.CHECKBOX,
                    "required": True,
                    "options": ["Smartphones", "Basic Feature Phone", "Shared Family Laptop / PC", "School Tablet"],
                },
                {
                    "prompt": "How reliable is the local community Wi-Fi signal at your residence?",
                    "type": models.QuestionType.RATING,
                    "required": True,
                },
                {
                    "prompt": "What services would you like to see hosted locally on the community intranet?",
                    "type": models.QuestionType.SHORT_TEXT,
                    "required": False,
                },
            ],
        },
        {
            "researcher": verified_researchers[2],  # Dr. Tariq Abrahams
            "title": "Household Energy Access & Solar Microgrid Viability",
            "description": "Examining electricity expenditure, frequency of power outages, and community interest in shared rooftop solar power.",
            "honorarium": "R75 Electricity Voucher",
            "participant_limit": 25,
            "state": models.StudyState.LIVE,
            "days_ago": 18,
            "survey": [
                {
                    "prompt": "What is your household's primary source of energy for cooking?",
                    "type": models.QuestionType.MULTIPLE_CHOICE,
                    "required": True,
                    "options": ["Prepaid Electricity", "LPG Gas Cylinder", "Paraffin Stove", "Wood / Charcoal"],
                },
                {
                    "prompt": "Do you own rechargeable battery lamps or portable solar lighting?",
                    "type": models.QuestionType.YES_NO,
                    "required": True,
                },
                {
                    "prompt": "How interested would your household be in joining a shared community solar mini-grid?",
                    "type": models.QuestionType.RATING,
                    "required": True,
                },
            ],
        },
        {
            "researcher": verified_researchers[3],  # Dr. Lindiwe Sithole
            "title": "Early Childhood Multilingual Reading Development",
            "description": "Understanding reading materials at home, mother-tongue storytelling, and literacy readiness before Grade 1.",
            "honorarium": "Children's Book Pack + R50",
            "participant_limit": 20,
            "state": models.StudyState.LIVE,
            "days_ago": 15,
            "survey": [
                {
                    "prompt": "What primary language(s) are spoken to your child at home?",
                    "type": models.QuestionType.CHECKBOX,
                    "required": True,
                    "options": ["isiXhosa", "Afrikaans", "English", "Other African Language"],
                },
                {
                    "prompt": "How many children's storybooks do you currently have at home?",
                    "type": models.QuestionType.MULTIPLE_CHOICE,
                    "required": True,
                    "options": ["0 books", "1 - 5 books", "6 - 15 books", "More than 15 books"],
                },
                {
                    "prompt": "How often does an adult read or tell stories to your children?",
                    "type": models.QuestionType.MULTIPLE_CHOICE,
                    "required": True,
                    "options": ["Every day", "2-3 times a week", "Once a week", "Rarely"],
                },
            ],
        },
        {
            "researcher": verified_researchers[4],  # Prof. Marcus van der Merwe
            "title": "Spaza Shop Supply Chains & Informal Retail Resilience",
            "description": "Documenting how micro-retailers, street vendors, and spazas procure stock and weather economic shocks.",
            "honorarium": "R150 Cash Stipend",
            "participant_limit": 15,
            "state": models.StudyState.LIVE,
            "days_ago": 14,
            "survey": [
                {
                    "prompt": "How often do you or family members purchase daily necessities from local spaza shops?",
                    "type": models.QuestionType.MULTIPLE_CHOICE,
                    "required": True,
                    "options": ["Daily", "Several times a week", "Once a week", "Rarely"],
                },
                {
                    "prompt": "Do your local spaza shops offer informal credit or 'book' purchases to trusted neighbors?",
                    "type": models.QuestionType.YES_NO,
                    "required": True,
                },
                {
                    "prompt": "How satisfied are you with product prices at neighborhood informal stores?",
                    "type": models.QuestionType.RATING,
                    "required": True,
                },
            ],
        },
        {
            "researcher": verified_researchers[5],  # Dr. Fatima Cassim
            "title": "Chronic Disease Clinic Adherence & Community Support",
            "description": "Investigating patient experiences collecting chronic medications and neighborhood care support networks.",
            "honorarium": "R80 Travel Subsidy",
            "participant_limit": 30,
            "state": models.StudyState.LIVE,
            "days_ago": 12,
            "survey": [
                {
                    "prompt": "How long does your typical visit to the local health clinic take?",
                    "type": models.QuestionType.MULTIPLE_CHOICE,
                    "required": True,
                    "options": ["Under 1 hour", "1 - 2 hours", "3 - 5 hours", "Full day"],
                },
                {
                    "prompt": "Have you ever missed collecting your medication due to long queues or transport costs?",
                    "type": models.QuestionType.YES_NO,
                    "required": True,
                },
            ],
        },
        {
            "researcher": verified_researchers[6],  # Dr. Sipho Mthembu
            "title": "Rainwater Harvesting & Domestic Water Security",
            "description": "Field evaluation of domestic water storage tanks, runoff quality, and emergency drought resilience.",
            "honorarium": "Water Quality Test Kit + R50",
            "participant_limit": 20,
            "state": models.StudyState.LIVE,
            "days_ago": 10,
            "survey": [
                {
                    "prompt": "Does your property have a rainwater harvesting tank or water drum?",
                    "type": models.QuestionType.YES_NO,
                    "required": True,
                },
                {
                    "prompt": "What do you primarily use harvested or stored water for?",
                    "type": models.QuestionType.CHECKBOX,
                    "required": True,
                    "options": ["Garden Watering", "Toilet Flushing", "Clothes Washing", "Emergency Household Use"],
                },
            ],
        },
        {
            "researcher": verified_researchers[0],  # Dr. Nomvula Zondo
            "title": "School Feeding Scheme Impact & Afternoon Hunger",
            "description": "Assessing the nutritional adequacy of primary school lunch programs on children's attention and wellbeing.",
            "honorarium": "R100 Shopping Voucher",
            "participant_limit": 25,
            "state": models.StudyState.LIVE,
            "days_ago": 8,
            "survey": None,
        },
        {
            "researcher": verified_researchers[1],  # Prof. Khalid Patel
            "title": "Youth Mobile Gaming & Digital Connectivity Survey",
            "description": "Understanding online recreational habits, bandwidth requirements, and gaming tournaments in the community.",
            "honorarium": "R60 Airtime Voucher",
            "participant_limit": 35,
            "state": models.StudyState.LIVE,
            "days_ago": 7,
            "survey": None,
        },
        {
            "researcher": verified_researchers[3],  # Dr. Lindiwe Sithole
            "title": "High School STEM Subject Choices & Career Aspirations",
            "description": "Longitudinal survey on why learners choose or drop pure mathematics and physical science in Grade 10.",
            "honorarium": "R100 Book Voucher",
            "participant_limit": 20,
            "state": models.StudyState.LIVE,
            "days_ago": 5,
            "survey": None,
        },
        {
            "researcher": verified_researchers[2],  # Dr. Tariq Abrahams
            "title": "Municipal Water Conservation & Pressure Management",
            "description": "Completed study on pressure management valves and household water bill reductions in South Peninsula.",
            "honorarium": "R100 Voucher",
            "participant_limit": 15,
            "state": models.StudyState.CLOSED,
            "days_ago": 40,
            "survey": None,
        },
        {
            "researcher": verified_researchers[4],  # Prof. Marcus van der Merwe
            "title": "Youth Freelancing & Remote Work Opportunities (Pilot)",
            "description": "Draft proposal investigating home workspace availability and noise levels for remote call center work.",
            "honorarium": "R120 Stipend",
            "participant_limit": 10,
            "state": models.StudyState.DRAFT,
            "days_ago": 2,
            "survey": None,
        },
    ]

    studies = []
    surveys = []
    questions = []

    for s_info in studies_catalog:
        study = models.StudyListing(
            researcher_id=s_info["researcher"].id,
            title=s_info["title"],
            description=s_info["description"],
            honorarium=s_info["honorarium"],
            participant_limit=s_info["participant_limit"],
            state=s_info["state"],
            created_at=now - timedelta(days=s_info["days_ago"]),
            closing_date=(now + timedelta(days=30)) if s_info["state"] == models.StudyState.LIVE else (now - timedelta(days=5)),
        )
        studies.append(study)

    db.add_all(studies)
    db.commit()
    for s in studies:
        db.refresh(s)

    # Attach surveys & questions for studies with a survey blueprint
    for idx, s_info in enumerate(studies_catalog):
        if not s_info["survey"]:
            continue
        study_obj = studies[idx]
        srv = models.Survey(
            study_id=study_obj.id,
            created_at=study_obj.created_at,
        )
        db.add(srv)
        db.flush()
        surveys.append(srv)

        for q_idx, q_data in enumerate(s_info["survey"]):
            q = models.SurveyQuestion(
                survey_id=srv.id,
                order=q_idx,
                type=q_data["type"],
                prompt=q_data["prompt"],
                required=q_data.get("required", True),
                options=q_data.get("options", None),
            )
            questions.append(q)

    db.add_all(questions)
    db.commit()
    for q in questions:
        db.refresh(q)

    # ==========================================
    # 9. SEED STUDY APPLICATIONS & SURVEY RESPONSES (45+)
    # ==========================================
    print("Seeding 45+ Study Applications & Completed Survey Responses...")
    study_applications = []
    survey_responses = []
    survey_answers = []

    # Map survey by study_id
    survey_by_study = {srv.study_id: srv for srv in surveys}

    for study in studies:
        if study.state == models.StudyState.DRAFT:
            continue

        candidate_applicants = random.sample(members, k=random.randint(4, 7))
        for applicant in candidate_applicants:
            # Most are accepted so they can fill surveys
            app_status = random.choices(
                [models.ApplicationStatus.ACCEPTED, models.ApplicationStatus.APPLIED, models.ApplicationStatus.DECLINED],
                weights=[0.70, 0.20, 0.10],
            )[0]
            app_time = to_naive(study.created_at) + timedelta(days=random.randint(1, 3))
            st_app = models.Application(
                study_id=study.id,
                user_id=applicant.id,
                status=app_status,
                applied_at=app_time,
            )
            study_applications.append(st_app)

            # If accepted and this study has a survey, submit a response
            if app_status == models.ApplicationStatus.ACCEPTED and study.id in survey_by_study:
                srv = survey_by_study[study.id]
                resp_time = app_time + timedelta(days=random.randint(1, 2))
                if resp_time > now:
                    resp_time = now - timedelta(hours=1)
                resp = models.SurveyResponse(
                    survey_id=srv.id,
                    user_id=applicant.id,
                    submitted_at=resp_time,
                )
                db.add(resp)
                db.flush()
                survey_responses.append(resp)

                # Answers for each question
                for q in srv.questions:
                    ans_val = None
                    if q.type == models.QuestionType.MULTIPLE_CHOICE:
                        ans_val = random.choice(q.options) if q.options else "Option 1"
                    elif q.type == models.QuestionType.CHECKBOX:
                        ans_val = random.sample(q.options, k=random.randint(1, min(2, len(q.options)))) if q.options else ["Option 1"]
                    elif q.type == models.QuestionType.RATING:
                        ans_val = str(random.randint(2, 5))
                    elif q.type == models.QuestionType.YES_NO:
                        ans_val = random.choice(["Yes", "No"])
                    elif q.type == models.QuestionType.SHORT_TEXT:
                        ans_val = "Local job boards and community training video streaming."
                    elif q.type == models.QuestionType.LONG_TEXT:
                        ans_val = "High transport costs to large retail stores and food price inflation on staple goods."

                    ans = models.SurveyAnswer(
                        response_id=resp.id,
                        question_id=q.id,
                        value=ans_val,
                    )
                    survey_answers.append(ans)

    db.add_all(study_applications)
    db.add_all(survey_answers)
    db.commit()

    # ==========================================
    # 10. SEED WORKSHOPS & REGISTRATIONS (14)
    # ==========================================
    print("Seeding 14 Workshops with 60+ Registrations...")
    workshops_catalog = [
        {
            "organizer": verified_researchers[0],  # Dr. Nomvula Zondo
            "title": "Community Nutrition & Low-Cost Healthy Cooking",
            "description": "An interactive 2-hour discussion and live demonstration on preparing balanced, nutrient-rich meals using affordable local vegetables and legumes.",
            "location": "Ocean View Community Hall, Room 3",
            "days_offset": 5,
            "max_participants": 20,
            "status": models.WorkshopStatus.SCHEDULED,
        },
        {
            "organizer": verified_researchers[1],  # Prof. Khalid Patel
            "title": "Digital CV Writing & Online Learnership Applications",
            "description": "Hands-on computer workshop: format professional CVs on mobile phones, save to cloud, and apply for accredited national learnerships.",
            "location": "iNethi Tech Hub, Sector 2",
            "days_offset": 8,
            "max_participants": 15,
            "status": models.WorkshopStatus.SCHEDULED,
        },
        {
            "organizer": verified_researchers[2],  # Dr. Tariq Abrahams
            "title": "Solar Power Basics & Low-Voltage Battery Safety",
            "description": "Learn how small household 12V solar panels and deep cycle batteries work, safe charging practices, and avoiding electrical fire hazards.",
            "location": "Kleinberg Primary School Hall",
            "days_offset": 12,
            "max_participants": 25,
            "status": models.WorkshopStatus.SCHEDULED,
        },
        {
            "organizer": verified_researchers[3],  # Dr. Lindiwe Sithole
            "title": "Reading for Joy: Early Childhood Storytelling Skills",
            "description": "Workshop for parents, ECD practitioners, and daycare helpers on interactive storytelling, book sharing, and playful phonics at home.",
            "location": "Ocean View Public Library, Multipurpose Room",
            "days_offset": 15,
            "max_participants": 18,
            "status": models.WorkshopStatus.SCHEDULED,
        },
        {
            "organizer": verified_researchers[4],  # Prof. Marcus van der Merwe
            "title": "Spaza Shop Bookkeeping & Stock Management on Mobile",
            "description": "Practical bookkeeping methods for informal traders, tracking stock turnover on simple phone spreadsheets, and negotiating wholesale discounts.",
            "location": "Sector 1 Civic Centre",
            "days_offset": 18,
            "max_participants": 16,
            "status": models.WorkshopStatus.SCHEDULED,
        },
        {
            "organizer": verified_researchers[5],  # Dr. Fatima Cassim
            "title": "Diabetes & Hypertension Community Support Circle",
            "description": "Open health literacy session: understanding blood sugar readings, low-salt cooking, foot care, and collective clinic peer support.",
            "location": "Ocean View Community Clinic Conference Room",
            "days_offset": 22,
            "max_participants": 20,
            "status": models.WorkshopStatus.SCHEDULED,
        },
        {
            "organizer": verified_researchers[6],  # Dr. Sipho Mthembu
            "title": "Rainwater Tank Installation & DIY Gutter Filtration",
            "description": "Practical demonstration on setting up 200L rain barrels, building mesh leaf filters, and utilizing greywater safely for garden beds.",
            "location": "Sector 2 Community Garden",
            "days_offset": 25,
            "max_participants": 20,
            "status": models.WorkshopStatus.SCHEDULED,
        },
        {
            "organizer": verified_researchers[1],  # Prof. Khalid Patel
            "title": "Building Community Mesh Wi-Fi Nodes",
            "description": "Technical walkthrough for youth interested in telecommunications: assembling outdoor Wi-Fi routers and linking local nodes.",
            "location": "iNethi Tech Hub, Sector 2",
            "days_offset": 28,
            "max_participants": 12,
            "status": models.WorkshopStatus.SCHEDULED,
        },
        # Completed past workshops
        {
            "organizer": verified_researchers[0],  # Dr. Nomvula Zondo
            "title": "Food Budgeting & Bulk Buying Clubs Orientation",
            "description": "Community collective purchasing meeting: how groups of 5-10 households can buy rice, oil, and flour in bulk from wholesalers.",
            "location": "Ocean View Community Hall",
            "days_offset": -10,
            "max_participants": 25,
            "status": models.WorkshopStatus.COMPLETED,
        },
        {
            "organizer": verified_researchers[3],  # Dr. Lindiwe Sithole
            "title": "Grade 1 Transition & School Readiness Clinic",
            "description": "Advice for parents whose children are entering formal schooling: motor skills, emotional readiness, and required supplies.",
            "location": "Kleinberg Primary School Hall",
            "days_offset": -15,
            "max_participants": 20,
            "status": models.WorkshopStatus.COMPLETED,
        },
        {
            "organizer": verified_researchers[4],  # Prof. Marcus van der Merwe
            "title": "Micro-Business Compliance & CIPC Registration",
            "description": "Assisting informal artisans and caterers with free CIPC business registration, tax numbers, and formal tender readiness.",
            "location": "Sector 1 Civic Centre",
            "days_offset": -20,
            "max_participants": 15,
            "status": models.WorkshopStatus.COMPLETED,
        },
        {
            "organizer": verified_researchers[5],  # Dr. Fatima Cassim
            "title": "Mental Wellness & Stress Reduction for Community Carers",
            "description": "Mindfulness, peer listening circles, and burnout prevention for informal caregivers looking after sick relatives.",
            "location": "Ocean View Library Multipurpose Room",
            "days_offset": -25,
            "max_participants": 15,
            "status": models.WorkshopStatus.COMPLETED,
        },
        # Cancelled workshop
        {
            "organizer": verified_researchers[2],  # Dr. Tariq Abrahams
            "title": "Advanced Micro-Inverter Repair Workshop",
            "description": "Cancelled due to venue maintenance work. Rescheduling for next month.",
            "location": "Ocean View Community Hall, Room 1",
            "days_offset": -5,
            "max_participants": 10,
            "status": models.WorkshopStatus.CANCELLED,
        },
        {
            "organizer": verified_researchers[6],  # Dr. Sipho Mthembu
            "title": "Groundwater Testing & Borehole Well Safety",
            "description": "Postponed session on testing salinity and chemical runoff in coastal borehole groundwater.",
            "location": "Sector 2 Community Garden",
            "days_offset": 35,
            "max_participants": 15,
            "status": models.WorkshopStatus.SCHEDULED,
        },
    ]

    workshops = []
    for w_data in workshops_catalog:
        w_time = now + timedelta(days=w_data["days_offset"], hours=random.randint(10, 16))
        created_time = w_time - timedelta(days=random.randint(7, 20))
        w = models.Workshop(
            organizer_id=w_data["organizer"].id,
            title=w_data["title"],
            description=w_data["description"],
            location=w_data["location"],
            date_time=w_time,
            max_participants=w_data["max_participants"],
            status=w_data["status"],
            created_at=created_time,
        )
        workshops.append(w)

    db.add_all(workshops)
    db.commit()
    for w in workshops:
        db.refresh(w)

    # Workshop Registrations (60+)
    workshop_registrations = []
    seen_workshop_pairs = set()
    for w in workshops:
        reg_count = random.randint(3, min(8, w.max_participants))
        participants = random.sample(members, k=reg_count)
        for p in participants:
            pair = (w.id, p.id)
            if pair in seen_workshop_pairs:
                continue
            seen_workshop_pairs.add(pair)
            reg_time = to_naive(w.created_at) + timedelta(days=random.randint(1, 4))
            if reg_time > now:
                reg_time = now - timedelta(hours=3)
            reg = models.WorkshopRegistration(
                workshop_id=w.id,
                user_id=p.id,
                registered_at=reg_time,
            )
            workshop_registrations.append(reg)

    db.add_all(workshop_registrations)
    db.commit()

    # ==========================================
    # 11. SEED SYSTEM ANNOUNCEMENTS (6)
    # ==========================================
    print("Seeding 6 Platform Announcements...")
    announcements_data = [
        {
            "author": chief_admin,
            "audience": "All members",
            "content": "Welcome to CommHub Ocean View! Connect with your neighbors, discover local services, and take part in verified community research studies.",
            "days_ago": 20,
        },
        {
            "author": community_admin,
            "audience": "Community Members",
            "content": "Municipal Water Pipe Maintenance scheduled for Sector 4 this Wednesday from 08:00 to 14:00. Please store clean household water in advance.",
            "days_ago": 3,
        },
        {
            "author": chief_admin,
            "audience": "Researchers",
            "content": "Quarterly Community Research Ethics & Verification Submissions are now open. Please review the updated community consent guidelines before launching field surveys.",
            "days_ago": 7,
        },
        {
            "author": tech_admin,
            "audience": "All members",
            "content": "Free community Wi-Fi voucher renewals and offline intranet browsing tutorials are available at the iNethi Tech Hub every Saturday morning.",
            "days_ago": 1,
        },
        {
            "author": community_admin,
            "audience": "Community Members",
            "content": "Ocean View Community Hall will host a free Small Business & Artisan Support desk this coming Friday. Bring your questions regarding municipal permits and trading.",
            "days_ago": 5,
        },
        {
            "author": chief_admin,
            "audience": "Researchers",
            "content": "Research study honorarium disbursement receipts for the past month have been reconciled. Please verify your participant register before the 25th.",
            "days_ago": 12,
        },
    ]

    announcements = []
    for a_data in announcements_data:
        ann = models.Announcement(
            author_id=a_data["author"].id,
            audience=a_data["audience"],
            content=a_data["content"],
            created_at=now - timedelta(days=a_data["days_ago"]),
        )
        announcements.append(ann)

    db.add_all(announcements)
    db.commit()

    # ==========================================
    # 12. SEED MODERATION REPORTS & AUDIT LOGS (8 reports, 15+ logs)
    # ==========================================
    print("Seeding Moderation Reports & Append-Only Audit Trail...")
    reports_data = [
        {
            "reporter": members[0],
            "target_type": models.ReportTargetType.SERVICE,
            "target_id": services[0].id,
            "reason": "Accidental duplicate listing posted twice in the directory.",
            "status": models.ReportStatus.OPEN,
            "resolved_by": None,
            "days_ago": 2,
        },
        {
            "reporter": members[1],
            "target_type": models.ReportTargetType.USER,
            "target_id": members[10].id,
            "reason": "Reported user phone number was unreachable for three consecutive days.",
            "status": models.ReportStatus.RESOLVED,
            "resolved_by": community_admin,
            "days_ago": 5,
        },
        {
            "reporter": members[2],
            "target_type": models.ReportTargetType.SERVICE,
            "target_id": services[15].id,
            "reason": "Listed price differs from quoted rate in direct inquiry.",
            "status": models.ReportStatus.DISMISSED,
            "resolved_by": chief_admin,
            "days_ago": 8,
        },
        {
            "reporter": members[3],
            "target_type": models.ReportTargetType.STUDY,
            "target_id": studies[0].id,
            "reason": "Inquiry regarding supermarket voucher collection location.",
            "status": models.ReportStatus.RESOLVED,
            "resolved_by": chief_admin,
            "days_ago": 12,
        },
        {
            "reporter": members[4],
            "target_type": models.ReportTargetType.SERVICE,
            "target_id": services[4].id,
            "reason": "Service marked as open but poster is currently on holiday.",
            "status": models.ReportStatus.OPEN,
            "resolved_by": None,
            "days_ago": 1,
        },
        {
            "reporter": members[5],
            "target_type": models.ReportTargetType.USER,
            "target_id": members[15].id,
            "reason": "Suspicious rapid inquiries test report.",
            "status": models.ReportStatus.DISMISSED,
            "resolved_by": community_admin,
            "days_ago": 14,
        },
        {
            "reporter": members[6],
            "target_type": models.ReportTargetType.SERVICE,
            "target_id": services[20].id,
            "reason": "Listing had typo in telephone number, requested admin correction.",
            "status": models.ReportStatus.RESOLVED,
            "resolved_by": community_admin,
            "days_ago": 6,
        },
        {
            "reporter": members[7],
            "target_type": models.ReportTargetType.STUDY,
            "target_id": studies[1].id,
            "reason": "Clarification requested on whether high school students qualify for airtime.",
            "status": models.ReportStatus.OPEN,
            "resolved_by": None,
            "days_ago": 3,
        },
    ]

    reports = []
    for rep_data in reports_data:
        r_time = now - timedelta(days=rep_data["days_ago"])
        resolved_time = (r_time + timedelta(days=1)) if rep_data["status"] != models.ReportStatus.OPEN else None
        rep = models.Report(
            reporter_id=rep_data["reporter"].id,
            target_type=rep_data["target_type"],
            target_id=rep_data["target_id"],
            reason=rep_data["reason"],
            status=rep_data["status"],
            resolved_by_id=rep_data["resolved_by"].id if rep_data["resolved_by"] else None,
            created_at=r_time,
            resolved_at=resolved_time,
        )
        reports.append(rep)

    db.add_all(reports)
    db.commit()

    # Append-only audit logs
    audit_logs_data = [
        (chief_admin.id, "researcher_verified", "user", verified_researchers[0].id, {"username": "dr_nomvula", "institutional_email": "nomvula.zondo@uct.ac.za"}, 55),
        (chief_admin.id, "researcher_verified", "user", verified_researchers[1].id, {"username": "prof_khalid", "institutional_email": "khalid.patel@uct.ac.za"}, 50),
        (chief_admin.id, "researcher_verified", "user", verified_researchers[2].id, {"username": "dr_tariq", "institutional_email": "tariq.abrahams@uwc.ac.za"}, 45),
        (chief_admin.id, "researcher_verified", "user", verified_researchers[3].id, {"username": "dr_lindiwe", "institutional_email": "lindiwe.sithole@uct.ac.za"}, 40),
        (chief_admin.id, "researcher_verified", "user", verified_researchers[4].id, {"username": "prof_marcus", "institutional_email": "marcus.vdmerwe@sun.ac.za"}, 35),
        (chief_admin.id, "researcher_verified", "user", verified_researchers[5].id, {"username": "dr_fatima", "institutional_email": "fatima.cassim@uwc.ac.za"}, 30),
        (chief_admin.id, "researcher_verified", "user", verified_researchers[6].id, {"username": "dr_sipho_research", "institutional_email": "sipho.mthembu.sci@uct.ac.za"}, 25),
        (chief_admin.id, "researcher_downgraded", "user", researchers[-1].id, {"username": "prof_johan", "reason": "voluntary_downgrade"}, 25),
        (community_admin.id, "report_resolved", "report", reports[1].id, {"action": "dismissed_resolved", "notes": "phone verified"}, 4),
        (chief_admin.id, "report_dismissed", "report", reports[2].id, {"action": "no_violation", "notes": "pricing negotiable"}, 7),
        (chief_admin.id, "report_resolved", "report", reports[3].id, {"action": "voucher_instructions_sent"}, 11),
        (community_admin.id, "report_resolved", "report", reports[6].id, {"action": "phone_typo_fixed"}, 5),
        (community_admin.id, "announcement_posted", "announcement", announcements[1].id, {"audience": "Community Members"}, 3),
        (chief_admin.id, "announcement_posted", "announcement", announcements[2].id, {"audience": "Researchers"}, 7),
        (tech_admin.id, "mesh_node_cache_purged", "system", None, {"node_id": "sector2-relay-node", "bytes_cleared": 4512000}, 2),
        (chief_admin.id, "study_state_changed", "study", studies[10].id, {"previous_state": "live", "new_state": "closed"}, 10),
    ]

    logs = []
    for actor_id, action, target_type, target_id, details, days_ago in audit_logs_data:
        log = models.AuditLog(
            actor_id=actor_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
            created_at=now - timedelta(days=days_ago),
        )
        logs.append(log)

    db.add_all(logs)
    db.commit()

    db.close()

    print("========================================================")
    print("[SUCCESS] CommHub database seeded with comprehensive data!")
    print("========================================================")
    print(f"Summary of Seeded Records:")
    print(f"  - Admins:                 {len(admins)}")
    print(f"  - Researchers:            {len(researchers)} (7 verified, 2 pending, 1 downgraded)")
    print(f"  - Community Members:      {len(members)}")
    print(f"  - Demographic Census:     {len(census_records)}")
    print(f"  - Services (Adverts):     {len(services)} (with photos from backend/uploads/services)")
    print(f"  - Peer Service Ratings:   {len(service_ratings)}")
    print(f"  - Service Inquiries:      {len(service_apps)}")
    print(f"  - Research Studies:       {len(studies)}")
    print(f"  - In-House Surveys:       {len(surveys)} ({len(questions)} questions total)")
    print(f"  - Study Applications:     {len(study_applications)}")
    print(f"  - Survey Responses:       {len(survey_responses)} ({len(survey_answers)} individual answers)")
    print(f"  - Workshops:              {len(workshops)}")
    print(f"  - Workshop Registrations: {len(workshop_registrations)}")
    print(f"  - Announcements:          {len(announcements)}")
    print(f"  - Moderation Reports:     {len(reports)}")
    print(f"  - Audit Trail Logs:       {len(logs)}")
    print("========================================================")
    print("Sample Login Accounts (PIN: 12345 for all):")
    print("  - Chief Admin:            chief_admin         / 12345")
    print("  - Community Admin:        community_admin     / 12345")
    print("  - Tech Admin:             tech_admin          / 12345")
    print("  - Verified Researcher 1:  dr_nomvula          / 12345")
    print("  - Verified Researcher 2:  prof_khalid         / 12345")
    print("  - Verified Researcher 3:  dr_tariq            / 12345")
    print("  - Pending Researcher:     dr_anele            / 12345")
    print("  - Downgraded Researcher:  prof_johan          / 12345")
    print("  - Community Member 1:     sipho_member        / 12345")
    print("  - Community Member 2:     ayanda_m            / 12345")
    print("  - Community Member 3:     thabo_k             / 12345")
    print("  - Community Member 4:     lungile_d           / 12345")
    print("========================================================")


if __name__ == "__main__":
    seed_database()
