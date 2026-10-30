"""
One consistent error envelope for every failure:

    {
      "status_code": 400,
      "error": "validation_error",
      "message": "One or more fields are invalid.",
      "details": {"field_name": ["What is wrong."]}      # only for validation errors
    }
"""

from django.db import IntegrityError
from rest_framework import status
from rest_framework.exceptions import APIException, NotAuthenticated
from rest_framework.response import Response
from rest_framework.views import exception_handler


class Conflict(APIException):
    """409 - the request is valid but clashes with existing data."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "The request conflicts with existing data."
    default_code = "conflict"


class InvalidCredentials(APIException):
    """401 for wrong username/password (these views have no auth header to trigger it)."""

    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Invalid username or password."
    default_code = "authentication_failed"


_CODES = {
    400: "validation_error",
    401: "authentication_failed",
    403: "permission_denied",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    415: "unsupported_media_type",
    429: "throttled",
}


def api_exception_handler(exc, context):
    if isinstance(exc, IntegrityError):
        return Response(
            {
                "status_code": 409,
                "error": "conflict",
                "message": "The change violates a database uniqueness or integrity rule.",
            },
            status=409,
        )

    response = exception_handler(exc, context)
    if response is None:
        return None  # genuine server error -> Django's 500

    code = _CODES.get(response.status_code, "error")
    if isinstance(exc, NotAuthenticated):
        code = "not_authenticated"

    data = response.data
    body = {"status_code": response.status_code, "error": code}

    if isinstance(data, dict) and set(data.keys()) == {"detail"}:
        body["message"] = str(data["detail"])
    elif response.status_code == 400:
        body["message"] = "One or more fields are invalid."
        body["details"] = data if isinstance(data, dict) else {"non_field_errors": data}
    else:
        body["message"] = str(data)

    response.data = body
    return response
