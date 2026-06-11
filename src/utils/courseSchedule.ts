import type { WorkRecord } from "../types";
import { calculateAcademicWeek } from "./academicCalendar";
import { getWeekday } from "./date";

export const COURSE_SCHEDULE_MARKER = "课程安排标识";

interface CourseSchedulePreset {
  key: string;
  course: string;
  date: string;
  academicWeek?: string;
  period: string;
  time: string;
}

const PERIOD_TIMES = {
  第一大节: "08:20-10:00",
  第二大节: "10:15-11:55",
  第三大节: "14:10-15:50",
  第四大节: "16:05-17:45",
  第五大节: "19:00-20:40",
} as const;

export const COURSE_SCHEDULE_PRESETS: CourseSchedulePreset[] = [
  { key: "futures-w15-mon-2", course: "期货投资分析", date: "2026-06-08", period: "第二大节", time: PERIOD_TIMES.第二大节 },
  { key: "futures-w15-wed-5", course: "期货投资分析", date: "2026-06-10", period: "第五大节", time: PERIOD_TIMES.第五大节 },
  { key: "futures-w16-mon-1", course: "期货投资分析", date: "2026-06-15", period: "第一大节", time: PERIOD_TIMES.第一大节 },
  { key: "futures-w16-mon-2", course: "期货投资分析", date: "2026-06-15", period: "第二大节", time: PERIOD_TIMES.第二大节 },
  { key: "futures-w16-wed-5", course: "期货投资分析", date: "2026-06-17", period: "第五大节", time: PERIOD_TIMES.第五大节 },
  { key: "econ-w15-tue-4", course: "经济学原理", date: "2026-06-09", period: "第四大节", time: PERIOD_TIMES.第四大节 },
  { key: "econ-w15-thu-4", course: "经济学原理", date: "2026-06-11", period: "第四大节", time: PERIOD_TIMES.第四大节 },
  { key: "econ-w16-tue-4", course: "经济学原理", date: "2026-06-16", period: "第四大节", time: PERIOD_TIMES.第四大节 },
  { key: "econ-w16-thu-4", course: "经济学原理", date: "2026-06-18", period: "第四大节", time: PERIOD_TIMES.第四大节 },
  { key: "econ-w17-tue-4", course: "经济学原理", date: "2026-06-23", period: "第四大节", time: PERIOD_TIMES.第四大节 },
  { key: "econ-w17-thu-4", course: "经济学原理", date: "2026-06-25", academicWeek: "第17周", period: "第四大节", time: PERIOD_TIMES.第四大节 },
];

export function getCourseScheduleKey(record: WorkRecord): string | null {
  const match = record.notes.match(new RegExp(`${COURSE_SCHEDULE_MARKER}：([^\\s]+)`));
  return match?.[1] || null;
}

export function buildCourseScheduleRecord(preset: CourseSchedulePreset, now: string): WorkRecord {
  return {
    id: `course-${preset.key}`,
    title: `${preset.course}（${preset.period}）`,
    type: "上课",
    date: preset.date,
    academicWeek: preset.academicWeek || calculateAcademicWeek(preset.date),
    weekday: getWeekday(preset.date),
    location: "",
    courseOrProject: preset.course,
    description: `${preset.period}，${preset.time}`,
    status: "未开始",
    priority: "中",
    notes: `${COURSE_SCHEDULE_MARKER}：${preset.key}。如有调课，可直接编辑本条记录。`,
    createdAt: now,
    updatedAt: now,
  };
}
