import { type FormEvent, useEffect, useMemo, useState } from "react";
import { PRIORITIES, RECORD_TYPES, STATUSES } from "../constants";
import type { WorkRecord } from "../types";
import { calculateAcademicWeek } from "../utils/academicCalendar";
import { getWeekday, toDateInputValue } from "../utils/date";
import { getRecordTypeClass } from "../utils/recordStyle";

type DraftRecord = Omit<WorkRecord, "id" | "createdAt" | "updatedAt">;

const emptyDraft = (): DraftRecord => {
  const today = toDateInputValue(new Date());
  return {
    title: "",
    type: "上课",
    date: today,
    academicWeek: calculateAcademicWeek(today),
    weekday: getWeekday(today),
    location: "",
    courseOrProject: "",
    description: "",
    status: "未开始",
    priority: "中",
    notes: "",
  };
};

interface RecordFormProps {
  editingRecord: WorkRecord | null;
  onSave: (record: DraftRecord, editingId?: string) => void;
  onCancel: () => void;
}

export function RecordForm({ editingRecord, onSave, onCancel }: RecordFormProps) {
  const initialDraft = useMemo(() => {
    if (!editingRecord) return emptyDraft();
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = editingRecord;
    return draft;
  }, [editingRecord]);

  const [draft, setDraft] = useState<DraftRecord>(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  function updateField<K extends keyof DraftRecord>(key: K, value: DraftRecord[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "date") {
        next.weekday = getWeekday(value as string);
        next.academicWeek = calculateAcademicWeek(value as string);
      }
      return next;
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    onSave({ ...draft, title: draft.title.trim() }, editingRecord?.id);
    setDraft(emptyDraft());
  }

  return (
    <form className="record-form" onSubmit={handleSubmit}>
      <div className="form-title-row">
        <div>
          <h2>{editingRecord ? "编辑记录" : "新增记录"}</h2>
        </div>
        {editingRecord && (
          <button className="ghost-button" type="button" onClick={onCancel}>
            取消编辑
          </button>
        )}
      </div>

      <div className="form-grid">
        <label>
          标题
          <input value={draft.title} onChange={(event) => updateField("title", event.target.value)} required />
        </label>

        <fieldset className="type-selector">
          <legend>类型</legend>
          <div className="type-option-grid">
            {RECORD_TYPES.map((type) => (
              <button
                className={`type-option ${getRecordTypeClass(type)} ${draft.type === type ? "active" : ""}`}
                key={type}
                type="button"
                aria-pressed={draft.type === type}
                onClick={() => updateField("type", type)}
              >
                <span className="type-swatch" aria-hidden="true" />
                <span>{type}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label>
          日期
          <input type="date" value={draft.date} onChange={(event) => updateField("date", event.target.value)} />
        </label>

        <label>
          校历周次
          <input value={draft.academicWeek} onChange={(event) => updateField("academicWeek", event.target.value)} />
        </label>

        <label>
          星期
          <input value={draft.weekday} onChange={(event) => updateField("weekday", event.target.value)} />
        </label>

        <label>
          地点
          <input value={draft.location} onChange={(event) => updateField("location", event.target.value)} />
        </label>

        <label>
          课程/项目名称
          <input value={draft.courseOrProject} onChange={(event) => updateField("courseOrProject", event.target.value)} />
        </label>

        <label>
          状态
          <select value={draft.status} onChange={(event) => updateField("status", event.target.value as DraftRecord["status"])}>
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>

        <label>
          优先级
          <select value={draft.priority} onChange={(event) => updateField("priority", event.target.value as DraftRecord["priority"])}>
            {PRIORITIES.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </label>
      </div>

      <label>
        内容描述
        <textarea value={draft.description} onChange={(event) => updateField("description", event.target.value)} rows={3} />
      </label>

      <label>
        备注
        <textarea value={draft.notes} onChange={(event) => updateField("notes", event.target.value)} rows={2} />
      </label>

      <div className="form-actions">
        <button className="primary-button" type="submit">
          {editingRecord ? "保存修改" : "新增记录"}
        </button>
      </div>
    </form>
  );
}
