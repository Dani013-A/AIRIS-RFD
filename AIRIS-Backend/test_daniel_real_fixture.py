import os
import unittest
import pymupdf as fitz
from role_profile_registry import resolve_role_profile
from evidence_chunker import chunk_resume_evidence
from deterministic_scorer import calculate_official_ats_score
from output_validator import AuditedFinding, ACMOFlags

class TestDanielRealFixture(unittest.TestCase):
    def test_daniel_fixture_it_specialist_scoring(self):
        fixture_path = "/Users/danieltan/.gemini/antigravity-ide/brain/a381e712-0e58-4975-bea8-27cf8673f46f/scratch/espela_resume.pdf"
        if not os.path.exists(fixture_path):
            self.skipTest(f"Fixture {fixture_path} not found in environment.")

        doc = fitz.open(fixture_path)
        text = ""
        for page in doc:
            text += page.get_text() + "\n"

        target_role = "Information Technology Specialist"
        role_profile = resolve_role_profile(target_role)
        p_dict = role_profile.to_dict()
        required_skills = p_dict["required_skills"]
        recommended_skills = p_dict["recommended_skills"]

        parsed_sections = {
            "Education": "Bachelor of Science in Information Technology\nPamantasan ng Lungsod ng Maynila",
            "Skills": "Python, Java, C++, JavaScript, TypeScript, SQL, Kotlin, React, React Native, Next.js, FastAPI, Node.js, Express.js, Laravel, SBERT, OCR, Whisper, Firebase, MySQL, Oracle, AWS EC2, AWS RDS, Git, GitHub, Figma, Android Studio, Postman, Unity",
            "Projects": "AIRIS - AI-Powered Resume Scoring & Interview Simulation Platform\nDeveloped full-stack React Native and FastAPI architecture with Python.\n\nYakap Kalinga - Disaster Relief Distribution and Tracking App.\nDeveloped full-stack disaster management system.\n\nTranslateTo - Speech and Text Multi-language Translation Application.\nDeveloped cross-platform mobile translation application.\n\nCentralized Hospital Information System.\nEngineered database management and hospital clinical records platform.\n\nWinner - Grundfos Hackathon 2024.\nEngineered water distribution monitoring prototype."
        }

        chunks = chunk_resume_evidence(parsed_sections)

        detected_skills = [
            "python", "java", "c++", "javascript", "typescript", "sql", "kotlin",
            "react", "react native", "next.js", "fastapi", "node.js", "express.js",
            "laravel", "sbert", "ocr", "whisper", "firebase", "mysql", "oracle",
            "aws ec2", "aws rds", "git", "github", "figma", "android studio",
            "postman", "unity"
        ]

        findings = [
            AuditedFinding(
                chunkId="chunk_skills_001",
                competency="Technical Support & Troubleshooting",
                classification="STRONG_MATCH",
                evidenceLevel="DEMONSTRATED",
                acmo=ACMOFlags(action=True, method=True),
                observedEvidence="Troubleshooting and engineering systems in capstone and hackathon projects",
                auditStatus="VERIFIED"
            ),
            AuditedFinding(
                chunkId="chunk_skills_001",
                competency="Python",
                classification="STRONG_MATCH",
                evidenceLevel="DEMONSTRATED",
                acmo=ACMOFlags(action=True, method=True),
                observedEvidence="Python development across multiple full-stack projects",
                auditStatus="VERIFIED"
            ),
            AuditedFinding(
                chunkId="chunk_skills_001",
                competency="Cloud Infrastructure",
                classification="STRONG_MATCH",
                evidenceLevel="DEMONSTRATED",
                acmo=ACMOFlags(action=True, method=True),
                observedEvidence="AWS EC2 and RDS cloud deployment",
                auditStatus="VERIFIED"
            )
        ]

        runs = []
        for _ in range(3):
            res = calculate_official_ats_score(
                audited_findings=findings,
                evidence_chunks=chunks,
                target_position=target_role,
                required_competencies=required_skills,
                recommended_competencies=recommended_skills,
                sbert_edu_sim_score=0.73,
                audit_status_metadata="VERIFIED",
                role_profile_metadata=p_dict,
                detected_skills=detected_skills
            )
            runs.append(res)

        # 1. Determinism
        self.assertEqual(runs[0]['overallScore'], runs[1]['overallScore'])
        self.assertEqual(runs[1]['overallScore'], runs[2]['overallScore'])
        self.assertEqual(runs[0]['resumeScore'], runs[1]['resumeScore'])

        # 2. Mathematical breakdown check
        r1 = runs[0]
        dim = r1["resumeScore"]["breakdown"]
        expected_score = round(
            0.40 * dim['skills']['rawScore'] +
            0.30 * dim['experience']['rawScore'] +
            0.20 * dim['education']['rawScore'] +
            0.10 * dim['certifications']['rawScore']
        )
        self.assertEqual(r1['overallScore'], expected_score)

        # 3. Category C Isolation: Software/web/mobile skills do not become IT Specialist competencies
        cat_c = r1["roleRelevance"]["relevantTechnicalSkills"]
        self.assertIn("react", cat_c)
        self.assertIn("javascript", cat_c)
        self.assertIn("fastapi", cat_c)

if __name__ == "__main__":
    unittest.main()
