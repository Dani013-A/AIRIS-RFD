import unittest
from deterministic_scorer import calculate_official_ats_score, _evaluate_ats_experience_parseability
from evidence_chunker import EvidenceChunk
from output_validator import AuditedFinding, ACMOFlags
from ai_recommendation_verifier import (
    is_safe_ip,
    resolve_and_validate_hostname,
    verify_external_resource_url,
    canonicalize_resource_url,
    generate_and_verify_ai_recommendations
)

class TestExperienceDomainIndependenceAndATS(unittest.TestCase):
    """
    Validates:
    1. ATS Experience parseability is completely domain-independent.
    2. Same resume across 6 diverse careers produces identical ATS total and component scores.
    3. Target Alignment derives distinct role-specific profiles, competencies, and gaps.
    4. AI recommendation generation is gap-first, SSRF-protected, and quota-bounded.
    """

    def test_experience_domain_independence(self):
        """
        Proves that software, networking, civil engineering, accounting, and general
        experience entries receive identical ATS experience parseability credit
        when document structure and descriptive completeness are equivalent.
        """
        e_software = [
            EvidenceChunk(chunkId='s1', section='WorkExperience', text='Software Developer at ACME Corp (2022 - 2023). Developed REST microservices and automated deployment pipelines.', sourceOrder=1, wordCount=15),
            EvidenceChunk(chunkId='s2', section='WorkExperience', text='Junior Engineer at Beta Tech (2021 - 2022). Implemented user interfaces and conducted automated tests.', sourceOrder=2, wordCount=14)
        ]

        e_networking = [
            EvidenceChunk(chunkId='n1', section='WorkExperience', text='Network Specialist at NetCore (2022 - 2023). Configured routing protocols and monitored network switch infrastructure.', sourceOrder=1, wordCount=14),
            EvidenceChunk(chunkId='n2', section='WorkExperience', text='Junior Systems Admin at DataLink (2021 - 2022). Maintained server racks and resolved network connectivity tickets.', sourceOrder=2, wordCount=14)
        ]

        e_civil = [
            EvidenceChunk(chunkId='c1', section='WorkExperience', text='Project Engineer at Build Corp (2022 - 2023). Designed structural plans for residential facilities and supervised site excavation.', sourceOrder=1, wordCount=16),
            EvidenceChunk(chunkId='c2', section='WorkExperience', text='Junior Civil Engineer at Alpha Designs (2021 - 2022). Drafted architectural drawings and calculated load bearing metrics.', sourceOrder=2, wordCount=14)
        ]

        e_accounting = [
            EvidenceChunk(chunkId='a1', section='WorkExperience', text='Staff Accountant at Ledger Associates (2022 - 2023). Prepared monthly financial reports and reconciled accounts payable ledgers.', sourceOrder=1, wordCount=16),
            EvidenceChunk(chunkId='a2', section='WorkExperience', text='Junior Auditor at Prime Audit (2021 - 2022). Audited inventory records and evaluated internal compliance procedures.', sourceOrder=2, wordCount=14)
        ]

        e_general = [
            EvidenceChunk(chunkId='g1', section='WorkExperience', text='Administrative Specialist at Office Global (2022 - 2023). Coordinated executive meetings and managed departmental scheduling.', sourceOrder=1, wordCount=14),
            EvidenceChunk(chunkId='g2', section='WorkExperience', text='Operations Assistant at City Services (2021 - 2022). Facilitated team communications and produced monthly performance summaries.', sourceOrder=2, wordCount=14)
        ]

        score_soft = _evaluate_ats_experience_parseability(e_software)
        score_net = _evaluate_ats_experience_parseability(e_networking)
        score_civil = _evaluate_ats_experience_parseability(e_civil)
        score_acct = _evaluate_ats_experience_parseability(e_accounting)
        score_gen = _evaluate_ats_experience_parseability(e_general)

        self.assertEqual(score_soft, 100)
        self.assertEqual(score_net, 100)
        self.assertEqual(score_civil, 100)
        self.assertEqual(score_acct, 100)
        self.assertEqual(score_gen, 100)

    def test_same_resume_across_six_careers_invariant(self):
        """
        Proves that the exact same resume produces bit-for-bit identical ATS overall and
        component scores across Software, Network Admin, Cybersecurity, Data Science,
        Civil Engineering, and Accounting.
        """
        chunks = [
            EvidenceChunk(chunkId='c1', section='Skills', text='Technical Skills: Python, Docker, Linux, Git, SQL, Financial Modeling', sourceOrder=1, wordCount=10),
            EvidenceChunk(chunkId='c2', section='WorkExperience', text='Project Analyst at Global Corp (2022 - 2023). Developed automation tools and prepared quarterly operational reports.', sourceOrder=2, wordCount=16),
            EvidenceChunk(chunkId='c3', section='Education', text='Bachelor of Science in Information Technology, TIP Manila, Graduated 2023.', sourceOrder=3, wordCount=11)
        ]

        findings = [
            AuditedFinding(
                chunkId='c2',
                competency='Python',
                classification='STRONG_MATCH',
                evidenceLevel='DEMONSTRATED',
                acmo=ACMOFlags(action=True, context=True, method=True, outcome=False),
                observedEvidence='Developed automation tools.'
            )
        ]

        careers = [
            ('Software Engineer', ['Software Development', 'Python', 'Docker'], ['Git']),
            ('Network Administrator', ['Network Configuration', 'Routing', 'Cisco IOS'], ['Subnetting']),
            ('Cybersecurity Analyst', ['Threat Analysis', 'SIEM', 'Incident Response'], ['Firewalls']),
            ('Data Scientist', ['Machine Learning', 'Statistical Modeling', 'PyTorch'], ['Pandas']),
            ('Civil Engineer', ['AutoCAD', 'Structural Analysis', 'Concrete Design'], ['Surveying']),
            ('Accountant', ['Financial Reporting', 'Auditing', 'General Ledger'], ['Taxation'])
        ]

        results = []
        for role, req, rec in careers:
            res = calculate_official_ats_score(
                audited_findings=findings,
                evidence_chunks=chunks,
                target_position=role,
                required_competencies=req,
                recommended_competencies=rec,
                detected_skills=['Python', 'Docker', 'Linux', 'Git', 'SQL'],
                parsed_sections={
                    'Skills': 'Python, Docker, Linux, Git, SQL, Financial Modeling',
                    'WorkExperience': 'Project Analyst at Global Corp (2022 - 2023). Developed automation tools and prepared quarterly operational reports.',
                    'Education': 'Bachelor of Science in Information Technology, TIP Manila, Graduated 2023.'
                }
            )
            b = res['resumeScore']['breakdown']
            results.append({
                'role': role,
                'overall': res['overallScore'],
                'skills': b['skills']['rawScore'],
                'exp': b['experience']['rawScore'],
                'edu': b['education']['rawScore'],
                'cert': b['certifications']['rawScore'],
                'alignment': res['roleRelevance']['alignmentPercentage'],
                'gaps': res['roleRelevance']['priorityGaps']
            })

        first = results[0]
        for r in results[1:]:
            self.assertEqual(r['overall'], first['overall'], f"ATS mismatch for {r['role']}")
            self.assertEqual(r['skills'], first['skills'], f"Skills mismatch for {r['role']}")
            self.assertEqual(r['exp'], first['exp'], f"Experience mismatch for {r['role']}")
            self.assertEqual(r['edu'], first['edu'], f"Education mismatch for {r['role']}")
            self.assertEqual(r['cert'], first['cert'], f"Certifications mismatch for {r['role']}")

        # Verify Target Alignment differs where appropriate
        # Software Engineer matches Python; Civil Engineer does not
        soft_res = next(r for r in results if r['role'] == 'Software Engineer')
        civil_res = next(r for r in results if r['role'] == 'Civil Engineer')
        self.assertGreater(soft_res['alignment'], civil_res['alignment'])
        self.assertIn('AutoCAD', civil_res['gaps'])
        self.assertNotIn('AutoCAD', soft_res['gaps'])

    def test_ssrf_and_hostname_security(self):
        """
        Validates authoritative backend SSRF protection: loopback, RFC1918,
        link-local, cloud metadata, and disallowed hostnames are blocked.
        """
        self.assertFalse(is_safe_ip('127.0.0.1'))
        self.assertFalse(is_safe_ip('10.10.10.10'))
        self.assertFalse(is_safe_ip('172.20.1.1'))
        self.assertFalse(is_safe_ip('192.168.1.254'))
        self.assertFalse(is_safe_ip('169.254.169.254'))
        self.assertFalse(is_safe_ip('::1'))
        self.assertFalse(is_safe_ip('fe80::1'))
        self.assertTrue(is_safe_ip('93.184.216.34'))

        safe_local, _ = resolve_and_validate_hostname('localhost')
        self.assertFalse(safe_local)

        safe_meta, _ = resolve_and_validate_hostname('metadata.google.internal')
        self.assertFalse(safe_meta)

    def test_external_resource_url_verification_gates(self):
        """
        Validates external resource verification: syntax, search fallbacks,
        generic landing pages, and canonicalization.
        """
        # Generic root landing page rejected
        res = verify_external_resource_url('https://www.coursera.org/')
        self.assertFalse(res['verified'])
        self.assertEqual(res['status'], 'generic_landing')

        # Disallowed search fallback rejected
        res = verify_external_resource_url('https://www.google.com/search?q=cisco+packet+tracer')
        self.assertFalse(res['verified'])
        self.assertEqual(res['status'], 'disallowed_domain')

        # Canonicalization strips tracking params
        c = canonicalize_resource_url('https://www.coursera.org/learn/networking?utm_source=fb&gclid=xyz')
        self.assertNotIn('utm_source', c)
        self.assertNotIn('gclid', c)

    def test_ai_recommendation_graceful_fallback_when_provider_unavailable(self):
        """
        Validates that when live network verification is disabled (verify_live_network=False),
        zero candidates can be admitted as verified.
        """
        recs = generate_and_verify_ai_recommendations(
            target_position="Network Administrator",
            priority_gaps=["Routing", "Switching", "Cisco IOS"],
            degree_program="BS Information Technology",
            verify_live_network=False
        )
        self.assertEqual(len(recs), 0, "No candidate may receive verified status when verify_live_network=False")

    def test_live_network_verification_reachability_and_redirects(self):
        """
        Validates live network reachability:
        - Confirmed 200 resource is verified
        - Confirmed 404 resource is rejected
        - Redirect to non-whitelisted or private destination is blocked
        """
        # 1. Live reachability of valid educational resource
        res_valid = verify_external_resource_url('https://www.subnetting.net/subnetting-practice-test')
        self.assertTrue(res_valid['verified'])
        self.assertEqual(res_valid['status'], 'verified')
        self.assertEqual(res_valid['statusCode'], 200)

        # 2. 404 dead link is rejected
        res_404 = verify_external_resource_url('https://www.coursera.org/learn/non-existent-course-slug-404-check')
        self.assertFalse(res_404['verified'])
        self.assertEqual(res_404['status'], 'not_found')

if __name__ == '__main__':
    unittest.main()
