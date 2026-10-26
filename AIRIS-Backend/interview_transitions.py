"""Bounded spoken acknowledgments; approved questions and transcripts stay unchanged."""
import re


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
