import { passwordSchema } from './validations';

export type GeneratePasswordOptions = {
  userName?: string;
  companyName?: string;
};

function randomIndex(max: number): number {
  if (max <= 0) return 0;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

function pickChar(pool: string): string {
  return pool[randomIndex(pool.length)]!;
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '');
}

function lettersOnly(value: string): string {
  return stripAccents(value).replace(/[^a-zA-Z]/g, '');
}

function nameWords(fullName: string): string[] {
  return stripAccents(fullName)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Mezcla mayúsculas y minúsculas sin exagerar. */
function mixCase(text: string): string {
  const lower = text.toLowerCase();
  if (lower.length === 0) return '';

  const chars = lower.split('');
  const upperCount = Math.min(
    Math.max(1, Math.floor(chars.length / 3)),
    Math.max(1, Math.floor(chars.length / 2)),
  );
  const upperPositions = new Set<number>();
  while (upperPositions.size < upperCount && upperPositions.size < chars.length) {
    upperPositions.add(randomIndex(chars.length));
  }

  return chars
    .map((char, index) => (upperPositions.has(index) ? char.toUpperCase() : char))
    .join('');
}

function partFromName(fullName: string | undefined): string {
  const words = fullName ? nameWords(fullName) : [];
  if (words.length >= 2) {
    const first = lettersOnly(words[0]!);
    const last = lettersOnly(words[words.length - 1]!);
    return (first.slice(0, 2) + last.slice(0, 2)).slice(0, 4);
  }
  if (words.length === 1) {
    const single = lettersOnly(words[0]!);
    if (single.length >= 4) {
      const start = randomIndex(Math.max(1, single.length - 3));
      return single.slice(start, start + 4);
    }
    return single.slice(0, 4);
  }
  return '';
}

function partFromCompany(companyName: string | undefined): string {
  const letters = lettersOnly(companyName ?? '');
  if (letters.length >= 3) {
    const len = Math.min(4, letters.length);
    const start = letters.length > len ? randomIndex(letters.length - len + 1) : 0;
    return letters.slice(start, start + len);
  }
  if (letters.length > 0) {
    return letters.padEnd(3, pickChar('aeiou')).slice(0, 3);
  }
  return '';
}

function fallbackLetters(): string {
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  const vowels = 'aeiou';
  return pickChar(consonants) + pickChar(vowels) + pickChar(consonants);
}

function ensureSchema(candidate: string): string {
  let pwd = candidate;
  if (!/\d/.test(pwd)) {
    pwd += String(10 + randomIndex(90));
  }
  if (!/[A-Za-z]/.test(pwd)) {
    pwd = `a${pwd}`;
  }
  while (pwd.length < 8) {
    pwd += pickChar('abcdefghijklmnopqrstuvwxyz');
  }
  if (pwd.length > 14) {
    pwd = pwd.slice(0, 14);
  }

  const parsed = passwordSchema.safeParse(pwd);
  if (parsed.success) {
    return parsed.data;
  }

  return ensureSchema(`${pwd.slice(0, 10)}${10 + randomIndex(90)}`);
}

/**
 * Contraseña legible basada en nombre, empresa y números.
 * Solo letras (mayúsculas/minúsculas mezcladas) y dígitos, sin símbolos.
 */
export function generateReadablePassword(options?: GeneratePasswordOptions): string {
  let userPart = partFromName(options?.userName);
  let companyPart = partFromCompany(options?.companyName);

  if (!userPart) userPart = fallbackLetters();
  if (!companyPart) companyPart = fallbackLetters();

  const digits = String(10 + randomIndex(90));
  const candidate = mixCase(userPart) + mixCase(companyPart) + digits;

  return ensureSchema(candidate);
}
