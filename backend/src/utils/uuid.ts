export function generateUUID(): string {
  return crypto.randomUUID();
}

export const newId = generateUUID;
