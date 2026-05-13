from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """10 attempts per minute per IP for token obtain."""
    scope = "login"
    rate = "10/min"


class TokenRefreshRateThrottle(UserRateThrottle):
    """30 refresh calls per minute per user/IP."""
    scope = "token_refresh"
    rate = "30/min"
