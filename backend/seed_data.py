"""
Database Seed Script for CommHub
================================
Populates the MySQL database with rich, realistic mock data for demonstrations:
- User Personas (Admin, Verified Researcher, Pending Researcher, Community Members) with PIN "12345"
- Service Directory Adverts (Offers & Requests) with applications
- Research Studies with In-House Surveys, Questions, and Submissions
- Upcoming Community Workshops & Registrations
- Community Census Demographic Responses (Employment, Income, Skills)
- System Announcements
- Moderation Reports & Append-Only Audit Logs

Usage:
  python backend/seed_data.py
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone

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

    print("Seeding Users (PIN: 12345 for all)...")
    hashed_pin = utils.hash_password("12345")
    now = datetime.now(timezone.utc)

    # 1. Admin
    admin = models.User(
        username="chief_admin",
        email="admin@commhub.org",
        password=hashed_pin,
        role=models.UserRole.ADMIN,
        verification_status=models.VerificationStatus.NONE,
        display_name="Platform Administrator",
        bio="CommHub platform administrator and community network coordinator.",
        phone="0821110001",
        contact_phone="0821110001",
        contact_email="admin@commhub.org",
        time=now - timedelta(days=60),
    )

    # 2. Researchers
    dr_nomvula = models.User(
        username="dr_nomvula",
        email="nomvula.zondo@uct.ac.za",
        password=hashed_pin,
        role=models.UserRole.RESEARCHER,
        verification_status=models.VerificationStatus.VERIFIED,
        display_name="Dr. Nomvula Zondo",
        bio="UCT Health Sciences & Community Nutrition Researcher specializing in food systems.",
        phone="0822220002",
        contact_phone="0822220002",
        contact_email="nomvula.zondo@uct.ac.za",
        time=now - timedelta(days=45),
    )

    prof_khalid = models.User(
        username="prof_khalid",
        email="khalid.patel@uct.ac.za",
        password=hashed_pin,
        role=models.UserRole.RESEARCHER,
        verification_status=models.VerificationStatus.PENDING,
        display_name="Prof. Khalid Patel",
        bio="Digital Inclusion & Mesh Network Researcher investigating low-cost connectivity.",
        phone="0823330003",
        contact_phone="0823330003",
        contact_email="khalid.patel@uct.ac.za",
        time=now - timedelta(days=2),
    )

    # 3. Community Members
    sipho = models.User(
        username="sipho_member",
        email="sipho.khumalo@gmail.com",
        password=hashed_pin,
        role=models.UserRole.COMMUNITY_MEMBER,
        verification_status=models.VerificationStatus.NONE,
        display_name="Sipho Khumalo",
        bio="Experienced carpenter, woodwork craftsman, and community garden volunteer.",
        phone="0834440004",
        contact_phone="0834440004",
        contact_email="sipho.khumalo@gmail.com",
        struggles=["employment", "internet_access"],
        time=now - timedelta(days=20),
    )

    ayanda = models.User(
        username="ayanda_m",
        email="ayanda.m@gmail.com",
        password=hashed_pin,
        role=models.UserRole.COMMUNITY_MEMBER,
        verification_status=models.VerificationStatus.NONE,
        display_name="Ayanda Mthembu",
        bio="Local home baker, catering coordinator, and sewing enthusiast in Sector 3.",
        phone="0845550005",
        contact_phone="0845550005",
        contact_email="ayanda.m@gmail.com",
        struggles=["food_security", "housing"],
        time=now - timedelta(days=15),
    )

    thabo = models.User(
        username="thabo_k",
        email="thabo.k@gmail.com",
        password=hashed_pin,
        role=models.UserRole.COMMUNITY_MEMBER,
        verification_status=models.VerificationStatus.NONE,
        display_name="Thabo Koen",
        bio="Grade 8-12 Mathematics & Physical Science tutor. Studying Computer Science.",
        phone="0856660006",
        contact_phone="0856660006",
        contact_email="thabo.k@gmail.com",
        struggles=["employment", "transport"],
        time=now - timedelta(days=10),
    )

    lungile = models.User(
        username="lungile_d",
        email="lungile.d@gmail.com",
        password=hashed_pin,
        role=models.UserRole.COMMUNITY_MEMBER,
        verification_status=models.VerificationStatus.NONE,
        display_name="Lungile Dlamini",
        bio="Certified apprentice plumber, pipe repair specialist, and general handyman.",
        phone="0867770007",
        contact_phone="0867770007",
        contact_email="lungile.d@gmail.com",
        struggles=["food_security", "employment"],
        time=now - timedelta(days=5),
    )

    db.add_all([admin, dr_nomvula, prof_khalid, sipho, ayanda, thabo, lungile])
    db.commit()
    for u in [admin, dr_nomvula, prof_khalid, sipho, ayanda, thabo, lungile]:
        db.refresh(u)

    print("Seeding Services (Adverts)...")
    s1 = models.Service(
        poster_id=lungile.id,
        type=models.ServiceType.OFFER,
        category="Plumbing",
        title="Plumbing & Emergency Pipe Repair",
        description="Emergency leak detection, tap fixing, and drainage unblocking in Ocean View. Fast local response.",
        price="R150 / hr",
        status=models.ServiceStatus.OPEN,
        created_at=now - timedelta(days=4),
    )
    s2 = models.Service(
        poster_id=thabo.id,
        type=models.ServiceType.OFFER,
        category="Education",
        title="Maths & Science High School Tutoring",
        description="Grade 8-12 mathematics exam preparation, past paper walkthroughs, and homework assistance.",
        price="R100 / session",
        status=models.ServiceStatus.OPEN,
        created_at=now - timedelta(days=3),
    )
    s3 = models.Service(
        poster_id=ayanda.id,
        type=models.ServiceType.OFFER,
        category="Catering",
        title="Traditional Catering for Events & Gatherings",
        description="Freshly cooked traditional stews, potjiekos, and baked pastries for family events and community functions.",
        price="R850 / pot",
        status=models.ServiceStatus.OPEN,
        created_at=now - timedelta(days=2),
    )
    s4 = models.Service(
        poster_id=sipho.id,
        type=models.ServiceType.REQUEST,
        category="Construction",
        title="Roof Sheet Replacement Help Needed",
        description="Looking for an extra pair of hands to help replace corrugated iron roof sheets this Saturday morning.",
        price="R250 budget",
        status=models.ServiceStatus.OPEN,
        created_at=now - timedelta(days=1),
    )
    s5 = models.Service(
        poster_id=ayanda.id,
        type=models.ServiceType.REQUEST,
        category="Electronics",
        title="Looking for Used Working Android Smartphone",
        description="Searching for an affordable second-hand smartphone with WhatsApp for school research assignments.",
        price="R500 negotiable",
        status=models.ServiceStatus.OPEN,
        created_at=now - timedelta(hours=12),
    )
    db.add_all([s1, s2, s3, s4, s5])
    db.commit()
    for s in [s1, s2, s3, s4, s5]:
        db.refresh(s)

    print("Seeding Advert Applications (Responses)...")
    app1 = models.ServiceApplication(
        service_id=s1.id,
        applicant_id=sipho.id,
        message="Hi Lungile, I have a leaking tap in my workshop. Are you available this Thursday afternoon?",
        applied_at=now - timedelta(days=2),
    )
    app2 = models.ServiceApplication(
        service_id=s2.id,
        applicant_id=ayanda.id,
        message="Hello Thabo! My nephew is struggling with Grade 10 Trigonometry. Could we book 2 weekend sessions?",
        applied_at=now - timedelta(days=1),
    )
    db.add_all([app1, app2])
    db.commit()

    print("Seeding Peer Service Ratings & Reviews...")
    r1 = models.ServiceRating(
        service_id=s1.id,
        user_id=sipho.id,
        score=5,
        comment="Fast emergency response and fixed the pipe properly. Very reliable local plumber!",
        created_at=now - timedelta(days=2),
    )
    r2 = models.ServiceRating(
        service_id=s1.id,
        user_id=thabo.id,
        score=5,
        comment="Lungile helped unblock our community centre drain. Excellent workmanship.",
        created_at=now - timedelta(days=1),
    )
    r3 = models.ServiceRating(
        service_id=s2.id,
        user_id=ayanda.id,
        score=5,
        comment="Patient and clear math tutor. My nephew's test score improved noticeably!",
        created_at=now - timedelta(days=1),
    )
    r4 = models.ServiceRating(
        service_id=s3.id,
        user_id=sipho.id,
        score=4,
        comment="Delicious traditional stew for our gathering. Everyone enjoyed the meal.",
        created_at=now - timedelta(hours=18),
    )
    db.add_all([r1, r2, r3, r4])
    db.commit()

    print("Seeding Research Studies & In-House Survey Engine...")
    study1 = models.StudyListing(
        researcher_id=dr_nomvula.id,
        title="Ocean View Food Security & Nutrition Access Study",
        description="Investigating household grocery access, reliance on spaza shops, and local feeding scheme nutrition. Accepted participants receive a supermarket grocery voucher.",
        honorarium="R100 Grocery Voucher",
        participant_limit=15,
        state=models.StudyState.LIVE,
        created_at=now - timedelta(days=8),
    )
    study2 = models.StudyListing(
        researcher_id=dr_nomvula.id,
        title="Digital Inclusion & Mesh Network Intranet Adoption",
        description="Evaluating digital skills, mobile data affordability, and local intranet community service usage across Ocean View.",
        honorarium="R50 Airtime Voucher",
        participant_limit=20,
        state=models.StudyState.LIVE,
        created_at=now - timedelta(days=3),
    )
    db.add_all([study1, study2])
    db.commit()
    db.refresh(study1)
    db.refresh(study2)

    # In-House Survey for Study 1
    survey1 = models.Survey(study_id=study1.id)
    db.add(survey1)
    db.flush()

    q1 = models.SurveyQuestion(
        survey_id=survey1.id,
        order=0,
        type=models.QuestionType.MULTIPLE_CHOICE,
        prompt="Where does your household buy the majority of its weekly groceries?",
        required=True,
        options=["Local Spaza Shop", "Supermarket in Fish Hoek / Simon's Town", "Community Feeding Scheme", "Informal Street Vendors"],
    )
    q2 = models.SurveyQuestion(
        survey_id=survey1.id,
        order=1,
        type=models.QuestionType.RATING,
        prompt="On a scale of 1 to 5, how accessible are affordable fresh vegetables in your area?",
        required=True,
    )
    q3 = models.SurveyQuestion(
        survey_id=survey1.id,
        order=2,
        type=models.QuestionType.YES_NO,
        prompt="Have you or anyone in your household participated in a community food garden?",
        required=True,
    )
    q4 = models.SurveyQuestion(
        survey_id=survey1.id,
        order=3,
        type=models.QuestionType.LONG_TEXT,
        prompt="What is the single biggest barrier your household faces regarding food security?",
        required=False,
    )
    db.add_all([q1, q2, q3, q4])
    db.commit()
    for q in [q1, q2, q3, q4]:
        db.refresh(q)

    print("Seeding Study Applications & Submissions...")
    # Sipho: Accepted & Completed
    study_app1 = models.Application(
        study_id=study1.id, user_id=sipho.id, status=models.ApplicationStatus.ACCEPTED, applied_at=now - timedelta(days=6)
    )
    # Ayanda: Accepted & Completed
    study_app2 = models.Application(
        study_id=study1.id, user_id=ayanda.id, status=models.ApplicationStatus.ACCEPTED, applied_at=now - timedelta(days=5)
    )
    # Thabo: Applied (Pending Review)
    study_app3 = models.Application(
        study_id=study1.id, user_id=thabo.id, status=models.ApplicationStatus.APPLIED, applied_at=now - timedelta(days=1)
    )
    db.add_all([study_app1, study_app2, study_app3])
    db.commit()

    # Survey Responses
    resp1 = models.SurveyResponse(survey_id=survey1.id, user_id=sipho.id, submitted_at=now - timedelta(days=4))
    resp2 = models.SurveyResponse(survey_id=survey1.id, user_id=ayanda.id, submitted_at=now - timedelta(days=3))
    db.add_all([resp1, resp2])
    db.flush()

    ans1_1 = models.SurveyAnswer(response_id=resp1.id, question_id=q1.id, value="Supermarket in Fish Hoek / Simon's Town")
    ans1_2 = models.SurveyAnswer(response_id=resp1.id, question_id=q2.id, value="2")
    ans1_3 = models.SurveyAnswer(response_id=resp1.id, question_id=q3.id, value="Yes")
    ans1_4 = models.SurveyAnswer(response_id=resp1.id, question_id=q4.id, value="High taxi and bus transport costs to travel into town for bulk groceries.")

    ans2_1 = models.SurveyAnswer(response_id=resp2.id, question_id=q1.id, value="Local Spaza Shop")
    ans2_2 = models.SurveyAnswer(response_id=resp2.id, question_id=q2.id, value="3")
    ans2_3 = models.SurveyAnswer(response_id=resp2.id, question_id=q3.id, value="No")
    ans2_4 = models.SurveyAnswer(response_id=resp2.id, question_id=q4.id, value="Spaza shops have limited fresh stock and prices are higher than large supermarket chains.")

    db.add_all([ans1_1, ans1_2, ans1_3, ans1_4, ans2_1, ans2_2, ans2_3, ans2_4])
    db.commit()

    print("Seeding Workshops & Scheduled Sessions...")
    w1 = models.Workshop(
        organizer_id=dr_nomvula.id,
        title="Community Nutrition & Low-Cost Healthy Cooking",
        description="An interactive 2-hour discussion on preparing balanced low-cost meals and sharing traditional community recipes.",
        location="Ocean View Community Hall, Room 3",
        date_time=now + timedelta(days=7),
        max_participants=12,
        status=models.WorkshopStatus.SCHEDULED,
        created_at=now - timedelta(days=4),
    )
    w2 = models.Workshop(
        organizer_id=dr_nomvula.id,
        title="Digital CV Writing & Online Learnership Applications",
        description="Learn how to format professional CVs on mobile phones and apply for accredited learnerships online.",
        location="iNethi Tech Hub, Sector 2",
        date_time=now + timedelta(days=14),
        max_participants=10,
        status=models.WorkshopStatus.SCHEDULED,
        created_at=now - timedelta(days=2),
    )
    db.add_all([w1, w2])
    db.commit()
    db.refresh(w1)
    db.refresh(w2)

    reg1 = models.WorkshopRegistration(workshop_id=w1.id, user_id=sipho.id, registered_at=now - timedelta(days=3))
    reg2 = models.WorkshopRegistration(workshop_id=w1.id, user_id=ayanda.id, registered_at=now - timedelta(days=2))
    reg3 = models.WorkshopRegistration(workshop_id=w1.id, user_id=thabo.id, registered_at=now - timedelta(days=1))
    reg4 = models.WorkshopRegistration(workshop_id=w2.id, user_id=lungile.id, registered_at=now - timedelta(days=1))
    db.add_all([reg1, reg2, reg3, reg4])
    db.commit()

    print("Seeding Community Demographic Census Data...")
    c_sipho = models.CommunityCensus(
        user_id=sipho.id,
        employment_status="Self-Employed / Entrepreneur",
        income_bracket="R3,501 - R6,000",
        education_level="Vocational / TVET Certificate",
        job_skills=["Carpentry & Construction", "Plumbing & Electrical"],
        job_support_needs=["Need internet / computer access", "Want skills training courses"],
    )
    c_ayanda = models.CommunityCensus(
        user_id=ayanda.id,
        employment_status="Employed (Part-Time / Casual)",
        income_bracket="R1,500 - R3,500",
        education_level="Matric / Grade 12",
        job_skills=["Cooking & Catering", "Retail & Cashiering"],
        job_support_needs=["Want skills training courses", "Need CV / Resume writing help"],
    )
    c_thabo = models.CommunityCensus(
        user_id=thabo.id,
        employment_status="Student / In Training",
        income_bracket="R1,500 - R3,500",
        education_level="Matric / Grade 12",
        job_skills=["Computer & Digital Skills", "Childcare & Domestic"],
        job_support_needs=["Looking for apprenticeship / learnership", "Ready to work immediately"],
    )
    c_lungile = models.CommunityCensus(
        user_id=lungile.id,
        employment_status="Job Seeker (Unemployed)",
        income_bracket="Under R1,500",
        education_level="Some High School (Grades 8-11)",
        job_skills=["Plumbing & Electrical", "Carpentry & Construction"],
        job_support_needs=["Ready to work immediately", "Need interview preparation"],
    )
    db.add_all([c_sipho, c_ayanda, c_thabo, c_lungile])
    db.commit()

    print("Seeding System Announcements...")
    ann1 = models.Announcement(
        author_id=admin.id,
        audience="All members",
        content="Municipal Water Pipe Maintenance scheduled for Sector 4 this Wednesday from 08:00 to 14:00. Please store household water in advance.",
        created_at=now - timedelta(days=2),
    )
    ann2 = models.Announcement(
        author_id=admin.id,
        audience="Researchers",
        content="Quarter 4 Community Research Ethics Submissions are now open. Please review the updated community consent guidelines.",
        created_at=now - timedelta(days=5),
    )
    db.add_all([ann1, ann2])
    db.commit()

    print("Seeding Moderation Reports & Audit Trail...")
    rep1 = models.Report(
        reporter_id=sipho.id,
        target_type=models.ReportTargetType.SERVICE,
        target_id=s4.id,
        reason="Duplicate listing posted accidentally.",
        status=models.ReportStatus.OPEN,
        created_at=now - timedelta(days=1),
    )
    rep2 = models.Report(
        reporter_id=ayanda.id,
        target_type=models.ReportTargetType.USER,
        target_id=thabo.id,
        reason="Testing report queue functionality.",
        status=models.ReportStatus.RESOLVED,
        resolved_by_id=admin.id,
        created_at=now - timedelta(days=3),
    )
    db.add_all([rep1, rep2])
    db.commit()

    log1 = models.AuditLog(
        actor_id=admin.id,
        action="researcher_verified",
        target_type="user",
        target_id=dr_nomvula.id,
        details={"username": "dr_nomvula", "institutional_email": "nomvula.zondo@uct.ac.za"},
        created_at=now - timedelta(days=40),
    )
    log2 = models.AuditLog(
        actor_id=admin.id,
        action="report_resolved",
        target_type="user",
        target_id=thabo.id,
        details={"report_id": 2, "action": "dismissed_no_violation"},
        created_at=now - timedelta(days=2),
    )
    db.add_all([log1, log2])
    db.commit()

    db.close()
    print("========================================================")
    print("[SUCCESS] CommHub database has been populated with mock data!")
    print("========================================================")
    print("Sample Login Accounts (PIN: 12345 for all):")
    print("  - Admin:               chief_admin   / 12345")
    print("  - Verified Researcher: dr_nomvula    / 12345")
    print("  - Pending Researcher:  prof_khalid   / 12345")
    print("  - Community Member:    sipho_member  / 12345")
    print("  - Community Member:    ayanda_m      / 12345")
    print("  - Community Member:    thabo_k       / 12345")
    print("  - Community Member:    lungile_d     / 12345")
    print("========================================================")


if __name__ == "__main__":
    seed_database()

