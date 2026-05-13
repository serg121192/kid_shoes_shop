from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView

from user.views import (
    CreateUserView,
    ManageUserView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ThrottledTokenObtainPairView,
    ThrottledTokenRefreshView,
    LogoutView,
)


app_name = "user"

urlpatterns = [
    path("register/", CreateUserView.as_view(), name="create"),
    path("token/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", ThrottledTokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("me/", ManageUserView.as_view(), name="manage"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
]
