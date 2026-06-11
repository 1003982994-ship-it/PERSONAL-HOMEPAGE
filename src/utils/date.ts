const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatChineseDate(value: string | Date): string {
  const date = typeof value === "string" ? parseLocalDate(value) : value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function getWeekday(value: string | Date): string {
  const date = typeof value === "string" ? parseLocalDate(value) : value;
  return WEEKDAYS[date.getDay()];
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfWeek(date: Date): Date {
  const day = date.getDay() || 7;
  return addDays(date, 1 - day);
}

export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

export function isDateWithin(value: string, start: Date, end: Date): boolean {
  const date = parseLocalDate(value);
  return date >= start && date <= end;
}
