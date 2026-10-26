import unittest
import numpy as np
from interview_engine import (
    calculate_filler_metrics,
    CORE_SURVEY_QUESTIONS,
    calculate_semantic_correctness,
    load_dataset,
    find_best_dataset_question,
    generate_first_question,
    classify_interaction_intent,
)
from sbert_matcher import _cached_encode, calculate_cosine_similarity

class TestInterviewScoringAndQuestioning(unittest.TestCase):
    """
    Comprehensive verification suite for interview questioning pattern,
    idealAnswer benchmark evaluation, and bounded filler/pause adjustments.
    """

    def setUp(self):
        self.dataset = load_dataset()
        self.benchmark_q = self.dataset[0]  # survey-1
        self.ideal_answer = self.benchmark_q["idealAnswer"]

    # A. Strong answer with normal delivery
    def test_case_a_strong_answer_normal_delivery(self):
        strong_answer = (
            "I recently graduated with a degree in Computer Science, where I built a solid theoretical foundation "
            "and gained extensive project experience in software development. Throughout my studies, I led multiple "
            "collaborative software projects, focusing on scalable web applications and clean code principles. "
            "I am eager to contribute dependability, strong problem-solving skills, and rapid adaptability to your engineering team."
        )
        history = [
            {
                "question": self.benchmark_q["text"],
                "answer": strong_answer,
                "benchmarkAnswer": self.ideal_answer,
            }
        ]
        score = calculate_semantic_correctness(history)
        filler_metrics = calculate_filler_metrics(strong_answer)

        self.assertGreaterEqual(score, 54.0, "Strong answer should achieve >= 54% semantic correctness.")
        self.assertEqual(filler_metrics["fillerCount"], 0)
        self.assertTrue(filler_metrics["natural"])

    # B. Strong answer with reasonable alternate wording
    def test_case_b_strong_answer_alternate_wording(self):
        alternate_wording = (
            "As a fresh graduate in IT, my academic journey provided comprehensive exposure to modern engineering practices. "
            "I took ownership of end-to-end coursework projects, solving real-world challenges through teamwork and disciplined research. "
            "I bring high enthusiasm, solid work ethic, and a proven ability to pick up new technical stacks swiftly."
        )
        history = [
            {
                "question": self.benchmark_q["text"],
                "answer": alternate_wording,
                "benchmarkAnswer": self.ideal_answer,
            }
        ]
        score = calculate_semantic_correctness(history)
        self.assertGreaterEqual(score, 60.0, "Alternate phrasing with same substance must score high.")

    # C. Strong answer with several natural fillers
    def test_case_c_strong_answer_natural_fillers(self):
        answer_with_natural_fillers = (
            "Well, I recently graduated with a degree in my field, where, um, I developed a strong foundation in both core academic "
            "principles and practical project work. Throughout my coursework, I took initiative to apply my skills to hands-on deliverables. "
            "I am, you know, enthusiastic about contributing dependably to the team from day one."
        )
        history = [
            {
                "question": self.benchmark_q["text"],
                "answer": answer_with_natural_fillers,
                "benchmarkAnswer": self.ideal_answer,
            }
        ]
        score = calculate_semantic_correctness(history)
        filler_metrics = calculate_filler_metrics(answer_with_natural_fillers)

        self.assertGreaterEqual(score, 60.0, "Natural fillers must not ruin semantic correctness.")
        self.assertLessEqual(filler_metrics["fillerCount"], 3)
        self.assertTrue(filler_metrics["natural"])
        self.assertFalse(filler_metrics["excessive"])

    # D. Strong answer with excessive fillers
    def test_case_d_strong_answer_excessive_fillers(self):
        answer_with_excessive_fillers = (
            "Um, well, I um graduated with a degree, uh, in my field, where like, um, I developed a strong foundation, uh, "
            "in both academic principles and, you know, practical project work. Throughout my studies, um, I took initiative, uh, "
            "to build hands-on deliverables, you know, and I am, um, eager to contribute."
        )
        filler_metrics = calculate_filler_metrics(answer_with_excessive_fillers)

        self.assertGreater(filler_metrics["fillerCount"], 6)
        self.assertTrue(filler_metrics["excessive"])

        history = [
            {
                "question": self.benchmark_q["text"],
                "answer": answer_with_excessive_fillers,
                "benchmarkAnswer": self.ideal_answer,
            }
        ]
        semantic_score = calculate_semantic_correctness(history)
        self.assertGreater(semantic_score, 50.0, "Substantive answer with fillers should still retain positive semantic alignment.")

    # E. Strong answer with long hesitation (audio pause metrics)
    def test_case_e_strong_answer_long_hesitation(self):
        answer = "I am a graduate with strong project experience and a commitment to dependable engineering."
        pause_metrics = {
            "totalPauseDuration": 8.5,
            "pauseCount": 4,
            "longestPause": 3.8,
            "averagePauseDuration": 2.125,
            "pausePeriodEquivalent": 8.5
        }
        history = [{
            "question": self.benchmark_q["text"],
            "answer": answer,
            "benchmarkAnswer": self.ideal_answer,
            "pauseMetrics": pause_metrics
        }]
        semantic_score = calculate_semantic_correctness(history)
        self.assertGreaterEqual(semantic_score, 45.0, "Substance is preserved despite pause metrics.")

    # F. Weak answer with excellent delivery
    def test_case_f_weak_answer_excellent_delivery(self):
        fluent_weak_answer = "I just really like computers and I have always wanted to have an office job with great coworkers."
        history = [
            {
                "question": self.benchmark_q["text"],
                "answer": fluent_weak_answer,
                "benchmarkAnswer": self.ideal_answer,
            }
        ]
        semantic_score = calculate_semantic_correctness(history)
        filler_metrics = calculate_filler_metrics(fluent_weak_answer)

        self.assertEqual(filler_metrics["fillerCount"], 0)
        self.assertLess(semantic_score, 45.0, "Fluff/weak answer must NOT receive high semantic score even with 0 fillers.")

    # G. Relevant answer with different wording from idealAnswer
    def test_case_g_relevant_answer_different_wording(self):
        diverse_wording = (
            "I am a recent graduate who focused on practical projects and technical coursework throughout my studies. "
            "I built software systems, worked closely with project teams, and developed strong problem-solving and collaboration capabilities. "
            "I am excited to start my career and contribute dependable execution."
        )
        history = [
            {
                "question": self.benchmark_q["text"],
                "answer": diverse_wording,
                "benchmarkAnswer": self.ideal_answer,
            }
        ]
        semantic_score = calculate_semantic_correctness(history)
        self.assertGreaterEqual(semantic_score, 60.0, "Different domain-relevant wording achieves strong similarity.")

    # H. Irrelevant answer
    def test_case_h_irrelevant_answer(self):
        irrelevant_answer = "The weather today in Manila is sunny with light scattered showers."
        history = [
            {
                "question": self.benchmark_q["text"],
                "answer": irrelevant_answer,
                "benchmarkAnswer": self.ideal_answer,
            }
        ]
        semantic_score = calculate_semantic_correctness(history)
        self.assertLess(semantic_score, 20.0, "Irrelevant off-topic answer must score under 20.")

    # I. An accepted clarification still uses the approved core-topic reference.
    def test_case_i_follow_up_uses_canonical_core_benchmark(self):
        history = [
            {
                "questionId": "survey-6",
                "question": "Can you explain the specific technical challenge you faced?",
                "answer": "We hit a race condition when concurrent database writes occurred during peak traffic.",
                "benchmarkAnswer": "Describe an unexpected technical bottleneck, root cause investigation, and the architecture fix implemented.",
            }
        ]
        semantic_score = calculate_semantic_correctness(history)
        expected = round(max(0, min(100, calculate_cosine_similarity(
            _cached_encode(CORE_SURVEY_QUESTIONS[5]["idealAnswer"]),
            _cached_encode(history[0]["answer"])) * 100)), 2)
        self.assertEqual(semantic_score, expected)
        history[0]["benchmarkAnswer"] = history[0]["answer"]
        self.assertEqual(calculate_semantic_correctness(history), expected)
        self.assertLess(expected, 100)

    # J. Follow-up question without benchmarkAnswer
    def test_case_j_follow_up_without_benchmark(self):
        history = [
            {
                "question": self.benchmark_q["text"],
                "answer": "I have extensive academic grounding in software architecture and practical project experience.",
                "benchmarkAnswer": self.ideal_answer,
            },
            {
                "questionId": "survey-1",
                "isInteraction": True,
                "question": "Could you tell me more about that specific database issue?",
                "answer": "We optimized our indexing and query execution plans.",
                "benchmarkAnswer": "",  # Empty benchmark on follow-up
            },
        ]
        # Clarification interactions do not add a second scored response.
        semantic_score = calculate_semantic_correctness(history)
        self.assertGreaterEqual(semantic_score, 40.0)
        self.assertFalse(np.isnan(semantic_score))

    # K. Same answer across multiple runs for deterministic scoring
    def test_case_k_deterministic_scoring(self):
        fixed_answer = "I completed my degree with distinction, focusing on system architecture and collaborative delivery."
        history = [
            {
                "question": self.benchmark_q["text"],
                "answer": fixed_answer,
                "benchmarkAnswer": self.ideal_answer,
            }
        ]
        score_1 = calculate_semantic_correctness(history)
        score_2 = calculate_semantic_correctness(history)
        score_3 = calculate_semantic_correctness(history)

        self.assertEqual(score_1, score_2)
        self.assertEqual(score_2, score_3)

if __name__ == "__main__":
    unittest.main()
