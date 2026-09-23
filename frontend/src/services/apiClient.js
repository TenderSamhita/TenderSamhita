/**
 * API Client with timeout, JSON parsing, and production-ready base URL handling
 */

const API_BASE =
  (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "") || (import.meta.env.PROD ? window.location.origin : "http://localhost:8000");

export async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const defaultHeaders = {
    Accept: "application/json",
  };

  // Only add Content-Type if NOT FormData
  if (!(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  // Timeout handling
  const controller = new AbortController();
  const timeout = options.timeout || 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  config.signal = controller.signal;

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;

      try {
        const errorData = await response.json();
        errorMessage =
          errorData.detail || errorData.message || errorMessage;
      } catch {
        // ignore non-json error
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout}ms`);
    }

    throw error;
  }
}
