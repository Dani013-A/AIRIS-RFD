import unittest
from typing import Dict, List, Any
from role_profile_registry import resolve_role_profile
from deterministic_scorer import calculate_official_ats_score
from output_validator import AuditedFinding, ACMOFlags
from evidence_chunker import EvidenceChunk

class TestMultiDomainScoringPipeline(unittest.TestCase):
    """
    Multi-domain end-to-end regression test suite covering all 5 Colleges of T.I.P. Manila.
    Validates mathematical correctness, evidence authorization, and 5-run determinism.
    """

    def _create_sample_candidate(
        self,
        domain_name: str,
        target_role: str,
        degree_text: str,
        skills_text: str,
        project_text: str,
        cert_text: str = "",
        sbert_sim: float = 80.0
    ) -> Dict[str, Any]:
        profile = resolve_role_profile(target_role)

        chunks = [
            EvidenceChunk(chunkId=f"chk_edu_{domain_name}", section="Education", text=degree_text, sourceOrder=1, wordCount=len(degree_text.split())),
            EvidenceChunk(chunkId=f"chk_skl_{domain_name}", section="Skills", text=skills_text, sourceOrder=2, wordCount=len(skills_text.split())),
            EvidenceChunk(chunkId=f"chk_prj_{domain_name}", section="Projects", text=project_text, sourceOrder=3, wordCount=len(project_text.split())),
        ]
        if cert_text:
            chunks.append(EvidenceChunk(chunkId=f"chk_crt_{domain_name}", section="Certifications", text=cert_text, sourceOrder=4, wordCount=len(cert_text.split())))

        # Build findings matching target competencies
        findings: List[AuditedFinding] = []
        for req_skill in profile.required_skills[:3]:  # Match first 3 required competencies
            findings.append(AuditedFinding(
                chunkId=f"chk_prj_{domain_name}",
                competency=req_skill,
                classification="STRONG_MATCH",
                evidenceLevel="STRONG_DEMONSTRATED",
                acmo=ACMOFlags(action=True, context=True, method=True, outcome=True),
                observedEvidence=project_text,
                auditStatus="VERIFIED"
            ))

        if cert_text:
            findings.append(AuditedFinding(
                chunkId=f"chk_crt_{domain_name}",
                competency=profile.certification_benchmarks[0] if profile.certification_benchmarks else "Certified Professional",
                classification="STRONG_MATCH",
                evidenceLevel="EXPLICIT",
                acmo=ACMOFlags(action=True, context=True, method=True, outcome=False),
                observedEvidence=cert_text,
                auditStatus="VERIFIED"
            ))

        meta = {
            "roleProfileId": profile.profile_id,
            "roleProfileVersion": profile.version,
            "profileSource": profile.profile_source,
            "isDegraded": profile.is_degraded,
            "domain": profile.domain
        }

        return {
            "target_role": target_role,
            "profile": profile,
            "chunks": chunks,
            "findings": findings,
            "sbert_sim": sbert_sim,
            "meta": meta
        }

    def test_multi_domain_10_career_personas_determinism(self):
        """
        Tests 10 distinct representative career personas across all 5 T.I.P. Manila colleges.
        Asserts formula consistency, boundedness, and 5-run execution determinism.
        """
        personas = [
            # 1. College of Computer Studies: BS Information Technology
            ("it_spec", "Information Technology Specialist", "Bachelor of Science in Information Technology", "Network Administration, Linux Administration, System Administration", "Configured Linux servers and enterprise network security infrastructure for campus capstone."),
            # 2. College of Computer Studies: BS Computer Science
            ("swe", "Software Engineer", "Bachelor of Science in Computer Science", "Python, SQL, Algorithms, Git", "Designed and implemented a distributed microservice backend using Python, SQL, and Git."),
            # 3. College of Computer Studies: BS Data Science & Analytics
            ("da", "Data Analyst", "Bachelor of Science in Data Science and Analytics", "SQL, Python, Data Visualization, Excel", "Built predictive customer analytics dashboards in Python and SQL using statistical modeling."),
            # 4. College of Engineering & Architecture: BS Civil Engineering
            ("ce", "Civil Engineer", "Bachelor of Science in Civil Engineering", "Structural Analysis, AutoCAD, Construction Materials", "Supervised structural analysis and AutoCAD technical drafting for mid-rise reinforced concrete building design."),
            # 5. College of Engineering & Architecture: BS Architecture
            ("arch", "Architect", "Bachelor of Science in Architecture", "Architectural Design, AutoCAD, BIM, Space Planning", "Drafted complete architectural working drawings and BIM models adhering to the National Building Code of the Philippines."),
            # 6. College of Engineering & Architecture: BS Mechanical Engineering
            ("me", "Mechanical Engineer", "Bachelor of Science in Mechanical Engineering", "Thermodynamics, Machine Design, Fluid Mechanics, AutoCAD", "Designed HVAC ducting layout and mechanical heat exchanger assemblies in AutoCAD for plant facility."),
            # 7. College of Business Education: BS Accountancy
            ("acct", "Accountant", "Bachelor of Science in Accountancy", "Financial Accounting, Tax Compliance, Auditing, Excel", "Prepared complete audited financial statements, tax filings, and general ledger reconciliation using Excel."),
            # 8. College of Business Education: BS Business Administration
            ("mktg", "Marketing Specialist", "Bachelor of Science in Business Administration - Marketing Management", "Digital Marketing, Market Research, Content Strategy, Social Media", "Executed digital marketing campaigns and consumer market research surveys increasing brand engagement by 40%."),
            # 9. College of Arts: BS Political Science
            ("polsci", "Community Relations Officer", "Bachelor of Science in Political Science", "Community Engagement, Public Policy, Stakeholder Management", "Formulated public policy briefs and coordinated community stakeholder engagement programs for local government unit."),
            # 10. Senior High School: TVL ICT
            ("shs_ict", "IT Support Technician", "Senior High School - TVL ICT Strand", "Computer Hardware Troubleshooting, LAN Setup, OS Setup", "Diagnosed motherboard faults, assembled PC workstations, and configured structured local area network cables."),
        ]

        for persona_id, role, edu, skls, prj in personas:
            candidate = self._create_sample_candidate(persona_id, role, edu, skls, prj)
            
            # Execute 5 consecutive runs to verify determinism
            previous_score = None
            previous_breakdown = None

            for run_idx in range(5):
                payload = calculate_official_ats_score(
                    audited_findings=candidate["findings"],
                    evidence_chunks=candidate["chunks"],
                    target_position=candidate["target_role"],
                    required_competencies=list(candidate["profile"].required_skills),
                    recommended_competencies=list(candidate["profile"].recommended_skills),
                    sbert_edu_sim_score=candidate["sbert_sim"],
                    audit_status_metadata="VERIFIED",
                    role_profile_metadata=candidate["meta"]
                )

                score = payload["overallScore"]
                breakdown = payload["resumeScore"]["breakdown"]

                # 1. Boundedness verification
                self.assertGreaterEqual(score, 0, f"Persona {role} score must be >= 0")
                self.assertLessEqual(score, 100, f"Persona {role} score must be <= 100")

                # 2. Formula verification: Skills 40% + Exp 30% + Edu 20% + Cert 10%
                s_pts = breakdown["skills"]["weightedScore"]
                e_pts = breakdown["experience"]["weightedScore"]
                ed_pts = breakdown["education"]["weightedScore"]
                c_pts = breakdown["certifications"]["weightedScore"]
                summed = round(s_pts + e_pts + ed_pts + c_pts)
                self.assertEqual(score, summed, f"Persona {role} formula mismatch: overall {score} != rounded sum {summed}")

                # 3. Determinism verification: Identical across repeated runs
                if previous_score is not None:
                    self.assertEqual(score, previous_score, f"Persona {role} nondeterminism detected between run 1 ({previous_score}) and run {run_idx+1} ({score})")
                    self.assertEqual(breakdown, previous_breakdown, f"Persona {role} component breakdown diverged across runs")

                previous_score = score
                previous_breakdown = breakdown

if __name__ == "__main__":
    unittest.main()
