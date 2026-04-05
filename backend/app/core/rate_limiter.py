import time
from typing import Callable, Any
from functools import wraps
from datetime import datetime, timedelta

class KiteRateLimiter:
    """Rate limiter for Zerodha Kite API.

    Zerodha Kite API has following rate limits:
    - 3 requests per second per API key
    - 100 requests per minute
    - Burst: up to 10 requests
    """

    def __init__(self, max_calls_per_second: int = 3, max_calls_per_minute: int = 100):
        self.max_calls_per_second = max_calls_per_second
        self.max_calls_per_minute = max_calls_per_minute
        self.call_times_second = []
        self.call_times_minute = []

    def wait_if_needed(self):
        """Check rate limits and wait if necessary."""
        now = time.time()

        # Clean old timestamps (older than 1 minute)
        cutoff_time = now - 60
        self.call_times_second = [t for t in self.call_times_second if t > now - 1]
        self.call_times_minute = [t for t in self.call_times_minute if t > cutoff_time]

        # Check per-second limit
        if len(self.call_times_second) >= self.max_calls_per_second:
            sleep_time = 1.0 - (now - self.call_times_second[0])
            if sleep_time > 0:
                print(f"[RateLimit] Per-second limit reached. Sleeping {sleep_time:.2f}s")
                time.sleep(sleep_time)
                now = time.time()
                self.call_times_second = []

        # Check per-minute limit
        if len(self.call_times_minute) >= self.max_calls_per_minute:
            sleep_time = 60 - (now - self.call_times_minute[0])
            if sleep_time > 0:
                print(f"[RateLimit] Per-minute limit reached. Sleeping {sleep_time:.2f}s")
                time.sleep(sleep_time)
                now = time.time()
                self.call_times_minute = []

        # Record this call
        self.call_times_second.append(now)
        self.call_times_minute.append(now)

    def __call__(self, func: Callable) -> Callable:
        """Decorator to apply rate limiting to a function."""
        @wraps(func)
        def wrapper(*args, **kwargs):
            self.wait_if_needed()
            return func(*args, **kwargs)
        return wrapper


# Global rate limiter instance
kite_limiter = KiteRateLimiter(max_calls_per_second=3, max_calls_per_minute=100)
