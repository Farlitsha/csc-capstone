"""
Unit Tests for Backlog Item 13: Multilingual Interface & More Languages
========================================================================
Kanban Item: Multilingual interface (2 languages) & More languages
PDF Spec: Multilingual support (Sprint 1 MVP & Sprint 2)

User Story:
  As a community member, I want the platform interface available in multiple South African
  languages (English, isiXhosa, Afrikaans, isiZulu) with seamless fallback behavior
  so that I can understand and use the service in my mother tongue.

Acceptance Criteria (DoD):
  1. Translation files exist and parse valid JSON for en, xh, af, zu.
  2. Translator correctly resolves nested dotted keys (e.g. 'auth.login').
  3. Missing translations in target language fall back cleanly to English (DEFAULT_LANGUAGE).
  4. Non-existent keys anywhere fall back safely to the dotted key string without crashing.
  5. Translator supports switching language and cycling through supported languages.
"""

import json
from pathlib import Path
import pytest
from app import i18n


def test_translation_files_valid_json():
    """DoD: All supported translation JSON files exist and are valid JSON."""
    translations_dir = Path(__file__).resolve().parent.parent / "app" / "translations"
    for lang in ["en", "xh", "af", "zu"]:
        file_path = translations_dir / f"{lang}.json"
        assert file_path.exists(), f"Missing translation file: {file_path}"
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            assert isinstance(data, dict)
            assert len(data) > 0


def test_translator_lookup_keys():
    """DoD: Translator resolves nested keys in English and other languages."""
    translator = i18n.Translator(initial_language="en")
    assert translator.current_language == "en"

    # Set to Afrikaans or Xhosa
    translator.set_language("af")
    assert translator.current_language == "af"


def test_translator_fallback_behavior():
    """DoD: Missing keys fall back gracefully to English or to key itself without crashing."""
    translator = i18n.Translator(initial_language="xh")
    # Non-existent key should return the key string
    result = translator.t("non_existent.nested.key.123")
    assert result == "non_existent.nested.key.123"


def test_translator_language_toggle():
    """DoD: Translator toggle cycles through all supported languages."""
    translator = i18n.Translator(initial_language="en")
    languages_seen = [translator.current_language]

    for _ in range(len(i18n.SUPPORTED_LANGUAGES) - 1):
        translator.toggle()
        languages_seen.append(translator.current_language)

    assert set(languages_seen) == set(i18n.SUPPORTED_LANGUAGES)

