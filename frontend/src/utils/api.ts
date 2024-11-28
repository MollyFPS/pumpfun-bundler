import axios, { AxiosError } from 'axios';

export class APIError extends Error {
  public statusCode: number;
  public details: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown): APIError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    return new APIError(
      axiosError.response?.data?.message || 'An error occurred',
      axiosError.response?.status || 500,
      axiosError.response?.data
    );
  }
  return new APIError('An unexpected error occurred', 500);
} 