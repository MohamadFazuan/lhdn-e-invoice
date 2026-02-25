// AES-GCM-256 encryption using Web Crypto API
// Compatible with Cloudflare Workers runtime
//
// Storage format: base64(iv[12 bytes] + ciphertext)
// The IV is random per encryption — same plaintext always produces different ciphertext.

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

async function importKey(hexKey: string): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(
    hexKey.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)),
  );
  return crypto.subtle.importKey('raw', keyBytes, { name: ALGORITHM }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encrypt(plaintext: string, hexKey: string): Promise<string> {
  const key = await importKey(hexKey);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(base64Ciphertext: string, hexKey: string): Promise<string> {
  const key = await importKey(hexKey);
  const combined = Uint8Array.from(atob(base64Ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}
