from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

REGISTER_URL = "/api/user/register/"
TOKEN_URL = "/api/user/token/"
TOKEN_REFRESH_URL = "/api/user/token/refresh/"
ME_URL = "/api/user/me/"


class RegisterUserTests(APITestCase):
    def test_register_user_success(self):
        payload = {
            "email": "test@example.com",
            "password": "testpassword",
        }
        res = self.client.post(REGISTER_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email=payload["email"]).exists())
        self.assertNotIn("password", res.data)

    def test_register_user_with_existing_email_returns_400(self):
        payload = {
            "email": "test@example.com",
            "password": "testpassword",
        }
        self.client.post(REGISTER_URL, payload)
        res = self.client.post(REGISTER_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_register_user_with_short_password_returns_400(self):
        payload = {
            "email": "test@example.com",
            "password": "short",
        }
        res = self.client.post(REGISTER_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class TokenTests(APITestCase):
    def test_token_obtain_pair_success(self):
        payload = {
            "email": "test@example.com",
            "password": "testpassword",
        }
        self.client.post(REGISTER_URL, payload)
        res = self.client.post(TOKEN_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_token_obtain_pair_with_invalid_credentials_returns_401(self):
        payload = {
            "email": "test@example.com",
            "password": "wrongpassword",
        }
        res = self.client.post(TOKEN_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res.data["detail"], "No active account found with the given credentials")
        
    def test_token_without_password_returns_400(self):
        payload = {
            "email": "test@example.com",
        }
        res = self.client.post(TOKEN_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["password"][0], "This field is required.")
        
    def test_take_new_token_with_refresh_token_success(self):
        payload = {
            "email": "test@example.com",
            "password": "testpassword",
        }
        self.client.post(REGISTER_URL, payload)
        res = self.client.post(TOKEN_URL, payload)
        refresh = res.data["refresh"]
        res = self.client.post(TOKEN_REFRESH_URL, {"refresh": refresh})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)


class ManageUserTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpassword",
            is_staff=True,
        )

    def test_unathorized_user_access_me_endpoint_return_401(self):
        res = self.client.get(ME_URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authorized_user_access_me_endpoint_return_200(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(ME_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["email"], self.user.email)
        self.assertEqual(res.data["is_staff"], self.user.is_staff)
        
    def test_authorized_user_update_email_success(self):
        self.client.force_authenticate(user=self.user)
        payload = {"email": "new@example.com"}
        res = self.client.patch(ME_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, payload["email"])
        
    def test_authorized_user_update_password_success(self):
        self.client.force_authenticate(user=self.user)
        payload = {"password": "newpassword"}
        res = self.client.patch(ME_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(payload["password"]))
        