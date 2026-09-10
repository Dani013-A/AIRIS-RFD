import unittest
from ai_service import is_skill_grounded_in_text, generate_learning_snapshot, CANONICAL_SKILL_ALIASES

class TestExhaustiveDomainNeutralGrounding(unittest.TestCase):

    CATALOG = [
        {
            "college": "College of Computer Studies",
            "program": "BS Information Technology",
            "careers": [
                "Information Technology Specialist", "Frontend Developer", "Backend Developer",
                "Full Stack Developer", "Mobile Application Developer", "UI/UX Designer",
                "QA / Software Tester", "System Administrator", "Cloud Engineer",
                "DevOps Specialist", "Network Engineer", "IT Support Specialist"
            ]
        },
        {
            "college": "College of Computer Studies",
            "program": "BS Computer Science",
            "careers": [
                "Software Engineer", "AI / Machine Learning Engineer", "Data Scientist",
                "Systems Software Developer", "Database Administrator", "Cybersecurity Analyst",
                "Algorithms Engineer", "Research Scientist"
            ]
        },
        {
            "college": "College of Computer Studies",
            "program": "BS Data Science and Analytics",
            "careers": [
                "Data Analyst", "Data Scientist", "Business Intelligence Analyst",
                "Machine Learning Engineer", "Data Engineer", "Statistical Analyst",
                "Analytics Consultant"
            ]
        },
        {
            "college": "College of Computer Studies",
            "program": "BS Entertainment and Multimedia Computing",
            "careers": [
                "Game Developer", "3D Animator", "Multimedia Artist", "Game Designer",
                "VFX Artist", "AR/VR Developer", "Motion Graphics Artist", "Unity / Unreal Engine Developer"
            ]
        },
        {
            "college": "College of Engineering and Architecture",
            "program": "BS Architecture",
            "careers": [
                "Architect", "Design Architect", "Project Architect", "CAD/BIM Specialist",
                "Interior Designer", "Urban Planner", "Landscape Architect"
            ]
        },
        {
            "college": "College of Engineering and Architecture",
            "program": "BS Chemical Engineering",
            "careers": [
                "Chemical Engineer", "Process Engineer", "Plant Engineer",
                "Quality Control Engineer", "Production Engineer", "Environmental Compliance Engineer",
                "Materials Engineer"
            ]
        },
        {
            "college": "College of Engineering and Architecture",
            "program": "BS Civil Engineering",
            "careers": [
                "Civil Engineer", "Structural Engineer", "Site Engineer", "Project Engineer",
                "Geotechnical Engineer", "Construction Manager", "Cost Estimator"
            ]
        },
        {
            "college": "College of Engineering and Architecture",
            "program": "BS Computer Engineering",
            "careers": [
                "Computer Engineer", "Embedded Software Engineer", "Hardware Engineer",
                "Firmware Engineer", "Network Architect", "IoT Solutions Architect", "Systems Engineer"
            ]
        },
        {
            "college": "College of Engineering and Architecture",
            "program": "BS Electrical Engineering",
            "careers": [
                "Electrical Engineer", "Electrical Design Engineer", "Power Systems Engineer",
                "Control Systems Engineer", "Project Electrical Engineer", "Substation Engineer"
            ]
        },
        {
            "college": "College of Engineering and Architecture",
            "program": "BS Electronics Engineering",
            "careers": [
                "Electronics Engineer", "Telecommunications Engineer", "Network Engineer",
                "Embedded Systems Engineer", "Microelectronics Engineer", "Signal Processing Engineer"
            ]
        },
        {
            "college": "College of Engineering and Architecture",
            "program": "BS Industrial Engineering",
            "careers": [
                "Industrial Engineer", "Process Improvement Engineer", "Production Planner",
                "Quality Assurance Engineer", "Supply Chain Analyst", "Operations Manager", "Manufacturing Engineer"
            ]
        },
        {
            "college": "College of Engineering and Architecture",
            "program": "BS Mechanical Engineering",
            "careers": [
                "Mechanical Engineer", "Mechanical Design Engineer", "HVAC Engineer",
                "Automotive Engineer", "Manufacturing Engineer", "Power Plant Engineer", "Maintenance Engineer"
            ]
        },
        {
            "college": "College of Business Education",
            "program": "BS Accountancy",
            "careers": [
                "Accountant", "Certified Public Accountant", "Auditor", "Financial Analyst",
                "Tax Consultant", "Bookkeeper", "Financial Controller"
            ]
        },
        {
            "college": "College of Business Education",
            "program": "BS Accounting Information System",
            "careers": [
                "Accounting Systems Analyst", "Financial Systems Consultant", "Internal Auditor",
                "ERP Implementation Specialist", "Accounting Specialist"
            ]
        },
        {
            "college": "College of Business Education",
            "program": "BS Business Administration major in Financial Management",
            "careers": [
                "Financial Analyst", "Investment Analyst", "Credit Analyst",
                "Banking Associate", "Treasury Analyst", "Risk Analyst"
            ]
        },
        {
            "college": "College of Business Education",
            "program": "BS Business Administration major in Human Resource Management",
            "careers": [
                "HR Specialist", "HR Generalist", "Talent Acquisition Specialist",
                "Compensation and Benefits Analyst", "Training and Development Officer", "HR Business Partner"
            ]
        },
        {
            "college": "College of Business Education",
            "program": "BS Business Administration major in Logistics and Supply Chain Management",
            "careers": [
                "Supply Chain Analyst", "Logistics Coordinator", "Procurement Officer",
                "Inventory Planner", "Warehouse Operations Manager"
            ]
        },
        {
            "college": "College of Business Education",
            "program": "BS Business Administration major in Marketing Management",
            "careers": [
                "Marketing Specialist", "Brand Associate", "Digital Marketing Officer",
                "Market Research Analyst", "Sales and Marketing Coordinator", "Social Media Strategist"
            ]
        },
        {
            "college": "College of Business Education",
            "program": "BS Business Administration",
            "careers": [
                "Business Analyst", "Business Operations Specialist", "Administrative Manager",
                "Project Coordinator", "Account Manager"
            ]
        },
        {
            "college": "College of Arts",
            "program": "Bachelor of Arts in Psychology",
            "careers": [
                "Psychometrician", "HR / Recruitment Associate", "Guidance Associate",
                "Behavioral Research Assistant", "Community Relations Officer",
                "Organizational Development Specialist", "Counseling Assistant"
            ]
        },
        {
            "college": "Senior High School",
            "program": "STEM Strand (Science, Technology, Engineering, and Mathematics)",
            "careers": [
                "Engineering Student Assistant", "Junior Software Developer",
                "Data Analyst Intern", "CAD Trainee"
            ]
        },
        {
            "college": "Senior High School",
            "program": "ABM Strand (Accountancy, Business, and Management)",
            "careers": [
                "Junior Bookkeeper", "Marketing Assistant", "Administrative Assistant", "HR Assistant"
            ]
        },
        {
            "college": "Senior High School",
            "program": "HUMSS Strand (Humanities and Social Sciences)",
            "careers": [
                "Content Writer", "Public Relations Assistant", "Communications Assistant"
            ]
        },
        {
            "college": "Senior High School",
            "program": "GAS Strand (General Academic Strand)",
            "careers": [
                "Administrative Associate", "Customer Service Representative"
            ]
        },
        {
            "college": "Senior High School",
            "program": "TVL Strand (Technical-Vocational-Livelihood)",
            "careers": [
                "IT Support Technician", "Multimedia Assistant"
            ]
        }
    ]

    def test_catalog_enumeration(self):
        total_programs = len(self.CATALOG)
        total_careers = sum(len(item["careers"]) for item in self.CATALOG)
        self.assertEqual(total_programs, 25)
        self.assertEqual(total_careers, 151)

    def test_positive_and_negative_grounding_business(self):
        text = "SKILLS: Financial reporting, Excel, Bookkeeping, QuickBooks, Tax preparation"
        self.assertTrue(is_skill_grounded_in_text("Financial reporting", text))
        self.assertTrue(is_skill_grounded_in_text("Excel", text))
        self.assertTrue(is_skill_grounded_in_text("Bookkeeping", text))
        self.assertTrue(is_skill_grounded_in_text("QuickBooks", text))
        self.assertFalse(is_skill_grounded_in_text("SAP", text))
        self.assertFalse(is_skill_grounded_in_text("Financial Modeling", text))

    def test_positive_and_negative_grounding_engineering(self):
        text = "SKILLS: AutoCAD, SolidWorks, Structural analysis, CAD"
        self.assertTrue(is_skill_grounded_in_text("AutoCAD", text))
        self.assertTrue(is_skill_grounded_in_text("SolidWorks", text))
        self.assertTrue(is_skill_grounded_in_text("Structural analysis", text))
        self.assertFalse(is_skill_grounded_in_text("Revit", text))
        self.assertFalse(is_skill_grounded_in_text("STAAD.Pro", text))

    def test_positive_and_negative_grounding_psychology(self):
        text = "SKILLS: Psychological assessment, Research methods, SPSS, Behavioral research"
        self.assertTrue(is_skill_grounded_in_text("Psychological assessment", text))
        self.assertTrue(is_skill_grounded_in_text("SPSS", text))
        self.assertFalse(is_skill_grounded_in_text("R programming", text))
        self.assertFalse(is_skill_grounded_in_text("NVivo", text))

    def test_cross_domain_non_contamination(self):
        eng_text = "SKILLS: AutoCAD, SolidWorks"
        biz_text = "SKILLS: Excel, Bookkeeping, QuickBooks"
        psy_text = "SKILLS: SPSS, Behavioral research"
        it_text = "SKILLS: Python, React, SQL"

        self.assertFalse(is_skill_grounded_in_text("QuickBooks", eng_text))
        self.assertFalse(is_skill_grounded_in_text("SPSS", eng_text))
        self.assertFalse(is_skill_grounded_in_text("React", eng_text))

        self.assertFalse(is_skill_grounded_in_text("AutoCAD", biz_text))
        self.assertFalse(is_skill_grounded_in_text("SPSS", biz_text))
        self.assertFalse(is_skill_grounded_in_text("Python", biz_text))

        self.assertFalse(is_skill_grounded_in_text("React", psy_text))
        self.assertFalse(is_skill_grounded_in_text("QuickBooks", psy_text))
        self.assertFalse(is_skill_grounded_in_text("AutoCAD", psy_text))

        self.assertFalse(is_skill_grounded_in_text("Financial reporting", it_text))
        self.assertFalse(is_skill_grounded_in_text("Structural analysis", it_text))

    def test_alias_matching_non_it(self):
        self.assertTrue(is_skill_grounded_in_text("Excel", "Skills: MS Excel"))
        self.assertTrue(is_skill_grounded_in_text("Excel", "Skills: Microsoft Excel"))
        self.assertTrue(is_skill_grounded_in_text("AutoCAD", "Skills: Auto CAD"))
        self.assertTrue(is_skill_grounded_in_text("QuickBooks", "Skills: Quick Books"))

    def test_broad_concept_does_not_invent_tools(self):
        generic_text = "Extensive database experience, programming, accounting software, CAD tools, and research experience"
        self.assertFalse(is_skill_grounded_in_text("MySQL", generic_text))
        self.assertFalse(is_skill_grounded_in_text("PostgreSQL", generic_text))
        self.assertFalse(is_skill_grounded_in_text("Python", generic_text))
        self.assertFalse(is_skill_grounded_in_text("QuickBooks", generic_text))
        self.assertFalse(is_skill_grounded_in_text("AutoCAD", generic_text))
        self.assertFalse(is_skill_grounded_in_text("SPSS", generic_text))

    from unittest.mock import patch

    @patch("ai_service.generate_text_with_fallback", side_effect=RuntimeError("Mock fast fallback"))
    def test_exhaustive_147_matrix_backend(self, mock_ai):
        count = 0
        for item in self.CATALOG:
            for career in item["careers"]:
                parsed_sections = {
                    "Skills": "Communication, Problem Solving, Project Coordination, GraphQL, PostgreSQL, SAP",
                    "Content": "CANDIDATE RESUME\nDegree: " + item["program"] + "\nSKILLS: Communication, Problem Solving, Project Coordination"
                }
                sbert_results = {"evidence": []}
                snapshot = generate_learning_snapshot(
                    target_position=career,
                    parsed_sections=parsed_sections,
                    sbert_results=sbert_results,
                    program=item["program"]
                )
                detected = snapshot.get("careerContext", {}).get("detectedSkills", [])
                self.assertIn("Communication", detected)
                self.assertNotIn("GraphQL", detected)
                self.assertNotIn("PostgreSQL", detected)
                self.assertNotIn("SAP", detected)
                count += 1
        self.assertEqual(count, 151)

if __name__ == "__main__":
    unittest.main()
