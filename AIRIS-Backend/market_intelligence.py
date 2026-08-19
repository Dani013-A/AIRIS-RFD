import os
import uuid
import datetime
import requests
from typing import Dict, Any
from firebase_admin import credentials, firestore, initialize_app, get_app

REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs"
MIN_SKILLS_THRESHOLD = 50

def get_firestore_client():
    try:
        get_app()
    except ValueError:
        # If no explicit credential is provided, firebase_admin uses GOOGLE_APPLICATION_CREDENTIALS automatically.
        initialize_app()
    return firestore.client()

def fetch_job_trends() -> dict:
    """
    Fetches the latest remote jobs from Remotive API.
    """
    response = requests.get(REMOTIVE_API_URL, params={"limit": 250}, timeout=15.0)
    response.raise_for_status()
    data = response.json()
    if "jobs" not in data:
        raise ValueError("Invalid response structure from Remotive API: missing 'jobs'")
    return data

def normalize_and_deduplicate(jobs_data: dict) -> Dict[str, Any]:
    """
    Extracts tags/skills from job listings, counts occurrences,
    and normalizes them into a 0-100 demandScore.
    """
    jobs = jobs_data.get("jobs", [])
    if not jobs:
        raise ValueError("No jobs found in the source data.")

    tag_counts = {}
    for job in jobs:
        tags = job.get("tags", [])
        for tag in tags:
            normalized_tag = tag.strip().lower()
            if not normalized_tag:
                continue
            tag_counts[normalized_tag] = tag_counts.get(normalized_tag, 0) + 1

    if not tag_counts:
        raise ValueError("No tags/skills extracted from the job data.")

    # Calculate frequencies
    total_jobs_analyzed = len(jobs)
    max_count = max(tag_counts.values()) if tag_counts else 1

    skills_dict = {}
    for tag, count in tag_counts.items():
        # Demand Score = (skillFrequency / max_skillFrequency_in_snapshot) * 100
        demand_score = int((count / max_count) * 100)

        # Determine relevance bucket conceptually
        if demand_score > 75:
            relevance = "high"
        elif demand_score > 30:
            relevance = "moderate"
        else:
            relevance = "low"

        skills_dict[tag] = {
            "demandScore": demand_score,
            "evidenceCount": count,
            "relevance": relevance
        }

    return {
        "metrics": {
            "total_jobs_analyzed": total_jobs_analyzed,
            "total_unique_skills": len(skills_dict)
        },
        "skills": skills_dict
    }

def refresh_job_market_snapshot() -> dict:
    """
    Orchestrates the refresh pipeline: Fetch -> Validate -> Normalize -> Deduplicate -> Firestore Batch Write.
    Returns the snapshot metadata on success.
    """
    raw_data = fetch_job_trends()

    # 2 & 3. Validate, Normalize, Deduplicate
    processed_data = normalize_and_deduplicate(raw_data)
    skills = processed_data.get("skills", {})
    metrics = processed_data.get("metrics", {})

    if len(skills) < MIN_SKILLS_THRESHOLD:
        raise ValueError(f"Quality check failed: Extracted {len(skills)} skills, minimum is {MIN_SKILLS_THRESHOLD}.")

    snapshot_id = f"snapshot_{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}"

    snapshot_doc = {
        "snapshot_id": snapshot_id,
        "source": "Remotive API",
        "source_url": REMOTIVE_API_URL,
        "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "active": True,
        "metrics": metrics,
        "skills": skills
    }

    db = get_firestore_client()
    market_ref = db.collection("market_intelligence")
    new_snapshot_ref = market_ref.document(snapshot_id)

    @firestore.transactional
    def update_in_transaction(transaction, market_ref, new_snapshot_ref, snapshot_doc):
        query = market_ref.where("active", "==", True)
        active_docs = transaction.get(query)

        for doc in active_docs:
            transaction.update(doc.reference, {"active": False})

        transaction.set(new_snapshot_ref, snapshot_doc)

    transaction = db.transaction()
    update_in_transaction(transaction, market_ref, new_snapshot_ref, snapshot_doc)

    return {
        "status": "success",
        "snapshot_id": snapshot_id,
        "message": f"Successfully activated new snapshot with {len(skills)} skills."
    }
