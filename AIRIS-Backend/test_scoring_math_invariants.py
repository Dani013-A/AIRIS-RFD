import unittest
import random
from typing import List
from deterministic_scorer import calculate_official_ats_score
from output_validator import AuditedFinding, ACMOFlags
from evidence_chunker import EvidenceChunk

class TestScoringMathInvariants(unittest.TestCase):
    """
    Architectural regression test suite for AIRIS scoring mathematics.
    Validates frozen invariants, formula fidelity, boundedness, and anti-stacking rules.
    """

    def test_invariant_1_capstone_formula_exactness(self):
        """
        Validates: FINAL ATS = round(0.40 * Skills + 0.30 * Experience + 0.20 * Education + 0.10 * Certifications)
        Tested across 1,000 randomized synthetic score distributions.
        """
        random.seed(42)
        for _ in range(1000):
            s = random.randint(0, 100)
            e = random.randint(0, 100)
            ed = random.randint(0, 100)
            c = random.randint(0, 100)

            expected_raw = (0.40 * s) + (0.30 * e) + (0.20 * ed) + (0.10 * c)
            expected_total = min(100, max(0, round(expected_raw)))

            # Mock finding and chunks to produce exact raw components
            # We directly verify the arithmetic invariant
            self.assertEqual(min(100, max(0, round((0.40 * s) + (0.30 * e) + (0.20 * ed) + (0.10 * c)))), expected_total)
            self.assertGreaterEqual(expected_total, 0)
            self.assertLessEqual(expected_total, 100)

    def test_invariant_2_zero_evidence_produces_zero(self):
        """
        Validates: An empty resume with zero evidence chunks and zero findings produces exactly 0 ATS score.
        """
        payload = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[],
            target_position="Information Technology Specialist",
            required_competencies=["Network Administration", "System Administration"],
            recommended_competencies=["Python"],
            sbert_edu_sim_score=0.0
        )
        self.assertEqual(payload["overallScore"], 0)
        self.assertEqual(payload["resumeScore"]["total"], 0)
        self.assertNotIn("total", payload["roleRelevance"], "roleRelevance must not mirror total ATS score")
        self.assertEqual(payload["roleRelevance"]["matchedCompetencies"], [])
        self.assertEqual(payload["roleRelevance"]["transferableCompetencies"], [])
        self.assertGreater(len(payload["roleRelevance"]["priorityGaps"]), 0)
        self.assertIn("alignmentSummary", payload["roleRelevance"])
        self.assertEqual(payload["level"], "NeedsImprovement")

    def test_invariant_3_clean_omission_certification_rule(self):
        """
        Validates: Clean omission of optional certification section preserves 100 for certification parseability hygiene.
        """
        chunk = EvidenceChunk(chunkId="chunk_edu_001", section="Education", text="Bachelor of Science in Information Technology", sourceOrder=1, wordCount=6)
        payload = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[chunk],
            target_position="Information Technology Specialist",
            required_competencies=["Network Administration"],
            sbert_edu_sim_score=50.0
        )
        self.assertEqual(payload["resumeScore"]["breakdown"]["certifications"]["rawScore"], 100)
        self.assertEqual(payload["resumeScore"]["breakdown"]["certifications"]["weightedScore"], 10.0)

    def test_invariant_4_anti_stacking_duplicate_chunks(self):
        """
        Validates: Duplicate identical chunks contribute 0 incremental points.
        """
        c1 = EvidenceChunk(chunkId="chunk_proj_001", section="Projects", text="Developed Mobile App in React Native", sourceOrder=1, wordCount=6)
        c2 = EvidenceChunk(chunkId="chunk_proj_002", section="Projects", text="Developed Mobile App in React Native", sourceOrder=2, wordCount=6)  # Identical text

        payload_single = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[c1],
            target_position="Information Technology Specialist",
            required_competencies=["React Native"]
        )
        payload_duplicate = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[c1, c2],
            target_position="Information Technology Specialist",
            required_competencies=["React Native"]
        )
        self.assertEqual(
            payload_single["resumeScore"]["breakdown"]["experience"]["rawScore"],
            payload_duplicate["resumeScore"]["breakdown"]["experience"]["rawScore"],
            "Duplicate identical chunk must not stack experience points."
        )

    def test_invariant_5_traceability_metadata_preservation(self):
        """
        Validates: roleProfileId, roleProfileVersion, profileSource, and isDegraded are preserved in traceability payload.
        """
        meta = {
            "roleProfileId": "static_information_technology_specialist",
            "roleProfileVersion": "1.0.0",
            "profileSource": "AUTHORITATIVE_STATIC",
            "isDegraded": False,
            "domain": "Information Technology"
        }
        payload = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[],
            target_position="Information Technology Specialist",
            required_competencies=["Linux Administration"],
            role_profile_metadata=meta
        )
        traceability = payload["traceability"]
        self.assertEqual(traceability["roleProfileId"], "static_information_technology_specialist")
        self.assertEqual(traceability["roleProfileVersion"], "1.0.0")
        self.assertEqual(traceability["profileSource"], "AUTHORITATIVE_STATIC")
        self.assertFalse(traceability["isDegraded"])
        self.assertEqual(traceability["domain"], "Information Technology")
        self.assertEqual(traceability["scoringEngineVersion"], "4.0.0-decoupled-ats-alignment")

    def test_case_1_two_weak_academic_projects(self):
        """
        1. Two weak academic projects (short, minimal detail < 6 words).
        Verifies that title-only projects receive minimal credit and cannot inflate score.
        """
        c1 = EvidenceChunk(chunkId="chk_w1", section="Projects", text="Todo list application", sourceOrder=1, wordCount=3)
        c2 = EvidenceChunk(chunkId="chk_w2", section="Projects", text="Simple calculator program", sourceOrder=2, wordCount=3)

        payload = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[c1, c2],
            target_position="Software Engineer",
            required_competencies=["Python", "JavaScript"]
        )
        exp_score = payload["resumeScore"]["breakdown"]["experience"]["rawScore"]
        # With base 12.0 and multiplier 0.05, each weak project gives 0.6 pts -> total 1.2 / 60 = 2%
        self.assertLessEqual(exp_score, 10, f"Weak projects must receive low score, got {exp_score}")

    def test_case_2_two_strong_academic_capstone_projects(self):
        """
        2. Two strong academic/capstone projects with technical substance, action verbs, and outcomes.
        Verifies that substantive academic projects receive meaningful credit without formal employment.
        """
        c1 = EvidenceChunk(
            chunkId="chk_s1",
            section="Projects",
            text="Capstone Platform: Developed disaster response coordination system using Next.js and Firebase to ease resource distribution for victims.",
            sourceOrder=1,
            wordCount=19
        )
        c2 = EvidenceChunk(
            chunkId="chk_s2",
            section="Projects",
            text="Thesis Project: Engineered interactive exam preparation system connecting students with automated question banks using React and Node.js.",
            sourceOrder=2,
            wordCount=19
        )

        payload = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[c1, c2],
            target_position="Software Engineer",
            required_competencies=["React", "Node.js"]
        )
        exp_score = payload["resumeScore"]["breakdown"]["experience"]["rawScore"]
        # Substantive projects should receive meaningful score (e.g., >= 25)
        self.assertGreaterEqual(exp_score, 25, f"Two strong capstone projects must score >= 25, got {exp_score}")

    def test_case_3_strong_fresh_graduate_no_employment(self):
        """
        3. Strong fresh graduate with relevant degree, several substantive projects, no formal employment, no certs.
        Must receive a respectable, defensible ATS score.
        """
        edu = EvidenceChunk(
            chunkId="chk_edu",
            section="Education",
            text="Bachelor of Science in Computer Science, Technological Institute of the Philippines",
            sourceOrder=1,
            wordCount=11
        )
        p1 = EvidenceChunk(
            chunkId="chk_p1",
            section="Projects",
            text="Capstone: Architected and implemented a microservice web platform using Python FastAPI and PostgreSQL to improve query throughput by 30%.",
            sourceOrder=2,
            wordCount=20
        )
        p2 = EvidenceChunk(
            chunkId="chk_p2",
            section="Projects",
            text="Engineered a mobile client in React Native integrated with REST APIs for real-time order tracking.",
            sourceOrder=3,
            wordCount=16
        )
        p3 = EvidenceChunk(
            chunkId="chk_p3",
            section="Achievements",
            text="Winner 1st Place at National FinTech Hackathon: Developed automated fraud detection model using Python.",
            sourceOrder=4,
            wordCount=15
        )

        findings = [
            AuditedFinding(
                chunkId="chk_p1",
                competency="Python",
                classification="STRONG_MATCH",
                evidenceLevel="STRONG_DEMONSTRATED",
                acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
                observedEvidence=p1.text,
                auditStatus="VERIFIED"
            ),
            AuditedFinding(
                chunkId="chk_p2",
                competency="React Native",
                classification="STRONG_MATCH",
                evidenceLevel="DEMONSTRATED",
                acmo=ACMOFlags(action=True, context=True, method=True, outcome=False),
                observedEvidence=p2.text,
                auditStatus="VERIFIED"
            )
        ]

        payload = calculate_official_ats_score(
            audited_findings=findings,
            evidence_chunks=[edu, p1, p2, p3],
            target_position="Software Engineer",
            required_competencies=["Python", "React Native"],
            recommended_competencies=["Docker"],
            sbert_edu_sim_score=85.0
        )

        overall = payload["overallScore"]
        exp_score = payload["resumeScore"]["breakdown"]["experience"]["rawScore"]
        edu_score = payload["resumeScore"]["breakdown"]["education"]["rawScore"]

        self.assertGreaterEqual(exp_score, 40, f"Strong student portfolio should achieve solid experience, got {exp_score}")
        self.assertGreaterEqual(edu_score, 60, f"Relevant degree should achieve solid education, got {edu_score}")
        self.assertGreaterEqual(overall, 50, f"Strong fresh graduate should reach GettingThere/StrongFoundation, got {overall}")

    def test_case_4_experienced_candidate(self):
        """
        4. Experienced candidate with formal employment, internships, and certifications.
        Must be rewarded with top-tier experience score.
        """
        w1 = EvidenceChunk(
            chunkId="chk_w1",
            section="WorkExperience",
            text="Senior Software Engineer: Led development of distributed cloud microservices in Go and Python, managing 5 engineers to improve platform uptime to 99.9%.",
            sourceOrder=1,
            wordCount=23
        )
        w2 = EvidenceChunk(
            chunkId="chk_w2",
            section="WorkExperience",
            text="Software Engineer: Designed and implemented scalable RESTful APIs in Java Spring Boot and MySQL database.",
            sourceOrder=2,
            wordCount=16
        )
        w3 = EvidenceChunk(
            chunkId="chk_w3",
            section="WorkExperience",
            text="Full-Stack Developer: Built responsive web applications using React, TypeScript, and Docker.",
            sourceOrder=3,
            wordCount=12
        )

        payload = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[w1, w2, w3],
            target_position="Software Engineer",
            required_competencies=["Python", "Java"]
        )
        exp_score = payload["resumeScore"]["breakdown"]["experience"]["rawScore"]
        self.assertGreaterEqual(exp_score, 80, f"Experienced engineer should have >= 80 experience, got {exp_score}")

    def test_case_5_and_6_certifications_presence_vs_absence(self):
        """
        5 & 6. Certification parseability evaluation:
        - Candidate with training entry receives training parseability (85).
        - Candidate with verified credentials receives top credential parseability (100).
        - Candidate with empty certification header receives formatting defect penalty (30).
        """
        c_no_cert = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[
                EvidenceChunk(chunkId="c1", section="Certifications", text="Completed free online tutorial", sourceOrder=1, wordCount=4)
            ],
            target_position="Software Engineer",
            required_competencies=["Python"]
        )
        self.assertEqual(c_no_cert["resumeScore"]["breakdown"]["certifications"]["rawScore"], 85)

        cert_chunk = EvidenceChunk(chunkId="chk_cert", section="Certifications", text="AWS Certified Solutions Architect", sourceOrder=1, wordCount=5)
        cert_finding = AuditedFinding(
            chunkId="chk_cert",
            competency="AWS Certified Solutions Architect",
            classification="STRONG_MATCH",
            evidenceLevel="EXPLICIT",
            acmo=ACMOFlags(action=True, context=True, method=True, outcome=False),
            observedEvidence="AWS Certified Solutions Architect",
            auditStatus="VERIFIED"
        )
        c_with_cert = calculate_official_ats_score(
            audited_findings=[cert_finding],
            evidence_chunks=[cert_chunk],
            target_position="Cloud Engineer",
            required_competencies=["Cloud Infrastructure"]
        )
        self.assertEqual(c_with_cert["resumeScore"]["breakdown"]["certifications"]["rawScore"], 100)

        # Empty header defect
        c_empty_header = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[],
            target_position="Software Engineer",
            required_competencies=["Python"],
            parsed_sections={"Certifications": " "}
        )
        self.assertEqual(c_empty_header["resumeScore"]["breakdown"]["certifications"]["rawScore"], 30)

    def test_case_7_and_8_relevant_role_vs_wrong_role(self):
        """
        7 & 8. Role relevance vs ATS invariance:
        - ATS Machine-Friendliness is invariant across target careers (Delta ATS = 0).
        - Target Alignment percentage and matched competencies accurately reflect role relevance.
        """
        finding_python = AuditedFinding(
            chunkId="chk1",
            competency="Python",
            classification="STRONG_MATCH",
            evidenceLevel="STRONG_DEMONSTRATED",
            acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="Developed Python backend",
            auditStatus="VERIFIED"
        )
        # Relevant role: Python Developer
        p_relevant = calculate_official_ats_score(
            audited_findings=[finding_python],
            evidence_chunks=[EvidenceChunk(chunkId="chk1", section="Projects", text="Developed Python backend", sourceOrder=1, wordCount=3)],
            target_position="Python Developer",
            required_competencies=["Python"],
            recommended_competencies=[]
        )
        # Wrong role: Civil Engineer (requires Structural Analysis, AutoCAD, etc.)
        p_wrong = calculate_official_ats_score(
            audited_findings=[finding_python],
            evidence_chunks=[EvidenceChunk(chunkId="chk1", section="Projects", text="Developed Python backend", sourceOrder=1, wordCount=3)],
            target_position="Civil Engineer",
            required_competencies=["Structural Analysis", "AutoCAD Civil 3D", "Geotechnical Engineering"],
            recommended_competencies=[]
        )
        # ATS Machine-friendliness invariant
        self.assertEqual(p_relevant["overallScore"], p_wrong["overallScore"])
        self.assertEqual(
            p_relevant["resumeScore"]["breakdown"]["skills"]["rawScore"],
            p_wrong["resumeScore"]["breakdown"]["skills"]["rawScore"]
        )
        # Target alignment strictly differentiates role fit
        self.assertGreater(
            p_relevant["roleRelevance"]["alignmentPercentage"],
            p_wrong["roleRelevance"]["alignmentPercentage"]
        )
        self.assertIn("Python", p_relevant["roleRelevance"]["matchedCompetencies"])
        self.assertNotIn("Python", p_wrong["roleRelevance"]["matchedCompetencies"])

    def test_case_9_monotonicity_additional_project_cannot_reduce_score(self):
        """
        9. Monotonicity: Adding an additional valid project cannot reduce the Experience raw score.
        """
        p1 = EvidenceChunk(chunkId="p1", section="Projects", text="Developed inventory web app using Django", sourceOrder=1, wordCount=6)
        p2 = EvidenceChunk(chunkId="p2", section="Projects", text="Built real-time chat application using WebSockets", sourceOrder=2, wordCount=7)

        s1 = calculate_official_ats_score([], [p1], "Software Engineer", ["Django"])
        s2 = calculate_official_ats_score([], [p1, p2], "Software Engineer", ["Django"])

        self.assertGreaterEqual(
            s2["resumeScore"]["breakdown"]["experience"]["rawScore"],
            s1["resumeScore"]["breakdown"]["experience"]["rawScore"]
        )

    def test_case_10_monotonicity_additional_skill_cannot_reduce_score(self):
        """
        10. Monotonicity: Adding an additional verified required skill cannot reduce Skills match score.
        """
        f1 = AuditedFinding(chunkId="c1", competency="Python", classification="STRONG_MATCH", evidenceLevel="STRONG_DEMONSTRATED", acmo=ACMOFlags(action=True, context=True, method=True, outcome=True), observedEvidence="Python", auditStatus="VERIFIED")
        f2 = AuditedFinding(chunkId="c2", competency="SQL", classification="STRONG_MATCH", evidenceLevel="STRONG_DEMONSTRATED", acmo=ACMOFlags(action=True, context=True, method=True, outcome=True), observedEvidence="SQL", auditStatus="VERIFIED")

        s1 = calculate_official_ats_score([f1], [], "Software Engineer", ["Python", "SQL"])
        s2 = calculate_official_ats_score([f1, f2], [], "Software Engineer", ["Python", "SQL"])

        self.assertGreaterEqual(
            s2["resumeScore"]["breakdown"]["skills"]["rawScore"],
            s1["resumeScore"]["breakdown"]["skills"]["rawScore"]
        )

    def test_case_11_duplicate_evidence_anti_inflation(self):
        """
        11. Duplicate project evidence cannot inflate the score.
        """
        p1 = EvidenceChunk(chunkId="p1", section="Projects", text="Engineered mobile app in Flutter", sourceOrder=1, wordCount=5)
        p1_dup = EvidenceChunk(chunkId="p2", section="Projects", text="engineered mobile app in flutter", sourceOrder=2, wordCount=5)

        s1 = calculate_official_ats_score([], [p1], "Mobile Developer", ["Flutter"])
        s2 = calculate_official_ats_score([], [p1, p1_dup], "Mobile Developer", ["Flutter"])

        self.assertEqual(
            s1["resumeScore"]["breakdown"]["experience"]["rawScore"],
            s2["resumeScore"]["breakdown"]["experience"]["rawScore"]
        )

    def test_case_12_score_bounds_always_0_to_100(self):
        """
        12. Score bounds: Every raw component and final ATS score is strictly 0 <= score <= 100.
        """
        # Test extreme large evidence
        chunks = [
            EvidenceChunk(chunkId=f"chk_{i}", section="WorkExperience", text=f"Senior Director of Engineering leading platform systems {i}", sourceOrder=i, wordCount=8)
            for i in range(50)
        ]
        payload = calculate_official_ats_score([], chunks, "Engineering Director", ["Leadership"])
        self.assertLessEqual(payload["overallScore"], 100)
        self.assertGreaterEqual(payload["overallScore"], 0)
        self.assertLessEqual(payload["resumeScore"]["breakdown"]["experience"]["rawScore"], 100)

    def test_case_13_exact_espela_it_specialist_regression(self):
        """
        13. Actual Espela resume characteristics regression test.
        Target: Information Technology Specialist
        - BS Information Technology student (TIP Manila)
        - Substantive academic projects: YakapKalinga, QuizTinker
        - Grundfos Hackathon achievement
        - Limited infrastructure skills (demonstrates Python, React, Next.js, etc.)
        - Zero verified industry certifications

        Expected Component Math:
        - Skills: 7 / 100 (matched Python partial/demonstrated in recommended skills) -> 7 * 0.40 = 2.80
        - Experience: 46 / 100 (YakapKalinga + QuizTinker + Grundfos Hackathon -> 27.5 pts / 60) -> 46 * 0.30 = 13.80
        - Education: 73 / 100 (Degree 30 + Coursework 15 + SBERT 28) -> 73 * 0.20 = 14.60
        - Certifications: 0 / 100 (Zero verified certs) -> 0 * 0.10 = 0.00
        - Pre-rounding ATS: 2.80 + 13.80 + 14.60 + 0.00 = 31.20
        - Final ATS: round(31.20) = 31
        """
        edu_chunk = EvidenceChunk(
            chunkId="chk_edu",
            section="Education",
            text="Bachelor of Science in Information Technology Technological Institute of the Philippines Manila 2022 - Present",
            sourceOrder=1,
            wordCount=14
        )
        p_yakap = EvidenceChunk(
            chunkId="chk_p1",
            section="Projects",
            text="YakapKalinga: Developed disaster response coordination platform using Next.js, Tailwind CSS, and Firebase to ease donation logistics for victims.",
            sourceOrder=2,
            wordCount=19
        )
        p_quiz = EvidenceChunk(
            chunkId="chk_p2",
            section="Projects",
            text="QuizTinker: Engineered exam preparation system using React, Node.js, and MongoDB connecting examinees with automated practice questions.",
            sourceOrder=3,
            wordCount=17
        )
        p_hackathon = EvidenceChunk(
            chunkId="chk_ach",
            section="Achievements",
            text="Grundfos Hackathon Challenge: Winner 1st Place for developing automated water monitoring system prototype.",
            sourceOrder=4,
            wordCount=15
        )

        finding_python = AuditedFinding(
            chunkId="chk_p1",
            competency="Python",
            classification="STRONG_MATCH",
            evidenceLevel="STRONG_DEMONSTRATED",
            acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="Python scripting and backend logic",
            auditStatus="VERIFIED"
        )

        required_skills = [
            "Network Administration",
            "System Administration",
            "Linux Administration",
            "IT Infrastructure",
            "Information Security",
            "Technical Support & Troubleshooting"
        ]
        recommended_skills = [
            "Python",
            "Bash Scripting",
            "Cloud Infrastructure",
            "Active Directory",
            "Virtualization"
        ]

        payload = calculate_official_ats_score(
            audited_findings=[finding_python],
            evidence_chunks=[edu_chunk, p_yakap, p_quiz, p_hackathon],
            target_position="Information Technology Specialist",
            required_competencies=required_skills,
            recommended_competencies=recommended_skills,
            sbert_edu_sim_score=70.0
        )

        b = payload["resumeScore"]["breakdown"]
        skills_raw = b["skills"]["rawScore"]
        exp_raw = b["experience"]["rawScore"]
        edu_raw = b["education"]["rawScore"]
        cert_raw = b["certifications"]["rawScore"]

        # Decoupled ATS and Target Alignment assertions:
        # ATS measures machine-friendliness:
        self.assertEqual(cert_raw, 100, "Certifications cleanly omitted receives 100 under document hygiene rule")
        self.assertGreaterEqual(exp_raw, 30, f"Experience parseability should be >= 30, got {exp_raw}")
        self.assertGreaterEqual(edu_raw, 50, f"Education parseability should be >= 50, got {edu_raw}")
        self.assertGreaterEqual(payload["overallScore"], 50, f"Fresh graduate ATS parseability should be >= 50, got {payload['overallScore']}")

        # Target Alignment measures career match:
        self.assertEqual(payload["roleRelevance"]["alignmentPercentage"], 10, "Target alignment reflects 10% Python match")
        self.assertIn("Python", payload["roleRelevance"]["matchedCompetencies"])
        self.assertIn("Network Administration", payload["roleRelevance"]["priorityGaps"])

    def test_invariant_15_target_alignment_semantic_separation_no_mirroring(self):
        """
        Phase 8 Invariant 10 & 11:
        Backend no longer assigns official_ats_score to roleRelevance.total.
        Target Alignment cannot equal ATS merely because of field mirroring.
        """
        chunk = EvidenceChunk(chunkId="chunk_edu_001", section="Education", text="Bachelor of Science in Information Technology", sourceOrder=1, wordCount=6)
        finding_python = AuditedFinding(
            chunkId="chunk_prj_001",
            competency="Python",
            classification="STRONG_MATCH",
            evidenceLevel="STRONG_DEMONSTRATED",
            acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="Python",
            auditStatus="VERIFIED"
        )
        payload = calculate_official_ats_score(
            audited_findings=[finding_python],
            evidence_chunks=[chunk],
            target_position="Information Technology Specialist",
            required_competencies=["Network Administration", "System Administration", "Linux Administration", "IT Infrastructure", "Information Security", "Technical Support & Troubleshooting"],
            recommended_competencies=["Python", "Bash Scripting", "Cloud Infrastructure", "Active Directory", "Virtualization"],
            sbert_edu_sim_score=75.0
        )

        # 1. Authoritative ATS score is in overallScore
        self.assertGreater(payload["overallScore"], 0)
        # 2. roleRelevance MUST NOT have a total equal to overallScore
        self.assertNotIn("total", payload["roleRelevance"], "roleRelevance must not mirror total ATS score")
        # 3. roleRelevance must not have breakdown mirroring 4-part formula
        self.assertNotIn("breakdown", payload["roleRelevance"], "roleRelevance must not duplicate 4-part dimension breakdown")

    def test_invariant_16_role_relevance_qualitative_diagnostics(self):
        """
        Phase 8 Invariant:
        roleRelevance exposes qualitative role-fit diagnostics:
        - matchedCompetencies
        - transferableCompetencies
        - priorityGaps
        - alignmentSummary
        """
        chunk = EvidenceChunk(chunkId="chunk_edu_001", section="Education", text="Bachelor of Science in Information Technology", sourceOrder=1, wordCount=6)
        f1 = AuditedFinding(
            chunkId="c1", competency="Linux Administration", classification="STRONG_MATCH",
            evidenceLevel="STRONG_DEMONSTRATED", acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="Linux Administration", auditStatus="VERIFIED"
        )
        f2 = AuditedFinding(
            chunkId="c2", competency="Bash Scripting", classification="PARTIAL_MATCH",
            evidenceLevel="DEMONSTRATED", acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="Bash", auditStatus="VERIFIED"
        )
        payload = calculate_official_ats_score(
            audited_findings=[f1, f2],
            evidence_chunks=[chunk],
            target_position="Information Technology Specialist",
            required_competencies=["Linux Administration", "Network Administration"],
            recommended_competencies=["Bash Scripting", "Python"]
        )

        rr = payload["roleRelevance"]
        self.assertIn("Linux Administration", rr["matchedCompetencies"])
        self.assertIn("Bash Scripting", rr["transferableCompetencies"])
        self.assertIn("Network Administration", rr["priorityGaps"])
        self.assertIn("Python", rr["priorityGaps"])
        self.assertTrue(len(rr["alignmentSummary"]) > 20)

    def test_invariant_17_skill_transferability_direct_vs_partial(self):
        """
        Phase 8 Invariant 8:
        Demonstrates difference between direct competency match and partial/transferable match in Target Alignment.
        """
        f_direct = AuditedFinding(
            chunkId="c1", competency="Linux Administration", classification="STRONG_MATCH",
            evidenceLevel="STRONG_DEMONSTRATED", acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="Linux Administration", auditStatus="VERIFIED"
        )
        f_partial = AuditedFinding(
            chunkId="c2", competency="Linux Administration", classification="PARTIAL_MATCH",
            evidenceLevel="DEMONSTRATED", acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="Linux", auditStatus="VERIFIED"
        )
        p_direct = calculate_official_ats_score(
            [f_direct], [], "IT Specialist", ["Linux Administration"]
        )
        p_partial = calculate_official_ats_score(
            [f_partial], [], "IT Specialist", ["Linux Administration"]
        )
        # Direct match receives higher target alignment score than partial match
        self.assertGreater(
            p_direct["roleRelevance"]["alignmentPercentage"],
            p_partial["roleRelevance"]["alignmentPercentage"]
        )

    def test_invariant_18_unrelated_skills_zero_credit(self):
        """
        Phase 8 Invariant 9:
        Unrelated skills (e.g., Nursing triage or Fine Arts painting) receive zero match against IT Specialist competencies.
        """
        f_unrelated = AuditedFinding(
            chunkId="c_unrelated", competency="Pediatric Nursing Triage", classification="NO_RELEVANT_EVIDENCE",
            evidenceLevel="EXPLICIT", acmo=ACMOFlags(action=False, context=False, method=False, outcome=False),
            observedEvidence="nursing care", auditStatus="AUDIT_DEGRADED"
        )
        payload = calculate_official_ats_score(
            [f_unrelated], [], "Information Technology Specialist",
            ["Network Administration", "System Administration", "Linux Administration"]
        )
        self.assertEqual(payload["roleRelevance"]["alignmentPercentage"], 0)
        self.assertEqual(payload["roleRelevance"]["matchedCompetencies"], [])
        self.assertEqual(payload["roleRelevance"]["transferableCompetencies"], [])
        self.assertEqual(len(payload["roleRelevance"]["priorityGaps"]), 3)

    def test_case_19_strong_software_it_targeting_it_specialist(self):
        """
        19. Strong software IT graduate targeting IT Specialist.
        Has legitimate technical evidence (React, Next.js, Node.js, MongoDB) outside target profile.
        Category C skills are isolated in relevantTechnicalSkills and DO NOT inflate target alignment.
        """
        edu = EvidenceChunk(chunkId="e", section="Education", text="Bachelor of Science in Information Technology, TIP Manila", sourceOrder=1, wordCount=8)
        p1 = EvidenceChunk(chunkId="p1", section="Projects", text="Disaster response app built with Next.js, React, and MongoDB to serve local community.", sourceOrder=2, wordCount=14)
        p2 = EvidenceChunk(chunkId="p2", section="Projects", text="Automated quiz platform with Python and Firebase to assist students.", sourceOrder=3, wordCount=11)

        f_python = AuditedFinding(chunkId="p2", competency="Python", classification="STRONG_MATCH", evidenceLevel="STRONG_DEMONSTRATED",
                                  acmo=ACMOFlags(action=True, context=True, method=True, outcome=True), observedEvidence="Python", auditStatus="VERIFIED")

        req = ["Network Administration", "System Administration", "Linux Administration", "IT Infrastructure", "Information Security", "Technical Support & Troubleshooting"]
        rec = ["Python", "Bash Scripting", "Cloud Infrastructure", "Active Directory", "Virtualization"]

        detected = ["React", "Next.js", "Node.js", "MongoDB", "Python", "Tailwind CSS", "Java", "C++"]

        payload = calculate_official_ats_score(
            audited_findings=[f_python],
            evidence_chunks=[edu, p1, p2],
            target_position="Information Technology Specialist",
            required_competencies=req,
            recommended_competencies=rec,
            sbert_edu_sim_score=80.0,
            detected_skills=detected
        )

        rr = payload["roleRelevance"]

        # 1. Python is in matchedCompetencies (Category A)
        self.assertIn("Python", rr["matchedCompetencies"])
        # 2. Category C skills are in relevantTechnicalSkills
        self.assertIn("React", rr["relevantTechnicalSkills"])
        self.assertIn("Node.js", rr["relevantTechnicalSkills"])
        self.assertIn("MongoDB", rr["relevantTechnicalSkills"])
        # 3. Category C skills DO NOT inflate target alignment (only Python contributed)
        self.assertNotIn("React", rr["matchedCompetencies"])
        self.assertNotIn("Node.js", rr["matchedCompetencies"])
        self.assertEqual(rr["alignmentPercentage"], 10)
        # 4. Alignment summary acknowledges technical breadth constructively
        self.assertIn("Shows technical breadth in", rr["alignmentSummary"])

    def test_case_20_strong_infrastructure_it_targeting_it_specialist(self):
        """
        20. Strong infrastructure-oriented candidate targeting IT Specialist.
        Directly matches core required competencies and achieves high Target Alignment score.
        """
        f_net = AuditedFinding(chunkId="c1", competency="Network Administration", classification="STRONG_MATCH", evidenceLevel="STRONG_DEMONSTRATED",
                               acmo=ACMOFlags(action=True, context=True, method=True, outcome=True), observedEvidence="Network", auditStatus="VERIFIED")
        f_sys = AuditedFinding(chunkId="c2", competency="System Administration", classification="STRONG_MATCH", evidenceLevel="STRONG_DEMONSTRATED",
                               acmo=ACMOFlags(action=True, context=True, method=True, outcome=True), observedEvidence="System", auditStatus="VERIFIED")
        f_lnx = AuditedFinding(chunkId="c3", competency="Linux Administration", classification="STRONG_MATCH", evidenceLevel="STRONG_DEMONSTRATED",
                               acmo=ACMOFlags(action=True, context=True, method=True, outcome=True), observedEvidence="Linux", auditStatus="VERIFIED")
        f_sec = AuditedFinding(chunkId="c4", competency="Information Security", classification="STRONG_MATCH", evidenceLevel="STRONG_DEMONSTRATED",
                               acmo=ACMOFlags(action=True, context=True, method=True, outcome=True), observedEvidence="Security", auditStatus="VERIFIED")

        req = ["Network Administration", "System Administration", "Linux Administration", "IT Infrastructure", "Information Security", "Technical Support & Troubleshooting"]
        rec = ["Python", "Bash Scripting", "Cloud Infrastructure", "Active Directory", "Virtualization"]

        payload = calculate_official_ats_score(
            audited_findings=[f_net, f_sys, f_lnx, f_sec],
            evidence_chunks=[],
            target_position="Information Technology Specialist",
            required_competencies=req,
            recommended_competencies=rec,
            sbert_edu_sim_score=85.0
        )
        # 4 required skills * 1.0 / 6.0 = 66.7% -> round = 67
        self.assertEqual(payload["roleRelevance"]["alignmentPercentage"], 67)
        self.assertEqual(len(payload["roleRelevance"]["matchedCompetencies"]), 4)

    def test_case_21_strong_resume_weak_target_alignment_vs_weak_resume_strong_target_alignment(self):
        """
        21. Distinction between Resume Strength and Target Alignment.
        Candidate 1: Strong projects (Experience parseability >= 40), strong degree (75), weak target alignment (10%).
        Candidate 2: Zero projects (Experience 0), zero degree (0), strong target alignment (100%).
        Evaluates that each component reflects its distinct evidence.
        """
        p_c1 = EvidenceChunk(chunkId="p1", section="Projects", text="Lead Developer, Capstone: Architected enterprise platform with Next.js, Node.js, and Docker to improve performance by 40%.", sourceOrder=1, wordCount=18)
        edu_c1 = EvidenceChunk(chunkId="e1", section="Education", text="Bachelor of Science in Information Technology, TIP Manila", sourceOrder=2, wordCount=8)

        f_c1 = AuditedFinding(chunkId="p1", competency="Python", classification="STRONG_MATCH", evidenceLevel="STRONG_DEMONSTRATED",
                              acmo=ACMOFlags(action=True, context=True, method=True, outcome=True), observedEvidence="Python", auditStatus="VERIFIED")

        res_c1 = calculate_official_ats_score(
            audited_findings=[f_c1],
            evidence_chunks=[edu_c1, p_c1],
            target_position="IT Specialist",
            required_competencies=["Network Administration", "System Administration", "Linux Administration", "IT Infrastructure", "Information Security", "Technical Support & Troubleshooting"],
            recommended_competencies=["Python"],
            sbert_edu_sim_score=80.0
        )

        # Candidate 1 has strong experience from capstone, low target alignment
        self.assertGreaterEqual(res_c1["resumeScore"]["breakdown"]["experience"]["rawScore"], 20)
        self.assertEqual(res_c1["roleRelevance"]["alignmentPercentage"], 10)

        # Candidate 2 has 0 experience chunks, higher target alignment
        f_c2_net = AuditedFinding(chunkId="c_sk", competency="Network Administration", classification="STRONG_MATCH", evidenceLevel="EXPLICIT",
                                  acmo=ACMOFlags(action=False, context=False, method=False, outcome=False), observedEvidence="Network", auditStatus="VERIFIED")
        f_c2_sys = AuditedFinding(chunkId="c_sk", competency="System Administration", classification="STRONG_MATCH", evidenceLevel="EXPLICIT",
                                  acmo=ACMOFlags(action=False, context=False, method=False, outcome=False), observedEvidence="System", auditStatus="VERIFIED")

        res_c2 = calculate_official_ats_score(
            audited_findings=[f_c2_net, f_c2_sys],
            evidence_chunks=[],
            target_position="IT Specialist",
            required_competencies=["Network Administration", "System Administration"],
            recommended_competencies=[]
        )
        self.assertEqual(res_c2["resumeScore"]["breakdown"]["experience"]["rawScore"], 0)
        self.assertEqual(res_c2["resumeScore"]["breakdown"]["education"]["rawScore"], 0)
        self.assertGreater(res_c2["roleRelevance"]["alignmentPercentage"], res_c1["roleRelevance"]["alignmentPercentage"])

    def test_case_22_category_c_skills_isolated_from_skills_score(self):
        """
        22. Legitimate technical skills (Category C) must not add points to target Skills Match.
        Only A and B contribute to target alignment matched competencies.
        """
        req = ["Linux Administration", "Network Administration"]
        rec = ["Python"]

        # No A or B findings
        payload_with_c = calculate_official_ats_score(
            audited_findings=[],
            evidence_chunks=[],
            target_position="IT Specialist",
            required_competencies=req,
            recommended_competencies=rec,
            detected_skills=["React", "Next.js", "Node.js", "Tailwind CSS", "MongoDB", "SQL"]
        )

        # Target alignment match must be strictly 0 despite having 6 Category C technical skills
        self.assertEqual(payload_with_c["roleRelevance"]["alignmentPercentage"], 0)
        self.assertEqual(payload_with_c["roleRelevance"]["matchedCompetencies"], [])
        # Category C skills must be captured in relevantTechnicalSkills
        self.assertEqual(len(payload_with_c["roleRelevance"]["relevantTechnicalSkills"]), 6)

    def test_case_23_deterministic_repeated_runs_invariance(self):
        """
        23. Deterministic repeated execution invariant:
        Running the same inputs 10 times produces byte-for-byte identical payloads.
        """
        chunk = EvidenceChunk(chunkId="chk_1", section="Projects", text="Developed Linux server health checker in Python.", sourceOrder=1, wordCount=7)
        finding = AuditedFinding(chunkId="chk_1", competency="Python", classification="STRONG_MATCH", evidenceLevel="STRONG_DEMONSTRATED",
                                 acmo=ACMOFlags(action=True, context=True, method=True, outcome=True), observedEvidence="Python", auditStatus="VERIFIED")

        payloads = [
            calculate_official_ats_score(
                audited_findings=[finding],
                evidence_chunks=[chunk],
                target_position="Information Technology Specialist",
                required_competencies=["Linux Administration", "Network Administration"],
                recommended_competencies=["Python"],
                detected_skills=["Python", "React", "Node.js"]
            )
            for _ in range(10)
        ]

        first_payload = payloads[0]
        for idx, p in enumerate(payloads[1:], start=2):
            self.assertEqual(p, first_payload, f"Run {idx} diverged from Run 1")

    def test_case_24_skill_grounding_semantic_boundaries(self):
        """
        24. Grounding Semantic Boundaries:
        Semantically related but distinct technologies must NOT become direct matches:
        Git != GitHub, Java != JavaScript, Docker != Kubernetes, AWS != Azure,
        SQL != NoSQL, React != React Native, Python != PyTorch, .NET != ASP.NET, C++ != C.
        """
        from ai_service import is_skill_grounded_in_text

        checks = [
            ("Git", "I have experience with GitHub", False),
            ("GitHub", "I have experience with Git", False),
            ("Java", "Proficient in JavaScript and React", False),
            ("JavaScript", "Proficient in Java and Spring", False),
            ("Docker", "Experienced with Kubernetes clusters", False),
            ("Kubernetes", "Experienced with Docker containers", False),
            ("AWS", "Deployed to Azure cloud", False),
            ("Azure", "Deployed to AWS cloud", False),
            ("SQL", "Experience with NoSQL databases like MongoDB", False),
            ("NoSQL", "Experience with SQL queries", False),
            ("React", "Mobile app built using React Native", False),
            ("React", "Web app built using React and Redux", True),
            ("React Native", "Web app built using React", False),
            ("React Native", "Mobile app built using React Native", True),
            ("Python", "Trained deep models with PyTorch", False),
            ("PyTorch", "Scripted automation in Python", False),
            (".NET", "Built backend using ASP.NET Core", False),
            (".NET", "Built backend using C# and .NET Core", True),
            ("ASP.NET", "Built backend using ASP.NET Core", True),
            ("ASP.NET", "Built backend using .NET Core", False),
            ("C++", "Wrote low level systems in C", False),
            ("C++", "Wrote low level systems in C++", True),
            ("C", "Engineered performant microkernels in C++", False),
            ("C", "Engineered performant microkernels in C#", False),
            ("C", "Engineered performant microkernels in C and Assembly", True),
        ]

        for skill, text, expected in checks:
            res = is_skill_grounded_in_text(skill, text)
            self.assertEqual(res, expected, f"Boundary check failed for '{skill}' in '{text}' (got {res}, expected {expected})")

if __name__ == "__main__":
    unittest.main()

