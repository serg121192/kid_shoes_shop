from rest_framework.permissions import BasePermission, SAFE_METHODS


def can_manage_orders(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (user.is_staff or getattr(user, "is_seller", False))
    )


class IsAdminOrReadOnly(BasePermission):
    """Read access for everyone; write access only for staff/admin."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class IsStaffOrSeller(BasePermission):
    """Staff managers or shop sellers."""

    def has_permission(self, request, view):
        return can_manage_orders(request.user)


class IsAdminOrVideoUploadToken(BasePermission):
    """Staff cookie auth or signed X-Video-Upload-Token for direct Railway upload."""

    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated and request.user.is_staff:
            return True
        return bool(request.headers.get("X-Video-Upload-Token"))


class IsOwnerOrAdmin(BasePermission):
    """
    View-level: requires authentication.
    Object-level: owner, staff, or seller can access the object.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if can_manage_orders(request.user):
            return True
        return getattr(obj, "user", None) == request.user
