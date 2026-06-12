import { AxiosError } from 'axios';

// Pulls the backend's error message out of an Axios error; falls back for
// network failures and unexpected response shapes.
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    if (message) return message;
  }
  return fallback;
}
