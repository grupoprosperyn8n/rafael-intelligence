export function normalizeName(value?: string): string {
  if (!value) return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePhone(value?: string | number): string {
  if (!value) return "";

  const digits = String(value).replace(/\D/g, "");

  if (!digits) return "";

  // Argentina: nos interesa principalmente la parte estable.
  return digits.slice(-10);
}

export function normalizeDni(value?: string | number): string {
  if (!value) return "";

  return String(value).replace(/\D/g, "");
}

export function normalizeEmail(value?: string): string {
  if (!value) return "";

  return value.trim().toLowerCase();
}

export function numberValue(value: any): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}
