# Appendix T: Unit Test Report

**Project Name:** CommHub (CSC3003S Capstone)  
**Execution Date:** 2026-09-08 02:15:06  
**Testing Framework:** pytest / unittest / FastAPI TestClient  
**Target Environment:** SQLite in-memory isolated sandbox (Zero external DB dependencies)  
**Overall Status:** ALL TESTS PASSING (100%)

---

## 1. Backlog Item Traceability & Test Suite Mapping

| Backlog Item | Test Script | Primary Developer | Priority | Status |
|---|---|---|---|---|
| Login and Profiles / Account Management | `test_item01_login_and_profiles.py` | Faresa | High | PASS |
| Profile Management | `test_item02_profile_management.py` | Faresa | High | PASS |
| Adverts (Service Directory) | `test_item03_adverts.py` | Faresa | High | PASS |
| Search for Adverts | `test_item04_search_adverts.py` | Faresa | High | PASS |
| Advert Responses (Service Applications) | `test_item05_advert_responses.py` | Faresa | High | PASS |
| Researcher Verification | `test_item06_researcher_verification.py` | Kholofelo | High | PASS |
| Participant Recruitment | `test_item07_participant_recruitment.py` | Dzanga | High | PASS |
| Survey Support (In-House Builder & Teardown) | `test_item08_survey_support.py` | Dzanga | High | PASS |
| Scheduling for Interviews & Workshops | `test_item09_scheduling_workshops.py` | Kholo | High | PASS |
| Admin and Moderation (RBAC) | `test_item10_admin_moderation.py` | Kholofelo | High | PASS |
| Reporting and Audit Logs | `test_item11_reporting_and_audit.py` | Kholofelo | High | PASS |
| Community Statistics | `test_item12_community_statistics.py` | Dzanga | High | PASS |
| Multilingual Interface & More Languages | `test_item13_multilingual_interface.py` | Team | High | PASS |
| Low-Data Optimisations & Platform Hosting | `test_item14_low_data_optimization.py` | Kholofelo | High | PASS |
| Database Setup & Trust (POPIA) | `test_item15_database_integrity.py` | Faresa | High | PASS |

---

## 2. Test Execution Output

```text
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.6.0 -- C:\Users\farli\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe
cachedir: .pytest_cache
rootdir: C:\Users\farli\OneDrive\Catch_MOVIES\final year project\csc-capstone\backend
configfile: pytest.ini
plugins: anyio-4.14.1, cov-7.1.0
collecting ... collected 94 items

tests/test_item01_login_and_profiles.py::test_register_community_member_success PASSED [  1%]
tests/test_item01_login_and_profiles.py::test_register_invalid_pin_rejected PASSED [  2%]
tests/test_item01_login_and_profiles.py::test_register_duplicate_email_conflict PASSED [  3%]
tests/test_item01_login_and_profiles.py::test_register_duplicate_username_conflict PASSED [  4%]
tests/test_item01_login_and_profiles.py::test_login_with_username_success PASSED [  5%]
tests/test_item01_login_and_profiles.py::test_login_with_email_success PASSED [  6%]
tests/test_item01_login_and_profiles.py::test_login_with_display_name_success PASSED [  7%]
tests/test_item01_login_and_profiles.py::test_login_invalid_password_fails PASSED [  8%]
tests/test_item01_login_and_profiles.py::test_login_nonexistent_user_fails PASSED [  9%]
tests/test_item01_login_and_profiles.py::test_update_account_credentials PASSED [ 10%]
tests/test_item01_login_and_profiles.py::test_delete_own_account PASSED  [ 11%]
tests/test_item01_login_and_profiles.py::test_delete_other_user_account_forbidden PASSED [ 12%]
tests/test_item02_profile_management.py::test_get_current_user_private_profile PASSED [ 13%]
tests/test_item02_profile_management.py::test_get_current_user_unauthenticated_fails PASSED [ 14%]
tests/test_item02_profile_management.py::test_update_profile_fields PASSED [ 15%]
tests/test_item02_profile_management.py::test_upload_avatar_valid_image PASSED [ 17%]
tests/test_item02_profile_management.py::test_upload_avatar_unsupported_type_rejected PASSED [ 18%]
tests/test_item02_profile_management.py::test_upload_avatar_oversized_rejected PASSED [ 19%]
tests/test_item02_profile_management.py::test_get_public_profile_of_another_user PASSED [ 20%]
tests/test_item02_profile_management.py::test_get_nonexistent_user_profile_returns_404 PASSED [ 21%]
tests/test_item03_adverts.py::test_create_service_advert_offer PASSED    [ 22%]
tests/test_item03_adverts.py::test_create_service_advert_request PASSED  [ 23%]
tests/test_item03_adverts.py::test_upload_service_photo_success PASSED   [ 24%]
tests/test_item03_adverts.py::test_upload_service_photo_oversized_rejected PASSED [ 25%]
tests/test_item03_adverts.py::test_get_single_service_by_id PASSED       [ 26%]
tests/test_item03_adverts.py::test_close_service_advert_by_owner PASSED  [ 27%]
tests/test_item03_adverts.py::test_close_service_advert_by_unauthorized_user_forbidden PASSED [ 28%]
tests/test_item03_adverts.py::test_delete_service_by_admin PASSED        [ 29%]
tests/test_item04_search_adverts.py::test_list_all_open_services PASSED  [ 30%]
tests/test_item04_search_adverts.py::test_search_services_by_query PASSED [ 31%]
tests/test_item04_search_adverts.py::test_filter_services_by_category PASSED [ 32%]
tests/test_item04_search_adverts.py::test_category_all_returns_all_open_listings PASSED [ 34%]
tests/test_item04_search_adverts.py::test_combined_search_query_and_category PASSED [ 35%]
tests/test_item04_search_adverts.py::test_search_no_matches_returns_empty_list PASSED [ 36%]
tests/test_item05_advert_responses.py::test_apply_to_service_success PASSED [ 37%]
tests/test_item05_advert_responses.py::test_apply_to_own_service_rejected PASSED [ 38%]
tests/test_item05_advert_responses.py::test_duplicate_service_application_rejected PASSED [ 39%]
tests/test_item05_advert_responses.py::test_apply_to_closed_service_rejected PASSED [ 40%]
tests/test_item05_advert_responses.py::test_poster_view_applicants_success PASSED [ 41%]
tests/test_item05_advert_responses.py::test_non_owner_view_applicants_forbidden PASSED [ 42%]
tests/test_item06_researcher_verification.py::test_researcher_registration_defaults_to_pending PASSED [ 43%]
tests/test_item06_researcher_verification.py::test_admin_list_pending_researchers PASSED [ 44%]
tests/test_item06_researcher_verification.py::test_admin_approve_researcher PASSED [ 45%]
tests/test_item06_researcher_verification.py::test_admin_reject_researcher PASSED [ 46%]
tests/test_item06_researcher_verification.py::test_non_admin_cannot_approve_researcher PASSED [ 47%]
tests/test_item06_researcher_verification.py::test_unverified_researcher_blocked_from_creating_study PASSED [ 48%]
tests/test_item06_researcher_verification.py::test_unverified_researcher_blocked_from_creating_workshop PASSED [ 50%]
tests/test_item06_researcher_verification.py::test_verified_researcher_can_create_study PASSED [ 51%]
tests/test_item07_participant_recruitment.py::test_apply_to_study_success PASSED [ 52%]
tests/test_item07_participant_recruitment.py::test_apply_duplicate_study_rejected PASSED [ 53%]
tests/test_item07_participant_recruitment.py::test_apply_to_closed_study_rejected PASSED [ 54%]
tests/test_item07_participant_recruitment.py::test_participant_limit_enforcement PASSED [ 55%]
tests/test_item07_participant_recruitment.py::test_researcher_view_and_manage_applicants PASSED [ 56%]
tests/test_item07_participant_recruitment.py::test_member_view_my_applications PASSED [ 57%]
tests/test_item08_survey_support.py::test_upsert_survey_questions PASSED [ 58%]
tests/test_item08_survey_support.py::test_get_study_survey_questions PASSED [ 59%]
tests/test_item08_survey_support.py::test_submit_survey_unaccepted_user_rejected PASSED [ 60%]
tests/test_item08_survey_support.py::test_submit_survey_accepted_user_success PASSED [ 61%]
tests/test_item08_survey_support.py::test_submit_survey_duplicate_rejected PASSED [ 62%]
tests/test_item08_survey_support.py::test_submit_survey_missing_required_answer_rejected PASSED [ 63%]
tests/test_item08_survey_support.py::test_researcher_view_survey_responses PASSED [ 64%]
tests/test_item08_survey_support.py::test_close_and_teardown_study PASSED [ 65%]
tests/test_item09_scheduling_workshops.py::test_schedule_workshop_success PASSED [ 67%]
tests/test_item09_scheduling_workshops.py::test_schedule_workshop_past_date_rejected PASSED [ 68%]
tests/test_item09_scheduling_workshops.py::test_schedule_workshop_invalid_capacity_rejected PASSED [ 69%]
tests/test_item09_scheduling_workshops.py::test_register_for_workshop_success PASSED [ 70%]
tests/test_item09_scheduling_workshops.py::test_register_duplicate_booking_prevented PASSED [ 71%]
tests/test_item09_scheduling_workshops.py::test_register_fully_booked_workshop_prevented PASSED [ 72%]
tests/test_item09_scheduling_workshops.py::test_cancel_workshop_registration PASSED [ 73%]
tests/test_item09_scheduling_workshops.py::test_cancel_workshop_by_organizer PASSED [ 74%]
tests/test_item09_scheduling_workshops.py::test_view_workshop_roster PASSED [ 75%]
tests/test_item10_admin_moderation.py::test_admin_bootstrap_status_true_when_admin_exists PASSED [ 76%]
tests/test_item10_admin_moderation.py::test_admin_update_user_role PASSED [ 77%]
tests/test_item10_admin_moderation.py::test_non_admin_cannot_promote_roles PASSED [ 78%]
tests/test_item10_admin_moderation.py::test_admin_stats_endpoint PASSED  [ 79%]
tests/test_item10_admin_moderation.py::test_admin_get_all_accounts PASSED [ 80%]
tests/test_item10_admin_moderation.py::test_admin_post_announcement_and_public_view PASSED [ 81%]
tests/test_item10_admin_moderation.py::test_community_member_cannot_post_announcement PASSED [ 82%]
tests/test_item11_reporting_and_audit.py::test_create_report_against_service PASSED [ 84%]
tests/test_item11_reporting_and_audit.py::test_admin_list_and_filter_reports PASSED [ 85%]
tests/test_item11_reporting_and_audit.py::test_admin_resolve_report_and_check_audit_log PASSED [ 86%]
tests/test_item11_reporting_and_audit.py::test_non_admin_cannot_access_audit_logs PASSED [ 87%]
tests/test_item12_community_statistics.py::test_community_stats_aggregation PASSED [ 88%]
tests/test_item12_community_statistics.py::test_community_stats_empty_db PASSED [ 89%]
tests/test_item13_multilingual_interface.py::test_translation_files_valid_json PASSED [ 90%]
tests/test_item13_multilingual_interface.py::test_translator_lookup_keys PASSED [ 91%]
tests/test_item13_multilingual_interface.py::test_translator_fallback_behavior PASSED [ 92%]
tests/test_item13_multilingual_interface.py::test_translator_language_toggle PASSED [ 93%]
tests/test_item14_low_data_optimization.py::test_api_health_check PASSED [ 94%]
tests/test_item14_low_data_optimization.py::test_compact_payload_size_on_services_listing PASSED [ 95%]
tests/test_item14_low_data_optimization.py::test_static_uploads_mount_available PASSED [ 96%]
tests/test_item15_database_integrity.py::test_user_deletion_cascades_services_and_applications PASSED [ 97%]
tests/test_item15_database_integrity.py::test_study_deletion_cascades_survey_and_questions PASSED [ 98%]
tests/test_item15_database_integrity.py::test_workshop_deletion_cascades_registrations PASSED [100%]

============================== warnings summary ===============================
..\..\..\..\..\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\LocalCache\local-packages\Python312\site-packages\fastapi\testclient.py:1
  C:\Users\farli\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\LocalCache\local-packages\Python312\site-packages\fastapi\testclient.py:1: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
    from starlette.testclient import TestClient as TestClient  # noqa

app\database.py:10
  C:\Users\farli\OneDrive\Catch_MOVIES\final year project\csc-capstone\backend\app\database.py:10: MovedIn20Warning: The ``declarative_base()`` function is now available as sqlalchemy.orm.declarative_base(). (deprecated since: 2.0) (Background on SQLAlchemy 2.0 at: https://sqlalche.me/e/b8d9)
    Base = declarative_base()

tests/test_item01_login_and_profiles.py::test_register_community_member_success
tests/test_item06_researcher_verification.py::test_researcher_registration_defaults_to_pending
  C:\Users\farli\OneDrive\Catch_MOVIES\final year project\csc-capstone\backend\app\routers\user.py:40: PydanticDeprecatedSince20: The `dict` method is deprecated; use `model_dump` instead. Deprecated in Pydantic V2.0 to be removed in V3.0. See Pydantic V2 Migration Guide at https://errors.pydantic.dev/2.13/migration/
    user_dict = user.dict()

tests/test_item01_login_and_profiles.py: 7 warnings
tests/test_item02_profile_management.py: 7 warnings
tests/test_item03_adverts.py: 8 warnings
tests/test_item05_advert_responses.py: 6 warnings
tests/test_item06_researcher_verification.py: 7 warnings
tests/test_item07_participant_recruitment.py: 6 warnings
tests/test_item08_survey_support.py: 7 warnings
tests/test_item09_scheduling_workshops.py: 9 warnings
tests/test_item10_admin_moderation.py: 6 warnings
tests/test_item11_reporting_and_audit.py: 4 warnings
  C:\Users\farli\OneDrive\Catch_MOVIES\final year project\csc-capstone\backend\app\oauth2.py:22: DeprecationWarning: datetime.datetime.utcnow() is deprecated and scheduled for removal in a future version. Use timezone-aware objects to represent datetimes in UTC: datetime.datetime.now(datetime.UTC).
    expire = datetime.utcnow()+ timedelta(minutes= ACCESS_TOKEN_EXPIRE_MINUTES)

tests/test_item02_profile_management.py::test_upload_avatar_unsupported_type_rejected
  C:\Users\farli\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\LocalCache\local-packages\Python312\site-packages\fastapi\routing.py:344: StarletteDeprecationWarning: 'HTTP_422_UNPROCESSABLE_ENTITY' is deprecated. Use 'HTTP_422_UNPROCESSABLE_CONTENT' instead.
    return await dependant.call(**values)

tests/test_item02_profile_management.py::test_upload_avatar_oversized_rejected
tests/test_item03_adverts.py::test_upload_service_photo_oversized_rejected
  C:\Users\farli\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\LocalCache\local-packages\Python312\site-packages\fastapi\routing.py:344: StarletteDeprecationWarning: 'HTTP_413_REQUEST_ENTITY_TOO_LARGE' is deprecated. Use 'HTTP_413_CONTENT_TOO_LARGE' instead.
    return await dependant.call(**values)

tests/test_item03_adverts.py::test_create_service_advert_offer
tests/test_item03_adverts.py::test_create_service_advert_request
tests/test_item03_adverts.py::test_get_single_service_by_id
tests/test_item03_adverts.py::test_close_service_advert_by_owner
  C:\Users\farli\OneDrive\Catch_MOVIES\final year project\csc-capstone\backend\app\routers\services.py:77: PydanticDeprecatedSince20: The `dict` method is deprecated; use `model_dump` instead. Deprecated in Pydantic V2.0 to be removed in V3.0. See Pydantic V2 Migration Guide at https://errors.pydantic.dev/2.13/migration/
    db_service = models.Service(**service.dict(), poster_id=current_user.id, status=models.ServiceStatus.OPEN)

tests/test_item06_researcher_verification.py::test_verified_researcher_can_create_study
  C:\Users\farli\OneDrive\Catch_MOVIES\final year project\csc-capstone\backend\app\routers\studies.py:40: PydanticDeprecatedSince20: The `dict` method is deprecated; use `model_dump` instead. Deprecated in Pydantic V2.0 to be removed in V3.0. See Pydantic V2 Migration Guide at https://errors.pydantic.dev/2.13/migration/
    payload = study.dict()

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
=============================== tests coverage ================================
______________ coverage: platform win32, python 3.12.10-final-0 _______________

Name                           Stmts   Miss  Cover   Missing
------------------------------------------------------------
app\__init__.py                    0      0   100%
app\audit.py                       7      0   100%
app\config.py                     16      0   100%
app\database.py                   13      4    69%   13-17
app\i18n.py                       47      6    87%   51, 53, 71, 75, 85-86
app\main.py                       30      2    93%   29-30
app\models.py                    247      2    99%   163, 169
app\oauth2.py                     39      4    90%   33, 35-36, 53
app\routers\announcements.py      19      1    95%   43
app\routers\audit_logs.py         12      0   100%
app\routers\community.py          73     47    36%   51-52, 62-83, 89-209
app\routers\posts.py              13      5    62%   14-18
app\routers\reports.py            39      3    92%   12, 61, 63
app\routers\services.py          115     24    79%   24, 38, 90, 104-130, 142, 169, 202, 217, 219
app\routers\studies.py           202     65    68%   15, 17, 29, 50-62, 70-76, 89-98, 115, 117, 141-185, 195-211, 228-230, 251, 265, 268, 290, 319, 339, 375, 377, 437, 440
app\routers\user.py              158     11    93%   89, 91, 220, 222, 239, 241, 256, 270, 320, 324-325
app\routers\workshops.py         116     45    61%   23, 72-89, 117-132, 155-176, 203-235, 263, 269, 305-312, 328, 334, 342, 401, 422, 428
app\schemas\__init__.py           11      0   100%
app\schemas\announcements.py      13      0   100%
app\schemas\audit_logs.py         26      0   100%
app\schemas\community.py          40      0   100%
app\schemas\posts.py               7      0   100%
app\schemas\reports.py            25      0   100%
app\schemas\services.py           33      0   100%
app\schemas\studies.py            70      0   100%
app\schemas\user.py               76      1    99%   94
app\schemas\workshops.py          74      9    88%   43-45, 50-55
app\utils.py                      13      1    92%   15
------------------------------------------------------------
TOTAL                           1534    230    85%
Coverage JSON written to file coverage.json
================= 94 passed, 79 warnings in 83.63s (0:01:23) ==================

```

---

## 3. Definition of Done (DoD) Checklist Compliance

- **Code Compiles / Syntax Verified:** YES (Python 3.12 bytecode validated)
- **Unit Test Coverage:** ALL (All 15 backlog items covered)
- **Unit Tests Succeed:** ALL (0 failures, 0 errors)
- **Security Addressed:** YES
  - Bcrypt password hashing
  - JWT token verification
  - Role-Based Access Control (RBAC)
  - Parameterized ORM queries (SQLi protection)
  - Strict upload size/MIME validation (RCE & DoS protection)
  - POPIA right-to-erasure cascade deletes
