import unittest
from transcriber import calculate_audio_pause_metrics

class TestPauseAnalysis(unittest.TestCase):
    def test_pause_metrics_zero_seconds(self):
        # Continuous speech with no silence gaps
        segments = [
            {"start": 0.5, "end": 2.0},
            {"start": 2.0, "end": 4.0}
        ]
        metrics = calculate_audio_pause_metrics(segments)
        self.assertEqual(metrics["totalPauseDuration"], 0.0)
        self.assertEqual(metrics["pauseCount"], 0)
        self.assertEqual(metrics["pausePeriodEquivalent"], 0.0)
        self.assertEqual(metrics["longestPause"], 0.0)

    def test_pause_metrics_half_second(self):
        # 0.50 seconds silence gap between segment 1 and 2
        segments = [
            {"start": 1.0, "end": 3.0},
            {"start": 3.5, "end": 5.0} # gap = 0.5s
        ]
        metrics = calculate_audio_pause_metrics(segments)
        self.assertEqual(metrics["totalPauseDuration"], 0.5)
        self.assertEqual(metrics["pauseCount"], 1)
        self.assertEqual(metrics["pausePeriodEquivalent"], 0.5)
        self.assertEqual(metrics["longestPause"], 0.5)

    def test_pause_metrics_one_second(self):
        # 1.00 second silence gap = 1.00 pausePeriodEquivalent
        segments = [
            {"start": 1.0, "end": 3.0},
            {"start": 4.0, "end": 6.0} # gap = 1.0s
        ]
        metrics = calculate_audio_pause_metrics(segments)
        self.assertEqual(metrics["totalPauseDuration"], 1.0)
        self.assertEqual(metrics["pauseCount"], 1)
        self.assertEqual(metrics["pausePeriodEquivalent"], 1.0)
        self.assertEqual(metrics["longestPause"], 1.0)

    def test_pause_metrics_two_seconds(self):
        # 2.00 seconds silence gap = 2.00 pausePeriodEquivalent
        segments = [
            {"start": 1.0, "end": 3.0},
            {"start": 5.0, "end": 7.0} # gap = 2.0s
        ]
        metrics = calculate_audio_pause_metrics(segments)
        self.assertEqual(metrics["totalPauseDuration"], 2.0)
        self.assertEqual(metrics["pauseCount"], 1)
        self.assertEqual(metrics["pausePeriodEquivalent"], 2.0)
        self.assertEqual(metrics["longestPause"], 2.0)

    def test_pause_metrics_three_point_five_seconds(self):
        # 3.50 seconds silence gap = 3.50 pausePeriodEquivalent
        segments = [
            {"start": 0.8, "end": 2.0},
            {"start": 5.5, "end": 8.0} # gap = 3.5s
        ]
        metrics = calculate_audio_pause_metrics(segments)
        self.assertEqual(metrics["totalPauseDuration"], 3.5)
        self.assertEqual(metrics["pauseCount"], 1)
        self.assertEqual(metrics["pausePeriodEquivalent"], 3.5)
        self.assertEqual(metrics["longestPause"], 3.5)

    def test_pause_metrics_boundary_conditions_exclusion(self):
        # Pre-speech silence (0.0 to 2.5s) and Post-speech recording delay (10.0 to 15.0s) MUST BE EXCLUDED
        # Only middle gaps count: Gap 1 (5.0s to 6.5s = 1.5s), Gap 2 (8.0s to 10.0s = 2.0s)
        segments = [
            {"start": 2.5, "end": 5.0}, # pre-speech 0-2.5s ignored
            {"start": 6.5, "end": 8.0}, # gap 1 = 1.5s
            {"start": 10.0, "end": 12.0} # gap 2 = 2.0s; post-speech 12-15s ignored
        ]
        metrics = calculate_audio_pause_metrics(segments)
        self.assertEqual(metrics["totalPauseDuration"], 3.5) # 1.5s + 2.0s
        self.assertEqual(metrics["pauseCount"], 2)
        self.assertEqual(metrics["pausePeriodEquivalent"], 3.5)
        self.assertEqual(metrics["longestPause"], 2.0)
        self.assertEqual(metrics["averagePauseDuration"], 1.75)

if __name__ == "__main__":
    unittest.main()
