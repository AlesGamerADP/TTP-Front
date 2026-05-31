// Cifrado de datos en localStorage (Web Crypto API)
// La clave se inyecta en build time vía NEXT_PUBLIC_ENCRYPTION_KEY

function resolveEncryptionKey(): string {
  const envKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY?.trim();
  if (envKey && envKey.length >= 32) {
    return envKey;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'dev-local-encryption-key-32chars-min!!';
  }
  throw new Error(
    'NEXT_PUBLIC_ENCRYPTION_KEY no está configurada o es demasiado corta (mínimo 32 caracteres).'
  );
}

const ENCRYPTION_KEY = resolveEncryptionKey();

function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

async function getKey(): Promise<CryptoKey> {
  const keyData = stringToArrayBuffer(ENCRYPTION_KEY);
  return await crypto.subtle.importKey('raw', keyData, { name: 'PBKDF2' }, false, ['deriveKey']);
}

async function deriveKey(): Promise<CryptoKey> {
  const baseKey = await getKey();
  const salt = stringToArrayBuffer('ingetec-storage-salt-v2');

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(data: string): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = stringToArrayBuffer(data);

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedData);

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encryptedData: string): Promise<string> {
  const key = await deriveKey();
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return arrayBufferToString(decrypted);
}

export function obfuscate(data: string): string {
  return btoa(data);
}

export function deobfuscate(obfuscated: string): string {
  return atob(obfuscated);
}
