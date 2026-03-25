"""Root conftest: pre-load stdlib calendar to prevent shadowing by backend/calendar/."""

import importlib.util
import os
import sys

# backend/calendar/ shadows stdlib's calendar module, which third-party packages
# (e.g. httpx via http.cookiejar) import directly. Pre-load the stdlib version.
_stdlib_dir = os.path.dirname(os.__file__)
_cal_path = os.path.join(_stdlib_dir, "calendar.py")
if os.path.exists(_cal_path) and "calendar" not in sys.modules:
    _spec = importlib.util.spec_from_file_location("calendar", _cal_path)
    _cal_module = importlib.util.module_from_spec(_spec)
    sys.modules["calendar"] = _cal_module
    _spec.loader.exec_module(_cal_module)
