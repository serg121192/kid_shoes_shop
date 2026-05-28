import os
from pathlib import Path

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "kid_shoes_shop.settings")
django.setup()

from django.core.files.storage import default_storage
from django.core.files import File
from django.conf import settings


MEDIA_ROOT = Path(settings.MEDIA_ROOT)
media_files = [file for file in MEDIA_ROOT.rglob("*") if file.is_file()]

uploaded = 0
skipped = 0
errors = 0

print(f"Found {len(media_files)} media files in local storage. Ready to upload to R2.")

for local_path in media_files:
    relative_path = local_path.relative_to(MEDIA_ROOT)
    relative_path_str = relative_path.as_posix()

    try:
        if default_storage.exists(relative_path_str):
            print(f"Skipping {relative_path_str} because it already exists in R2.")
            skipped += 1
            continue
    
        with open(local_path, "rb") as f:
            saved_path = default_storage.save(relative_path_str, File(f))
        print("Uploaded: ", saved_path)
        uploaded += 1
    except Exception as e:
        print(f"Error uploading {relative_path_str}: {e}")
        errors += 1

print(
    f"Uploaded: {uploaded} files.\n"
    f"Skipped: {skipped} files.\n"
    f"Errors: {errors} files."
)
