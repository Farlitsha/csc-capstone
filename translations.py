"""
translations.py

translation helper for the FastAPI/Jinja2 app.

"""

import json
import os

TRANSLATIONS_DIR = os.path.join(
    os.path.dirname(__file__), "backend", "app", "translations"
)
SUPPORTED_LANGUAGES = ("en", "af")
DEFAULT_LANGUAGE = "en"

# Load once at import time so templates render fast.
_strings: dict[str, dict] = {}
for _lang in SUPPORTED_LANGUAGES:
    _path = os.path.join(TRANSLATIONS_DIR, f"{_lang}.json")
    with open(_path, "r", encoding="utf-8") as _f:
        _strings[_lang] = json.load(_f)


def _resolve(strings_dict: dict, dotted_key: str):
    node = strings_dict
    for part in dotted_key.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node if isinstance(node, str) else None


def get_translator(lang: str):
    """
    Return a callable t(key) that looks up the dotted key in the given
    language, falling back to English, then to the key itself.

    Pass the returned callable into template context as 't'.
    """
    lang = lang if lang in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE
    lang_strings = _strings.get(lang, {})
    en_strings = _strings.get(DEFAULT_LANGUAGE, {})

    def t(dotted_key: str) -> str:
        value = _resolve(lang_strings, dotted_key)
        if value is not None:
            return value
        value = _resolve(en_strings, dotted_key)
        if value is not None:
            return value
        return dotted_key

    return t
