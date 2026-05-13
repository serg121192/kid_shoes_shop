from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from django.conf import settings as django_settings

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from user.throttles import LoginRateThrottle, TokenRefreshRateThrottle
from user.serializers import (
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserSerializer,
)

COOKIE_SECURE = not django_settings.DEBUG
COOKIE_SAMESITE = "Lax"

User = get_user_model()


class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access = response.data.pop("access", None)
            refresh = response.data.pop("refresh", None)
            if access:
                response.set_cookie(
                    "access_token",
                    access,
                    max_age=int(django_settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
                    httponly=True,
                    secure=COOKIE_SECURE,
                    samesite=COOKIE_SAMESITE,
                    path="/",
                )
            if refresh:
                response.set_cookie(
                    "refresh_token",
                    refresh,
                    max_age=int(django_settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
                    httponly=True,
                    secure=COOKIE_SECURE,
                    samesite=COOKIE_SAMESITE,
                    path="/",
                )
        return response


class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [TokenRefreshRateThrottle]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token and "refresh" not in request.data:
            request._full_data = {**request.data, "refresh": refresh_token}

        try:
            response = super().post(request, *args, **kwargs)
        except (TokenError, InvalidToken) as exc:
            raise InvalidToken(exc.args[0]) from exc

        if response.status_code == 200:
            access = response.data.pop("access", None)
            if access:
                response.set_cookie(
                    "access_token",
                    access,
                    max_age=int(django_settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
                    httponly=True,
                    secure=COOKIE_SECURE,
                    samesite=COOKIE_SAMESITE,
                    path="/",
                )
            refresh = response.data.pop("refresh", None)
            if refresh:
                response.set_cookie(
                    "refresh_token",
                    refresh,
                    max_age=int(django_settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
                    httponly=True,
                    secure=COOKIE_SECURE,
                    samesite=COOKIE_SAMESITE,
                    path="/",
                )
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)
        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/")
        return response


class CreateUserView(generics.CreateAPIView):
    serializer_class = UserSerializer


class ManageUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user


class PasswordResetRequestView(APIView):
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.get(email=email)

        token = PasswordResetTokenGenerator().make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

        send_mail(
            subject="Password Reset — Kid Shoes Shop",
            message=(
                f"Hi,\n\n"
                f"Click the link below to reset your password:\n{reset_url}\n\n"
                f"The link is valid for 24 hours.\n"
                f"If you didn't request this, ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
        )

        return Response(
            {"detail": "Password reset email has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            user_pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_pk)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "Invalid reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response(
                {"error": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()

        return Response(
            {"detail": "Password has been reset successfully."},
            status=status.HTTP_200_OK,
        )
