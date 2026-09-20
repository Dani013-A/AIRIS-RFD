import unittest
from deterministic_scorer import calculate_official_ats_score
from evidence_chunker import EvidenceChunk
from output_validator import AuditedFinding, ACMOFlags


class TestSameResumeDifferentCareers(unittest.TestCase):
    """
    Test suite verifying that ATS Machine-Friendliness is strictly career-agnostic (Delta ATS = 0),
    while Target Alignment evaluates role-specific readiness and priority gaps.
    """

    def setUp(self):
        # Realistic fresh graduate resume (Espela-like profile)
        self.edu = EvidenceChunk(
            chunkId="edu_1",
            section="Education",
            text="Bachelor of Science in Information Technology, Technological Institute of the Philippines, 2020 - 2024",
            sourceOrder=1,
            wordCount=14
        )
        self.p1 = EvidenceChunk(
            chunkId="p_1",
            section="Projects",
            text="YakapKalinga: Developed disaster response coordination platform using Next.js and Firebase, 2023.",
            sourceOrder=2,
            wordCount=14
        )
        self.p2 = EvidenceChunk(
            chunkId="p_2",
            section="Projects",
            text="QuizTinker: Built automated quiz generation application using Python and Google Gemini API, 2024.",
            sourceOrder=3,
            wordCount=13
        )
        self.evidence_chunks = [self.edu, self.p1, self.p2]
        self.detected_skills = ["Python", "JavaScript", "TypeScript", "React", "Next.js", "Firebase", "Git", "SQL"]

        # Python finding
        self.finding_python = AuditedFinding(
            chunkId="p_2",
            competency="Python",
            classification="STRONG_MATCH",
            evidenceLevel="STRONG_DEMONSTRATED",
            acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="Python",
            auditStatus="VERIFIED"
        )
        # React finding
        self.finding_react = AuditedFinding(
            chunkId="p_1",
            competency="React",
            classification="STRONG_MATCH",
            evidenceLevel="STRONG_DEMONSTRATED",
            acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="React",
            auditStatus="VERIFIED"
        )

    def test_ats_score_delta_is_strictly_zero_across_five_distinct_careers(self):
        """
        Runs the exact same candidate resume against 5 vastly different careers:
        1. Software Engineer
        2. Information Technology Specialist
        3. Cybersecurity Analyst
        4. Data Scientist
        5. Civil Engineer
        Must produce exactly Delta ATS = 0 across all five careers.
        """
        careers = [
            {
                "role": "Software Engineer",
                "req": ["Python", "React", "Data Structures", "Git"],
                "rec": ["Docker", "TypeScript"],
                "findings": [self.finding_python, self.finding_react]
            },
            {
                "role": "Information Technology Specialist",
                "req": ["Network Administration", "System Administration", "Linux Administration"],
                "rec": ["Python", "Active Directory"],
                "findings": [self.finding_python]
            },
            {
                "role": "Cybersecurity Analyst",
                "req": ["Threat Analysis", "Network Security", "Incident Response"],
                "rec": ["Python", "Wireshark"],
                "findings": [self.finding_python]
            },
            {
                "role": "Data Scientist",
                "req": ["Machine Learning", "Statistics", "Data Visualization"],
                "rec": ["Python", "Pandas"],
                "findings": [self.finding_python]
            },
            {
                "role": "Civil Engineer",
                "req": ["AutoCAD Civil 3D", "Structural Analysis", "Geotechnical Engineering"],
                "rec": ["Project Estimation"],
                "findings": []
            }
        ]

        results = []
        for c in careers:
            payload = calculate_official_ats_score(
                audited_findings=c["findings"],
                evidence_chunks=self.evidence_chunks,
                target_position=c["role"],
                required_competencies=c["req"],
                recommended_competencies=c["rec"],
                detected_skills=self.detected_skills
            )
            results.append(payload)

        base_ats = results[0]["overallScore"]
        base_b = results[0]["breakdown"]
        base_skills_raw = base_b["skillsFormatting"]["rawScore"]
        base_exp_raw = base_b["experienceStructure"]["rawScore"]
        base_edu_raw = base_b["educationStructure"]["rawScore"]
        base_contact_raw = base_b["contactRecognition"]["rawScore"]

        for idx, res in enumerate(results[1:], start=1):
            role = careers[idx]["role"]
            # 1. ATS Score is identical (Delta ATS = 0)
            self.assertEqual(
                res["overallScore"], base_ats,
                f"Delta ATS must be 0 for same resume! Failed on {role}: {res['overallScore']} vs {base_ats}"
            )
            # 2. ATS Breakdown scores are identical
            b = res["breakdown"]
            self.assertEqual(b["skillsFormatting"]["rawScore"], base_skills_raw)
            self.assertEqual(b["experienceStructure"]["rawScore"], base_exp_raw)
            self.assertEqual(b["educationStructure"]["rawScore"], base_edu_raw)
            self.assertEqual(b["contactRecognition"]["rawScore"], base_contact_raw)

        # 3. Target Alignment varies meaningfully and accurately reflects role match
        software_alignment = results[0]["roleRelevance"]["alignmentPercentage"]
        it_spec_alignment = results[1]["roleRelevance"]["alignmentPercentage"]
        civil_alignment = results[4]["roleRelevance"]["alignmentPercentage"]

        self.assertGreater(software_alignment, it_spec_alignment, "Software role should have higher alignment than IT Spec")
        self.assertGreater(it_spec_alignment, civil_alignment, "IT Spec role should have higher alignment than Civil Eng")
        self.assertEqual(civil_alignment, 0, "Civil Engineering should have 0% alignment for IT graduate")

        # 4. Gaps adapt dynamically to the target career
        self.assertIn("Network Administration", results[1]["roleRelevance"]["priorityGaps"])
        self.assertIn("Threat Analysis", results[2]["roleRelevance"]["priorityGaps"])
        self.assertIn("Machine Learning", results[3]["roleRelevance"]["priorityGaps"])
        self.assertIn("AutoCAD Civil 3D", results[4]["roleRelevance"]["priorityGaps"])


if __name__ == "__main__":
    unittest.main()
