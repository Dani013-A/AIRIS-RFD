"""Advisory retrieval topics from existing program and role data, never scoring inputs."""
import json
import re
from functools import lru_cache
from pathlib import Path

GENERIC_TOPICS = {'analysis', 'management', 'execution', 'compliance', 'operations', 'administration', 'development', 'architecture', 'design', 'engineering', 'science', 'business', 'systems', 'system', 'process', 'processes', 'fundamentals', 'principles', 'basics', 'methods', 'implementation', 'time', 'study', 'guidelines', 'procedures', 'tools', 'standards', 'reporting', 'techniques', 'models', 'frameworks'}

def program_label(value):
    value = re.sub(r"^(?:B\.?S\.?|B\.?A\.?|Bachelor of (?:Arts|Science)(?: in)?)\s+", "", value, flags=re.I)
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


@lru_cache(maxsize=1)
def program_aliases():
    colleges = json.loads((Path(__file__).parent / 'data/tip_programs.json').read_text())
    aliases = {}
    for college in colleges:
        if college['name'] == 'Senior High School': continue
        for program in college['programs']:
            if program['verification']['status'] != 'verified': continue
            name = program['name']; label = program_label(name)
            acronym = ''.join(word[0] for word in label.split() if word not in {'and', 'in', 'of', 'major'})
            short = {acronym, 'bs' + acronym} if len(acronym) >= 2 and acronym not in {'ba', 'bs'} else set()
            for alias in {label, *short}:
                aliases.setdefault(alias, set()).add(name)
    return {alias: next(iter(names)) for alias, names in aliases.items() if len(names) == 1}


def split_topics(labels):
    topics = []
    for label in labels:
        if not isinstance(label, str): continue
        for part in re.split(r'[&/()]', label):
            part = re.sub(r'\s+', ' ', part).strip(' ,.-')
            if len(part) < 3 or len(part) > 120: continue
            if set(part.lower().split()) <= GENERIC_TOPICS: continue
            topics.append(part)
            if len(part.split()) > 2:
                shortened = re.sub(r'\s+(?:Design|Architecture|Development|Implementation|Administration|Procedures|Principles|Fundamentals|Basics|Techniques)$', '', part, flags=re.I)
                if shortened != part: topics.append(shortened)
    return list(dict.fromkeys(topics))


def learning_context(context):
    from role_profile_registry import AUTHORITATIVE_STATIC_PROFILES, canonicalize_role_title
    result = dict(context)
    raw_program = context.get('program', '')
    result['program'] = program_aliases().get(program_label(raw_program), raw_program)
    program = re.sub(r'^(?:BS|BA|Bachelor of (?:Arts|Science)(?: in)?)\s+', '', result['program'], flags=re.I)
    program_topics = split_topics(re.split(r'\s+major\s+in\s+', program, flags=re.I))
    for label in list(program_topics):
        if label.lower().endswith(' management'):
            program_topics.append(label[:-len(' management')])
    role = canonicalize_role_title(context.get('targetPosition', ''))
    profile = AUTHORITATIVE_STATIC_PROFILES.get(role, {})
    competencies = list(profile.get('required_skills', [])) + list(profile.get('recommended_skills', []))
    result['careerTopics'] = split_topics(competencies + [profile.get('domain', '')])[:32]
    result['namedTopics'] = split_topics([inside for label in competencies for inside in re.findall(r'\(([^)]*)\)', label)])[:24]
    result['programTopics'] = split_topics(program_topics)[:8]
    return result
