"""
i18n.py

Translation manager

Design notes:
- Strings live in translations/en.json and translations/af.json, using nested
  keys like "directory.heading".
- A single global Translator instance is shared across the app. Widgets
  register a "retranslate" callback so that switching languages updates
  every open screen immediately, without rebuilding the UI from scratch.
"""

import json
import os
from PyQt5.QtCore import QObject, pyqtSignal

TRANSLATIONS_DIR = os.path.join(os.path.dirname(__file__), "translations")
SUPPORTED_LANGUAGES = ["en", "af"]
DEFAULT_LANGUAGE = "en"


def _load_language_file(lang_code: str) -> dict:
    path = os.path.join(TRANSLATIONS_DIR, f"{lang_code}.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


class Translator(QObject):
    """
    Holds the current language and all loaded translation dictionaries.
    Emits `language_changed` whenever the language is switched, so any
    widget can connect to it and refresh its own text.
    """

    language_changed = pyqtSignal(str)  # emits the new language code

    def __init__(self, initial_language: str = DEFAULT_LANGUAGE):
        super().__init__()
        self._strings = {
            lang: _load_language_file(lang) for lang in SUPPORTED_LANGUAGES
        }
        self._current_language = initial_language

    @property
    def current_language(self) -> str:
        return self._current_language

    def set_language(self, lang_code: str):
        if lang_code not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported language: {lang_code}")
        if lang_code == self._current_language:
            return
        self._current_language = lang_code
        self.language_changed.emit(lang_code)

    def toggle(self):
        """Convenience for a two-language app: flips en <-> af."""
        other = "af" if self._current_language == "en" else "en"
        self.set_language(other)

    def t(self, dotted_key: str) -> str:
        """
        Look up a UI string by dotted key, e.g. t("directory.heading").
        Falls back to English, then to the key itself, so a missing
        translation never crashes the demo.
        """
        value = self._resolve(self._strings.get(self._current_language, {}), dotted_key)
        if value is not None:
            return value

        value = self._resolve(self._strings.get(DEFAULT_LANGUAGE, {}), dotted_key)
        if value is not None:
            return value

        return dotted_key

    @staticmethod
    def _resolve(strings_dict: dict, dotted_key: str):
        node = strings_dict
        for part in dotted_key.split("."):
            if not isinstance(node, dict) or part not in node:
                return None
            node = node[part]
        return node if isinstance(node, str) else None


# Single shared instance - import this from anywhere in the app.
translator = Translator()
