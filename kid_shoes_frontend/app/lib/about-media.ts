/** URL фото команди на сторінці «Про нас» (R2). Задається через NEXT_PUBLIC_EMPLOYEES_PHOTO_URL */
export function getEmployeesPhotoUrl(): string {
  return process.env.NEXT_PUBLIC_EMPLOYEES_PHOTO_URL?.trim() ?? "";
}
