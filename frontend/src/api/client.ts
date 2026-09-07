// Con valor (`http://localhost:8080` en dev): el backend vive en otro host/puerto.
// Vacío (deploy tras un reverse-proxy que sirve front y back en el mismo origen):
// todas las llamadas van relativas a la página.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {};
  if (options.body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method,
    headers,
    body:
      options.body === undefined
        ? undefined
        : isFormData
          ? (options.body as FormData)
          : JSON.stringify(options.body),
  });

  if (!response.ok) {
    // Token vencido/ inválido en una llamada autenticada: la sesión ya no sirve.
    // No se dispara en el 401 de "credenciales inválidas" del login (ese no lleva token).
    if (response.status === 401 && options.token) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    const message = await response
      .json()
      .then((body: { message?: string }) => body.message ?? response.statusText)
      .catch(() => response.statusText);
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function apiGet<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, { method: 'GET', token });
}

export function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, { method: 'POST', body, token });
}

export function apiPut<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, { method: 'PUT', body, token });
}

export function apiDelete<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, { method: 'DELETE', token });
}

/** POST de multipart/form-data — el navegador arma el Content-Type con su boundary. */
export function apiUpload<T>(path: string, formData: FormData, token?: string): Promise<T> {
  return request<T>(path, { method: 'POST', body: formData, token });
}

/** Antepone la base del backend a una ruta de media (`/media/...`) que el API devuelve relativa. */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return `${API_BASE_URL}${path}`;
}

/**
 * URL absoluta del endpoint WebSocket. Con `VITE_API_BASE_URL` seteada, deriva
 * `ws(s)://` de esa base (`http` → `ws`, `https` → `wss`). Con la base vacía
 * (deploy tras reverse-proxy, mismo origen que la página) la deriva de
 * `window.location` — `@stomp/stompjs` exige una URL absoluta en `brokerURL`.
 */
export function wsUrl(path = '/ws'): string {
  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/^http/, 'ws')}${path}`;
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}${path}`;
}
