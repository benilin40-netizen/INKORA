/**
 * Shared API Response Handler
 * Enforces content-type inspection, status verification, and safe JSON parsing
 * to prevent SyntaxError ("<!doctype ... is not valid JSON") when HTML is returned.
 */

export class ApiError extends Error {
  status: number;
  statusText: string;
  url: string;
  contentType: string | null;

  constructor(
    message: string,
    status: number,
    statusText: string,
    url: string,
    contentType: string | null,
    cause?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.contentType = contentType;
    if (cause) {
      this.cause = cause;
    }
  }
}

export async function fetchJson<T = any>(
  input: string | URL,
  init?: RequestInit
): Promise<T> {
  const url = typeof input === 'string' ? input : input.toString();

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (networkErr: any) {
    throw new ApiError(
      `Network request failed to ${url}: ${networkErr?.message || 'Server unreachable'}`,
      0,
      'NetworkError',
      url,
      null,
      networkErr
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  // If response is HTML instead of JSON (typical SPA rewrite or server error page)
  if (!isJson) {
    const isHtml = contentType.toLowerCase().includes('text/html');
    const diagnostic = isHtml
      ? `API route ${url} responded with HTML (HTTP ${response.status} ${response.statusText}) instead of JSON. Ensure the endpoint is defined on the backend.`
      : `API route ${url} responded with non-JSON Content-Type "${contentType}" (HTTP ${response.status} ${response.statusText}).`;

    throw new ApiError(diagnostic, response.status, response.statusText, url, contentType);
  }

  // Safe JSON extraction
  let data: any;
  try {
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return {} as T;
    }
    data = JSON.parse(text);
  } catch (parseErr: any) {
    throw new ApiError(
      `Invalid JSON received from ${url} (HTTP ${response.status} ${response.statusText}): ${parseErr?.message}`,
      response.status,
      response.statusText,
      url,
      contentType,
      parseErr
    );
  }

  // Check HTTP response status before treating as successful
  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new ApiError(errorMsg, response.status, response.statusText, url, contentType);
  }

  return data as T;
}
