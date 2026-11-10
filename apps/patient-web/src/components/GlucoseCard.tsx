import { useEffect, useState } from "react";
import { Droplets, Trash2 } from "lucide-react";

import { api, type GlucoseContext, type GlucoseRanges, type GlucoseReading } from "../lib/api";
import { GLUCOSE_CONTEXTS } from "../lib/food";
import { Alert, Button } from "./ui";

const contextLabel = (c: GlucoseContext) => GLUCOSE_CONTEXTS.find((x) => x.value === c)?.label ?? c;

// Optional daily blood sugar log. Reference ranges are shown for information only —
// the app never raises an alert on a reading.
export function GlucoseCard({ date, token }: { date: string; token: string }) {
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [ranges, setRanges] = useState<GlucoseRanges | null>(null);
  const [value, setValue] = useState("");
  const [context, setContext] = useState<GlucoseContext>("FASTING");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getGlucose(date, token).then((res) => {
      if (res) {
        setReadings(res.readings);
        setRanges(res.referenceRanges);
      }
    }).catch(() => undefined);
  }, [date, token]);

  const selectedRange = ranges?.ranges[context];

  const add = async () => {
    const mgDl = Number(value);
    if (!Number.isFinite(mgDl) || mgDl < 20 || mgDl > 600) {
      setError("Enter a value between 20 and 600 mg/dL.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { reading } = await api.addGlucose({ logDate: date, valueMgDl: mgDl, context }, token);
      setReadings((prev) => [...prev, reading]);
      setValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that reading.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteGlucose(id, token);
      setReadings((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete that reading.");
    }
  };

  return (
    <div className="card mb-4">
      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
        <Droplets size={18} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
        <span style={{ fontWeight: 600 }}>Blood sugar</span>
        <span className="text-xs text-muted">· optional</span>
      </div>
      <div className="text-xs text-muted" style={{ marginBottom: 12 }}>
        Log a reading whenever you check. Your care team can see your trend.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8 }}>
        <div>
          <label htmlFor="glucoseValue">mg/dL</label>
          <input id="glucoseValue" type="number" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 105" />
        </div>
        <div>
          <label htmlFor="glucoseContext">When</label>
          <select id="glucoseContext" value={context} onChange={(e) => setContext(e.target.value as GlucoseContext)}>
            {GLUCOSE_CONTEXTS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedRange && (
        <div className="text-xs text-secondary" style={{ marginTop: 8 }}>
          Typical {contextLabel(context).toLowerCase()} range: {selectedRange.text}
        </div>
      )}

      {error && <div style={{ marginTop: 10 }}><Alert variant="error">{error}</Alert></div>}

      <div style={{ marginTop: 12 }}>
        <Button block variant="secondary" loading={saving} disabled={value === ""} onClick={add}>
          Add reading
        </Button>
      </div>

      {readings.length > 0 && (
        <div style={{ marginTop: 14, borderTop: "1px solid var(--color-border)" }}>
          {readings.map((r) => {
            const range = ranges?.ranges[r.context];
            return (
              <div key={r.id} className="flex items-center" style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)", gap: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 600, minWidth: 64 }}>{r.valueMgDl}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {contextLabel(r.context)} · {new Date(r.measuredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </div>
                  {range && <div className="text-xs text-muted">Typical: {range.text}</div>}
                </div>
                <button onClick={() => remove(r.id)} aria-label="Delete reading" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", minHeight: 0, padding: 6 }}>
                  <Trash2 size={17} strokeWidth={1.5} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {ranges && <div className="text-xs text-muted" style={{ marginTop: 10 }}>{ranges.note}</div>}
    </div>
  );
}
