
// src/lib/api.ts
//
// Point d'entrée UNIQUE pour tous les appels au backend.
//
// Toutes les pages utilisent :
// API_URL
// authHeaders()
// fetchJson()
// postJson()
// putJson()
// deleteJson()

export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000';

console.log('DEBUG API_URL =', API_URL, '| VITE_API_URL brute =', import.meta.env.VITE_API_URL);
// =====================================================
// AUTHENTIFICATION
// =====================================================

export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}


// =====================================================
// FETCH GENERIQUE
// GET / PATCH / PUT / DELETE...
// =====================================================

export async function fetchJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {

  const headers: HeadersInit = {
    ...authHeaders(),
    ...(options.headers || {}),
  };

  // Ajouter Content-Type automatiquement lorsque nécessaire
  if (
    options.body &&
    !(headers as Record<string, string>)['Content-Type']
  ) {
    (headers as Record<string, string>)['Content-Type'] =
      'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Gestion d'une erreur HTTP
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));

    throw new Error(
      errorData.message ||
        `Erreur API ${path}: ${res.status}`
    );
  }

  // Certains PATCH/DELETE peuvent retourner 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}


// =====================================================
// POST
// =====================================================

export async function postJson<T>(
  path: string,
  body: unknown
): Promise<T> {

  return fetchJson<T>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}


// =====================================================
// PUT
// =====================================================

export async function putJson<T>(
  path: string,
  body: unknown
): Promise<T> {

  return fetchJson<T>(path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}


// =====================================================
// DELETE
// =====================================================

export async function deleteJson<T>(
  path: string
): Promise<T> {

  return fetchJson<T>(path, {
    method: 'DELETE',
  });
}

