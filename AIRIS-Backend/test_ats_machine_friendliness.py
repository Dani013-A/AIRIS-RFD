import unittest
from deterministic_scorer import calculate_official_ats_score
from evidence_chunker import EvidenceChunk
from output_validator import AuditedFinding, ACMOFlags


class TestAtsMachineFriendliness(unittest.TestCase):
    """
    Test suite verifying ATS Score as a pure measure of Document Machine-Friendliness.
    Evaluates:
    - Normal fresh graduates with clean structure score naturally in 70-85+ range.
    - Sparse but clean resumes score >= 50 without arbitrary score floors.
    - Poorly structured documents, OCR corruption, and keyword stuffing are penalized.
    - Zero career penalty in ATS score.
    """

    def test_normal_fresh_graduate_clean_resume_scores_naturally_strong(self):
        """
        Normal fresh graduate with clean standard sections:
        - Skills: 7 clean comma-separated skills
        - Experience: 2 capstone/academic projects with dates and action verbs
        - Education: BS Information Technology from recognized college with dates
        - Certifications: Clean omission (standard fresh graduate hygiene)
        Must naturally score >= 70 (StrongFoundation or ExcellentMatch).
        """
        edu_chunk = EvidenceChunk(
            chunkId="edu_1",
            section="Education",
            text="Bachelor of Science in Information Technology, Technological Institute of the Philippines, 2020 - 2024",
            sourceOrder=1,
            wordCount=14
        )
        p1 = EvidenceChunk(
            chunkId="p_1",
            section="Projects",
            text="Capstone Project (Lead Developer): Designed and engineered an automated disaster response tracking portal using Next.js and Firebase. Implemented real-time resource routing, 2023 - 2024.",
            sourceOrder=2,
            wordCount=25
        )
        p2 = EvidenceChunk(
            chunkId="p_2",
            section="Projects",
            text="Thesis Project: Built an interactive machine learning exam evaluation tool in Python and SQLite, streamlining automated grading for 200 students, 2023.",
            sourceOrder=3,
            wordCount=23
        )
        skills = ["Python", "JavaScript", "TypeScript", "React", "Next.js", "Firebase", "Git"]

        payload = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[edu_chunk, p1, p2],
            target_position="Software Engineer",
            required_competencies=["Python", "JavaScript"],
            detected_skills=skills
        )

        overall = payload["overallScore"]
        b = payload["resumeScore"]["breakdown"]

        self.assertGreaterEqual(b["skills"]["rawScore"], 80, f"Clean skills must score >= 80, got {b['skills']['rawScore']}")
        self.assertGreaterEqual(b["experience"]["rawScore"], 70, f"Clean project history must score >= 70, got {b['experience']['rawScore']}")
        self.assertGreaterEqual(b["education"]["rawScore"], 70, f"Clean education must score >= 70, got {b['education']['rawScore']}")
        self.assertEqual(b["certifications"]["rawScore"], 100, "Clean omission of certs must be 100")
        self.assertGreaterEqual(overall, 70, f"Clean fresh graduate resume must naturally score >= 70, got {overall}")

    def test_sparse_clean_resume_scores_defensibly(self):
        """
        Sparse but clean resume:
        - 3 clean skills
        - 1 simple project with dates and an action verb
        - Clean degree
        - No certifications section
        Must score >= 50 (GettingThere) without needing artificial score clamping.
        """
        edu = EvidenceChunk(
            chunkId="e", section="Education",
            text="BS Computer Science, City College, 2024",
            sourceOrder=1, wordCount=6
        )
        p = EvidenceChunk(
            chunkId="p", section="Projects",
            text="Developed a library management web tool using PHP and MySQL, 2023.",
            sourceOrder=2, wordCount=11
        )
        skills = ["PHP", "MySQL", "HTML"]

        payload = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[edu, p],
            target_position="Web Developer",
            required_competencies=["PHP", "MySQL"],
            detected_skills=skills
        )

        overall = payload["overallScore"]
        self.assertGreaterEqual(overall, 50, f"Sparse clean resume must achieve >= 50, got {overall}")

    def test_poorly_structured_dense_narrative_penalized(self):
        """
        Poorly structured resume with dense unformatted paragraphs, no delimiters,
        and missing standard headers.
        Must be penalized for machine unfriendliness.
        """
        wall_of_text = (
            "I have experience working on computers doing various programming tasks I like python and javascript "
            "and also html and css and I learned how to build websites and work with databases like mysql and postgres "
            "and also worked in teams during school to build various small projects and homework assignments."
        )
        p_messy = EvidenceChunk(
            chunkId="m1", section="Summary",
            text=wall_of_text,
            sourceOrder=1, wordCount=48
        )
        payload = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[p_messy],
            target_position="Software Engineer",
            required_competencies=["Python"],
            parsed_sections={"Skills": wall_of_text}
        )

        b = payload["resumeScore"]["breakdown"]
        # Dense narrative without delimiters must receive low skills structure score
        self.assertLess(b["skills"]["rawScore"], 60, f"Unformatted wall of text should receive < 60 in skills, got {b['skills']['rawScore']}")

    def test_ocr_corrupted_resume_heavily_penalized(self):
        """
        Resume with severe OCR scanning artifacts (\ufffd, scrambled characters).
        Must receive poor ATS machine-friendliness scores.
        """
        corrupted_skills = "Pyth\ufffd\ufffdn, J\ufffdvaSc\ufffdrpt, C++ \x00\x01\x02\x03\x04, \ufffd\ufffd\ufffd\ufffd"
        payload = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[],
            target_position="Software Engineer",
            required_competencies=["Python"],
            parsed_sections={"Skills": corrupted_skills, "Certifications": "C\ufffd\ufffd\ufffdrtified \ufffd\ufffd\ufffd"}
        )

        b = payload["resumeScore"]["breakdown"]
        self.assertLessEqual(b["skills"]["rawScore"], 50, f"Corrupted skills must be <= 50, got {b['skills']['rawScore']}")
        self.assertLessEqual(b["certifications"]["rawScore"], 20, f"Corrupted certs must be <= 20, got {b['certifications']['rawScore']}")

    def test_keyword_stuffing_penalized(self):
        """
        Resume attempting keyword stuffing by repeating skills excessively.
        Must be detected and penalized in the ATS hygiene dimension.
        """
        stuffed_skills = "python " * 30 + "react " * 30 + "javascript " * 30
        payload = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[],
            target_position="Software Engineer",
            required_competencies=["Python"],
            parsed_sections={"Skills": stuffed_skills}
        )

        b = payload["resumeScore"]["breakdown"]
        self.assertLessEqual(b["skills"]["rawScore"], 60, f"Keyword stuffed skills must be penalized, got {b['skills']['rawScore']}")


if __name__ == "__main__":
    unittest.main()
