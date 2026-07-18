from fastapi import status

class AppException(Exception):
    def __init__(self, message: str, code: str = "APP_ERROR", status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)

class BusinessError(AppException):
    pass

class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, "NOT_FOUND", 404)

class ConflictError(AppException):
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message, "CONFLICT", 409)

class ValidationError(AppException):
    def __init__(self, message: str = "Validation error"):
        super().__init__(message, "VALIDATION_ERROR", 422)
