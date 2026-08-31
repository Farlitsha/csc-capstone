import os
import sys
import pytest
from pathlib import Path

# Ensure backend root is in sys.path
backend_path = str(Path(__file__).resolve().parent.parent)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Set test environment variables before importing app modules
os.environ["DATABASE_HOSTNAME"] = "localhost"
os.environ["DATABASE_PORT"] = "3306"
os.environ["DATABASE_NAME"] = "test_db"
os.environ["DATABASE_USERNAME"] = "root"
os.environ["DATABASE_PASSWORD"] = "testpass"
os.environ["SECRET_KEY"] = "supersecretkeyfortestingpurposesonly12345"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app import models, utils, oauth2

# Create SQLite in-memory database engine for fast isolated testing
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables once before test session starts and drop them after."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Provide a clean transactional database session per test."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ── Helper Factory Functions ───────────────────────────────────────────────────

def create_user_in_db(
    db,
    username="testuser",
    email="testuser@example.com",
    role=models.UserRole.COMMUNITY_MEMBER,
    verification_status=models.VerificationStatus.NONE,
    display_name="Test User",
    phone="0821234567",
    password="12345",
    struggles=None,
):
    user = models.User(
        username=username,
        email=email,
        password=utils.hash_password(password),
        role=role,
        verification_status=verification_status,
        display_name=display_name,
        phone=phone,
        contact_phone=phone,
        contact_email=email,
        struggles=struggles or ["food_security", "internet_access"],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_auth_token_for_user(user):
    return oauth2.create_access_token(data={"user_id": user.id, "role": user.role.value})


def get_auth_headers_for_user(user):
    token = get_auth_token_for_user(user)
    return {"Authorization": f"Bearer {token}"}


# ── Fixtures for common roles ──────────────────────────────────────────────────

@pytest.fixture
def community_user(db_session):
    return create_user_in_db(
        db_session,
        username="sipho_member",
        email="sipho@example.com",
        role=models.UserRole.COMMUNITY_MEMBER,
        verification_status=models.VerificationStatus.NONE,
        display_name="Sipho Khumalo",
    )


@pytest.fixture
def community_user_auth_headers(community_user):
    return get_auth_headers_for_user(community_user)


@pytest.fixture
def verified_researcher(db_session):
    return create_user_in_db(
        db_session,
        username="dr_nomvula",
        email="nomvula@uct.ac.za",
        role=models.UserRole.RESEARCHER,
        verification_status=models.VerificationStatus.VERIFIED,
        display_name="Dr. Nomvula Zondo",
    )


@pytest.fixture
def verified_researcher_auth_headers(verified_researcher):
    return get_auth_headers_for_user(verified_researcher)


@pytest.fixture
def unverified_researcher(db_session):
    return create_user_in_db(
        db_session,
        username="pending_prof",
        email="pending@uct.ac.za",
        role=models.UserRole.RESEARCHER,
        verification_status=models.VerificationStatus.PENDING,
        display_name="Prof. Pending",
    )


@pytest.fixture
def unverified_researcher_auth_headers(unverified_researcher):
    return get_auth_headers_for_user(unverified_researcher)


@pytest.fixture
def admin_user(db_session):
    return create_user_in_db(
        db_session,
        username="chief_admin",
        email="admin@commhub.org",
        role=models.UserRole.ADMIN,
        verification_status=models.VerificationStatus.NONE,
        display_name="Platform Admin",
    )


@pytest.fixture
def admin_auth_headers(admin_user):
    return get_auth_headers_for_user(admin_user)

