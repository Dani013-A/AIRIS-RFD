"""Separate listed credentials from explicit preparation, expiry, and intent."""
import re

UNCONFIRMED = re.compile(r"\b(none|no certifications?|no credentials?|in[ -]progress|prepar(?:ing|ation)|studying|pursuing|planned|plan(?:ning)? to|intend|candidate|expired|not (?:yet )?(?:earned|certified)|training only)\b", re.I)


def listed_credentials(text: str) -> str:
    # Status belongs to an entry, so do not let one planned entry erase another earned one.
    return "\n".join(dict.fromkeys(line.strip() for line in re.split(r"\n|;", text or "")
                                   if line.strip() and not UNCONFIRMED.search(line)))
