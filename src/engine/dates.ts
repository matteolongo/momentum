export function toDayStamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDayStamp(stamp: string): Date {
  const [year, month, day] = stamp.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayStamp(): string {
  return toDayStamp(new Date());
}

export function addDays(stamp: string, amount: number): string {
  const date = fromDayStamp(stamp);
  date.setDate(date.getDate() + amount);
  return toDayStamp(date);
}

export function yesterday(stamp: string): string {
  return addDays(stamp, -1);
}

export function tomorrow(stamp: string): string {
  return addDays(stamp, 1);
}

export function dayIndex(stamp: string): number {
  const date = fromDayStamp(stamp);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

export function weekStart(stamp: string): string {
  const date = fromDayStamp(stamp);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return toDayStamp(date);
}

export function lastNDays(stamp: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(stamp, index - count + 1));
}
