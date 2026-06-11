import type { RecordType } from "../types";

const typeClassMap: Record<RecordType, string> = {
  上课: "type-class",
  开会: "type-meeting",
  监考: "type-exam",
  行政事项: "type-admin",
  教学灵感: "type-teaching-idea",
  科研灵感: "type-research-idea",
  AI智能体灵感: "type-ai-idea",
  其他事项: "type-other",
};

export function getRecordTypeClass(type: RecordType): string {
  return typeClassMap[type];
}
