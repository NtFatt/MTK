export function assertValidDate(d: Date, errCode: string) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    throw new Error(errCode);
  }
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60 * 1000);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

export function clampDate(d: Date, max: Date): Date {
  return d.getTime() <= max.getTime() ? d : max;
}
