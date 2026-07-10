type StoredToken = {
  token: string;
  expiresAt: number;
};

const TOKEN_STORAGE_KEY = 'elm.auth.token';

let memoryToken: StoredToken | null = null;

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) {
      return null;
    }

    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

    if (typeof window === 'undefined') {
      return null;
    }

    return JSON.parse(window.atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

function readLocalStorageToken(): StoredToken | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!rawToken) {
    return null;
  }

  try {
    return JSON.parse(rawToken) as StoredToken;
  } catch {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

function isExpired(expiresAt: number) {
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

export function setAuthToken(token: string, expiresInSeconds?: number) {
  const jwtPayload = decodeJwtPayload(token);
  const expiresAt =
    typeof jwtPayload?.exp === 'number'
      ? jwtPayload.exp * 1000
      : Date.now() + (expiresInSeconds ?? 60 * 60) * 1000;

  const nextToken: StoredToken = {
    token,
    expiresAt,
  };

  memoryToken = nextToken;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(nextToken));
  }
}

export function getAuthToken() {
  if (memoryToken && !isExpired(memoryToken.expiresAt)) {
    return memoryToken.token;
  }

  const storedToken = readLocalStorageToken();
  if (!storedToken) {
    memoryToken = null;
    return null;
  }

  if (isExpired(storedToken.expiresAt)) {
    clearAuthToken();
    return null;
  }

  memoryToken = storedToken;
  return storedToken.token;
}

export function clearAuthToken() {
  memoryToken = null;

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function hasValidAuthToken() {
  return Boolean(getAuthToken());
}