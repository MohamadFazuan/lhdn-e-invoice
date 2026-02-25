import bcrypt from 'bcryptjs';

// --- Password hashing (bcryptjs — pure JS, safe in Cloudflare Workers) ---

export async function hashPassword(password: string, rounds = 10): Promise<string> {
  return bcrypt.hash(password, rounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// --- SHA-256 hashing (Web Crypto API) ---

export async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Base64(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
