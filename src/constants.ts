import type { Priority, RecordStatus, RecordType, ViewKey } from "./types";

export const RECORD_TYPES: RecordType[] = [
  "上课",
  "开会",
  "监考",
  "行政事项",
  "教学灵感",
  "科研灵感",
  "AI智能体灵感",
  "其他事项",
];

export const IDEA_TYPES: RecordType[] = ["教学灵感", "科研灵感", "AI智能体灵感"];
export const STATUSES: RecordStatus[] = ["未开始", "进行中", "已完成", "暂缓"];
export const PRIORITIES: Priority[] = ["低", "中", "高"];

export const NAV_ITEMS: { key: ViewKey; label: string }[] = [
  { key: "dashboard", label: "工作台首页" },
  { key: "calendar", label: "日历视图" },
  { key: "week", label: "周视图" },
  { key: "records", label: "记录列表" },
  { key: "ideas", label: "灵感库" },
  { key: "create", label: "新增记录" },
  { key: "settings", label: "设置" },
];
