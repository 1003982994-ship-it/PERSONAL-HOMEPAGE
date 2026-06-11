import type { WorkRecord } from "../types";
import { getRecordTypeClass } from "../utils/recordStyle";

interface RecordListProps {
  records: WorkRecord[];
  emptyText?: string;
  onEdit: (record: WorkRecord) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  readOnly?: boolean;
}

const priorityClass = {
  低: "priority-low",
  中: "priority-mid",
  高: "priority-high",
};

export function RecordList({ records, emptyText = "暂无记录", onEdit, onDelete, onComplete, readOnly = false }: RecordListProps) {
  if (records.length === 0) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <div className="record-list">
      {records.map((record) => (
        <article className={`record-item ${getRecordTypeClass(record.type)}`} key={record.id}>
          <div className="record-main">
            <div className="record-heading">
              <h3>{record.title}</h3>
              <span className={`priority-pill ${priorityClass[record.priority]}`}>{record.priority}</span>
            </div>
            <div className="record-meta">
              <span className={`type-pill ${getRecordTypeClass(record.type)}`}>{record.type}</span>
              <span>{record.date}</span>
              <span>{record.weekday}</span>
              <span>{record.academicWeek}</span>
              <span>{record.status}</span>
            </div>
            {(record.courseOrProject || record.location) && (
              <p className="record-sub">
                {record.courseOrProject}
                {record.courseOrProject && record.location ? " · " : ""}
                {record.location}
              </p>
            )}
            {record.description && <p className="record-description">{record.description}</p>}
            {record.notes && <p className="record-notes">备注：{record.notes}</p>}
          </div>

          {!readOnly && (
            <div className="record-actions">
              <button className="icon-button" type="button" onClick={() => onComplete(record.id)} title="标记完成">
                完成
              </button>
              <button className="icon-button" type="button" onClick={() => onEdit(record)} title="编辑">
                编辑
              </button>
              <button className="icon-button danger" type="button" onClick={() => onDelete(record.id)} title="删除">
                删除
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
