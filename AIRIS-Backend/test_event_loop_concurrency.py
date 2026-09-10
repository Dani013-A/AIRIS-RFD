import asyncio
import time
import unittest
from fastapi.testclient import TestClient
from main import app

class TestEventLoopConcurrency(unittest.TestCase):
    def test_health_check_response_time(self):
        client = TestClient(app)
        start = time.time()
        res = client.get("/")
        elapsed = time.time() - start
        self.assertEqual(res.status_code, 200)
        self.assertLess(elapsed, 0.5, f"GET / took {elapsed:.2f}s, expected < 0.5s")
        print(f"\n[GET / Latency Test] Returned HTTP 200 in {elapsed*1000:.2f}ms")

if __name__ == "__main__":
    unittest.main()
