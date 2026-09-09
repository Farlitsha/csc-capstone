"""
Unit Tests for Backlog Item 16: Accessibility (a11y) & Disability Inclusion
=============================================================================
Kanban Item: Comprehensive WCAG 2.1 AA Accessibility & Assistive Tech Inclusion
Focus: Phones, Tablets, Screen Readers (TalkBack/VoiceOver), Low Vision & Motor Ergonomics

User Story:
  As a community member with disabilities (visual, motor, cognitive, or low-bandwidth/mobile context),
  I want the platform to be fully accessible with screen readers, skip navigation links,
  high-contrast visual tokens, accessible data tables for charts, live result announcements,
  and touch-friendly interactive targets (>= 44x44px), so that I can participate equally in all
  community services, studies, workshops, and surveys.

Acceptance Criteria (DoD):
  1. Skip Navigation Link & Landmarks: Top-level skip link (<a href="#main-content">) and <main id="main-content"> exist.
  2. Document Language Synchronization: LanguageContext dynamically syncs document.documentElement.lang on language switch.
  3. Form Accessibility & Touch Targets: Field component dynamically associates labels with input IDs via useId,
     links errors/hints via aria-describedby and aria-invalid, emits role="alert", and enforces min-height: 44px.
  4. Screen-Reader Accessible Charts: PieChart and BarChart render aria-hidden="true" visual graphics
     accompanied by structured .sr-only <table> summaries with column/row headers and percentage breakdowns.
  5. Live Regions (ARIA Live): Services, Studies, and Workshops directory pages announce result updates via aria-live="polite".
  6. Mobile PIN Ergonomics: Auth forms enforce inputMode="numeric" and pattern="[0-9]{5}" for 5-digit PINs,
     and render error alerts with role="alert" / aria-live="assertive".
  7. Design Tokens & Contrast: tokens.css contains .sr-only utilities, prefers-reduced-motion media query,
     and compliant high-contrast color tokens.
"""

from pathlib import Path
import pytest

FRONTEND_SRC = Path(__file__).resolve().parent.parent.parent / "frontend" / "src"


def test_skip_link_and_main_landmarks():
    """DoD 1: MobileLayout and DesktopLayout provide skip navigation link to #main-content."""
    mobile_layout_path = FRONTEND_SRC / "layouts" / "MobileLayout.jsx"
    desktop_layout_path = FRONTEND_SRC / "layouts" / "DesktopLayout.jsx"

    assert mobile_layout_path.exists(), "MobileLayout.jsx must exist"
    assert desktop_layout_path.exists(), "DesktopLayout.jsx must exist"

    mobile_content = mobile_layout_path.read_text(encoding="utf-8")
    desktop_content = desktop_layout_path.read_text(encoding="utf-8")

    # Verify skip link href and main-content id
    assert 'href="#main-content"' in mobile_content, "MobileLayout must contain a skip link targeting #main-content"
    assert 'id="main-content"' in mobile_content, "MobileLayout must define <main id='main-content'>"

    assert 'href="#main-content"' in desktop_content, "DesktopLayout must contain a skip link targeting #main-content"
    assert 'id="main-content"' in desktop_content, "DesktopLayout must define <main id='main-content'>"


def test_document_language_synchronization():
    """DoD 2: LanguageContext dynamically updates document.documentElement.lang."""
    lang_ctx_path = FRONTEND_SRC / "i18n" / "LanguageContext.jsx"
    assert lang_ctx_path.exists(), "LanguageContext.jsx must exist"

    content = lang_ctx_path.read_text(encoding="utf-8")
    assert "document.documentElement.lang = lang" in content, (
        "LanguageContext must synchronize document.documentElement.lang on language switch for screen readers"
    )
    assert "useEffect" in content, "LanguageContext must use useEffect to apply language sync"


def test_form_field_accessibility_and_touch_targets():
    """DoD 3: Field component binds labels via useId, supports aria-describedby/aria-invalid, and 44px min-height."""
    field_jsx_path = FRONTEND_SRC / "components" / "Field.jsx"
    field_css_path = FRONTEND_SRC / "components" / "Field.css"

    assert field_jsx_path.exists(), "Field.jsx must exist"
    assert field_css_path.exists(), "Field.css must exist"

    jsx_content = field_jsx_path.read_text(encoding="utf-8")
    css_content = field_css_path.read_text(encoding="utf-8")

    assert "useId" in jsx_content, "Field.jsx should use React useId for accessible label-input associations"
    assert "htmlFor=" in jsx_content, "Field.jsx must render <label htmlFor={...}>"
    assert "aria-invalid" in jsx_content, "Field.jsx must support aria-invalid for error states"
    assert "aria-describedby" in jsx_content, "Field.jsx must wire aria-describedby to error/hint text"
    assert 'role="alert"' in jsx_content, "Field.jsx must announce error messages with role='alert'"

    # Touch targets & mobile font-size
    assert "min-height: 44px" in css_content or "min-height:44px" in css_content, (
        "Field.css must enforce >= 44px min-height for mobile touch accessibility"
    )
    assert "font-size: 16px" in css_content or "16px" in css_content, (
        "Field.css should specify 16px input font size to prevent iOS Safari auto-zoom"
    )


def test_chart_screen_reader_fallbacks():
    """DoD 4: PieChart and BarChart have aria-hidden visual elements and .sr-only data tables."""
    pie_chart_path = FRONTEND_SRC / "components" / "PieChart.jsx"
    bar_chart_path = FRONTEND_SRC / "components" / "BarChart.jsx"

    assert pie_chart_path.exists(), "PieChart.jsx must exist"
    assert bar_chart_path.exists(), "BarChart.jsx must exist"

    pie_content = pie_chart_path.read_text(encoding="utf-8")
    bar_content = bar_chart_path.read_text(encoding="utf-8")

    # PieChart checks
    assert 'className="sr-only"' in pie_content, "PieChart must render a .sr-only summary table"
    assert "<table" in pie_content and "<caption>" in pie_content, "PieChart table must include <table> and <caption>"
    assert 'aria-hidden="true"' in pie_content, "PieChart SVG container must be marked aria-hidden='true'"

    # BarChart checks
    assert 'className="sr-only"' in bar_content, "BarChart must render a .sr-only summary table"
    assert "<table" in bar_content and "<caption>" in bar_content, "BarChart table must include <table> and <caption>"
    assert 'aria-hidden="true"' in bar_content, "BarChart visual bars must be marked aria-hidden='true'"


def test_directory_pages_live_announcements():
    """DoD 5: Directory pages include aria-live='polite' region for dynamic search/filter announcements."""
    services_path = FRONTEND_SRC / "pages" / "ServicesDirectoryPage.jsx"
    studies_path = FRONTEND_SRC / "pages" / "StudiesDirectoryPage.jsx"
    workshops_path = FRONTEND_SRC / "pages" / "WorkshopsDirectoryPage.jsx"

    assert services_path.exists(), "ServicesDirectoryPage.jsx must exist"
    assert studies_path.exists(), "StudiesDirectoryPage.jsx must exist"
    assert workshops_path.exists(), "WorkshopsDirectoryPage.jsx must exist"

    services_content = services_path.read_text(encoding="utf-8")
    studies_content = studies_path.read_text(encoding="utf-8")
    workshops_content = workshops_path.read_text(encoding="utf-8")

    assert 'aria-live="polite"' in services_content, "ServicesDirectoryPage must have an aria-live='polite' region"
    assert 'aria-live="polite"' in studies_content, "StudiesDirectoryPage must have an aria-live='polite' region"
    assert 'aria-live="polite"' in workshops_content, "WorkshopsDirectoryPage must have an aria-live='polite' region"


def test_mobile_pin_keypad_and_form_alerts():
    """DoD 6: Login and Signup pages use numeric keypad and alert roles on validation errors."""
    login_path = FRONTEND_SRC / "pages" / "LoginPage.jsx"
    signup_path = FRONTEND_SRC / "pages" / "SignupPage.jsx"

    assert login_path.exists(), "LoginPage.jsx must exist"
    assert signup_path.exists(), "SignupPage.jsx must exist"

    login_content = login_path.read_text(encoding="utf-8")
    signup_content = signup_path.read_text(encoding="utf-8")

    assert 'inputMode="numeric"' in login_content, "LoginPage PIN field must use inputMode='numeric'"
    assert 'pattern="[0-9]{5}"' in login_content, "LoginPage PIN field must specify 5-digit pattern"
    assert 'role="alert"' in login_content, "LoginPage error banner must use role='alert'"

    assert 'inputMode="numeric"' in signup_content, "SignupPage PIN field must use inputMode='numeric'"
    assert 'role="alert"' in signup_content, "SignupPage error banner must use role='alert'"


def test_design_tokens_and_accessibility_utilities():
    """DoD 7: tokens.css contains .sr-only utility, skip link styling, and prefers-reduced-motion."""
    tokens_path = FRONTEND_SRC / "styles" / "tokens.css"
    assert tokens_path.exists(), "tokens.css must exist"

    tokens_content = tokens_path.read_text(encoding="utf-8")

    assert ".sr-only" in tokens_content, "tokens.css must provide .sr-only utility class"
    assert ".ch-skip-link" in tokens_content, "tokens.css must provide .ch-skip-link styling"
    assert "prefers-reduced-motion" in tokens_content, "tokens.css must support prefers-reduced-motion"
    assert "--color-sage" in tokens_content, "tokens.css must define color tokens"

