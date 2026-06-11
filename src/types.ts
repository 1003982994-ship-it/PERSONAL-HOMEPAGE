export type RecordType =
  | "上课"
  | "开会"
  | "监考"
  | "行政事项"
  | "教学灵感"
  | "科研灵感"
  | "AI智能体灵感"
  | "其他事项";

export type RecordStatus = "未开始" | "进行中" | "已完成" | "暂缓";
export type Priority = "低" | "中" | "高";
export type ViewKey = "dashboard" | "calendar" | "week" | "records" | "ideas" | "create" | "settings";
export type AcademicWeekPhase = "教学周" | "考试周" | "假期" | "学期外";

export interface AcademicWeekInfo {
  id: string;
  label: string;
  start: string;
  end: string;
  phase: AcademicWeekPhase;
}

export interface WorkRecord {
  id: string;
  title: string;
  type: RecordType;
  date: string;
  academicWeek: string;
  weekday: string;
  location: string;
  courseOrProject: string;
  description: string;
  status: RecordStatus;
  priority: Priority;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordFilters {
  date: string;
  week: string;
  type: string;
  status: string;
  keyword: string;
}

export type WeeklySummaries = Record<string, string>;

export interface BackupMetadata {
  lastBackupAt: string;
  recordCount: number;
  weeklySummaryCount: number;
}
