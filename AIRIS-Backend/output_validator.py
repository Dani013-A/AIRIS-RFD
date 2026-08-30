import re
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from evidence_chunker import EvidenceChunk

class ACMOFlags(BaseModel):
    action: bool = False
    context: bool = False
    method: bool = False
    outcome: bool = False

class AuditedFinding(BaseModel):
    chunkId: str
    competency: str
    classification: str  # STRONG_MATCH | PARTIAL_MATCH | NO_RELEVANT_EVIDENCE | INSUFFICIENT_EVIDENCE
    evidenceLevel: str   # EXPLICIT | DEMONSTRATED | STRONG_DEMONSTRATED
    acmo: ACMOFlags
    observedEvidence: str
    auditStatus: str = "VERIFIED"  # VERIFIED | REJECTED_UNGROUNDED_QUOTE | REJECTED_INVALID_CHUNK_ID | REJECTED_INVALID_COMPETENCY | REJECTED_INVALID_ACMO
    auditorNotes: str = ""

def _is_strict_bool(val: Any) -> bool:
    """Enforces strict boolean type. Disallows strings ('true', 'false'), integers (1, 0), or None."""
    return isinstance(val, bool)

def validate_ai_response(
    raw_evaluations: List[Dict[str, Any]],
    evidence_chunks: List[EvidenceChunk],
    valid_competencies: Optional[List[str]] = None
) -> List[AuditedFinding]:
    """
    Deterministic Python validator that runs after LLM processing.
    Validates machine-checkable facts (chunk IDs, verbatim quote match, strict boolean ACMO types, enum bounds)
    and enforces strict business contract rules before scoring.
    """
    if not raw_evaluations or not evidence_chunks:
        return []

    chunk_map = {chunk.chunkId: chunk for chunk in evidence_chunks}
    valid_comp_set = {c.lower().strip() for c in valid_competencies} if valid_competencies else set()

    validated_findings: List[AuditedFinding] = []
    seen_pairs = set()

    for item in raw_evaluations:
        if not isinstance(item, dict):
            continue

        # 1. Reject forbidden numeric score injections
        if "score" in item or "atsScore" in item or "overallScore" in item:
            print(f"[OUTPUT VALIDATOR WARNING] Rejected payload containing forbidden score injection: {item}")
            continue

        chunk_id = str(item.get("chunkId", "")).strip()
        competency = str(item.get("competency", "")).strip()

        # 2. Chunk ID Existence Rule
        if chunk_id not in chunk_map:
            print(f"[OUTPUT VALIDATOR REJECTION] Invalid chunkId '{chunk_id}' not found in candidate text chunks.")
            continue

        # 3. Competency Boundary Rule (STRICT REJECTION if valid_competencies provided)
        if valid_comp_set and competency.lower().strip() not in valid_comp_set:
            print(f"[OUTPUT VALIDATOR REJECTION] Competency '{competency}' is not in authoritative target competency list.")
            continue

        # 4. Strict Boolean ACMO Validation
        raw_acmo = item.get("acmo")
        if not isinstance(raw_acmo, dict):
            print(f"[OUTPUT VALIDATOR REJECTION] ACMO flags must be a valid object/dictionary, got {type(raw_acmo)}.")
            continue

        action_val = raw_acmo.get("action")
        context_val = raw_acmo.get("context")
        method_val = raw_acmo.get("method")
        outcome_val = raw_acmo.get("outcome")

        # Require strict boolean type (reject 'true', 'false', 1, 0, None)
        if not (_is_strict_bool(action_val) and _is_strict_bool(context_val) and _is_strict_bool(method_val) and _is_strict_bool(outcome_val)):
            print(f"[OUTPUT VALIDATOR REJECTION] ACMO flags must be strict boolean types (True/False). Got types: action={type(action_val)}, context={type(context_val)}, method={type(method_val)}, outcome={type(outcome_val)}.")
            continue

        acmo_obj = ACMOFlags(
            action=action_val,
            context=context_val,
            method=method_val,
            outcome=outcome_val
        )

        # 5. Verbatim Quote Verification Rule
        chunk_text = chunk_map[chunk_id].text
        raw_quote = str(item.get("observedEvidence", "")).strip()
        
        normalized_chunk = " ".join(chunk_text.lower().split())
        normalized_quote = " ".join(raw_quote.lower().split())

        quote_verbatim_match = bool(normalized_quote and normalized_quote in normalized_chunk)
        if not quote_verbatim_match:
            print(f"[OUTPUT VALIDATOR WARNING] Quote '{raw_quote}' is not verbatim substring of chunk '{chunk_text}'.")
            audit_status = "REJECTED_UNGROUNDED_QUOTE"
        else:
            audit_status = "VERIFIED"

        # 6. Classification & Evidence Level Enums
        classification = str(item.get("classification", "NO_RELEVANT_EVIDENCE")).upper()
        if classification not in ("STRONG_MATCH", "PARTIAL_MATCH", "NO_RELEVANT_EVIDENCE", "INSUFFICIENT_EVIDENCE"):
            classification = "NO_RELEVANT_EVIDENCE"

        evidence_level = str(item.get("evidenceLevel", "EXPLICIT")).upper()
        if evidence_level not in ("EXPLICIT", "DEMONSTRATED", "STRONG_DEMONSTRATED"):
            evidence_level = "EXPLICIT"

        # 7. De-duplication Rule (Unique chunkId + competency pair)
        pair_key = (chunk_id, competency.lower().strip())
        if pair_key in seen_pairs:
            continue
        seen_pairs.add(pair_key)

        finding = AuditedFinding(
            chunkId=chunk_id,
            competency=competency,
            classification=classification,
            evidenceLevel=evidence_level,
            acmo=acmo_obj,
            observedEvidence=raw_quote if quote_verbatim_match else chunk_text,
            auditStatus=audit_status,
            auditorNotes=str(item.get("reasoningSummary", item.get("auditorNotes", "")))
        )
        validated_findings.append(finding)

    return validated_findings
