"""Bounded spoken acknowledgments; approved questions and transcripts stay unchanged."""
import re
import json


def transition_choices(answer, relevance, next_question, history=(), current_question="", spoken_question=""):
    # Silence is preferable to interpreting a fragment, a negation, or ambient speech.
    text = " ".join(answer.lower().split())
    words = re.findall(r"\b[\w']+\b", text)
    if relevance != "Relevant" or len(words) < 4:
        return [""]
    if re.search(r"\b(ignore|prompt|system|background|inaudible|unintelligible|television|radio)\b", text):
        return [""]
    clauses = [clause for clause in re.split(r"[.!?;\n]+", text)
               if not re.search(r"\b(no|not|never|without|if|maybe|wish|said|heard)\b|\bi (?:would|could|might)\b", clause)]
    if any(words.count(word) >= 4 for word in set(words) if len(word) > 4):
        return [""]

    # Recognize explicit first-person actions, never inferred abilities or outcomes.
    topic = (current_question or next_question).lower()
    patterns = (
        (r"\b(?:my career goal is|i (?:want|aim|hope) to (?:become|work|start))\b",
         "You outlined the direction you want to take in your career.", r"yourself|career|goals"),
        (r"\bi (?:checked|reviewed)\b.{0,40}\blogs\b.{0,50}\breproduced (?:the )?(?:error|issue|bug|fault|problem|failure)\b|\bi reproduced (?:the )?(?:error|issue|bug|fault|problem|failure)\b.{0,60}\b(?:checked|reviewed)\b.{0,40}\blogs\b",
         "You described reproducing the issue and checking the logs.", r"problem|difficult|setback|challenge"),
        (r"\bi (?:retested|tested|helped test|checked)\b.{0,45}\b(?:fix|feature|login|application)\b",
         "You described testing the work.", r"problem|difficult|setback|team|work|strength"),
        (r"\bi (?:asked|clarified)\b.{0,70}\b(?:requirements|needed|expected|understand|clarification)\b",
         "You described taking time to clarify what was needed.", r"problem|difficult|setback|team|work|prioriti"),
        (r"\bi (?:suggested|introduced|used|created)\b.{0,65}\b(?:shared task board|shared schedule|task board)\b",
         "You described a way to organize the work.", r"team|work|deadlines|prioriti"),
        (r"\bi (?:prioritized|prioritised|ranked)\b.{0,60}\b(?:tasks|deadlines|work)\b",
         "You described setting priorities for the work.", r"prioriti|deadlines|time|manage"),
        (r"\bi (?:practiced|practised|studied|completed)\b.{0,60}\b(?:exercises|tutorials|practice)\b",
         "You described working through learning material.", r"learn|skill|concept|adapt"),
        (r"\bi (?:investigated|diagnosed|debugged|traced)\b.{0,65}\b(?:error|issue|bug|fault|problem)\b",
         "You described how you investigated the problem.", r"problem|difficult|setback|challenge"),
    )
    for pattern, acknowledgment, related_topic in patterns:
        if any(re.search(pattern, clause) for clause in clauses) and re.search(related_topic, topic):
            recent = spoken_question + " " + " ".join(str(turn.get("question", "")) for turn in history[-2:])
            if acknowledgment in recent or spoken_question.startswith("You described") or len((acknowledgment + " " + next_question).split()) > 30:
                return [""]
            return [acknowledgment, ""]
    return [""]


_UNSAFE_CONTEXT = re.compile(r'\[(?:blank_audio|inaudible|background[^]]*)\]|\b(?:inaudible|unintelligible)\b|\b(?:someone|television|radio)\b.{0,40}\bsaid\b|\b(?:ignore|disregard|override)\b.{0,50}\b(?:instructions|rules|prompt|scoring)\b|\bfull marks\b', re.I)
_ACTION = re.compile(r"\b(?:i|we)\s+(?:(?:personally|also|then|have|had|did|not|would)\s+){0,3}(?:[a-z]{2,}ed|built|ran|taught|wrote|drew|made|took|sold|gave|paid|met|kept|read|won|set|put|led|learnt|was responsible for|am responsible for|want|aim|hope|plan|learn|work|improve)\b", re.I)


def answer_evidence(answer):
    """Whole, attributable excerpts only; no paraphrased accomplishments or cut-off claims."""
    if not isinstance(answer, str) or _UNSAFE_CONTEXT.search(answer):
        return []
    evidence = []
    for sentence in re.split(r'(?<=[.!?])\s+|\n+', answer.strip()):
        sentence = ' '.join(sentence.split())
        if (_ACTION.search(sentence) and 4 <= len(sentence.split()) <= 45
                and len(sentence) <= 360 and not sentence.endswith('?') and sentence not in evidence):
            evidence.append(sentence)
    # Keep both the setup/action and the later result, even in a long transcript.
    return evidence if len(evidence) <= 4 else evidence[:2] + evidence[-2:]


def grounded_reflection(evidence, index, turn=0):
    if type(index) is not int or not 0 <= index < len(evidence):
        return ''
    lead = ('You mentioned', 'I noted this detail', 'You highlighted this point')[turn % 3]
    return f'{lead}: “{evidence[index]}”'


def conversation_context(history):
    """Keep every ordered turn; expose omissions rather than pretending excerpts are complete."""
    if not history:
        return []
    allowance = min(2200, 22000 // len(history))
    context = []
    for turn in history:
        answer = str(turn.get('answer', turn.get('candidateAnswer', '')))
        question_limit = min(240, allowance // 6)
        def question_excerpt(value):
            value = str(value)
            return value if len(value) <= question_limit else value[:question_limit] + ' [excerpt]'
        item = {
            'questionId': turn.get('questionId'),
            'question': question_excerpt(turn.get('question', '')),
            'spokenQuestion': question_excerpt(turn.get('spokenQuestion', turn.get('question', ''))),
            'isInteraction': bool(turn.get('isInteraction')),
            'answer': '', 'omittedCharacters': len(answer), 'evidence': [],
        }
        remaining = max(0, allowance - len(json.dumps(item, ensure_ascii=False)) - 20)
        for claim in reversed(answer_evidence(answer)):
            cost = len(json.dumps(claim, ensure_ascii=False)) + 2
            if cost <= remaining // 2:
                item['evidence'].insert(0, claim)
                remaining -= cost
        excerpt = answer if len(answer) <= remaining else answer[:remaining].rsplit(' ', 1)[0]
        item.update(answer=excerpt, omittedCharacters=len(answer) - len(excerpt))
        context.append(item)
    return context


def question_delivery(meta, target_role, history):
    """Adapt delivery within its competency; stable IDs/benchmarks still own evaluation."""
    number = int(meta['id'].split('-')[1])
    role = ' '.join(str(target_role).split())
    if len(role) > 100 or not re.fullmatch(r"[\w /&().+-]+", role):
        role = 'your target role'
    if number == 2:
        return f'What interests you about the {role} position, and how does your background prepare you for it?'
    if number == 3:
        return f'When considering an employer for the {role} position, what would you research and what would interest you about its work?'
    topics = {
        5: (r'\b(?:learned|learnt|studied|practiced)\b', 'Building on the learning experience you described, what would you do differently next time you need to learn a new skill quickly?'),
        6: (r'\b(?:investigated|traced|resolved|fixed)\b', 'Looking back at the problem you described, what was the hardest decision you made, and what did you learn from the outcome?'),
        7: (r'\b(?:team|teammates|colleagues)\b', 'Building on the team example you described, how did you coordinate with others, and what would you improve about your contribution?'),
        8: (r'\b(?:prioritized|prioritised|deadlines)\b', 'Building on your approach to deadlines, how would you handle an unexpected change in priorities while protecting the quality of your work?'),
    }
    if number in topics:
        pattern, followup = topics[number]
        if any(re.search(pattern, claim, re.I) for turn in history if not turn.get('isInteraction')
               for claim in answer_evidence(turn.get('answer', ''))
               if not re.search(r'\b(?:not|never|would|could|might|if|want|aim|hope|plan)\b', claim, re.I)):
            return followup
    return meta['text']


def focused_followup(meta, answer):
    evidence = [claim for claim in answer_evidence(answer)
                if not re.search(r'\b(?:not|never|would|could|might|if|want|aim|hope|plan)\b', claim, re.I)]
    if not evidence:
        return ''
    number = int(meta['id'].split('-')[1])
    personal = re.search(r'\bi\b', answer, re.I)
    if number == 7 and not personal and re.search(r'\b(?:we|team)\b', answer, re.I):
        return 'What was your own responsibility in that team, and what did you personally contribute?'
    if number == 5 and re.search(r'\b(?:learned|learnt|studied)\b', answer, re.I) and len(answer.split()) < 25 and not re.search(r'\b(?:by|read|reading|practice|practiced|documentation|asked|steps)\b', answer, re.I):
        return 'What steps did you take to learn that skill, and how did you check your understanding?'
    if number == 6 and re.search(r'\b(?:error|issue|bug|fault|problem|setback)\b', answer, re.I) and len(answer.split()) < 25 and not re.search(r'\b(?:result|outcome|resolved|fixed|passed|completed|learned|learnt)\b', answer, re.I):
        return 'What happened after you took that action, and what did you learn from the outcome?'
    return ''


def validate_conversation_history(history, evaluations):
    scored = [turn for turn in history if not turn.get('isInteraction')]
    if (len(scored) != len(evaluations) or
            [turn.get('questionId') for turn in scored] != [f'survey-{i}' for i in range(1, len(scored) + 1)] or
            any(not str(turn.get('answer', '')).strip() for turn in scored) or
            [turn.get('turn') for turn in history] != list(range(len(history)))):
        raise ValueError('Stored interview context is incomplete or out of order.')
