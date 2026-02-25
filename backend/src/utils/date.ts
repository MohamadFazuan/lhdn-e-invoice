export function nowISO(): string {
  return new Date().toISOString();
}

export function toISODate(d: Date): string {
  return d.toISOString().substring(0, 10); // YYYY-MM-DD
}

export function toISOTime(d: Date): string {
  return d.toISOString().substring(11, 19) + 'Z'; // HH:MM:SSZ
}

export function expiresInSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function expiresInMs(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

export function isExpired(isoDate: string): boolean {
  return new Date(isoDate) <= new Date();
}
