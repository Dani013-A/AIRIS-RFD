import unittest
import time
import json
import os
from role_profile_registry import (
    resolve_role_profile,
    canonicalize_role_title,
    validate_dynamic_profile_payload,
    RoleProfileUnresolvedError,
    RoleProfile,
    AUTHORITATIVE_STATIC_PROFILES,
    ROLE_ALIASES
)

class TestRoleProfileRegistry(unittest.TestCase):
    """
    Exhaustive Test Suite for Role Profile Registry:
    - 146-career catalog coverage
    - Anti-collision checks (Network Architect != Architect, IoT != Architect, Algorithms Engineer != generic)
    - Domain semantic correctness (Maritime, Multimedia, Psychology, Accountancy)
    - 5-run determinism
    - 4-tier hierarchy & degraded transparency
    - Quality gate & immutability
    """

    @classmethod
    def setUpClass(cls):
        # Load the official 146 unique career titles from tipManilaPrograms
        tip_json = os.path.join(os.path.dirname(__file__), "data", "tip_programs.json")
        with open(tip_json, "r", encoding="utf-8") as f:
            colleges = json.load(f)
        cls.catalog_careers = sorted(list({
            pos for col in colleges for prog in col["programs"] for pos in prog["suggestedPositions"]
        }))

    def test_a_b_all_146_authoritative_careers_resolve_successfully(self):
        """
        Requirements A & B:
        - All 146 authoritative career titles resolve successfully.
        - No legitimate catalog career unnecessarily refuses or raises RoleProfileUnresolvedError.
        - Every catalog role receives a valid non-empty profile.
        """
        self.assertEqual(len(self.catalog_careers), 146, "Catalog must contain exactly 146 unique careers.")
        for career in self.catalog_careers:
            profile = resolve_role_profile(career)
            self.assertIsNotNone(profile, f"Role '{career}' returned None.")
            self.assertEqual(profile.profile_source, "AUTHORITATIVE_STATIC", f"Role '{career}' did not resolve to Tier 1.")
            self.assertFalse(profile.is_degraded, f"Catalog role '{career}' should not be degraded.")
            self.assertGreaterEqual(len(profile.required_skills), 5, f"Role '{career}' lacks required skills.")
            self.assertGreaterEqual(len(profile.recommended_skills), 3, f"Role '{career}' lacks recommended skills.")
            self.assertGreaterEqual(len(profile.education_benchmarks), 1, f"Role '{career}' lacks education benchmarks.")

    def test_c_exact_aliases_resolve_correctly(self):
        """
        Requirement C: Exact aliases resolve to their canonical counterparts.
        """
        alias_checks = [
            ("Certified Public Accountant", "Accountant"),
            ("cpa", "Accountant"),
            ("Junior Software Developer", "Software Engineer"),
            ("systems software developer", "Software Engineer"),
            ("Data Analyst Intern", "Data Analyst"),
            ("Junior Bookkeeper", "Bookkeeper"),
            ("Machine Learning Engineer", "AI / Machine Learning Engineer"),
            ("HR / Recruitment Associate", "Talent Acquisition Specialist"),
            ("HR Assistant", "HR Generalist"),
            ("Marketing Assistant", "Marketing Specialist"),
            ("Administrative Assistant", "Administrative Associate"),
            ("CAD Trainee", "CAD/BIM Specialist")
        ]
        for raw, expected_canonical in alias_checks:
            canon = canonicalize_role_title(raw)
            self.assertEqual(canon, expected_canonical, f"Canonicalization failed for alias '{raw}'")
            profile = resolve_role_profile(raw)
            self.assertEqual(profile.canonical_role, expected_canonical)
            self.assertEqual(profile.profile_source, "AUTHORITATIVE_STATIC")

    def test_d_e_f_known_substring_collisions_are_rejected(self):
        """
        Requirements D, E, F:
        - Unsafe substring matching is eliminated.
        - Network Architect != Building Architect.
        - IoT Solutions Architect != Building Architect.
        - Landscape Architect != Building Architect.
        """
        bldg_arch = resolve_role_profile("Architect")
        net_arch = resolve_role_profile("Network Architect")
        iot_arch = resolve_role_profile("IoT Solutions Architect")
        land_arch = resolve_role_profile("Landscape Architect")

        # Must have distinct profile IDs
        self.assertNotEqual(net_arch.profile_id, bldg_arch.profile_id)
        self.assertNotEqual(iot_arch.profile_id, bldg_arch.profile_id)
        self.assertNotEqual(land_arch.profile_id, bldg_arch.profile_id)

        # Network Architect competencies must be networking, not building codes
        net_skills_str = " ".join(net_arch.required_skills).lower()
        self.assertIn("bgp", net_skills_str)
        self.assertNotIn("building code", net_skills_str)
        self.assertNotIn("revit", net_skills_str)

        # IoT Solutions Architect competencies must be IoT, not building codes
        iot_skills_str = " ".join(iot_arch.required_skills).lower()
        self.assertIn("mqtt", iot_skills_str)
        self.assertNotIn("building code", iot_skills_str)

        # Building Architect must have architectural design & building code
        bldg_skills_str = " ".join(bldg_arch.required_skills).lower()
        self.assertIn("architectural design", bldg_skills_str)
        self.assertIn("building code", bldg_skills_str)

    def test_g_algorithms_engineer_resolves_to_cs_not_generic_engineering(self):
        """
        Requirement G:
        Algorithms Engineer resolves to Computer Science domain, not generic engineering.
        """
        algo_eng = resolve_role_profile("Algorithms Engineer")
        self.assertEqual(algo_eng.canonical_role, "Algorithms Engineer")
        self.assertIn("Computer Science", algo_eng.domain)
        self.assertNotIn("Thermodynamics", algo_eng.required_skills)
        self.assertIn("Advanced Data Structures", algo_eng.required_skills)
        self.assertIn("Algorithm Design & Complexity Analysis", algo_eng.required_skills)

    def test_h_marine_engineering_officer_competencies(self):
        """
        Requirement H: Marine Engineering Officer gets authentic maritime engineering competencies.
        """
        marine_eng = resolve_role_profile("Marine Engineering Officer")
        self.assertEqual(marine_eng.canonical_role, "Marine Engineering Officer")
        self.assertIn("Maritime", marine_eng.domain)
        skills_str = " ".join(marine_eng.required_skills).lower()
        self.assertIn("marine diesel engine", skills_str)
        self.assertIn("stcw", skills_str)
        self.assertIn("solas", skills_str)

    def test_i_multimedia_careers_get_creative_competencies(self):
        """
        Requirement I: Multimedia careers get creative/multimedia-relevant competencies.
        """
        animator = resolve_role_profile("3D Animator")
        self.assertIn("3D Character Animation", animator.required_skills)
        self.assertIn("Autodesk Maya / Blender", animator.required_skills)

        vfx = resolve_role_profile("VFX Artist")
        self.assertIn("Particle Systems & Dynamics", vfx.required_skills)

        gamedev = resolve_role_profile("Game Developer")
        self.assertIn("Game Engine Development (Unity / Unreal Engine)", gamedev.required_skills)

    def test_j_psychology_careers_get_behavioral_competencies(self):
        """
        Requirement J: Psychology careers get psychology/behavioral-relevant competencies.
        """
        psych = resolve_role_profile("Psychometrician")
        self.assertIn("Psychological Testing Administration & Standardization", psych.required_skills)
        self.assertIn("Philippine Psychometrics Practice & Ethics (RA 10029)", psych.required_skills)
        self.assertIn("Registered Psychometrician (RPm - PRC License)", psych.certification_benchmarks)

        guidance = resolve_role_profile("Guidance Associate")
        self.assertIn("Guidance & Counseling Principles & Ethical Standards", guidance.required_skills)

    def test_k_finance_accounting_careers_get_finance_competencies(self):
        """
        Requirement K: Finance/accounting careers get finance/accounting-relevant competencies.
        """
        acct = resolve_role_profile("Accountant")
        self.assertIn("Philippine Financial Reporting Standards (PFRS / IFRS)", acct.required_skills)
        self.assertIn("Philippine Tax Laws & BIR Compliance", acct.required_skills)
        self.assertIn("Certified Public Accountant (CPA - PRC License)", acct.certification_benchmarks)

        tax = resolve_role_profile("Tax Consultant")
        self.assertIn("Philippine National Internal Revenue Code (NIRC) Expertise", tax.required_skills)

        treasury = resolve_role_profile("Treasury Analyst")
        self.assertIn("Daily Cash Position Reporting & Liquidity Management", treasury.required_skills)

    def test_l_five_consecutive_resolutions_determinism(self):
        """
        Requirement L:
        Five consecutive resolutions of every supported career produce identical profile identity/version/competencies.
        """
        for career in self.catalog_careers:
            runs = [resolve_role_profile(career).to_dict() for _ in range(5)]
            first_dump = json.dumps(runs[0], sort_keys=True)
            for idx, r in enumerate(runs[1:], 1):
                self.assertEqual(
                    json.dumps(r, sort_keys=True),
                    first_dump,
                    f"Variance detected on career '{career}' run {idx}"
                )

    def test_m_tier_4_remains_explicitly_degraded(self):
        """
        Requirement M: Tier 4 domain fallback remains explicitly degraded.
        """
        degraded_cases = [
            ("Quantum Computing Specialist", "computing", "Computing & Information Sciences"),
            ("Subsea Pipeline Engineer", "engineering", "Engineering & Applied Sciences"),
            ("Aviation Logistics Specialist", "business_management", "Business & Management"),
            ("Nautical Navigation Cadet", "maritime", "Maritime Studies & Marine Engineering")
        ]
        for raw_role, expected_id_part, expected_domain in degraded_cases:
            prof = resolve_role_profile(raw_role, allow_domain_fallback=True)
            self.assertEqual(prof.profile_source, "APPROVED_DOMAIN_FALLBACK")
            self.assertTrue(prof.is_degraded, "Tier 4 MUST be marked degraded.")
            self.assertIn(expected_id_part, prof.profile_id)
            self.assertEqual(prof.domain, expected_domain)
            self.assertEqual(prof.version, "fallback-1.0.0")

    def test_n_unsupported_role_refusal(self):
        """
        Requirement N: No unsupported role silently receives an exact-profile label.
        Unresolvable roles without a domain strictly raise RoleProfileUnresolvedError.
        """
        with self.assertRaises(RoleProfileUnresolvedError):
            resolve_role_profile("Galactic Stargazer 9000", allow_domain_fallback=True)

        with self.assertRaises(RoleProfileUnresolvedError):
            resolve_role_profile("Quantum Computing Specialist", allow_domain_fallback=False)

    def test_o_profile_immutability(self):
        """
        Profile instances are frozen dataclasses and cannot be mutated in-flight.
        """
        profile = resolve_role_profile("Software Engineer")
        with self.assertRaises(Exception):
            profile.required_skills = ("MutatedSkill",)
        
        # In-memory dictionary conversion is detached
        p_dict = profile.to_dict()
        p_dict["required_skills"].append("InjectedSkill")
        fresh = resolve_role_profile("Software Engineer")
        self.assertNotIn("InjectedSkill", fresh.required_skills)

    def test_p_quality_gate_validation(self):
        """
        Pre-authoritative quality gate strictly rejects generic filler and insufficient skills.
        """
        bad = {
            "required_skills": ["Technical Skills", "Problem Solving", "Core Competency", "Tools", "Execution"],
            "recommended_skills": ["Communication", "Teamwork", "Office"],
            "education_benchmarks": ["Bachelor Degree"]
        }
        ok, reason = validate_dynamic_profile_payload(bad, "Test Role")
        self.assertFalse(ok)
        self.assertIn("generic", reason.lower())

        good = {
            "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "REST API Development"],
            "recommended_skills": ["Git", "Redis", "Linux Systems"],
            "education_benchmarks": ["Bachelor of Science in Computer Science"]
        }
        ok, reason = validate_dynamic_profile_payload(good, "Custom Role")
        self.assertTrue(ok)

    def test_sub_millisecond_cache_latency(self):
        """
        Average lookup time must remain sub-millisecond.
        """
        resolve_role_profile("Information Technology Specialist")
        t0 = time.perf_counter()
        for _ in range(100):
            resolve_role_profile("Information Technology Specialist")
        elapsed = (time.perf_counter() - t0) / 100
        self.assertLess(elapsed, 0.001)

if __name__ == "__main__":
    unittest.main()
