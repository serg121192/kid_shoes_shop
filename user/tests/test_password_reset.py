from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

PASSWORD_RESET_URL = "/api/user/password-reset/"
PASSWORD_RESET_CONFIRM_URL = "/api/user/password-reset/confirm/"


def create_user(email="user@test.com", password="testpassword123"):
    return User.objects.create_user(email=email, password=password)


def make_uid_and_token(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = PasswordResetTokenGenerator().make_token(user)
    return uid, token


class PasswordResetRequestTests(APITestCase):

    def setUp(self):
        self.user = create_user()

    def test_reset_request_with_valid_email_returns_200(self):
        res = self.client.post(PASSWORD_RESET_URL, {"email": self.user.email})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("detail", res.data)

    def test_reset_request_with_unknown_email_returns_400(self):
        res = self.client.post(PASSWORD_RESET_URL, {"email": "unknown@test.com"})

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_request_without_email_returns_400(self):
        res = self.client.post(PASSWORD_RESET_URL, {})

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_request_sends_email(self):
        from django.core import mail

        self.client.post(PASSWORD_RESET_URL, {"email": self.user.email})

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(self.user.email, mail.outbox[0].to)
        self.assertIn("reset", mail.outbox[0].subject.lower())


class PasswordResetConfirmTests(APITestCase):

    def setUp(self):
        self.user = create_user()
        self.uid, self.token = make_uid_and_token(self.user)

    def test_confirm_with_valid_token_resets_password(self):
        res = self.client.post(PASSWORD_RESET_CONFIRM_URL, {
            "uid": self.uid,
            "token": self.token,
            "new_password": "newpassword456",
        })

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpassword456"))

    def test_confirm_with_invalid_token_returns_400(self):
        res = self.client.post(PASSWORD_RESET_CONFIRM_URL, {
            "uid": self.uid,
            "token": "invalid-token",
            "new_password": "newpassword456",
        })

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_with_invalid_uid_returns_400(self):
        res = self.client.post(PASSWORD_RESET_CONFIRM_URL, {
            "uid": "invalid-uid",
            "token": self.token,
            "new_password": "newpassword456",
        })

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_with_short_password_returns_400(self):
        res = self.client.post(PASSWORD_RESET_CONFIRM_URL, {
            "uid": self.uid,
            "token": self.token,
            "new_password": "short",
        })

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password("short"))

    def test_confirm_token_can_only_be_used_once(self):
        self.client.post(PASSWORD_RESET_CONFIRM_URL, {
            "uid": self.uid,
            "token": self.token,
            "new_password": "newpassword456",
        })

        res = self.client.post(PASSWORD_RESET_CONFIRM_URL, {
            "uid": self.uid,
            "token": self.token,
            "new_password": "anotherpassword789",
        })

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
