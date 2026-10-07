"use client";

import { FormEvent, useState } from "react";

import { PlusIcon } from "@/components/Icons";
import { Field, Notice, Page, PageHeader } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { daysUntil, documentStage } from "@/lib/engine";
import { useFuel } from "@/lib/fuel-context";
import { formatDateOnly, formatExpiry } from "@/lib/format";
import type { VehicleDocument } from "@/lib/types";
import { cardClass, chipClass, errorTextClass, inputClass, mutedTextClass, primaryButtonClass, secondaryButtonClass, smallButtonClass } from "@/lib/ui";
import { DOCUMENT_KINDS, NOTE_MAX_LENGTH, parseDocumentInput } from "@/lib/validation";

const KIND_HINTS: Record<string, string> = {
  Insurance: "Vehicle insurance policy",
  PUC: "Pollution under control certificate",
  RC: "Registration certificate",
  Licence: "Your driving licence",
  Other: "Permit, fitness, warranty...",
};

function DocumentForm({ document, onDone }: { document?: VehicleDocument; onDone: () => void }) {
  const { vehicles, activeVehicle, refresh } = useFuel();
  const [kind, setKind] = useState(document?.kind ?? "Insurance");
  const [vehicleId, setVehicleId] = useState(document ? document.vehicleId ?? "" : activeVehicle?.id ?? "");
  const [expiresOn, setExpiresOn] = useState(document?.expiresOn.slice(0, 10) ?? "");
  const [note, setNote] = useState(document?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = { kind, vehicleId, expiresOn, note };
    const parsed = parseDocumentInput(body);
    if (!parsed.ok) return setError(parsed.error);
    setSaving(true);
    const result = await apiRequest(document ? `/api/documents/${document.id}` : "/api/documents", {
      method: document ? "PATCH" : "POST",
      body,
    });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    await refresh();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-subtle">Document</span>
        <div className="flex flex-wrap gap-2">
          {DOCUMENT_KINDS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setKind(option);
                if (option === "Licence") setVehicleId("");
              }}
              aria-pressed={kind === option}
              className={`${chipClass} ${kind === option ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface text-subtle"}`}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">{KIND_HINTS[kind]}</p>
      </div>

      <Field label="For">
        <select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} className={inputClass}>
          <option value="">Me (personal)</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Valid until">
        <input type="date" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} className={`${inputClass} tabular`} />
      </Field>

      <Field label="Note (optional)" hint="Policy number, insurer, where the paper copy is...">
        <input value={note} maxLength={NOTE_MAX_LENGTH} onChange={(event) => setNote(event.target.value)} className={inputClass} />
      </Field>

      {error ? <p className={errorTextClass}>{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={`${primaryButtonClass} flex-1`}>
          {saving ? "Saving..." : document ? "Save changes" : "Add document"}
        </button>
        <button type="button" onClick={onDone} disabled={saving} className={secondaryButtonClass}>Cancel</button>
      </div>
    </form>
  );
}

const stageTone: Record<string, string> = {
  expired: "bg-danger/15 text-danger",
  "7": "bg-reserve/20 text-foreground",
  "30": "bg-surface-muted text-foreground",
};

export default function DocumentsPage() {
  const { documents, allVehicles, refresh } = useFuel();
  const [mode, setMode] = useState<{ type: "add" } | { type: "edit"; id: string } | null>(null);
  const [error, setError] = useState("");

  async function remove(document: VehicleDocument) {
    if (!window.confirm(`Delete this ${document.kind} reminder?`)) return;
    const result = await apiRequest(`/api/documents/${document.id}`, { method: "DELETE" });
    if (!result.ok) return setError(result.error);
    setError("");
    await refresh();
  }

  return (
    <Page narrow>
      <PageHeader
        title="Documents"
        subtitle="Get reminded 30 and 7 days before anything expires."
        actions={
          mode?.type !== "add" ? (
            <button type="button" onClick={() => setMode({ type: "add" })} className={primaryButtonClass}>
              <PlusIcon size={18} /> Add
            </button>
          ) : null
        }
      />
      {error ? <Notice tone="danger">{error}</Notice> : null}

      {mode?.type === "add" ? (
        <section className={cardClass}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">New document</h2>
          <DocumentForm onDone={() => setMode(null)} />
        </section>
      ) : null}

      {documents.length === 0 && mode === null ? (
        <section className={cardClass}>
          <p className={mutedTextClass}>
            No documents yet. Add your insurance, PUC, RC and driving licence expiry dates so you never ride with an expired one.
          </p>
        </section>
      ) : null}

      {documents.map((document) => {
        if (mode?.type === "edit" && mode.id === document.id) {
          return (
            <section key={document.id} className={cardClass}>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Edit {document.kind}</h2>
              <DocumentForm document={document} onDone={() => setMode(null)} />
            </section>
          );
        }
        const daysLeft = daysUntil(document.expiresOn);
        const stage = documentStage(daysLeft);
        const owner = allVehicles.find((vehicle) => vehicle.id === document.vehicleId)?.name ?? "Personal";
        return (
          <section key={document.id} className={cardClass}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">{document.kind}</h2>
                <p className="text-sm text-muted">{owner} · valid until {formatDateOnly(document.expiresOn)}</p>
                {document.note ? <p className="mt-1 truncate text-sm text-subtle">{document.note}</p> : null}
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${stage ? stageTone[stage] : "bg-surface-muted text-muted"}`}>
                {formatExpiry(daysLeft)}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setMode({ type: "edit", id: document.id })} className={`${secondaryButtonClass} ${smallButtonClass}`}>
                {stage ? "Renewed? Update date" : "Edit"}
              </button>
              <button type="button" onClick={() => void remove(document)} className={`${secondaryButtonClass} ${smallButtonClass} text-danger!`}>Delete</button>
            </div>
          </section>
        );
      })}
    </Page>
  );
}
