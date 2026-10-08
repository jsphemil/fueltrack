"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { PlusIcon } from "@/components/Icons";
import { Field, Notice, Page, PageHeader, VehicleChips } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useFuel } from "@/lib/fuel-context";
import { formatDateOnly, formatKm, formatMoney, formatServiceDue, toInputNumber } from "@/lib/format";
import type { OpenIssue, ServiceKind, ServiceRecord, ServiceStatus, VehicleSummary } from "@/lib/types";
import { cardClass, chipClass, errorTextClass, inputClass, mutedTextClass, primaryButtonClass, secondaryButtonClass, smallButtonClass } from "@/lib/ui";
import { ISSUE_TITLE_MAX_LENGTH, NOTE_MAX_LENGTH, parseIssueInput, parseServiceItemInput, parseServiceRecordInput, SERVICE_NAME_MAX_LENGTH } from "@/lib/validation";

// Typical intervals for a commuter bike; the owner's manual wins.
const PRESETS = [
  { name: "Engine oil", intervalKm: 3000, intervalMonths: 6 },
  { name: "Chain clean & lube", intervalKm: 500, intervalMonths: null },
  { name: "Air filter", intervalKm: 6000, intervalMonths: 12 },
  { name: "Brake pads check", intervalKm: 5000, intervalMonths: null },
  { name: "Spark plug", intervalKm: 10000, intervalMonths: null },
  { name: "General service", intervalKm: 3000, intervalMonths: 4 },
];

// Today's date on this phone as "YYYY-MM-DD".
function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const KIND_LABELS: Record<ServiceKind, string> = { MAINTENANCE: "Maintenance", REPAIR: "Repair" };

function chipStyle(selected: boolean) {
  return `${chipClass} ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface text-subtle"}`;
}

function toggle(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

function IssueForm({ vehicle, onDone }: { vehicle: VehicleSummary; onDone: () => void }) {
  const { refresh } = useFuel();
  const [title, setTitle] = useState("");
  const [notedOn, setNotedOn] = useState(localToday());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = { title, notedOn };
    const parsed = parseIssueInput(body);
    if (!parsed.ok) return setError(parsed.error);
    setSaving(true);
    const result = await apiRequest(`/api/vehicles/${vehicle.id}/issues`, { method: "POST", body });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    await refresh();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label="What's wrong?">
        <input value={title} maxLength={ISSUE_TITLE_MAX_LENGTH} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Front brake squeals" className={inputClass} />
      </Field>
      <Field label="Noticed on">
        <input type="date" value={notedOn} max={localToday()} onChange={(event) => setNotedOn(event.target.value)} className={`${inputClass} tabular`} />
      </Field>
      {error ? <p className={errorTextClass}>{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={`${primaryButtonClass} flex-1`}>{saving ? "Saving..." : "Add issue"}</button>
        <button type="button" onClick={onDone} disabled={saving} className={secondaryButtonClass}>Cancel</button>
      </div>
    </form>
  );
}

function intervalText(status: Pick<ServiceStatus, "intervalKm" | "intervalMonths">) {
  const parts = [];
  if (status.intervalKm !== null) parts.push(`${status.intervalKm.toLocaleString("en-IN")} km`);
  if (status.intervalMonths !== null) parts.push(`${status.intervalMonths} month${status.intervalMonths === 1 ? "" : "s"}`);
  return `Every ${parts.join(" or ")}`;
}

function ItemForm({ vehicle, item, onDone }: { vehicle: VehicleSummary; item?: ServiceStatus; onDone: () => void }) {
  const { refresh } = useFuel();
  const [name, setName] = useState(item?.name ?? "");
  const [intervalKm, setIntervalKm] = useState(item?.intervalKm != null ? String(item.intervalKm) : "");
  const [intervalMonths, setIntervalMonths] = useState(item?.intervalMonths != null ? String(item.intervalMonths) : "");
  const [lastDoneKm, setLastDoneKm] = useState("");
  const [lastDoneOn, setLastDoneOn] = useState(item ? "" : localToday());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = { name, intervalKm, intervalMonths, lastDoneKm, lastDoneOn };
    const parsed = parseServiceItemInput(body);
    if (!parsed.ok) return setError(parsed.error);
    setSaving(true);
    const result = await apiRequest(item ? `/api/service-items/${item.itemId}` : `/api/vehicles/${vehicle.id}/service-items`, {
      method: item ? "PATCH" : "POST",
      body,
    });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    await refresh();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {!item ? (
        <div className="flex flex-wrap gap-2">
          {PRESETS.filter((preset) => !vehicle.services.some((status) => status.name === preset.name)).map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                setName(preset.name);
                setIntervalKm(String(preset.intervalKm));
                setIntervalMonths(preset.intervalMonths !== null ? String(preset.intervalMonths) : "");
              }}
              className={`${chipClass} ${name === preset.name ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface text-subtle"}`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      ) : null}
      <Field label="Name">
        <input value={name} maxLength={SERVICE_NAME_MAX_LENGTH} onChange={(event) => setName(event.target.value)} placeholder="e.g. Engine oil" className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Every (km)">
          <input type="number" inputMode="numeric" min="0" step="1" value={intervalKm} onChange={(event) => setIntervalKm(event.target.value)} placeholder="e.g. 3000" className={`${inputClass} tabular`} />
        </Field>
        <Field label="Every (months)" hint="Optional">
          <input type="number" inputMode="numeric" min="0" step="1" value={intervalMonths} onChange={(event) => setIntervalMonths(event.target.value)} placeholder="e.g. 6" className={`${inputClass} tabular`} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Last done at (km)" hint={item ? "Blank keeps it as is. Logged services always count." : "Blank = starting odometer"}>
          <input type="number" inputMode="decimal" min="0" step="0.1" value={lastDoneKm} onChange={(event) => setLastDoneKm(event.target.value)} className={`${inputClass} tabular`} />
        </Field>
        <Field label="Last done on" hint={item ? "Blank keeps it as is" : "When it was last done"}>
          <input type="date" value={lastDoneOn} max={localToday()} onChange={(event) => setLastDoneOn(event.target.value)} className={`${inputClass} tabular`} />
        </Field>
      </div>
      {error ? <p className={errorTextClass}>{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={`${primaryButtonClass} flex-1`}>{saving ? "Saving..." : item ? "Save changes" : "Add item"}</button>
        <button type="button" onClick={onDone} disabled={saving} className={secondaryButtonClass}>Cancel</button>
      </div>
    </form>
  );
}

// Readings this far above the estimate are probably typos (an extra zero).
const ODOMETER_CHECK_KM = 1000;

type RecordFormProps = {
  vehicle: VehicleSummary;
  initialKind: ServiceKind;
  issueId?: string;
  record?: ServiceRecord; // edit when set
  onSaved: () => void;
  onCancel: () => void;
};

function RecordForm({ vehicle, initialKind, issueId, record, onSaved, onCancel }: RecordFormProps) {
  const { refresh } = useFuel();
  const [kind, setKind] = useState<ServiceKind>(record?.kind ?? initialKind);
  const [issueIds, setIssueIds] = useState<string[]>(record ? record.issues.map((issue) => issue.id) : issueId ? [issueId] : []);
  const [occurredOn, setOccurredOn] = useState(record?.occurredOn.slice(0, 10) ?? localToday());
  const [odometerKm, setOdometerKm] = useState(record ? toInputNumber(record.odometer, 10, 1) : "");
  const [costRupees, setCostRupees] = useState(record?.costPaise != null ? String(record.costPaise / 100) : "");
  const [itemIds, setItemIds] = useState<string[]>(
    record
      ? record.items.map((item) => item.id)
      : initialKind === "MAINTENANCE"
        ? vehicle.services.filter((status) => status.due).map((status) => status.itemId)
        : []
  );
  const [note, setNote] = useState(record?.note ?? "");
  // Issues still open, plus the ones this visit already fixed.
  const fixableIssues = [...(record?.issues ?? []), ...vehicle.openIssues.filter((issue) => !record?.issues.some((fixed) => fixed.id === issue.id))];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = { vehicleId: vehicle.id, kind, occurredOn, odometerKm, costRupees, itemIds, issueIds, note };
    const parsed = parseServiceRecordInput(body);
    if (!parsed.ok) return setError(parsed.error);
    const aboveKm = (parsed.value.odometer - vehicle.gauge.odometer.odometer) / 10;
    if (aboveKm > ODOMETER_CHECK_KM && !window.confirm(`That's ${Math.round(aboveKm).toLocaleString("en-IN")} km above the current odometer estimate. Save anyway?`)) return;
    setSaving(true);
    const result = await apiRequest(record ? `/api/service-records/${record.id}` : "/api/service-records", { method: record ? "PATCH" : "POST", body });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    await refresh();
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type of visit">
        {(Object.keys(KIND_LABELS) as ServiceKind[]).map((option) => (
          <button key={option} type="button" role="radio" aria-checked={kind === option} onClick={() => setKind(option)} className={`${chipStyle(kind === option)} justify-center`}>
            {KIND_LABELS[option]}
          </button>
        ))}
      </div>
      {fixableIssues.length > 0 ? (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-subtle">Issues fixed</legend>
          <div className="flex flex-wrap gap-2">
            {fixableIssues.map((issue) => (
              <button key={issue.id} type="button" aria-pressed={issueIds.includes(issue.id)} onClick={() => setIssueIds(toggle(issueIds, issue.id))} className={chipStyle(issueIds.includes(issue.id))}>
                {issue.title}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      {vehicle.services.length > 0 ? (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-subtle">{kind === "REPAIR" ? "Also serviced" : "What was done"}</legend>
          <div className="flex flex-wrap gap-2">
            {vehicle.services.map((status) => (
              <button key={status.itemId} type="button" aria-pressed={itemIds.includes(status.itemId)} onClick={() => setItemIds(toggle(itemIds, status.itemId))} className={chipStyle(itemIds.includes(status.itemId))}>
                {status.name}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" value={occurredOn} max={localToday()} onChange={(event) => setOccurredOn(event.target.value)} className={`${inputClass} tabular`} />
        </Field>
        <Field label="Odometer (km)" hint={`Now about ${formatKm(vehicle.gauge.odometer.odometer)}`}>
          <input type="number" inputMode="decimal" min="0" step="0.1" value={odometerKm} onChange={(event) => setOdometerKm(event.target.value)} className={`${inputClass} tabular`} />
        </Field>
      </div>
      <Field label="Cost (₹)" hint="Optional: parts and labour together">
        <input type="number" inputMode="decimal" min="0" step="1" value={costRupees} onChange={(event) => setCostRupees(event.target.value)} className={`${inputClass} tabular`} />
      </Field>
      <Field
        label={kind === "REPAIR" ? "What was fixed" : "Note (optional)"}
        hint={kind === "REPAIR" ? "Problem, parts replaced, workshop" : "Workshop, oil brand, parts replaced..."}
      >
        <input value={note} maxLength={NOTE_MAX_LENGTH} onChange={(event) => setNote(event.target.value)} className={inputClass} />
      </Field>
      {error ? <p className={errorTextClass}>{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={`${primaryButtonClass} flex-1`}>{saving ? "Saving..." : record ? "Save changes" : kind === "REPAIR" ? "Save repair" : "Save service"}</button>
        <button type="button" onClick={onCancel} disabled={saving} className={secondaryButtonClass}>Cancel</button>
      </div>
    </form>
  );
}

export default function ServicePage() {
  const { activeVehicle, refresh } = useFuel();
  const [mode, setMode] = useState<{ type: "log"; kind: ServiceKind; issueId?: string } | { type: "add" } | { type: "issue" } | { type: "edit"; id: string } | { type: "editVisit"; id: string } | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [filter, setFilter] = useState<ServiceKind | "ALL">("ALL");
  const [error, setError] = useState("");
  const vehicleId = activeVehicle?.id ?? null;
  // Changes whenever a service is logged or deleted (refresh recomputes statuses).
  const historyKey = activeVehicle?.services.map((status) => `${status.lastOdometer}:${status.lastDate}`).join("|");

  const load = useCallback(async (id: string) => {
    const result = await apiRequest<{ records: ServiceRecord[] }>(`/api/vehicles/${id}/service-records`);
    if (result.ok) {
      setRecords(result.data.records);
      setError("");
    } else {
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    if (!vehicleId) return;
    const timerId = window.setTimeout(() => void load(vehicleId), 0);
    return () => window.clearTimeout(timerId);
  }, [vehicleId, load, historyKey]);

  async function removeItem(status: ServiceStatus) {
    if (!window.confirm(`Stop tracking ${status.name}? Past services stay in the history.`)) return;
    const result = await apiRequest(`/api/service-items/${status.itemId}`, { method: "DELETE" });
    if (!result.ok) return setError(result.error);
    await refresh();
  }

  async function removeIssue(issue: OpenIssue) {
    if (!window.confirm(`Remove "${issue.title}"? Use this if it was noted by mistake or went away.`)) return;
    const result = await apiRequest(`/api/issues/${issue.id}`, { method: "DELETE" });
    if (!result.ok) return setError(result.error);
    await refresh();
  }

  async function removeRecord(record: ServiceRecord) {
    const reopens = record.issues.length > 0 ? " Issues it fixed will be open again." : "";
    if (!window.confirm(`Delete the ${KIND_LABELS[record.kind].toLowerCase()} on ${formatDateOnly(record.occurredOn)}?${reopens}`)) return;
    const result = await apiRequest(`/api/service-records/${record.id}`, { method: "DELETE" });
    if (!result.ok) return setError(result.error);
    await refresh();
    if (vehicleId) void load(vehicleId);
  }

  if (!activeVehicle) {
    return (
      <Page narrow>
        <PageHeader title="Service" />
        <p className={mutedTextClass}>Add a vehicle first.</p>
      </Page>
    );
  }

  const services = activeVehicle.services;
  const openIssues = activeVehicle.openIssues;
  const costOf = (kind: ServiceKind) => records.filter((record) => record.kind === kind).reduce((sum, record) => sum + (record.costPaise ?? 0), 0);
  const shown = filter === "ALL" ? records : records.filter((record) => record.kind === filter);

  return (
    <Page narrow>
      <PageHeader
        title="Service"
        subtitle={`${activeVehicle.name} · due within 100 km or 14 days gets a reminder`}
        actions={
          mode?.type !== "log" ? (
            <button type="button" onClick={() => setMode({ type: "log", kind: "MAINTENANCE" })} className={primaryButtonClass}>
              <PlusIcon size={18} /> Log visit
            </button>
          ) : null
        }
      />
      <VehicleChips />
      {error ? <Notice tone="danger">{error}</Notice> : null}

      {mode?.type === "log" ? (
        <section className={cardClass}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Log a visit</h2>
          <RecordForm
            key={`${mode.kind}:${mode.issueId ?? ""}`}
            vehicle={activeVehicle}
            initialKind={mode.kind}
            issueId={mode.issueId}
            onSaved={() => {
              setMode(null);
              void load(activeVehicle.id);
            }}
            onCancel={() => setMode(null)}
          />
        </section>
      ) : null}

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-foreground">Open issues</h2>
          {mode?.type !== "issue" ? (
            <button type="button" onClick={() => setMode({ type: "issue" })} className={`${secondaryButtonClass} ${smallButtonClass}`}>Add issue</button>
          ) : null}
        </div>
        {mode?.type === "issue" ? (
          <div className="mt-4"><IssueForm vehicle={activeVehicle} onDone={() => setMode(null)} /></div>
        ) : null}
        {openIssues.length === 0 && mode?.type !== "issue" ? (
          <p className={`mt-3 ${mutedTextClass}`}>Nothing wrong right now. Note problems as you notice them so you can tell the mechanic.</p>
        ) : null}
        <ul className="mt-2 divide-y divide-border">
          {openIssues.map((issue) => (
            <li key={issue.id} className="flex items-start justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{issue.title}</p>
                <p className="text-xs text-muted">Noticed {formatDateOnly(issue.notedOn)}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                <button type="button" onClick={() => setMode({ type: "log", kind: "REPAIR", issueId: issue.id })} className="font-medium text-subtle underline">Log repair</button>
                <button type="button" onClick={() => void removeIssue(issue)} className="font-medium text-danger underline">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-foreground">What to service</h2>
          {mode?.type !== "add" ? (
            <button type="button" onClick={() => setMode({ type: "add" })} className={`${secondaryButtonClass} ${smallButtonClass}`}>Add item</button>
          ) : null}
        </div>
        {mode?.type === "add" ? (
          <div className="mt-4"><ItemForm vehicle={activeVehicle} onDone={() => setMode(null)} /></div>
        ) : null}
        {services.length === 0 && mode?.type !== "add" ? (
          <p className={`mt-3 ${mutedTextClass}`}>Nothing tracked yet. Add engine oil, chain lube and the rest to get reminders before they&apos;re due.</p>
        ) : null}
        <ul className="mt-2 divide-y divide-border">
          {services.map((status) =>
            mode?.type === "edit" && mode.id === status.itemId ? (
              <li key={status.itemId} className="py-4"><ItemForm vehicle={activeVehicle} item={status} onDone={() => setMode(null)} /></li>
            ) : (
              <li key={status.itemId} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{status.name}</p>
                    <p className="text-xs text-muted">
                      {intervalText(status)} · last at {formatKm(status.lastOdometer)}, {formatDateOnly(status.lastDate)}
                    </p>
                  </div>
                  <span className={`tabular shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.due ? "bg-reserve/20 text-foreground" : "bg-surface-muted text-muted"}`}>
                    {formatServiceDue(status)}
                  </span>
                </div>
                <div className="mt-2 flex gap-3 text-sm">
                  <button type="button" onClick={() => setMode({ type: "edit", id: status.itemId })} className="font-medium text-subtle underline">Edit</button>
                  <button type="button" onClick={() => void removeItem(status)} className="font-medium text-danger underline">Remove</button>
                </div>
              </li>
            )
          )}
        </ul>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-foreground">History</h2>
          {records.length > 0 ? (
            <span className="tabular text-right text-xs text-muted">
              Maintenance {formatMoney(costOf("MAINTENANCE"), true)} · Repair {formatMoney(costOf("REPAIR"), true)}
            </span>
          ) : null}
        </div>
        {records.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {(["ALL", "MAINTENANCE", "REPAIR"] as const).map((option) => (
              <button key={option} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)} className={chipStyle(filter === option)}>
                {option === "ALL" ? "All" : KIND_LABELS[option]}
              </button>
            ))}
          </div>
        ) : null}
        {shown.length === 0 ? <p className={`mt-3 ${mutedTextClass}`}>{records.length === 0 ? "No visits logged yet." : "Nothing of this type yet."}</p> : null}
        <ul className="mt-2 divide-y divide-border">
          {shown.map((record) =>
            mode?.type === "editVisit" && mode.id === record.id ? (
              <li key={record.id} className="py-4">
                <RecordForm
                  vehicle={activeVehicle}
                  initialKind={record.kind}
                  record={record}
                  onSaved={() => {
                    setMode(null);
                    void load(activeVehicle.id);
                  }}
                  onCancel={() => setMode(null)}
                />
              </li>
            ) : (
              <li key={record.id} className="flex items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${record.kind === "REPAIR" ? "bg-reserve/20" : "bg-surface-muted"}`}>{KIND_LABELS[record.kind]}</span>
                    {[...record.issues.map((issue) => issue.title), ...record.items.map((item) => item.name)].join(", ") || (record.kind === "REPAIR" ? "Repair" : "Service")}
                  </p>
                  <p className="tabular text-xs text-muted">
                    {formatDateOnly(record.occurredOn)} · {formatKm(record.odometer)}
                    {record.costPaise !== null ? ` · ${formatMoney(record.costPaise, true)}` : ""}
                  </p>
                  {record.note ? <p className="mt-1 text-sm text-subtle">{record.note}</p> : null}
                </div>
                <div className="flex shrink-0 gap-3 text-sm">
                  <button type="button" onClick={() => setMode({ type: "editVisit", id: record.id })} className="font-medium text-subtle underline">Edit</button>
                  <button type="button" onClick={() => void removeRecord(record)} className="font-medium text-danger underline">Delete</button>
                </div>
              </li>
            )
          )}
        </ul>
      </section>
    </Page>
  );
}
