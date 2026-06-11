import type { BackupMetadata, WeeklySummaries, WorkRecord } from "../types";

const STORAGE_KEY = "teacher-workbench.records.v1";
const WEEKLY_SUMMARY_KEY = "teacher-workbench.weekly-summaries.v1";
const BACKUP_METADATA_KEY = "teacher-workbench.backup-metadata.v1";

export function loadRecords(): WorkRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecords(records: WorkRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function loadWeeklySummaries(): WeeklySummaries {
  try {
    const raw = localStorage.getItem(WEEKLY_SUMMARY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveWeeklySummaries(summaries: WeeklySummaries): void {
  localStorage.setItem(WEEKLY_SUMMARY_KEY, JSON.stringify(summaries));
}

export function loadBackupMetadata(): BackupMetadata | null {
  try {
    const raw = localStorage.getItem(BACKUP_METADATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.lastBackupAt !== "string") return null;
    return {
      lastBackupAt: parsed.lastBackupAt,
      recordCount: typeof parsed.recordCount === "number" ? parsed.recordCount : 0,
      weeklySummaryCount: typeof parsed.weeklySummaryCount === "number" ? parsed.weeklySummaryCount : 0,
    };
  } catch {
    return null;
  }
}

export function saveBackupMetadata(metadata: BackupMetadata): void {
  localStorage.setItem(BACKUP_METADATA_KEY, JSON.stringify(metadata));
}
