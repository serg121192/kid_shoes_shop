from decimal import Decimal
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from shop.models import Product, Vendor, ProductVideo
from shop.r2_upload import build_gallery_key, validate_gallery_key
from shop.video_upload import make_video_upload_token
from shop.tests.test_products import (
    PRODUCTS_URL,
    create_product,
    create_product_size,
    create_user,
    create_vendor,
)


class R2UploadHelperTests(SimpleTestCase):
    def test_validate_gallery_key_matches_product_slug(self):
        vendor = Vendor(name="Nike")
        product = Product(
            vendor=vendor,
            model_name="Air Max",
            prod_type=Product.ProductTypeChoices.SNEAKERS,
            gender=Product.GenderChoices.UNISEX,
            seasons=[Product.SeasonChoices.SUMMER],
            full_price=Decimal("100.00"),
        )
        key = build_gallery_key(product, "image/jpeg")
        self.assertTrue(validate_gallery_key(key, product))
        self.assertFalse(validate_gallery_key("products/gallery/other-123.jpg", product))
        self.assertFalse(validate_gallery_key("../secret.jpg", product))


class PresignImagesTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        create_product_size(self.product)
        self.admin = create_user(email="admin@test.com", is_staff=True)

    @patch("shop.views.is_r2_direct_upload_enabled", return_value=False)
    def test_presign_without_r2_returns_direct_upload_false(self, _mock_enabled):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            f"{PRODUCTS_URL}{self.product.id}/presign_images/",
            {"images": [{"content_type": "image/jpeg"}]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["direct_upload"])

    @override_settings(
        AWS_STORAGE_BUCKET_NAME="bucket",
        AWS_S3_ENDPOINT_URL="https://example.r2.cloudflarestorage.com",
        AWS_ACCESS_KEY_ID="key",
        AWS_SECRET_ACCESS_KEY="secret",
    )
    @patch("shop.views.is_r2_direct_upload_enabled", return_value=True)
    @patch("shop.views.presign_gallery_uploads")
    def test_presign_with_r2_returns_upload_urls(self, mock_presign, _mock_enabled):
        mock_presign.return_value = [
            {
                "key": "products/gallery/nike-air-max-abc.jpg",
                "upload_url": "https://signed.example/put",
                "content_type": "image/jpeg",
            }
        ]
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            f"{PRODUCTS_URL}{self.product.id}/presign_images/",
            {"images": [{"content_type": "image/jpeg"}]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["direct_upload"])
        self.assertEqual(len(res.data["uploads"]), 1)

    @override_settings(
        AWS_STORAGE_BUCKET_NAME="bucket",
        AWS_S3_ENDPOINT_URL="https://example.r2.cloudflarestorage.com",
        AWS_ACCESS_KEY_ID="key",
        AWS_SECRET_ACCESS_KEY="secret",
    )
    @patch("shop.views.is_r2_direct_upload_enabled", return_value=True)
    @patch("shop.views.presign_video_upload")
    def test_presign_video_with_r2(self, mock_presign, _mock_enabled):
        mock_presign.return_value = {
            "key": "products/videos/nike-air-max-abc.mp4",
            "upload_url": "https://signed.example/put",
            "content_type": "video/mp4",
        }
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            f"{PRODUCTS_URL}{self.product.id}/presign_video/",
            {"content_type": "video/mp4", "filename": "clip.mp4"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["direct_upload"])
        self.assertEqual(res.data["upload"]["content_type"], "video/mp4")

    @override_settings(BACKEND_PUBLIC_URL="https://api.example.com")
    @patch("shop.views.is_r2_direct_upload_enabled", return_value=False)
    def test_prepare_video_upload_without_r2_returns_backend(self, _mock_enabled):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            f"{PRODUCTS_URL}{self.product.id}/prepare_video_upload/",
            {"content_type": "video/mp4", "filename": "clip.mp4"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data["r2"])
        self.assertIn("token", res.data["backend"])
        self.assertTrue(
            res.data["backend"]["url"].endswith(
                f"/api/shop/products/{self.product.id}/upload_video/"
            )
        )

    def test_upload_video_with_signed_token(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        token = make_video_upload_token(self.product.id)
        video = SimpleUploadedFile("clip.mp4", b"x" * 1024, content_type="video/mp4")
        res = self.client.post(
            f"{PRODUCTS_URL}{self.product.id}/upload_video/",
            {"video": video, "title": "Test", "order": 0},
            format="multipart",
            HTTP_X_VIDEO_UPLOAD_TOKEN=token,
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ProductVideo.objects.filter(product=self.product).count(), 1)

    def test_upload_video_rejects_bad_token(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        video = SimpleUploadedFile("clip.mp4", b"x" * 64, content_type="video/mp4")
        res = self.client.post(
            f"{PRODUCTS_URL}{self.product.id}/upload_video/",
            {"video": video},
            format="multipart",
            HTTP_X_VIDEO_UPLOAD_TOKEN="bad-token",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
