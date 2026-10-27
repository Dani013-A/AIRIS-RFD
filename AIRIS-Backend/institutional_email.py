"""Student-campus eligibility, separate from identity hashing and account recovery."""
import re

MANILA_EMAIL_MESSAGE = 'Only T.I.P. Manila institutional email addresses starting with m and ending in @tip.edu.ph are accepted.'
_PATTERN = re.compile(r"m[a-z0-9!#$%&'*+/=?^_`{|}~-]*(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@tip\.edu\.ph", re.ASCII)


def is_manila_student_email(value):
    if not isinstance(value, str):
        return False
    email = value.strip().lower()
    return len(email) <= 254 and len(email.split('@')[0]) <= 64 and bool(_PATTERN.fullmatch(email))
