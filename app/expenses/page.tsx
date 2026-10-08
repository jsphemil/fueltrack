"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { PlusIcon } from "@/components/Icons";
import { Field, Notice, Page, PageHeader, VehicleChips } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useFuel } from "@/lib/fuel-context";
import { formatDateOnly, formatMoney } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { cardClass, chipClass, errorTextClass, inputClass, mutedTextClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { EXPENSE_CATEGORIES, NOTE_MAX_LENGTH, parseExpenseInput } from "@/lib/validation";

// Today's date on this phone as "YYYY-MM-DD".
function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

type ExpenseFormProps = { vehicleId: string; expense?: Expense; onSaved: () => void; onCancel: () => void };

function ExpenseForm({ vehicleId, expense, onSaved, onCancel }: ExpenseFormProps) {
  const [category, setCategory] = useState<string>(expense?.category ?? "Parts");
  const [occurredOn, setOccurredOn] = useState(expense?.occurredOn.slice(0, 10) ?? localToday());
  const [amountRupees, setAmountRupees] = useState(expense ? String(expense.amountPaise / 100) : "");
  const [note, setNote] = useState(expense?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = { vehicleId, category, occurredOn, amountRupees, note };
    const parsed = parseExpenseInput(body);
    if (!parsed.ok) return setError(parsed.error);
    setSaving(true);
    const result = await apiRequest(expense ? `/api/expenses/${expense.id}` : "/api/expenses", { method: expense ? "PATCH" : "POST", body });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="flex flex-wrap gap-2">
        {EXPENSE_CATEGORIES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={category === option}
            onClick={() => setCategory(option)}
            className={`${chipClass} ${category === option ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface text-subtle"}`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)">
          <input type="number" inputMode="decimal" min="0" step="1" value={amountRupees} onChange={(event) => setAmountRupees(event.target.value)} className={`${inputClass} tabular`} />
        </Field>
        <Field label="Date">
          <input type="date" value={occurredOn} max={localToday()} onChange={(event) => setOccurredOn(event.target.value)} className={`${inputClass} tabular`} />
        </Field>
      </div>
      <Field label="Note (optional)" hint="What it was for, shop, policy number...">
        <input value={note} maxLength={NOTE_MAX_LENGTH} onChange={(event) => setNote(event.target.value)} className={inputClass} />
      </Field>
      {error ? <p className={errorTextClass}>{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={`${primaryButtonClass} flex-1`}>{saving ? "Saving..." : expense ? "Save changes" : "Add expense"}</button>
        <button type="button" onClick={onCancel} disabled={saving} className={secondaryButtonClass}>Cancel</button>
      </div>
    </form>
  );
}

export default function ExpensesPage() {
  const { activeVehicle } = useFuel();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState("");
  const vehicleId = activeVehicle?.id ?? null;

  const load = useCallback(async (id: string) => {
    const result = await apiRequest<{ expenses: Expense[] }>(`/api/vehicles/${id}/expenses`);
    if (result.ok) {
      setExpenses(result.data.expenses);
      setError("");
    } else {
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    if (!vehicleId) return;
    const timerId = window.setTimeout(() => void load(vehicleId), 0);
    return () => window.clearTimeout(timerId);
  }, [vehicleId, load]);

  async function remove(expense: Expense) {
    if (!window.confirm(`Delete this ${expense.category.toLowerCase()} expense of ${formatMoney(expense.amountPaise, true)}?`)) return;
    const result = await apiRequest(`/api/expenses/${expense.id}`, { method: "DELETE" });
    if (!result.ok) return setError(result.error);
    if (vehicleId) void load(vehicleId);
  }

  if (!activeVehicle) {
    return (
      <Page narrow>
        <PageHeader title="Expenses" />
        <p className={mutedTextClass}>Add a vehicle first.</p>
      </Page>
    );
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amountPaise, 0);

  return (
    <Page narrow>
      <PageHeader
        title="Expenses"
        subtitle={`${activeVehicle.name} · fuel and service visits are counted separately`}
        actions={
          !adding ? (
            <button type="button" onClick={() => setAdding(true)} className={primaryButtonClass}>
              <PlusIcon size={18} /> Add
            </button>
          ) : null
        }
      />
      <VehicleChips />
      {error ? <Notice tone="danger">{error}</Notice> : null}

      {adding ? (
        <section className={cardClass}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">New expense</h2>
          <ExpenseForm
            key={activeVehicle.id}
            vehicleId={activeVehicle.id}
            onSaved={() => {
              setAdding(false);
              void load(activeVehicle.id);
            }}
            onCancel={() => setAdding(false)}
          />
        </section>
      ) : null}

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-foreground">All expenses</h2>
          {expenses.length > 0 ? <span className="tabular text-sm text-muted">Total {formatMoney(total, true)}</span> : null}
        </div>
        {expenses.length === 0 ? (
          <p className={`mt-3 ${mutedTextClass}`}>Nothing yet. Add parts, insurance, parking, tolls and washes to see what the vehicle really costs on the Stats page.</p>
        ) : null}
        <ul className="mt-2 divide-y divide-border">
          {expenses.map((expense) =>
            editingId === expense.id ? (
              <li key={expense.id} className="py-4">
                <ExpenseForm
                  vehicleId={activeVehicle.id}
                  expense={expense}
                  onSaved={() => {
                    setEditingId(null);
                    void load(activeVehicle.id);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={expense.id} className="flex items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{expense.category}</p>
                  <p className="tabular text-xs text-muted">{formatDateOnly(expense.occurredOn)}</p>
                  {expense.note ? <p className="mt-1 text-sm text-subtle">{expense.note}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="tabular font-semibold text-foreground">{formatMoney(expense.amountPaise, true)}</span>
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => setEditingId(expense.id)} className="font-medium text-subtle underline">Edit</button>
                    <button type="button" onClick={() => void remove(expense)} className="font-medium text-danger underline">Delete</button>
                  </div>
                </div>
              </li>
            )
          )}
        </ul>
      </section>
    </Page>
  );
}
