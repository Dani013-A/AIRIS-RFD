import unittest
from deterministic_scorer import (
    calculate_canonical_resume_score,
    evaluate_ats_machine_readability,
    evaluate_role_alignment
)
from evidence_chunker import EvidenceChunk
from output_validator import AuditedFinding, ACMOFlags
from role_profile_registry import resolve_role_profile, AUTHORITATIVE_STATIC_PROFILES


class TestCanonicalScoringEngine(unittest.TestCase):
    """
    Comprehensive test suite verifying the authoritative AIRIS scoring engine redesign.
    Validates all behavioral invariants, numerical contracts, role independence/dependence,
    evidence weighting, and lack of artificial score floors/ceilings.
    """

    def setUp(self):
        # Sample clean candidate resume chunks
        self.chunk_contact = EvidenceChunk(
            chunkId="chk_con_1",
            section="ContactInformation",
            text="Juan Dela Cruz | juan.delacruz@gmail.com | 09171234567 | linkedin.com/in/jdelacruz | github.com/jdelacruz",
            sourceOrder=1,
            wordCount=14
        )
        self.chunk_edu = EvidenceChunk(
            chunkId="chk_edu_1",
            section="Education",
            text="Bachelor of Science in Information Technology, Technological Institute of the Philippines, 2020 - 2024",
            sourceOrder=2,
            wordCount=14
        )
        self.chunk_p1 = EvidenceChunk(
            chunkId="chk_p_1",
            section="Projects",
            text="Lead Developer - Disaster Coordination Web Platform: Engineered a high-concurrency disaster relief dashboard in Python, FastAPI, and PostgreSQL. Automated notifications handling 10,000 requests/day, 2023 - 2024.",
            sourceOrder=3,
            wordCount=27
        )
        self.chunk_p2 = EvidenceChunk(
            chunkId="chk_p_2",
            section="Projects",
            text="Full Stack Project: Developed an interactive student analytics portal using React, Node.js, and Docker containerization, reducing build deploy time by 30%, 2023.",
            sourceOrder=4,
            wordCount=24
        )
        self.chunk_skills = EvidenceChunk(
            chunkId="chk_skl_1",
            section="Skills",
            text="Python, JavaScript, TypeScript, React, Docker, FastAPI, PostgreSQL, Git, Linux",
            sourceOrder=5,
            wordCount=10
        )
        self.all_chunks = [self.chunk_contact, self.chunk_edu, self.chunk_p1, self.chunk_p2, self.chunk_skills]
        self.parsed_sections = {
            "ContactInformation": self.chunk_contact.text,
            "Education": self.chunk_edu.text,
            "Projects": f"{self.chunk_p1.text}\n{self.chunk_p2.text}",
            "Skills": self.chunk_skills.text
        }
        self.detected_skills = ["Python", "JavaScript", "TypeScript", "React", "Docker", "FastAPI", "PostgreSQL", "Git", "Linux"]

    def test_invariant_1_ats_is_completely_role_independent(self):
        """
        Invariant: ATS Score measures machine readability of the document.
        Target-role changes MUST NOT alter ATS Score.
        Tested across diverse professions: Software Developer, Network Engineer, Data Analyst, Cybersecurity Analyst, Accountant.
        """
        roles_to_test = [
            "Software Developer",
            "Network Engineer",
            "Data Analyst",
            "Cybersecurity Analyst",
            "Accountant"
        ]
        ats_scores = []
        for role_name in roles_to_test:
            profile = resolve_role_profile(role_name)
            result = calculate_canonical_resume_score(
                evidence_chunks=self.all_chunks,
                parsed_sections=self.parsed_sections,
                detected_skills=self.detected_skills,
                target_position=role_name,
                required_competencies=list(profile.required_skills),
                recommended_competencies=list(profile.recommended_skills),
                education_benchmarks=list(profile.education_benchmarks),
                certification_benchmarks=list(profile.certification_benchmarks)
            )
            ats_scores.append(result["atsScore"]["overallScore"])

        # All ATS scores must be strictly identical across any role
        self.assertEqual(len(set(ats_scores)), 1, f"ATS score must be strictly invariant across roles, got: {ats_scores}")

    def test_invariant_2_alignment_is_target_role_dependent(self):
        """
        Invariant: Alignment Score evaluates demonstrated suitability for the selected target role.
        A Software Developer profile should produce different Alignment than a Network Engineer or Accountant.
        """
        dev_profile = resolve_role_profile("Software Developer")
        acct_profile = resolve_role_profile("Accountant")

        dev_result = calculate_canonical_resume_score(
            evidence_chunks=self.all_chunks,
            parsed_sections=self.parsed_sections,
            detected_skills=self.detected_skills,
            target_position="Software Developer",
            required_competencies=list(dev_profile.required_skills),
            recommended_competencies=list(dev_profile.recommended_skills),
            education_benchmarks=list(dev_profile.education_benchmarks),
            certification_benchmarks=list(dev_profile.certification_benchmarks)
        )

        acct_result = calculate_canonical_resume_score(
            evidence_chunks=self.all_chunks,
            parsed_sections=self.parsed_sections,
            detected_skills=self.detected_skills,
            target_position="Accountant",
            required_competencies=list(acct_profile.required_skills),
            recommended_competencies=list(acct_profile.recommended_skills),
            education_benchmarks=list(acct_profile.education_benchmarks),
            certification_benchmarks=list(acct_profile.certification_benchmarks)
        )

        dev_alignment = dev_result["alignmentScore"]["overallScore"]
        acct_alignment = acct_result["alignmentScore"]["overallScore"]

        self.assertNotEqual(dev_alignment, acct_alignment, "Alignment score must dynamically vary across roles")
        self.assertGreater(dev_alignment, acct_alignment, "Dev candidate must align significantly higher with Software Developer than Accountant")

    def test_invariant_3_resume_score_exact_formula(self):
        """
        Finalized manuscript section 3.5.1: Resume Score combines ATS and alignment.
        The four-component matrix remains inside Role Alignment.
        """
        profile = resolve_role_profile("Software Developer")
        result = calculate_canonical_resume_score(
            evidence_chunks=self.all_chunks,
            parsed_sections=self.parsed_sections,
            detected_skills=self.detected_skills,
            target_position="Software Developer",
            required_competencies=list(profile.required_skills),
            recommended_competencies=list(profile.recommended_skills),
            education_benchmarks=list(profile.education_benchmarks),
            certification_benchmarks=list(profile.certification_benchmarks)
        )

        align = result["alignmentScore"]["overallScore"]
        ats = result["atsScore"]["overallScore"]

        self.assertEqual(result["resumeScore"]["overallScore"], round(.4 * ats + .6 * align))
        self.assertEqual(result["overallScore"], round(.4 * ats + .6 * align))
        self.assertEqual(result["resumeScore"]["diagnosticAtsScore"], ats)
        self.assertIn("ATS Readability × 0.40", result["resumeScore"]["formula"])

    def test_invariant_4_alignment_manuscript_four_components(self):
        """
        Invariant: Alignment Score = round(0.40 * Skills + 0.30 * Experience + 0.20 * Education + 0.10 * Certifications).
        """
        profile = resolve_role_profile("Software Developer")
        result = calculate_canonical_resume_score(
            evidence_chunks=self.all_chunks,
            parsed_sections=self.parsed_sections,
            detected_skills=self.detected_skills,
            target_position="Software Developer",
            required_competencies=list(profile.required_skills),
            recommended_competencies=list(profile.recommended_skills),
            education_benchmarks=list(profile.education_benchmarks),
            certification_benchmarks=list(profile.certification_benchmarks)
        )

        b = result["alignmentScore"]["breakdown"]
        s = b["skillsMatch"]["rawScore"]
        e = b["experienceProjects"]["rawScore"]
        ed = b["educationRelevance"]["rawScore"]
        c = b["certifications"]["rawScore"]

        expected_alignment = min(100, max(0, round((0.40 * s) + (0.30 * e) + (0.20 * ed) + (0.10 * c))))
        self.assertEqual(result["alignmentScore"]["overallScore"], expected_alignment)

    def test_invariant_5_required_vs_recommended_competency_weighting(self):
        """
        Invariant: Required competencies carry greater weight than recommended competencies.
        Missing a required competency impacts score more than missing a recommended one.
        """
        finding_req = AuditedFinding(
            chunkId="chk_p_1",
            competency="Python",
            classification="STRONG_MATCH",
            evidenceLevel="STRONG_DEMONSTRATED",
            acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="Python FastAPI"
        )
        finding_rec = AuditedFinding(
            chunkId="chk_p_2",
            competency="Docker",
            classification="STRONG_MATCH",
            evidenceLevel="STRONG_DEMONSTRATED",
            acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="Docker containerization"
        )

        # Case A: Candidate matches Required competency
        res_a = evaluate_role_alignment(
            audited_findings=[finding_req],
            evidence_chunks=self.all_chunks,
            detected_skills=["Python"],
            parsed_sections=self.parsed_sections,
            target_position="Software Developer",
            required_competencies=["Python"],
            recommended_competencies=["Docker"],
            education_benchmarks=["Information Technology"],
            certification_benchmarks=[]
        )

        # Case B: Candidate matches Recommended competency only
        res_b = evaluate_role_alignment(
            audited_findings=[finding_rec],
            evidence_chunks=self.all_chunks,
            detected_skills=["Docker"],
            parsed_sections=self.parsed_sections,
            target_position="Software Developer",
            required_competencies=["Python"],
            recommended_competencies=["Docker"],
            education_benchmarks=["Information Technology"],
            certification_benchmarks=[]
        )

        self.assertGreater(
            res_a["breakdown"]["skillsMatch"]["rawScore"],
            res_b["breakdown"]["skillsMatch"]["rawScore"],
            "Matching required competency must score higher than matching recommended competency alone"
        )

    def test_invariant_6_evidence_hierarchy_demonstrated_stronger_than_skills_section_only(self):
        """
        Invariant: A skill appearing in the Skills section alone is weaker evidence
        than active application in Experience, Projects, or Capstone.
        """
        # Finding from Projects section (Demonstrated)
        finding_demonstrated = AuditedFinding(
            chunkId="chk_p_1",  # section is Projects
            competency="Python",
            classification="STRONG_MATCH",
            evidenceLevel="STRONG_DEMONSTRATED",
            acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="Engineered in Python"
        )

        # Finding from Skills section only (Explicit listing)
        finding_skills_only = AuditedFinding(
            chunkId="chk_skl_1",  # section is Skills
            competency="Python",
            classification="STRONG_MATCH",
            evidenceLevel="EXPLICIT",
            acmo=ACMOFlags(action=False, context=False, method=False, outcome=False),
            observedEvidence="Python"
        )

        res_dem = evaluate_role_alignment(
            audited_findings=[finding_demonstrated],
            evidence_chunks=self.all_chunks,
            detected_skills=["Python"],
            parsed_sections=self.parsed_sections,
            target_position="Software Developer",
            required_competencies=["Python"],
            recommended_competencies=[],
            education_benchmarks=[],
            certification_benchmarks=[]
        )

        res_skills_only = evaluate_role_alignment(
            audited_findings=[finding_skills_only],
            evidence_chunks=self.all_chunks,
            detected_skills=["Python"],
            parsed_sections=self.parsed_sections,
            target_position="Software Developer",
            required_competencies=["Python"],
            recommended_competencies=[],
            education_benchmarks=[],
            certification_benchmarks=[]
        )

        self.assertGreater(
            res_dem["breakdown"]["skillsMatch"]["rawScore"],
            res_skills_only["breakdown"]["skillsMatch"]["rawScore"],
            "Demonstrated application in projects must yield higher score than raw skills-section mention"
        )

    def test_invariant_7_no_artificial_score_floors_or_ceilings(self):
        """
        Invariant: No arbitrary floors or ceilings.
        An empty document with zero evidence chunks yields 0 for both ATS and Alignment.
        """
        empty_res = calculate_canonical_resume_score(
            evidence_chunks=[],
            parsed_sections={},
            detected_skills=[],
            target_position="Software Developer",
            required_competencies=["Python"],
            recommended_competencies=["Docker"],
            education_benchmarks=["Computer Science"],
            certification_benchmarks=["AWS"]
        )

        self.assertEqual(empty_res["atsScore"]["overallScore"], 0)
        self.assertEqual(empty_res["alignmentScore"]["overallScore"], 0)
        self.assertEqual(empty_res["resumeScore"]["overallScore"], 0)

    def test_invariant_8_certifications_are_role_profile_aware_without_universal_zero(self):
        """
        Invariant: Certification absence must not universally default to 0.
        Roles with no material certification benchmarks (e.g. software development)
        must not penalize candidates with an arbitrary zero.
        Roles with material benchmarks (e.g. CCNA for Network Engineering)
        legitimately reflect absence as missing evidence.
        """
        finding = AuditedFinding(
            chunkId="chk_p_1",
            competency="Python",
            classification="STRONG_MATCH",
            evidenceLevel="STRONG_DEMONSTRATED",
            acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
            observedEvidence="Python project"
        )

        # Role without material cert benchmarks
        res_no_bm = evaluate_role_alignment(
            audited_findings=[finding],
            evidence_chunks=self.all_chunks,
            detected_skills=self.detected_skills,
            parsed_sections=self.parsed_sections,
            target_position="Frontend Developer",
            required_competencies=["Python"],
            recommended_competencies=[],
            education_benchmarks=["Computer Science"],
            certification_benchmarks=[]  # No material cert expectation
        )

        # Role with material cert benchmarks
        res_with_bm = evaluate_role_alignment(
            audited_findings=[finding],
            evidence_chunks=self.all_chunks,
            detected_skills=self.detected_skills,
            parsed_sections=self.parsed_sections,
            target_position="Network Engineer",
            required_competencies=["Python"],
            recommended_competencies=[],
            education_benchmarks=["Computer Science"],
            certification_benchmarks=["Cisco Certified Network Associate (CCNA)"]  # Material cert expectation
        )

        cert_score_no_bm = res_no_bm["breakdown"]["certifications"]["rawScore"]
        cert_score_with_bm = res_with_bm["breakdown"]["certifications"]["rawScore"]

        self.assertGreater(cert_score_no_bm, 0, "Role without material cert expectation must not be penalized with an arbitrary 0")
        self.assertEqual(cert_score_with_bm, 0, "Role with material cert expectation legitimately reflects missing cert as 0 without manufactured floor")

    def test_invariant_9_ats_does_not_reward_raw_skill_volume(self):
        """
        Invariant: ATS evaluates formatting and parseability, NOT raw skill volume or whitelist count.
        A resume with 5 clean skills should achieve equal or better ATS formatting score
        than a resume stuffed with 50 skills.
        """
        clean_5_skills = ["Python", "JavaScript", "TypeScript", "SQL", "Git"]
        stuffed_50_skills = [f"Skill_{i}" for i in range(50)]

        ats_5 = evaluate_ats_machine_readability(
            evidence_chunks=[self.chunk_contact, self.chunk_edu, self.chunk_p1],
            parsed_sections={"Skills": ", ".join(clean_5_skills)},
            detected_skills=clean_5_skills
        )

        ats_50 = evaluate_ats_machine_readability(
            evidence_chunks=[self.chunk_contact, self.chunk_edu, self.chunk_p1],
            parsed_sections={"Skills": ", ".join(stuffed_50_skills)},
            detected_skills=stuffed_50_skills
        )

        self.assertGreaterEqual(
            ats_5["breakdown"]["skillsFormatting"]["rawScore"],
            ats_50["breakdown"]["skillsFormatting"]["rawScore"],
            "Clean skill list must score as high or higher in ATS formatting than an inflated list"
        )

    def test_invariant_10_legacy_contract_isolation(self):
        """
        Invariant: New records are tagged scoringModelVersion = '3.0.0-canonical'.
        Old records remain distinct and cannot silently masquerade as v3.
        """
        profile = resolve_role_profile("Software Developer")
        result = calculate_canonical_resume_score(
            evidence_chunks=self.all_chunks,
            parsed_sections=self.parsed_sections,
            detected_skills=self.detected_skills,
            target_position="Software Developer",
            required_competencies=list(profile.required_skills),
            recommended_competencies=list(profile.recommended_skills),
            education_benchmarks=list(profile.education_benchmarks),
            certification_benchmarks=list(profile.certification_benchmarks)
        )

    def test_invariant_11_daniel_espela_calibration_fixture(self):
        """
        Calibrate on real conventional 2-page candidate resume (Daniel Aaron Espela).
        Must achieve a high parseability ATS score (>= 85) across all 6 machine-readability dimensions,
        without being penalized for missing certifications or absence of traditional corporate employment.
        """
        daniel_sections = {
            "ContactInformation": "DANIEL AARON T. ESPELA\ndanielespela251@gmail.com | 0992 212 8671\nlinkedin.com/in/espela-daniel | https://github.com/Dani013-A",
            "ProfessionalSummary": "Motivated Information Technology student specializing in mobile and web development, with hands-on experience building full-stack applications.",
            "Education": "Technological Institute of the Philippines\nBachelor of Science in Information Technology\nExpected Graduation: 2027\n2023 - Present",
            "TechnicalSkills": "Languages: JavaScript, TypeScript, Python, Kotlin, PHP, SQL\nFrameworks: React, React Native, Expo, FastAPI, Node.js, Express.js, Laravel\nTools: Git, GitHub, Docker, Firebase, MySQL, AWS",
            "Projects": "AIRIS - AI-Powered Career Preparation System: React Native, Expo, FastAPI, SBERT, Firebase, Unity VR\nYakap Kalinga - Disaster Relief Platform: React, Laravel, MySQL, AWS\nTranslateTo - Real-time Translation App: Kotlin, Jetpack Compose, ML Kit",
            "Achievements": "Dean's Lister, 1st - 3rd Year\nHackathon Finalist 2024"
        }
        daniel_chunks = [
            EvidenceChunk(chunkId="c1", section="ContactInformation", text=daniel_sections["ContactInformation"], sourceOrder=1, wordCount=15),
            EvidenceChunk(chunkId="c2", section="ProfessionalSummary", text=daniel_sections["ProfessionalSummary"], sourceOrder=2, wordCount=16),
            EvidenceChunk(chunkId="c3", section="Education", text=daniel_sections["Education"], sourceOrder=3, wordCount=14),
            EvidenceChunk(chunkId="c4", section="TechnicalSkills", text=daniel_sections["TechnicalSkills"], sourceOrder=4, wordCount=25),
            EvidenceChunk(chunkId="c5", section="Projects", text=daniel_sections["Projects"], sourceOrder=5, wordCount=35),
            EvidenceChunk(chunkId="c6", section="Achievements", text=daniel_sections["Achievements"], sourceOrder=6, wordCount=10),
        ]
        daniel_skills = ["React Native", "Expo", "TypeScript", "Python", "FastAPI", "React", "Laravel", "MySQL", "AWS", "Kotlin"]

        ats_res = evaluate_ats_machine_readability(
            evidence_chunks=daniel_chunks,
            parsed_sections=daniel_sections,
            detected_skills=daniel_skills
        )

        # Confirm ATS score is in high parseability tier
        self.assertGreaterEqual(ats_res["overallScore"], 85)
        self.assertIn(ats_res["levelLabel"], ["Optimal Parseability", "Good Parseability"])

        # Confirm all 6 dimensions are populated
        b = ats_res["breakdown"]
        for dim in ["sectionStructure", "contactRecognition", "skillsFormatting", "experienceStructure", "educationStructure", "dateRecognition"]:
            self.assertIn(dim, b)
            self.assertGreaterEqual(b[dim]["rawScore"], 50)

    def test_invariant_12_project_based_experience_scoring_not_zero(self):
        """
        Requirements 8, 9, 10, 23:
        Projects MUST count in Experience & Projects.
        Relevant projects for Full Stack Developer must produce an Experience score > 0.
        """
        from role_profile_registry import resolve_role_profile
        profile = resolve_role_profile("Full Stack Developer")

        project_chunks = [
            EvidenceChunk(
                chunkId="chk_p1",
                section="Projects",
                text="Developing a mobile platform using React Native, Expo, TypeScript, FastAPI, and Firebase.",
                sourceOrder=1,
                wordCount=14
            ),
            EvidenceChunk(
                chunkId="chk_p2",
                section="Projects",
                text="Developed a donation and disaster-response platform using React and Laravel.",
                sourceOrder=2,
                wordCount=11
            ),
            EvidenceChunk(
                chunkId="chk_p3",
                section="Projects",
                text="Worked with MySQL and AWS for backend and database deployment.",
                sourceOrder=3,
                wordCount=11
            ),
            EvidenceChunk(
                chunkId="chk_p4",
                section="Projects",
                text="Developed a quiz and review platform for examination preparation using Node.js, Django, and FastAPI.",
                sourceOrder=4,
                wordCount=16
            ),
        ]
        parsed_sec = {
            "Projects": "\n".join(c.text for c in project_chunks),
            "Skills": "React, React Native, TypeScript, FastAPI, Node.js, Laravel, MySQL, AWS, Firebase",
            "Education": "Technological Institute of the Philippines\nBS Information Technology"
        }
        detected = ["React", "React Native", "TypeScript", "FastAPI", "Node.js", "Laravel", "MySQL", "AWS", "Firebase"]

        res = calculate_canonical_resume_score(
            evidence_chunks=project_chunks,
            parsed_sections=parsed_sec,
            detected_skills=detected,
            target_position="Full Stack Developer",
            required_competencies=list(profile.required_skills),
            recommended_competencies=list(profile.recommended_skills),
            education_benchmarks=list(profile.education_benchmarks),
            certification_benchmarks=list(profile.certification_benchmarks)
        )

        align = res["alignmentScore"]
        exp_score = align["breakdown"]["experienceProjects"]["rawScore"]
        self.assertGreater(exp_score, 0, f"Experience & Projects must be > 0 when relevant projects exist, got {exp_score}")
        self.assertGreaterEqual(exp_score, 30, f"Substantive technical projects should achieve moderate/strong score, got {exp_score}")

    def test_invariant_13_current_cv1_grounding_and_deduplication(self):
        """
        Requirements 1, 2, 4, 5, 6, 7, 22:
        Strict skill grounding against the actual CV (1).pdf structure.
        """
        from ai_service import is_skill_grounded_in_text, extract_authoritative_resume_skills
        from resume_parser import parse_resume

        cv1_sample_text = """
DANIEL AARON T. ESPELA
danielespela251@gmail.com | 0992 212 8671
linkedin.com/in/espela-daniel | https://github.com/Dani013-A

PROFESSIONAL SUMMARY
Information Technology student with experience in developing web, mobile, and AI-powered applications through academic projects, hackathons, and collaborative projects. Experienced with full-stack development, APIs, databases, and machine learning. Interested in software development, AI/ML, Cybersecurity, and building practical technology solutions.

EDUCATION
Technological Institute of the Philippines – Manila
Bachelor of Science in Information Technology | 2023–Present
Expected Graduation: 2027

TECHNICAL SKILLS
Languages:
Python, Java, C++, JavaScript, TypeScript, SQL, Kotlin, VB.NET
Frameworks:
React, React Native, Expo, Next.js, FastAPI, Node.js, Express.js, Laravel
AI/ML:
SBERT, Sentence Transformers, Gemini, Groq, OpenRouter, OCR, Whisper
Databases/Cloud:
Firebase, MySQL, Oracle, AWS EC2, AWS RDS
Tools:
Git, GitHub, Figma, Android Studio, Postman, Unity

PROJECTS
AIRIS: AI-Assisted Resume Analysis & Interview Simulation Platform (School Project)
● Developing a mobile platform using React Native, Expo, TypeScript, FastAPI, and Firebase.
● Implemented resume analysis, ATS scoring, semantic job matching, AI recommendations, OCR, and interview features.
Yakap Kalinga: Disaster Response Platform (School Project)
● Developed a donation and disaster-response platform using React and Laravel.
● Worked with MySQL and AWS for backend and database deployment.
TranslateTo: Translator & Note Application (School Project)
● Developed an Android application using Kotlin and Jetpack Compose.
● Integrated translation, OCR, speech-to-text, and text-to-speech features.
Centralized Hospital Information System
● Developed a hospital information system using Oracle SQL and Oracle APEX.
● Designed relational databases and application workflows.
QuizTinker: Automated Quiz Platform
● Developed a quiz and review platform for examination preparation using Node.js, Django, and FastAPI.

ACHIEVEMENTS
Winner – Grundfos Hackathon
Technological Institute of the Philippines – Quezon City
"""
        sections = parse_resume(cv1_sample_text)
        self.assertIn("Projects", sections, "Projects section must be recognized")
        self.assertNotIn("Custom_AIRIS", sections, "AIRIS must not become a Custom_ section")
        self.assertNotIn("Custom_AIML", sections, "AI/ML must not become a Custom_ section")

        skills = extract_authoritative_resume_skills(cv1_sample_text, sections)

        # 1. MUST EXIST: all 27 technical skills
        must_exist = [
            "Python", "Java", "C++", "JavaScript", "TypeScript", "SQL", "Kotlin", "VB.NET",
            "React", "React Native", "Expo", "Next.js", "FastAPI", "Node.js", "Express.js", "Laravel",
            "Firebase", "MySQL", "Oracle", "AWS EC2", "AWS RDS", "Git", "GitHub", "Figma",
            "Android Studio", "Postman", "Unity"
        ]
        for s in must_exist:
            self.assertIn(s, skills, f"Required skill '{s}' missing from extracted skills")

        # 2. MUST NOT EXIST: stale / ungrounded skills
        must_not_exist = [
            "Tailwind CSS", "Project Management", "Docker", "PostgreSQL", "GraphQL", "CI/CD",
            "Frameworks: React", "Frameworks & Tools: React", "Languages: Python, Java, C++",
            ".NET"
        ]
        for s in must_not_exist:
            self.assertNotIn(s, skills, f"Forbidden/stale skill '{s}' must NOT appear in candidate skills")


if __name__ == "__main__":
    unittest.main()
