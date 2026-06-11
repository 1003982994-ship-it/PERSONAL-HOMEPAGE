import { RECORD_TYPES, STATUSES } from "../constants";
import type { RecordFilters } from "../types";

interface FiltersProps {
  filters: RecordFilters;
  weeks: string[];
  onChange: (filters: RecordFilters) => void;
}

export function Filters({ filters, weeks, onChange }: FiltersProps) {
  return (
    <section className="filters">
      <input
        placeholder="搜索标题、地点、课程、描述或备注"
        value={filters.keyword}
        onChange={(event) => onChange({ ...filters, keyword: event.target.value })}
      />
      <input type="date" value={filters.date} onChange={(event) => onChange({ ...filters, date: event.target.value })} />
      <select value={filters.week} onChange={(event) => onChange({ ...filters, week: event.target.value })}>
        <option value="">全部周次</option>
        {weeks.map((week) => (
          <option key={week} value={week}>
            {week}
          </option>
        ))}
      </select>
      <select value={filters.type} onChange={(event) => onChange({ ...filters, type: event.target.value })}>
        <option value="">全部类型</option>
        {RECORD_TYPES.map((type) => (
          <option key={type}>{type}</option>
        ))}
      </select>
      <select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}>
        <option value="">全部状态</option>
        {STATUSES.map((status) => (
          <option key={status}>{status}</option>
        ))}
      </select>
      <button className="ghost-button" type="button" onClick={() => onChange({ date: "", week: "", type: "", status: "", keyword: "" })}>
        清空筛选
      </button>
    </section>
  );
}
