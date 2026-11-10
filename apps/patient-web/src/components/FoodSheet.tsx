import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Plus, Sparkles, Trash2, X } from "lucide-react";

import { api, type DaySummary, type FoodEntry, type FoodItemDraft, type MealType } from "../lib/api";
import { emptyItem, FOOD_UNITS, MEAL_TYPES, PLATE_CATEGORIES, photoToBase64, scaleItem, unitCups } from "../lib/food";
import { Alert, Button } from "./ui";

type Props = {
  mealType: MealType;
  date: string;
  token: string;
  onClose: () => void;
  onSaved: (day: { entries: FoodEntry[]; summary: DaySummary }) => void;
};

const num = (v: string) => (v === "" ? 0 : Number(v));

export function FoodSheet({ mealType, date, token, onClose, onSaved }: Props) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<FoodItemDraft[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "text" | "photo" | "save">(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mealLabel = MEAL_TYPES.find((m) => m.value === mealType)?.label ?? "meal";
  const total = items.reduce((sum, i) => sum + i.calories, 0);

  const addAnalyzed = (result: { items: Array<Omit<FoodItemDraft, "source">>; note: string | null }, source: "AI_TEXT" | "AI_PHOTO") => {
    if (result.items.length === 0) {
      setError(result.note ?? "I couldn't find any food in that. Try describing it differently.");
      return;
    }
    setItems((prev) => [...prev, ...result.items.map((i) => ({ ...i, source }))]);
    setNote(result.note);
  };

  const estimateText = async () => {
    if (text.trim().length < 2) return;
    setBusy("text");
    setError(null);
    try {
      addAnalyzed(await api.analyzeFoodText(text.trim(), token), "AI_TEXT");
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't estimate that. You can add it manually below.");
    } finally {
      setBusy(null);
    }
  };

  const estimatePhoto = async (file: File) => {
    setBusy("photo");
    setError(null);
    try {
      const { base64, mediaType } = await photoToBase64(file);
      addAnalyzed(await api.analyzeFoodPhoto(base64, mediaType, text.trim() || undefined, token), "AI_PHOTO");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that photo. You can add the food manually below.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const update = (index: number, patch: Partial<FoodItemDraft>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const save = async () => {
    const valid = items.filter((i) => i.name.trim() && i.quantity > 0);
    if (valid.length === 0) {
      setError("Add at least one food with a name and amount.");
      return;
    }
    setBusy("save");
    setError(null);
    try {
      const prepared = valid.map((i) => ({
        ...i,
        name: i.name.trim(),
        volumeCups: i.volumeCups > 0 ? i.volumeCups : Math.round(i.quantity * unitCups(i.unit) * 100) / 100,
      }));
      onSaved(await api.addFood({ logDate: date, mealType, items: prepared }, token));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
      setBusy(null);
    }
  };

  // Rendered on document.body: an animated ancestor would otherwise trap position:fixed and
  // push the sheet to the bottom of the page instead of the bottom of the screen.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Add food to ${mealLabel}`}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,16,36,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--color-surface)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          padding: "18px 16px max(18px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>Add to {mealLabel}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", minHeight: 0, padding: 6 }}>
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <label htmlFor="foodText">What did you eat?</label>
        <textarea
          id="foodText"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 1 bowl oatmeal, 1 tablespoon peanut butter, a banana"
          style={{ minHeight: 64 }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <Button loading={busy === "text"} disabled={busy !== null || text.trim().length < 2} onClick={estimateText} leftIcon={<Sparkles size={16} strokeWidth={1.5} />}>
            Estimate calories
          </Button>
          <Button variant="secondary" loading={busy === "photo"} disabled={busy !== null} onClick={() => fileRef.current?.click()} leftIcon={<Camera size={16} strokeWidth={1.5} />}>
            Add a photo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => e.target.files?.[0] && estimatePhoto(e.target.files[0])}
          />
        </div>
        <div className="text-xs text-muted" style={{ marginTop: 6 }}>
          Photos are used only to estimate the food and are not saved.
        </div>

        {error && <div style={{ marginTop: 12 }}><Alert variant="error">{error}</Alert></div>}

        {items.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 18 }}>Review and adjust</div>
            {note && <div className="text-xs text-secondary" style={{ marginBottom: 8 }}>{note}</div>}
            <div className="text-xs text-muted" style={{ marginBottom: 8 }}>
              These are estimates. Change the amount or any number that looks off.
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((item, i) => (
                <div key={i} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 12 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input aria-label="Food name" value={item.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Food" style={{ flex: 1 }} />
                    <button onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove item" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", minHeight: 0, padding: 6 }}>
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 8, marginTop: 8 }}>
                    <input aria-label="Amount" type="number" inputMode="decimal" min="0" step="0.25" value={item.quantity} onChange={(e) => setItems((prev) => prev.map((x, j) => (j === i ? scaleItem(x, num(e.target.value)) : x)))} />
                    <select aria-label="Unit" value={item.unit} onChange={(e) => update(i, { unit: e.target.value })}>
                      {FOOD_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                      {!FOOD_UNITS.some((u) => u.value === item.unit) && <option value={item.unit}>{item.unit}</option>}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
                    {([
                      ["Calories", "calories"],
                      ["Carbs g", "carbsG"],
                      ["Protein g", "proteinG"],
                      ["Fat g", "fatG"],
                    ] as const).map(([label, key]) => (
                      <div key={key}>
                        <div className="text-xs text-muted" style={{ marginBottom: 2 }}>{label}</div>
                        <input aria-label={label} type="number" inputMode="decimal" min="0" value={item[key]} onChange={(e) => update(i, { [key]: num(e.target.value) })} />
                      </div>
                    ))}
                  </div>
                  <select aria-label="Plate category" value={item.plateCategory} onChange={(e) => update(i, { plateCategory: e.target.value as FoodItemDraft["plateCategory"] })} style={{ marginTop: 8 }}>
                    {PLATE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  {item.confidence === "low" && <div className="text-xs" style={{ color: "var(--color-warning-text)", marginTop: 6 }}>Low-confidence estimate — please check.</div>}
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          style={{ marginTop: 12, background: "none", border: "none", color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 0, padding: "6px 0" }}
        >
          <Plus size={16} strokeWidth={1.75} /> Add a food manually
        </button>

        <div style={{ marginTop: 16 }}>
          <Button block loading={busy === "save"} disabled={busy !== null || items.length === 0} onClick={save}>
            {items.length > 0 ? `Save to ${mealLabel} · ${Math.round(total)} kcal` : `Save to ${mealLabel}`}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
