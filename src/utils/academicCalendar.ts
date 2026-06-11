import { addDays, parseLocalDate, toDateInputValue } from "./date";
import type { AcademicWeekInfo, AcademicWeekPhase } from "../types";

const SUMMER_START = parseLocalDate("2026-06-25");
const SUMMER_END = parseLocalDate("2026-09-06");
const FALL_START = parseLocalDate("2026-09-07");
const SPRING_WEEK_15_MONDAY = parseLocalDate("2026-06-08");

export function calculateAcademicWeek(dateValue: string): string {
  const date = parseLocalDate(dateValue);

  if (date >= SUMMER_START && date <= SUMMER_END) {
    return "暑假";
  }

  if (date >= FALL_START) {
    const week = Math.floor((date.getTime() - FALL_START.getTime()) / 604800000) + 1;
    if (week >= 1 && week <= 18) return `第${week}周`;
    if (week >= 19 && week <= 20) return `第${week}周（考试周）`;
    return "学期外";
  }

  const springWeek = Math.floor((date.getTime() - SPRING_WEEK_15_MONDAY.getTime()) / 604800000) + 15;
  if (springWeek >= 1 && springWeek <= 17) return `第${springWeek}周`;
  return "学期外";
}

export function getWeekRangeByAcademicLabel(label: string, fallbackDate: string): { start: string; end: string } {
  const match = label.match(/第(\d+)周/);
  if (!match) {
    const start = parseLocalDate(fallbackDate);
    return { start: toDateInputValue(start), end: toDateInputValue(addDays(start, 6)) };
  }

  const week = Number(match[1]);
  const start = week >= 15 && parseLocalDate(fallbackDate) < FALL_START
    ? addDays(SPRING_WEEK_15_MONDAY, (week - 15) * 7)
    : addDays(FALL_START, (week - 1) * 7);

  return { start: toDateInputValue(start), end: toDateInputValue(addDays(start, 6)) };
}

export function getAcademicPhase(dateValue: string): AcademicWeekPhase {
  const label = calculateAcademicWeek(dateValue);
  if (label === "暑假") return "假期";
  if (label.includes("考试周")) return "考试周";
  if (label.startsWith("第")) return "教学周";
  return "学期外";
}

export function getAcademicWeeks(): AcademicWeekInfo[] {
  const springWeeks = [15, 16, 17].map((week) => {
    const start = addDays(SPRING_WEEK_15_MONDAY, (week - 15) * 7);
    return {
      id: `spring-2026-${week}`,
      label: `第${week}周`,
      start: toDateInputValue(start),
      end: toDateInputValue(addDays(start, 6)),
      phase: "教学周" as const,
    };
  });

  const summer: AcademicWeekInfo = {
    id: "summer-2026",
    label: "暑假",
    start: toDateInputValue(SUMMER_START),
    end: toDateInputValue(SUMMER_END),
    phase: "假期",
  };

  const fallWeeks = Array.from({ length: 20 }, (_, index) => {
    const week = index + 1;
    const start = addDays(FALL_START, index * 7);
    return {
      id: `fall-2026-${week}`,
      label: week <= 18 ? `第${week}周` : `第${week}周（考试周）`,
      start: toDateInputValue(start),
      end: toDateInputValue(addDays(start, 6)),
      phase: week <= 18 ? "教学周" : "考试周",
    } satisfies AcademicWeekInfo;
  });

  return [...springWeeks, summer, ...fallWeeks];
}

export function getAcademicWeekInfoForDate(dateValue: string): AcademicWeekInfo {
  const date = parseLocalDate(dateValue);
  const found = getAcademicWeeks().find((week) => date >= parseLocalDate(week.start) && date <= parseLocalDate(week.end));
  if (found) return found;

  return {
    id: `outside-${dateValue}`,
    label: calculateAcademicWeek(dateValue),
    start: dateValue,
    end: dateValue,
    phase: getAcademicPhase(dateValue),
  };
}
