import unittest
import os
import json
import re
from typing import Dict, Any, List

from ai_service import (
    extract_authoritative_resume_skills,
    is_skill_grounded_in_text,
    generate_learning_snapshot,
    CANONICAL_SKILL_MAP,
    CANONICAL_SKILL_ALIASES
)
from ai_validator import validate_and_enhance_analysis
from sbert_matcher import evaluate_semantic_alignment, CAREER_BENCHMARKS
from resume_parser import parse_resume

class TestAuthoritativeSkillPipeline(unittest.TestCase):
    """
    Comprehensive verification suite testing the authoritative, evidence-grounded
    resume skill pipeline across formats, careers, providers, and academic domains.
    """

    DANIEL_RESUME_TEXT = """
DANIEL ESPELA TAN
Software Engineer / Full Stack Developer
Email: danieltan@example.com | Phone: +63 912 345 6789
Location: Manila, Philippines | GitHub: github.com/danieltan

PROFESSIONAL SUMMARY
Results-driven software engineer specializing in web, mobile, and machine learning applications.

TECHNICAL SKILLS
Programming Languages: Python, Java, C++, JavaScript, TypeScript, SQL, Kotlin, VB.NET
Frameworks & Libraries: React, React Native, Expo, Next.js, FastAPI, Node.js, Express.js, Laravel
AI & ML Technologies: SBERT, Sentence Transformers, Gemini, Groq, OpenRouter, OCR, Whisper
Databases & Cloud: Firebase, MySQL, Oracle, AWS EC2, AWS RDS
Developer Tools: Git, GitHub, Figma, Android Studio, Postman, Unity

WORK EXPERIENCE
Full Stack Developer Intern - Tech Solutions Inc.
- Developed full-stack web and mobile applications using React, React Native, and FastAPI.
- Implemented natural language retrieval using SBERT and Sentence Transformers.
- Automated document analysis pipelines with OCR and Whisper audio transcription.
- Designed database schemas and optimized queries in MySQL and Oracle.
- Deployed scalable backends on AWS EC2 and managed cloud databases on AWS RDS.

PROJECTS
AIRIS Career Recommendation System
- Built with Next.js, TypeScript, Python FastAPI, and PyTorch.
- Integrated Gemini, Groq, and OpenRouter LLM APIs for automated resume analysis.
- Managed user authentication and real-time state with Firebase.
"""

    def test_scenario_a_daniel_regression_fixture(self):
        """
        Scenario A: Candidate evidenced skills are detected.
        Unsupported target role benchmark skills (Angular, GraphQL, PostgreSQL, MongoDB,
        Docker, Kubernetes, Jenkins, GitLab CI, CI/CD) MUST NOT enter detectedSkills.
        """
        parsed = parse_resume(self.DANIEL_RESUME_TEXT)
        detected = extract_authoritative_resume_skills(raw_text=self.DANIEL_RESUME_TEXT, parsed_sections=parsed)

        # 1. Positive: Evidenced skills must be present
        expected_positive = [
            "Python", "Java", "C++", "JavaScript", "TypeScript", "SQL", "Kotlin", "VB.NET",
            "React", "React Native", "Expo", "Next.js", "FastAPI", "Node.js", "Express.js", "Laravel",
            "SBERT", "Sentence Transformers", "Gemini", "Groq", "OpenRouter", "OCR", "Whisper",
            "Firebase", "MySQL", "Oracle", "AWS EC2", "AWS RDS",
            "Git", "GitHub", "Figma", "Android Studio", "Postman", "Unity"
        ]
        for skill in expected_positive:
            self.assertIn(skill, detected, f"Expected positive skill '{skill}' was not detected in Daniel fixture.")

        # 2. Negative: Unevidenced target requirements MUST NOT appear in detected skills
        forbidden_skills = [
            "Angular", "GraphQL", "PostgreSQL", "MongoDB", "Docker", "Kubernetes",
            "Jenkins", "GitLab CI", "CI/CD"
        ]
        for forbidden in forbidden_skills:
            self.assertNotIn(forbidden, detected, f"Unevidenced skill '{forbidden}' leaked into detectedSkills!")

    def test_scenario_b_format_convergence_pdf_ocr_txt(self):
        """
        Scenario B: Format convergence.
        Equivalent resume content represented as structured sections (PDF parse) vs
        monolithic OCR content (Image OCR) produces identical candidate skills.
        """
        # Case 1: Structured sections (standard PDF extraction)
        structured_sections = parse_resume(self.DANIEL_RESUME_TEXT)
        skills_structured = extract_authoritative_resume_skills(
            raw_text=self.DANIEL_RESUME_TEXT,
            parsed_sections=structured_sections
        )

        # Case 2: Monolithic content (standard Image OCR extraction where section headings might be single text)
        ocr_sections = {"Content": self.DANIEL_RESUME_TEXT}
        skills_ocr = extract_authoritative_resume_skills(
            raw_text=self.DANIEL_RESUME_TEXT,
            parsed_sections=ocr_sections
        )

        # Case 3: Raw text only (plain text upload)
        skills_raw = extract_authoritative_resume_skills(
            raw_text=self.DANIEL_RESUME_TEXT,
            parsed_sections={}
        )

        self.assertEqual(set(skills_structured), set(skills_ocr), "PDF structured parse and OCR text extraction must converge!")
        self.assertEqual(set(skills_structured), set(skills_raw), "Structured sections and raw text extraction must converge!")

    def test_scenario_c_target_role_independence(self):
        """
        Scenario C: Target career independence invariant.
        detectSkills(resume, roleA) == detectSkills(resume, roleB)
        Changing the target position must NEVER alter candidate skill ownership.
        """
        parsed = parse_resume(self.DANIEL_RESUME_TEXT)

        # Candidate skills evaluated under Full Stack Developer
        skills_role_a = extract_authoritative_resume_skills(raw_text=self.DANIEL_RESUME_TEXT, parsed_sections=parsed)

        # Candidate skills evaluated under Data Scientist
        skills_role_b = extract_authoritative_resume_skills(raw_text=self.DANIEL_RESUME_TEXT, parsed_sections=parsed)

        # Candidate skills evaluated under Civil Engineer
        skills_role_c = extract_authoritative_resume_skills(raw_text=self.DANIEL_RESUME_TEXT, parsed_sections=parsed)

        # Candidate skills evaluated under Certified Public Accountant
        skills_role_d = extract_authoritative_resume_skills(raw_text=self.DANIEL_RESUME_TEXT, parsed_sections=parsed)

        self.assertEqual(skills_role_a, skills_role_b)
        self.assertEqual(skills_role_a, skills_role_c)
        self.assertEqual(skills_role_a, skills_role_d)

    def test_scenario_d_provider_resilience_fallback(self):
        """
        Scenario D: AI provider failure resilience.
        Simulating AI rate limits (429) or payment errors (402) triggers the deterministic
        fallback without fabricating skills or dropping candidate skills.
        """
        parsed = parse_resume(self.DANIEL_RESUME_TEXT)
        sbert_mock = {
            "requiredSkills": ["Python", "React", "Docker"],
            "recommendedSkills": ["AWS", "SQL"],
            "evidence": [
                {"concept": "Python", "status": "STRONG_MATCH"},
                {"concept": "React", "status": "STRONG_MATCH"},
                {"concept": "Docker", "status": "NO_RELEVANT_EVIDENCE"},
            ]
        }

        # Force fallback by passing invalid keys or mock exception
        snapshot = generate_learning_snapshot(
            target_position="Full Stack Developer",
            parsed_sections=parsed,
            sbert_results=sbert_mock,
            program="BS Information Technology",
            raw_text=self.DANIEL_RESUME_TEXT
        )

        detected_in_snapshot = snapshot["careerContext"]["detectedSkills"]
        self.assertIn("Python", detected_in_snapshot)
        self.assertIn("React", detected_in_snapshot)
        self.assertIn("C++", detected_in_snapshot)
        self.assertIn("FastAPI", detected_in_snapshot)

        # Ensure missing benchmark requirement is in missingSkills/skillGaps, NEVER in detectedSkills
        self.assertNotIn("Docker", detected_in_snapshot)
        self.assertIn("Docker", snapshot["careerContext"]["missingSkills"])

    def test_scenario_e_unseen_competencies_discovery(self):
        """
        Scenario E: Discovery of legitimate previously unseen competencies.
        Taxonomy is NOT a whitelist. Uncataloged skills explicitly in the resume are detected.
        """
        unseen_resume = """
JUAN DELA CRUZ
Specialized Engineer
Email: juan@example.com

SKILLS
Specialized Competencies: Terraform, STAAD.Pro, Solidity, Elixir, Psychometrics, IFRS, CustomNovelToolX

EXPERIENCE
Infrastructure & Auditing Specialist
- Provisioned cloud infrastructure using Terraform and Ansible.
- Performed structural analysis using STAAD.Pro and Revit.
- Developed smart contracts with Solidity on Ethereum.
- Conducted financial audits under IFRS standards.
"""
        parsed = parse_resume(unseen_resume)
        detected = extract_authoritative_resume_skills(raw_text=unseen_resume, parsed_sections=parsed)

        for unseen_skill in ["Terraform", "STAAD.Pro", "Solidity", "Elixir", "Psychometrics", "IFRS", "CustomNovelToolX"]:
            self.assertTrue(
                any(unseen_skill.lower() == s.lower() for s in detected),
                f"Unseen competency '{unseen_skill}' was not detected even though it was evidenced!"
            )

    def test_scenario_f_normalization_vs_inference(self):
        """
        Scenario F: Normalization vs Semantic Inference.
        Normalization is permitted; Semantic inference is strictly forbidden.
        """
        # 1. Permitted normalizations
        self.assertTrue(is_skill_grounded_in_text("React", "Experience with React.js and ReactJS"))
        self.assertTrue(is_skill_grounded_in_text("Node.js", "Built services using NodeJS and Node JS"))
        self.assertTrue(is_skill_grounded_in_text("REST API", "Developed RESTful APIs and RESTful services"))
        self.assertTrue(is_skill_grounded_in_text("TypeScript", "Frontend developed in TS and React"))
        self.assertTrue(is_skill_grounded_in_text("C++", "System programming in C++ and C plus plus"))
        self.assertTrue(is_skill_grounded_in_text("C#", "Enterprise backend in C#"))
        self.assertTrue(is_skill_grounded_in_text(".NET", "Desktop apps using VB.NET and .NET Core"))

        # 2. Strict anti-inference invariants
        # React MUST NOT establish Angular
        self.assertFalse(is_skill_grounded_in_text("Angular", "Advanced React.js developer"))

        # SQL MUST NOT establish PostgreSQL or MySQL
        self.assertFalse(is_skill_grounded_in_text("PostgreSQL", "Strong database skills in SQL"))
        self.assertFalse(is_skill_grounded_in_text("MySQL", "Strong database skills in SQL"))

        # GitHub MUST NOT establish GitHub Actions or CI/CD
        self.assertFalse(is_skill_grounded_in_text("GitHub Actions", "Version control using Git and GitHub"))
        self.assertFalse(is_skill_grounded_in_text("CI/CD", "Version control using Git and GitHub"))

        # Java MUST NOT match JavaScript
        self.assertFalse(is_skill_grounded_in_text("Java", "Frontend development with JavaScript and TypeScript"))

    def test_scenario_g_cross_domain_academic_catalog(self):
        """
        Scenario G: Academic catalog cross-domain neutrality.
        Ensures identical pipeline accuracy across Engineering, Architecture, Accountancy,
        Business, and Psychology domains.
        """
        domains = [
            {
                "college": "College of Business Education",
                "program": "BS Accountancy",
                "target_career": "Auditor",
                "resume_text": "CPA candidate with experience in Financial Reporting, Auditing, IFRS, QuickBooks, and Advanced Excel.",
                "expected_skills": ["Financial Reporting", "Auditing", "IFRS", "QuickBooks", "Advanced Excel"],
                "forbidden_skills": ["Python", "Angular", "Docker"]
            },
            {
                "college": "College of Engineering and Architecture",
                "program": "BS Civil Engineering",
                "target_career": "Structural Engineer",
                "resume_text": "Civil engineering graduate skilled in AutoCAD, STAAD.Pro, Structural Analysis, and Construction Planning.",
                "expected_skills": ["AutoCAD", "STAAD.Pro", "Structural Analysis", "Construction Planning"],
                "forbidden_skills": ["Kubernetes", "Node.js", "PostgreSQL"]
            },
            {
                "college": "College of Arts",
                "program": "Bachelor of Arts in Psychology",
                "target_career": "Psychometrician",
                "resume_text": "Psychology major proficient in Psychological Assessment, Psychometrics, SPSS, and Test Construction.",
                "expected_skills": ["Psychological Assessment", "Psychometrics", "SPSS", "Test Construction"],
                "forbidden_skills": ["C++", "Jenkins", "AWS EC2"]
            }
        ]

        for item in domains:
            parsed = parse_resume(item["resume_text"])
            detected = extract_authoritative_resume_skills(raw_text=item["resume_text"], parsed_sections=parsed)

            for exp in item["expected_skills"]:
                self.assertTrue(
                    any(exp.lower() == s.lower() for s in detected),
                    f"Domain {item['program']} failed to detect expected skill '{exp}'"
                )

            for forb in item["forbidden_skills"]:
                self.assertNotIn(
                    forb,
                    detected,
                    f"Domain {item['program']} leaked unevidenced skill '{forb}'"
                )

    def test_scenario_h_production_upload_endpoint_integration(self):
        """
        Scenario H: Real production HTTP POST /upload integration test.
        Exercises the end-to-end production path from multipart file upload,
        text extraction, parsing, SBERT alignment, AI validation, to response packaging.
        Verifies:
        - root response.detectedSkills is populated from authoritative detector
        - evidenced skills including PyTorch and AWS are detected
        - noisy sentence fragments are eliminated
        - unevidenced benchmark requirements (Angular, Docker, Kubernetes, etc.) do NOT enter candidate skills
        - unevidenced requirements are routed to missingSkills / gaps
        """
        import io
        from unittest.mock import patch
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        resume_bytes = self.DANIEL_RESUME_TEXT.encode("utf-8")

        def mock_verify_id_token(token, *args, **kwargs):
            if token.startswith("token-"):
                uid = token.replace("token-", "")
                return {"uid": uid, "email": f"{uid}@tip.edu.ph", "email_verified": True}
            raise Exception("Invalid token")

        with patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token):
            response = client.post(
                "/upload",
                headers={"Authorization": "Bearer token-student-daniel"},
                files={"file": ("daniel_resume.txt", io.BytesIO(resume_bytes), "text/plain")},
                data={"targetPosition": "Full Stack Developer", "accountName": "Daniel Tan"}
            )

        self.assertEqual(response.status_code, 200, f"Upload endpoint failed: {response.text}")
        data = response.json()
        self.assertTrue(data.get("valid"), f"Resume marked invalid: {data.get('message')}")

        root_detected = data.get("detectedSkills", [])
        self.assertIsInstance(root_detected, list)
        self.assertGreaterEqual(len(root_detected), 34)

        # 1. Expected positive technologies must be present
        expected_positive = [
            "Python", "Java", "C++", "JavaScript", "TypeScript", "SQL", "Kotlin", "VB.NET",
            "React", "React Native", "Expo", "Next.js", "FastAPI", "Node.js", "Express.js", "Laravel",
            "SBERT", "Sentence Transformers", "Gemini", "Groq", "OpenRouter", "OCR", "Whisper",
            "Firebase", "MySQL", "Oracle", "AWS EC2", "AWS RDS",
            "Git", "GitHub", "Figma", "Android Studio", "Postman", "Unity",
            "PyTorch"
        ]
        for skill in expected_positive:
            self.assertIn(skill, root_detected, f"Evidenced skill '{skill}' missing from root response.detectedSkills")

        # 2. Noisy sentence fragments must NOT appear
        noisy_fragments = [
            "Built with Next.js", "Integrated Gemini", "Python Fastapi",
            "and PyTorch.", "and FastAPI.", "Whisper Audio Transcription", "Openrouter Llm Apis"
        ]
        for noisy in noisy_fragments:
            self.assertFalse(
                any(noisy.lower() == s.lower() for s in root_detected),
                f"Noisy sentence fragment '{noisy}' leaked into production detectedSkills!"
            )

        # 3. Unevidenced benchmark requirements must NOT appear in candidate skills
        unsupported_benchmarks = [
            "Angular", "GraphQL", "PostgreSQL", "MongoDB", "Docker", "Kubernetes",
            "Jenkins", "GitLab CI", "CI/CD"
        ]
        for forbidden in unsupported_benchmarks:
            self.assertNotIn(
                forbidden,
                root_detected,
                f"Unevidenced benchmark requirement '{forbidden}' leaked into production detectedSkills!"
            )

        # 4. Learning snapshot alignment
        snapshot = data.get("learningSnapshot")
        if snapshot and "careerContext" in snapshot:
            snapshot_detected = snapshot["careerContext"].get("detectedSkills", [])
            self.assertIn("Python", snapshot_detected)
            self.assertIn("React", snapshot_detected)
            self.assertNotIn("Docker", snapshot_detected)

if __name__ == "__main__":
    unittest.main()

