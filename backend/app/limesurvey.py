"""
limesurvey.py

Thin client for LimeSurvey's RemoteControl 2 (RPC) API, used to link a
StudyListing to a LimeSurvey survey and pull basic status/response info.

CommHub does not host surveys itself - researchers build the survey in
LimeSurvey and CommHub just stores the numeric survey ID (see
StudyListing.limesurvey_survey_id) and uses this client to:
  - confirm the survey exists / is active before showing it to participants
  - build the public participation URL
  - report a response count back to the researcher

Requires these settings (see app/config.py):
  limesurvey_url        e.g. "https://survey.example.org/index.php/admin/remotecontrol"
  limesurvey_username
  limesurvey_password
"""

import httpx
from typing import Any, Optional


class LimeSurveyError(Exception):
    """Raised when LimeSurvey's RPC endpoint returns an error payload."""
    pass


class LimeSurveyClient:
    def __init__(self, url: str, username: str, password: str, timeout: float = 10.0):
        self._url = url
        self._username = username
        self._password = password
        self._timeout = timeout
        self._session_key: Optional[str] = None

    def _call(self, method: str, params: list) -> Any:
        payload = {
            "method": method,
            "params": params,
            "id": 1,
        }
        with httpx.Client(timeout=self._timeout) as client:
            response = client.post(self._url, json=payload, headers={"content-type": "application/json"})
            response.raise_for_status()
        body = response.json()
        if body.get("error"):
            raise LimeSurveyError(str(body["error"]))
        return body.get("result")

    def __enter__(self) -> "LimeSurveyClient":
        self._session_key = self._call("get_session_key", [self._username, self._password])
        if not isinstance(self._session_key, str):
            # LimeSurvey returns a dict like {"status": "Invalid user name or password"} on failure
            raise LimeSurveyError(str(self._session_key))
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._session_key:
            self._call("release_session_key", [self._session_key])
            self._session_key = None

    def get_survey_properties(self, survey_id: int) -> dict:
        """Basic survey metadata: title, active status, language, etc."""
        result = self._call(
            "get_survey_properties",
            [self._session_key, survey_id, ["surveyls_title", "active", "language"]],
        )
        if not isinstance(result, dict):
            raise LimeSurveyError(f"Survey {survey_id} not found or not accessible: {result}")
        return result

    def get_summary(self, survey_id: int) -> dict:
        """Response counts: {'completed_responses': .., 'incomplete_responses': .., ...}"""
        result = self._call("get_summary", [self._session_key, survey_id, "all"])
        if not isinstance(result, dict):
            raise LimeSurveyError(f"Could not fetch summary for survey {survey_id}: {result}")
        return result

    def list_surveys(self) -> list:
        """All surveys visible to the configured LimeSurvey account, for admin/researcher pickers."""
        result = self._call("list_surveys", [self._session_key, None])
        return result if isinstance(result, list) else []


def build_participation_url(limesurvey_base_url: str, survey_id: int, lang: Optional[str] = None) -> str:
    """
    Build the public link a participant clicks to take the survey, e.g.
    https://survey.example.org/index.php/survey/index/sid/123456?lang=xh

    limesurvey_base_url should be the site root (no /admin/remotecontrol suffix) -
    typically LimeSurvey URL settings live in the same .env as the remotecontrol one,
    see app/config.py: limesurvey_public_url.
    """
    url = f"{limesurvey_base_url.rstrip('/')}/index.php/survey/index/sid/{survey_id}"
    if lang:
        url += f"?lang={lang}"
    return url
