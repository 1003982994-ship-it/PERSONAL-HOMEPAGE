import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Filters } from "./components/Filters";
import { RecordForm } from "./components/RecordForm";
import { RecordList } from "./components/RecordList";
import { IDEA_TYPES, NAV_ITEMS } from "./constants";
import centuryTreeOverview from "./assets/century-tree-overview.png";
import deskWorkbenchHero from "./assets/desk-workbench-hero.png";
import professorAvatar from "./assets/profile-real-avatar.jpg";
import type { BackupMetadata, RecordFilters, ViewKey, WeeklySummaries, WorkRecord } from "./types";
import { calculateAcademicWeek, getAcademicWeekInfoForDate, getAcademicWeeks } from "./utils/academicCalendar";
import { COURSE_SCHEDULE_PRESETS, buildCourseScheduleRecord, getCourseScheduleKey } from "./utils/courseSchedule";
import { addDays, endOfWeek, formatChineseDate, getWeekday, isDateWithin, isSameDay, parseLocalDate, startOfWeek, toDateInputValue } from "./utils/date";
import {
  loadBackupMetadata,
  loadCloudBackup,
  loadRecords,
  loadSyncToken,
  loadWeeklySummaries,
  saveBackupMetadata,
  saveCloudBackup,
  saveRecords,
  saveSyncToken,
  saveWeeklySummaries,
} from "./utils/storage";
import { getRecordTypeClass } from "./utils/recordStyle";

type DraftRecord = Omit<WorkRecord, "id" | "createdAt" | "updatedAt">;
type CloudSyncStatus = "local" | "loading" | "ready" | "saving" | "saved" | "error";

const todayValue = toDateInputValue(new Date());
const currentWeek = calculateAcademicWeek(todayValue);
const currentWeekInfo = getAcademicWeekInfoForDate(todayValue);

const initialFilters: RecordFilters = {
  date: "",
  week: "",
  type: "",
  status: "",
  keyword: "",
};

function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sortRecords(records: WorkRecord[]): WorkRecord[] {
  return [...records].sort((a, b) => {
    if (a.date === b.date) return b.updatedAt.localeCompare(a.updatedAt);
    return a.date.localeCompare(b.date);
  });
}

function recordMatchesKeyword(record: WorkRecord, keyword: string): boolean {
  const text = [
    record.title,
    record.type,
    record.location,
    record.courseOrProject,
    record.description,
    record.status,
    record.priority,
    record.notes,
  ].join(" ");
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function countWeeklySummaries(summaries: WeeklySummaries): number {
  return Object.values(summaries).filter((summary) => summary.trim().length > 0).length;
}

function shouldUseCloudSync(): boolean {
  if (typeof window === "undefined") return false;
  return !["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function getCloudSyncLabel(status: CloudSyncStatus): string {
  if (status === "local") return "本地模式";
  if (status === "loading") return "正在读取云端";
  if (status === "ready") return "云端已连接";
  if (status === "saving") return "正在保存云端";
  if (status === "saved") return "云端已保存";
  return "云端同步异常";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知时间";
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getDaysSince(value: string): number {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function formatMonthTitle(monthValue: string): string {
  const [year, month] = monthValue.split("-").map(Number);
  return `${year}年${month}月`;
}

function getMonthOverviewCells(monthValue: string, sourceRecords: WorkRecord[]) {
  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const gridStart = addDays(firstDay, -(firstDay.getDay() || 7) + 1);

  return Array.from({ length: 42 }, (_, index) => {
    const date = toDateInputValue(addDays(gridStart, index));
    return {
      date,
      day: parseLocalDate(date).getDate(),
      inMonth: date.startsWith(monthValue),
      isToday: date === todayValue,
      week: calculateAcademicWeek(date),
      count: sourceRecords.filter((record) => record.date === date).length,
    };
  });
}

function getRecordKind(record: WorkRecord): string {
  return getRecordTypeClass(record.type);
}

function summarizeCourses(sourceRecords: WorkRecord[]) {
  const classRecords = sourceRecords
    .filter((record) => getRecordKind(record) === "type-class")
    .map((record) => ({
      course: record.courseOrProject || record.title,
      date: record.date,
      week: record.academicWeek,
      slot: [record.weekday, record.description].filter(Boolean).join(" "),
    }));

  const fallbackCourses = COURSE_SCHEDULE_PRESETS.map((preset) => ({
    course: preset.course,
    date: preset.date,
    week: preset.academicWeek || calculateAcademicWeek(preset.date),
    slot: `${getWeekday(preset.date)} ${preset.period} ${preset.time}`,
  }));

  const items = classRecords.length > 0 ? classRecords : fallbackCourses;
  const groups = new Map<string, { course: string; dates: string[]; weeks: Set<string>; slots: Set<string>; count: number }>();

  items.forEach((item) => {
    const key = item.course || "未命名课程";
    const group = groups.get(key) || { course: key, dates: [], weeks: new Set<string>(), slots: new Set<string>(), count: 0 };
    group.dates.push(item.date);
    group.weeks.add(item.week);
    if (item.slot) group.slots.add(item.slot);
    group.count += 1;
    groups.set(key, group);
  });

  return Array.from(groups.values()).map((group) => {
    const sortedDates = group.dates.sort();
    return {
      course: group.course,
      dateRange: `${sortedDates[0]} 至 ${sortedDates[sortedDates.length - 1]}`,
      weeks: Array.from(group.weeks).join("、"),
      slots: Array.from(group.slots).slice(0, 3),
      moreSlotCount: Math.max(0, group.slots.size - 3),
      count: group.count,
    };
  });
}

function App() {
  const [records, setRecords] = useState<WorkRecord[]>(() => sortRecords(loadRecords()));
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummaries>(() => loadWeeklySummaries());
  const [backupMetadata, setBackupMetadata] = useState<BackupMetadata | null>(() => loadBackupMetadata());
  const [syncToken, setSyncToken] = useState(() => loadSyncToken());
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(() => (shouldUseCloudSync() ? "loading" : "local"));
  const [cloudSyncError, setCloudSyncError] = useState("");
  const [cloudSyncReady, setCloudSyncReady] = useState(false);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [filters, setFilters] = useState<RecordFilters>(initialFilters);
  const [editingRecord, setEditingRecord] = useState<WorkRecord | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(todayValue.slice(0, 7));
  const [selectedWeekId, setSelectedWeekId] = useState(currentWeekInfo.id);
  const importInputRef = useRef<HTMLInputElement>(null);
  const cloudSaveTimerRef = useRef<number | null>(null);
  const cloudSyncEnabled = useMemo(() => shouldUseCloudSync(), []);

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  useEffect(() => {
    saveWeeklySummaries(weeklySummaries);
  }, [weeklySummaries]);

  useEffect(() => {
    saveSyncToken(syncToken);
  }, [syncToken]);

  useEffect(() => {
    if (!cloudSyncEnabled) return;

    let cancelled = false;
    setCloudSyncReady(false);
    setCloudSyncStatus("loading");
    setCloudSyncError("");

    loadCloudBackup(syncToken)
      .then((backup) => {
        if (cancelled) return;
        if (backup) {
          setRecords(sortRecords(backup.records));
          setWeeklySummaries(backup.weeklySummaries);
          setBackupMetadata(backup.backupMetadata);
          if (backup.backupMetadata) saveBackupMetadata(backup.backupMetadata);
        }
        setCloudSyncReady(true);
        setCloudSyncStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        setCloudSyncReady(false);
        setCloudSyncStatus("error");
        setCloudSyncError(error instanceof Error ? error.message : "云端数据读取失败");
      });

    return () => {
      cancelled = true;
    };
  }, [cloudSyncEnabled, syncToken]);

  useEffect(() => {
    if (!cloudSyncEnabled || !cloudSyncReady) return;
    if (cloudSaveTimerRef.current) window.clearTimeout(cloudSaveTimerRef.current);

    setCloudSyncStatus("saving");
    setCloudSyncError("");
    cloudSaveTimerRef.current = window.setTimeout(() => {
      saveCloudBackup({ records, weeklySummaries, backupMetadata }, syncToken)
        .then(() => {
          setCloudSyncStatus("saved");
        })
        .catch((error) => {
          setCloudSyncStatus("error");
          setCloudSyncError(error instanceof Error ? error.message : "云端数据保存失败");
        });
    }, 700);

    return () => {
      if (cloudSaveTimerRef.current) window.clearTimeout(cloudSaveTimerRef.current);
    };
  }, [backupMetadata, cloudSyncEnabled, cloudSyncReady, records, syncToken, weeklySummaries]);

  const academicWeeks = useMemo(() => getAcademicWeeks(), []);

  const weeks = useMemo(() => Array.from(new Set(records.map((record) => record.academicWeek))).filter(Boolean), [records]);

  const filteredRecords = useMemo(() => {
    return sortRecords(records).filter((record) => {
      if (filters.date && record.date !== filters.date) return false;
      if (filters.week && record.academicWeek !== filters.week) return false;
      if (filters.type && record.type !== filters.type) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.keyword && !recordMatchesKeyword(record, filters.keyword)) return false;
      return true;
    });
  }, [records, filters]);

  const dashboardData = useMemo(() => {
    const weekStart = startOfWeek(parseLocalDate(todayValue));
    const weekEnd = endOfWeek(parseLocalDate(todayValue));
    const ideas = records
      .filter((record) => IDEA_TYPES.includes(record.type))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);

    return {
      today: records.filter((record) => isSameDay(record.date, todayValue)),
      week: records.filter((record) => isDateWithin(record.date, weekStart, weekEnd)),
      unfinished: records.filter((record) => record.status !== "已完成"),
      ideas,
      monthCells: getMonthOverviewCells(selectedMonth, records),
      courses: summarizeCourses(records),
      stats: {
        total: records.length,
        classes: records.filter((record) => getRecordKind(record) === "type-class").length,
        meetings: records.filter((record) => getRecordKind(record) === "type-meeting").length,
        exams: records.filter((record) => getRecordKind(record) === "type-exam").length,
        admin: records.filter((record) => getRecordKind(record) === "type-admin").length,
        ideas: records.filter((record) => IDEA_TYPES.includes(record.type)).length,
      },
    };
  }, [records, selectedMonth]);

  function handleSave(draft: DraftRecord, editingId?: string) {
    const now = new Date().toISOString();
    if (editingId) {
      setRecords((current) =>
        sortRecords(
          current.map((record) =>
            record.id === editingId
              ? {
                  ...record,
                  ...draft,
                  updatedAt: now,
                }
              : record,
          ),
        ),
      );
      setEditingRecord(null);
      setActiveView("records");
      return;
    }

    setRecords((current) =>
      sortRecords([
        ...current,
        {
          ...draft,
          id: createId(),
          createdAt: now,
          updatedAt: now,
        },
      ]),
    );
    setActiveView("records");
  }

  function handleEdit(record: WorkRecord) {
    setEditingRecord(record);
    setActiveView("create");
  }

  function handleDelete(id: string) {
    const record = records.find((item) => item.id === id);
    if (!record) return;
    if (!window.confirm(`确认删除“${record.title}”吗？`)) return;
    setRecords((current) => current.filter((item) => item.id !== id));
    if (editingRecord?.id === id) setEditingRecord(null);
  }

  function handleComplete(id: string) {
    const now = new Date().toISOString();
    setRecords((current) =>
      current.map((record) => (record.id === id ? { ...record, status: "已完成", updatedAt: now } : record)),
    );
  }

  function handleGenerateCourseSchedule() {
    const now = new Date().toISOString();
    let addedCount = 0;
    setRecords((current) => {
      const existingKeys = new Set(current.map(getCourseScheduleKey).filter(Boolean));
      const newRecords = COURSE_SCHEDULE_PRESETS.filter((preset) => !existingKeys.has(preset.key)).map((preset) => buildCourseScheduleRecord(preset, now));
      addedCount = newRecords.length;
      return sortRecords([...current, ...newRecords]);
    });
    window.alert(addedCount > 0 ? `已生成 ${addedCount} 条课程安排。` : "课程安排已存在，没有重复添加。");
    setActiveView("records");
  }

  function handleExport() {
    const nextBackupMetadata: BackupMetadata = {
      lastBackupAt: new Date().toISOString(),
      recordCount: records.length,
      weeklySummaryCount: countWeeklySummaries(weeklySummaries),
    };
    const blob = new Blob([JSON.stringify({ records, weeklySummaries, backupMetadata: nextBackupMetadata }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `teacher-workbench-${todayValue}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setBackupMetadata(nextBackupMetadata);
    saveBackupMetadata(nextBackupMetadata);
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      const importedRecords = Array.isArray(imported) ? imported : imported.records;
      const importedSummaries = Array.isArray(imported) ? {} : imported.weeklySummaries;
      const importedBackupMetadata = Array.isArray(imported) ? null : imported.backupMetadata;
      if (!Array.isArray(importedRecords)) throw new Error("JSON 中缺少 records 数组");
      const normalized = importedRecords.map((item: Partial<WorkRecord>) => {
        const date = item.date || todayValue;
        const now = new Date().toISOString();
        return {
          id: item.id || createId(),
          title: item.title || "未命名记录",
          type: item.type || "其他事项",
          date,
          academicWeek: item.academicWeek || calculateAcademicWeek(date),
          weekday: item.weekday || getWeekday(date),
          location: item.location || "",
          courseOrProject: item.courseOrProject || "",
          description: item.description || "",
          status: item.status || "未开始",
          priority: item.priority || "中",
          notes: item.notes || "",
          createdAt: item.createdAt || now,
          updatedAt: item.updatedAt || now,
        } satisfies WorkRecord;
      });
      setRecords(sortRecords(normalized));
      if (importedSummaries && typeof importedSummaries === "object" && !Array.isArray(importedSummaries)) {
        setWeeklySummaries(importedSummaries);
      }
      if (importedBackupMetadata && typeof importedBackupMetadata === "object" && typeof importedBackupMetadata.lastBackupAt === "string") {
        const restoredMetadata = {
          lastBackupAt: importedBackupMetadata.lastBackupAt,
          recordCount: typeof importedBackupMetadata.recordCount === "number" ? importedBackupMetadata.recordCount : normalized.length,
          weeklySummaryCount:
            typeof importedBackupMetadata.weeklySummaryCount === "number"
              ? importedBackupMetadata.weeklySummaryCount
              : countWeeklySummaries(importedSummaries || {}),
        };
        setBackupMetadata(restoredMetadata);
        saveBackupMetadata(restoredMetadata);
      }
      window.alert("导入完成，已替换当前本地数据。");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "导入失败，请检查 JSON 文件。");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  function renderDashboard() {
    const hasSavedData = records.length > 0 || countWeeklySummaries(weeklySummaries) > 0;
    const shouldRemindBackup = hasSavedData && (!backupMetadata || getDaysSince(backupMetadata.lastBackupAt) >= 7);

    return (
      <>
        {shouldRemindBackup && (
          <section className="backup-reminder">
            <div>
              <strong>{backupMetadata ? "距离上次备份已超过 7 天" : "当前数据还没有备份"}</strong>
              <span>定期清理浏览器站点数据前，请先在设置页导出 JSON 备份。</span>
            </div>
            <button className="ghost-button" type="button" onClick={() => setActiveView("settings")}>
              去备份
            </button>
          </section>
        )}
        <section className="identity-panel" style={{ "--identity-hero": `url(${deskWorkbenchHero})` } as CSSProperties}>
          <div className="school-badge">南京理工大学紫金学院</div>
          <div className="identity-copy">
            <p>Finance Faculty Workspace</p>
            <h2>张张老师的个人工作台</h2>
            <span>课程、研究、会议与灵感，都先安放在这一张桌面上。</span>
          </div>
          <div className="metric-strip">
            <div>
              <strong>{dashboardData.today.length}</strong>
              <span>今日事项</span>
            </div>
            <div>
              <strong>{dashboardData.week.length}</strong>
              <span>本周记录</span>
            </div>
            <div>
              <strong>{dashboardData.unfinished.length}</strong>
              <span>待推进</span>
            </div>
            <div>
              <strong>{dashboardData.ideas.length}</strong>
              <span>近期灵感</span>
            </div>
          </div>
        </section>
        <div className="overview-grid" style={{ "--overview-tree": `url(${centuryTreeOverview})` } as CSSProperties}>
          <section className="panel month-overview-panel">
            <div className="section-heading compact">
              <h2>本月节奏</h2>
              <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
            </div>
            <div className="mini-calendar-title">{formatMonthTitle(selectedMonth)}</div>
            <div className="mini-calendar-grid">
              {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
                <div className="mini-calendar-weekday" key={day}>
                  周{day}
                </div>
              ))}
              {dashboardData.monthCells.map((cell) => (
                <button
                  className={`mini-calendar-cell ${cell.inMonth ? "" : "muted-cell"} ${cell.isToday ? "today-cell" : ""}`}
                  type="button"
                  key={cell.date}
                  onClick={() => {
                    setSelectedMonth(cell.date.slice(0, 7));
                    setActiveView("calendar");
                  }}
                >
                  <strong>{cell.day}</strong>
                  <span>{cell.week}</span>
                  {cell.count > 0 && <small>{cell.count} 条</small>}
                </button>
              ))}
            </div>
          </section>

          <section className="panel course-overview-panel">
            <div className="section-heading compact">
              <h2>本学期课程</h2>
              <span>{dashboardData.courses.length} 门</span>
            </div>
            <div className="course-overview-list">
              {dashboardData.courses.map((course) => (
                <article className="course-overview-card" key={course.course}>
                  <div>
                    <h3>{course.course}</h3>
                    <p>{course.weeks}</p>
                  </div>
                  <span>{course.dateRange}</span>
                  <ul>
                    {course.slots.map((slot) => (
                      <li key={slot}>{slot}</li>
                    ))}
                    {course.moreSlotCount > 0 && <li>另有 {course.moreSlotCount} 个时间段</li>}
                  </ul>
                  <small>{course.count} 次课</small>
                </article>
              ))}
            </div>
          </section>

          <section className="panel work-stat-panel">
            <div className="section-heading compact">
              <h2>工作统计</h2>
              <span>截至今日</span>
            </div>
            <div className="work-stat-grid">
              <div>
                <strong>{dashboardData.stats.classes}</strong>
                <span>上课</span>
              </div>
              <div>
                <strong>{dashboardData.stats.meetings}</strong>
                <span>开会</span>
              </div>
              <div>
                <strong>{dashboardData.stats.exams}</strong>
                <span>监考</span>
              </div>
              <div>
                <strong>{dashboardData.stats.admin}</strong>
                <span>行政事项</span>
              </div>
              <div>
                <strong>{dashboardData.stats.ideas}</strong>
                <span>灵感</span>
              </div>
              <div>
                <strong>{dashboardData.stats.total}</strong>
                <span>总记录</span>
              </div>
            </div>
          </section>
        </div>
      </>
    );
  }

  function renderWeekView() {
    const selectedWeek = academicWeeks.find((week) => week.id === selectedWeekId) || currentWeekInfo;
    const weekRecords = sortRecords(records.filter((record) => isDateWithin(record.date, parseLocalDate(selectedWeek.start), parseLocalDate(selectedWeek.end))));
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = toDateInputValue(addDays(parseLocalDate(selectedWeek.start), index));
      return { date, label: getWeekday(date), records: weekRecords.filter((record) => record.date === date) };
    });
    const summary = weeklySummaries[selectedWeek.id] || "";

    return (
      <div className="week-view-layout">
        <aside className="week-picker panel">
          <div className="section-heading compact">
            <h2>校历周</h2>
            <span>{academicWeeks.length} 个</span>
          </div>
          <div className="week-button-list">
            {academicWeeks.map((week) => {
              const count = records.filter((record) => isDateWithin(record.date, parseLocalDate(week.start), parseLocalDate(week.end))).length;
              return (
                <button
                  className={selectedWeek.id === week.id ? "week-button active" : "week-button"}
                  type="button"
                  key={week.id}
                  onClick={() => setSelectedWeekId(week.id)}
                >
                  <span>{week.label}</span>
                  <small>
                    {week.start.slice(5)} 至 {week.end.slice(5)} · {week.phase} · {count} 条
                  </small>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel">
          <div className="week-hero">
            <div>
              <p>{selectedWeek.phase}</p>
              <h2>{selectedWeek.label}</h2>
              <span>
                {selectedWeek.start} 至 {selectedWeek.end}
              </span>
            </div>
            <div className="week-stat-grid">
              <span>{weekRecords.filter((record) => record.type === "上课").length} 上课</span>
              <span>{weekRecords.filter((record) => record.type === "开会").length} 会议</span>
              <span>{weekRecords.filter((record) => record.type === "监考").length} 监考</span>
              <span>{weekRecords.filter((record) => record.status !== "已完成").length} 待办</span>
              <span>{weekRecords.filter((record) => IDEA_TYPES.includes(record.type)).length} 灵感</span>
            </div>
          </div>

          <section className="weekly-summary-card">
            <div className="section-heading compact">
              <h2>本周总结</h2>
              <span>聚焦完成情况、问题和下周计划</span>
            </div>
            <label className="weekly-summary">
              <span className="sr-only">本周总结</span>
              <textarea
                value={summary}
                onChange={(event) =>
                  setWeeklySummaries((current) => ({
                    ...current,
                    [selectedWeek.id]: event.target.value,
                  }))
                }
                rows={6}
                placeholder="记录本周完成情况、遇到的问题、下周计划..."
              />
            </label>
          </section>

          <div className="week-days-heading">
            <h3>每日事项概览</h3>
            <span>简略显示，点击事项可进入编辑</span>
          </div>
          <div className="week-grid compact-week-grid">
            {days.map((day) => (
              <div className="day-column" key={day.date}>
                <div className="day-head">
                  <strong>{day.label}</strong>
                  <span>
                    {day.date.slice(5)} · {day.records.length}
                  </span>
                </div>
                <div className="day-brief-list">
                  {day.records.length === 0 ? (
                    <span className="day-empty">暂无安排</span>
                  ) : (
                    day.records.slice(0, 4).map((record) => (
                      <button className={`day-brief-item ${getRecordTypeClass(record.type)}`} type="button" key={record.id} onClick={() => handleEdit(record)}>
                        <span>{record.title}</span>
                      </button>
                    ))
                  )}
                  {day.records.length > 4 && <span className="day-more">+{day.records.length - 4} 条</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  function renderCalendarView() {
    const [year, month] = selectedMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const gridStart = addDays(firstDay, -(firstDay.getDay() || 7) + 1);
    const cells = Array.from({ length: 42 }, (_, index) => {
      const date = toDateInputValue(addDays(gridStart, index));
      return {
        date,
        inMonth: date.startsWith(selectedMonth),
        records: records.filter((record) => record.date === date),
      };
    });
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>日历视图</h2>
          </div>
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
        </div>
        <div className="calendar-grid">
          {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
            <div className="calendar-weekday" key={day}>
              周{day}
            </div>
          ))}
          {cells.map((cell) => (
            <div className={`calendar-cell ${cell.inMonth ? "" : "muted-cell"}`} key={cell.date}>
              <div className="calendar-date">
                <span>{parseLocalDate(cell.date).getDate()}</span>
                <small>{calculateAcademicWeek(cell.date)}</small>
              </div>
              {cell.records.slice(0, 3).map((record) => (
                <button className={`calendar-record ${getRecordTypeClass(record.type)}`} type="button" key={record.id} onClick={() => handleEdit(record)}>
                  {record.title}
                </button>
              ))}
              {cell.records.length > 3 && <small>+{cell.records.length - 3} 条</small>}
            </div>
          ))}
        </div>
      </section>
    );
  }
  function renderIdeas() {
    const ideaRecords = sortRecords(records.filter((record) => IDEA_TYPES.includes(record.type)));
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>灵感库</h2>
          </div>
          <span>{ideaRecords.length} 条</span>
        </div>
        <RecordList records={ideaRecords} emptyText="还没有灵感" onEdit={handleEdit} onDelete={handleDelete} onComplete={handleComplete} />
      </section>
    );
  }

  function renderCreateView() {
    return (
      <section className="form-page">
        <RecordForm
          editingRecord={editingRecord}
          onSave={handleSave}
          onCancel={() => {
            setEditingRecord(null);
            setActiveView("records");
          }}
        />
        <div className="mini-panel">
          <span className="mini-mark">提示</span>
          <p>新增或编辑完成后会回到记录列表；灵感类型会自动汇入灵感库。</p>
        </div>
      </section>
    );
  }

  function renderSettings() {
    const summaryCount = countWeeklySummaries(weeklySummaries);

    return (
      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <h2>设置</h2>
          </div>
        </div>
        <div className="backup-status-grid">
          <div>
            <span>记录数量</span>
            <strong>{records.length}</strong>
          </div>
          <div>
            <span>周总结数量</span>
            <strong>{summaryCount}</strong>
          </div>
          <div>
            <span>上次备份</span>
            <strong>{backupMetadata ? formatDateTime(backupMetadata.lastBackupAt) : "尚未备份"}</strong>
          </div>
          <div>
            <span>云端同步</span>
            <strong>{getCloudSyncLabel(cloudSyncStatus)}</strong>
          </div>
        </div>
        <div className="settings-actions">
          <button className="primary-button" type="button" onClick={handleExport}>
            导出备份 JSON
          </button>
          <button className="ghost-button" type="button" onClick={() => importInputRef.current?.click()}>
            导入备份 JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImport(file);
            }}
          />
        </div>
        <label className="sync-token-field">
          <span>同步口令</span>
          <input
            type="password"
            value={syncToken}
            onChange={(event) => setSyncToken(event.target.value)}
            placeholder="如 Vercel 设置了同步口令，请在这里填写"
          />
        </label>
        {cloudSyncError && <div className="sync-error">{cloudSyncError}</div>}
        <div className="sync-note">
          <h3>本地和线上数据同步</h3>
          <p>
            本地页面的数据不能被线上网址直接读取。首次迁移时，请先在 http://127.0.0.1:5173/ 导出备份 JSON，
            再到线上页面导入；导入成功后，线上页面的新记录会自动保存到云端。
          </p>
        </div>
        <div className="course-schedule-panel">
          <div>
            <h3>课程安排</h3>
            <p>生成期货投资分析和经济学原理的 15-17 周上课记录；后续调课可在记录里直接编辑日期、大节或备注。</p>
          </div>
          <button className="primary-button" type="button" onClick={handleGenerateCourseSchedule}>
            生成课程安排
          </button>
        </div>
        <div className="calendar-rules">
          <h3>校历规则</h3>
          <p>2026年6月9日为本学期第15周，第17周后进入暑假；2026年6月25日至9月6日显示为“暑假”。</p>
          <p>2026-2027学年第一学期从2026年9月7日开始，共20周，第19-20周为考试周。</p>
        </div>
      </section>
    );
  }

  function renderMainView() {
    if (activeView === "dashboard") return renderDashboard();
    if (activeView === "week") return renderWeekView();
    if (activeView === "calendar") return renderCalendarView();
    if (activeView === "ideas") return renderIdeas();
    if (activeView === "create") return renderCreateView();
    if (activeView === "settings") return renderSettings();
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>记录列表</h2>
          </div>
        </div>
        <Filters filters={filters} weeks={weeks} onChange={setFilters} />
        <RecordList records={filteredRecords} onEdit={handleEdit} onDelete={handleDelete} onComplete={handleComplete} />
      </section>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-avatar" src={professorAvatar} alt="教师头像" />
          <div>
            <strong>张张老师</strong>
            <span>教学-科研</span>
          </div>
        </div>
        <div className="sidebar-profile">
          <span>Finance Professor</span>
          <strong>公司金融 / 期货 / 投行</strong>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              className={activeView === item.key ? "active" : ""}
              key={item.key}
              type="button"
              onClick={() => {
                if (item.key === "create") setEditingRecord(null);
                setActiveView(item.key);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p>今天</p>
            <h1>
              {formatChineseDate(todayValue)} · {getWeekday(todayValue)} · {currentWeek}
            </h1>
          </div>
          {activeView !== "dashboard" && (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setEditingRecord(null);
                setActiveView("create");
              }}
            >
              新增记录
            </button>
          )}
        </header>

        {renderMainView()}
      </main>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  records: WorkRecord[];
  onEdit: (record: WorkRecord) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}

function SummaryCard({ title, records, onEdit, onDelete, onComplete }: SummaryCardProps) {
  return (
    <section className="panel summary-card">
      <div className="section-heading compact">
        <h2>{title}</h2>
        <span>{records.length} 条</span>
      </div>
      <RecordList records={records.slice(0, 5)} emptyText="暂无事项" onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} />
    </section>
  );
}

export default App;
