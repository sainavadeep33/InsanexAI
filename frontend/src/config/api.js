/**
 * InsanexAI API Configuration
 * Supports local development and production environments (e.g. AWS EC2 with reverse proxy)
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.PROD
      ? ''
      : 'http://127.0.0.1:8000'
