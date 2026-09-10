import unittest
from ai_service import is_skill_grounded_in_text, generate_learning_snapshot

class TestSkillGroundingAndIsolation(unittest.TestCase):

    RESUME_FIXTURE = (
        "DANIEL AARON T. ESPELA\n"
        "Software Engineer | Manila, Philippines\n"
        "Skills: Python, Java, C++, JavaScript, TypeScript, SQL, Kotlin, VB.NET, React, "
        "React Native, Expo, Next.js, FastAPI, Node.js, Express.js, Laravel, SBERT, "
        "Sentence Transformers, Gemini, Groq, OpenRouter, OCR, Whisper, Firebase, "
        "MySQL, Oracle, AWS EC2, AWS RDS, Git, GitHub, Figma, Android Studio, Postman, Unity\n"
        "Experience: Built production mobile & full-stack web applications.\n"
    )

    def test_explicit_skills_grounded(self):
        self.assertTrue(is_skill_grounded_in_text("JavaScript", self.RESUME_FIXTURE))
        self.assertTrue(is_skill_grounded_in_text("React", self.RESUME_FIXTURE))
        self.assertTrue(is_skill_grounded_in_text("MySQL", self.RESUME_FIXTURE))
        self.assertTrue(is_skill_grounded_in_text("FastAPI", self.RESUME_FIXTURE))
        self.assertTrue(is_skill_grounded_in_text("Python", self.RESUME_FIXTURE))

    def test_unsupported_skills_rejected(self):
        self.assertFalse(is_skill_grounded_in_text("GraphQL", self.RESUME_FIXTURE))
        self.assertFalse(is_skill_grounded_in_text("PostgreSQL", self.RESUME_FIXTURE))
        self.assertFalse(is_skill_grounded_in_text("MongoDB", self.RESUME_FIXTURE))
        self.assertFalse(is_skill_grounded_in_text("CI/CD", self.RESUME_FIXTURE))

    def test_sql_only_does_not_infer_postgresql(self):
        sql_only_text = "Skills: SQL, Python, Git"
        self.assertTrue(is_skill_grounded_in_text("SQL", sql_only_text))
        self.assertFalse(is_skill_grounded_in_text("PostgreSQL", sql_only_text))
        self.assertFalse(is_skill_grounded_in_text("MySQL", sql_only_text))

    def test_react_only_does_not_infer_nextjs(self):
        react_only_text = "Skills: React, Redux, HTML, CSS"
        self.assertTrue(is_skill_grounded_in_text("React", react_only_text))
        self.assertFalse(is_skill_grounded_in_text("Next.js", react_only_text))

    def test_javascript_does_not_infer_graphql(self):
        js_only_text = "Skills: JavaScript, Node.js"
        self.assertTrue(is_skill_grounded_in_text("JavaScript", js_only_text))
        self.assertFalse(is_skill_grounded_in_text("GraphQL", js_only_text))

    def test_alias_matching_legitimate(self):
        js_alias_text = "Skills: JS ES6, TS, Node, Express"
        self.assertTrue(is_skill_grounded_in_text("JavaScript", js_alias_text))
        self.assertTrue(is_skill_grounded_in_text("TypeScript", js_alias_text))
        self.assertTrue(is_skill_grounded_in_text("Node.js", js_alias_text))
        self.assertTrue(is_skill_grounded_in_text("Express.js", js_alias_text))

    def test_generate_learning_snapshot_grounds_detected_skills(self):
        parsed_sections = {
            "Skills": "Python, React, MySQL, Node.js, Express.js, GraphQL, PostgreSQL, MongoDB, CI/CD",
            "Content": self.RESUME_FIXTURE
        }
        sbert_results = {"evidence": []}
        snapshot = generate_learning_snapshot(
            target_position="Software Engineer",
            parsed_sections=parsed_sections,
            sbert_results=sbert_results
        )

        detected = snapshot["careerContext"]["detectedSkills"]
        self.assertIn("Python", detected)
        self.assertIn("React", detected)
        self.assertIn("MySQL", detected)

        # Un-grounded hallucinated skills MUST NOT be present in detectedSkills
        self.assertNotIn("GraphQL", detected)
        self.assertNotIn("PostgreSQL", detected)
        self.assertNotIn("MongoDB", detected)
        self.assertNotIn("CI/CD", detected)

if __name__ == "__main__":
    unittest.main()
