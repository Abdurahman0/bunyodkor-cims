/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Extracts a user-friendly error message from API error responses
 * Handles FastAPI validation errors (422) which return arrays of error objects
 */
export function extractErrorMessage(error: any, fallbackMessage: string = 'An error occurred'): string {
  const detail = error?.response?.data?.detail;

  // Handle FastAPI validation errors (array format)
  if (Array.isArray(detail) && detail.length > 0) {
    return detail[0].msg || detail[0].message || fallbackMessage;
  }

  // Handle string detail
  if (typeof detail === 'string') {
    return detail;
  }

  // Handle message field
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  return fallbackMessage;
}
