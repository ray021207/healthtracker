import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, LogOut, Bell } from "lucide-react";

import { useAuth } from "../lib/auth";
import { usePlanGeneration } from "../lib/planGeneration";
import { api } from "../lib/api";
import { disableReminder, enableReminder, isPushSupported } from "../lib/push";
import { Alert, Avatar, Badge, Button, Card } from "../components/ui";

const tagsToString = (arr: string[]) => arr.join(", ");
const stringToTags = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);

function CheckRow({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0 }} />
      <span>
        <span className="font-medium" style={{ display: "block", color: "var(--color-text-primary)" }}>{label}</span>
        <span className="text-xs text-muted">{sub}</span>
      </span>
    </label>
  );
}

export default function ProfilePage() {
  const { user, accessToken, logout } = useAuth();
  const { generating: planGenerating, status: planStatus, error: planError, generatePlan } = usePlanGeneration();
  const navigate = useNavigate();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwStatus, setPwStatus] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const [hpLoading, setHpLoading] = useState(true);
  const [hpSaving, setHpSaving] = useState(false);
  const [hpStatus, setHpStatus] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [existingProfile, setExistingProfile] = useState<Record<string, unknown> | null>(null);
  const [prefs, setPrefs] = useState({
    activityLevel: "MODERATELY_ACTIVE",
    dietStyle: "BALANCED",
    dietaryRestrictions: "",
    allergies: "",
    includeAyurvedic: false,
    includeAntiInflammatory: false,
  });

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("19:00");
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    api.getHealthProfile(accessToken).then((res) => {
      const hp = res?.healthProfile;
      if (hp) {
        setExistingProfile(hp);
        setPrefs({
          activityLevel: String(hp.activityLevel ?? "MODERATELY_ACTIVE"),
          dietStyle: String(hp.dietStyle ?? "BALANCED"),
          dietaryRestrictions: tagsToString(Array.isArray(hp.dietaryRestrictions) ? (hp.dietaryRestrictions as string[]) : []),
          allergies: tagsToString(Array.isArray(hp.allergies) ? (hp.allergies as string[]) : []),
          includeAyurvedic: Boolean(hp.includeAyurvedic),
          includeAntiInflammatory: Boolean(hp.includeAntiInflammatory),
        });
      }
    }).finally(() => setHpLoading(false));

    api.getProfile(accessToken).then((res) => {
      const p = res?.profile;
      if (p) {
        setReminderEnabled(Boolean(p.reminderEnabled));
        if (typeof p.reminderTime === "string") setReminderTime(p.reminderTime);
      }
    });
  }, [accessToken]);

  const handleReminderToggle = async (checked: boolean) => {
    if (!accessToken) return;
    setReminderSaving(true);
    setReminderStatus(null);
    try {
      if (checked) {
        await enableReminder(reminderTime, accessToken);
        setReminderEnabled(true);
        setReminderStatus({ type: "ok", msg: `Daily reminder set for ${reminderTime}.` });
      } else {
        await disableReminder(accessToken);
        setReminderEnabled(false);
        setReminderStatus({ type: "ok", msg: "Daily reminder turned off." });
      }
    } catch (e) {
      setReminderStatus({ type: "err", msg: e instanceof Error ? e.message : "Failed to update reminder" });
    } finally {
      setReminderSaving(false);
    }
  };

  const handleReminderTimeChange = async (time: string) => {
    setReminderTime(time);
    if (!accessToken || !reminderEnabled) return;
    setReminderSaving(true);
    setReminderStatus(null);
    try {
      await enableReminder(time, accessToken);
      setReminderStatus({ type: "ok", msg: `Daily reminder updated to ${time}.` });
    } catch (e) {
      setReminderStatus({ type: "err", msg: e instanceof Error ? e.message : "Failed to update reminder time" });
    } finally {
      setReminderSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) { setPwStatus({ type: "err", msg: "All fields are required" }); return; }
    if (newPw.length < 12) { setPwStatus({ type: "err", msg: "New password must be at least 12 characters" }); return; }
    if (newPw !== confirmPw) { setPwStatus({ type: "err", msg: "Passwords do not match" }); return; }
    if (newPw === currentPw) { setPwStatus({ type: "err", msg: "New password must differ from current" }); return; }
    setSaving(true);
    setPwStatus(null);
    try {
      await api.changePassword(currentPw, newPw, accessToken!);
      setPwStatus({ type: "ok", msg: "Password changed. Signing you out…" });
      setTimeout(() => { logout(); navigate("/login"); }, 2000);
    } catch (e) {
      setPwStatus({ type: "err", msg: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingProfile) return;
    setHpSaving(true);
    setHpStatus(null);
    try {
      const merged = {
        ...existingProfile,
        activityLevel: prefs.activityLevel,
        dietStyle: prefs.dietStyle,
        dietaryRestrictions: stringToTags(prefs.dietaryRestrictions),
        allergies: stringToTags(prefs.allergies),
        includeAyurvedic: prefs.includeAyurvedic,
        includeAntiInflammatory: prefs.includeAntiInflammatory,
      };
      await api.updateHealthProfile(merged, accessToken!);
      setHpStatus({ type: "ok", msg: "Preferences saved" });
    } catch (e) {
      setHpStatus({ type: "err", msg: e instanceof Error ? e.message : "Failed to save" });
    } finally {
      setHpSaving(false);
    }
  };

  return (
    <div className="page-pad">
      <div className="mb-4">
        <div className="text-sm text-secondary font-medium">Account</div>
        <h1 style={{ fontSize: 26, marginTop: 2 }}>Profile</h1>
      </div>

      {/* User card */}
      <Card className="mb-4">
        <div className="flex items-center gap-4">
          <Avatar firstName={user?.firstName} lastName={user?.lastName} size={56} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>{user?.firstName} {user?.lastName}</div>
            <div className="text-sm text-secondary mt-2" style={{ marginTop: 2 }}>{user?.email}</div>
            <div className="mt-2"><Badge variant="primary">Patient</Badge></div>
          </div>
        </div>
      </Card>

      {/* Health preferences */}
      <Card className="mb-4">
        <h2 className="mb-2">Health Preferences</h2>
        <div className="text-sm text-secondary mb-4">Your activity level, diet style, and restrictions used to personalise your plan.</div>

        {hpLoading ? (
          <div className="text-sm text-muted">Loading…</div>
        ) : !existingProfile ? (
          <div className="text-sm text-secondary" style={{ background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 16, lineHeight: 1.6 }}>
            Your health profile hasn't been entered yet, so you can't set preferences or generate a plan. Your practitioner needs to add your clinical vitals first — please visit your clinic.
          </div>
        ) : (
          <form onSubmit={handleSavePrefs} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="activity">Activity Level</label>
              <select id="activity" value={prefs.activityLevel} onChange={(e) => setPrefs((p) => ({ ...p, activityLevel: e.target.value }))}>
                <option value="SEDENTARY">Sedentary (desk job, little/no exercise)</option>
                <option value="LIGHTLY_ACTIVE">Lightly active (1–3 days/week)</option>
                <option value="MODERATELY_ACTIVE">Moderately active (3–5 days/week)</option>
                <option value="VERY_ACTIVE">Very active (6–7 days/week)</option>
                <option value="EXTRA_ACTIVE">Extra active (athlete / physical job)</option>
              </select>
            </div>
            <div>
              <label htmlFor="diet">Diet Style</label>
              <select id="diet" value={prefs.dietStyle} onChange={(e) => setPrefs((p) => ({ ...p, dietStyle: e.target.value }))}>
                <option value="BALANCED">Balanced</option>
                <option value="LOW_CARB">Low carb</option>
                <option value="KETO">Keto</option>
                <option value="MEDITERRANEAN">Mediterranean</option>
                <option value="VEGETARIAN">Vegetarian</option>
                <option value="NON_VEGETARIAN">Non-vegetarian</option>
                <option value="VEGAN">Vegan</option>
                <option value="INDIAN">Indian</option>
                <option value="INDIAN_VEGETARIAN">Indian vegetarian</option>
                <option value="INDIAN_VEGAN">Indian vegan</option>
                <option value="DIABETIC_FRIENDLY">Diabetic friendly</option>
                <option value="LOW_CHOLESTEROL">Low cholesterol</option>
              </select>
            </div>
            <div>
              <label htmlFor="restrictions">Dietary Restrictions (comma-separated)</label>
              <input id="restrictions" value={prefs.dietaryRestrictions} onChange={(e) => setPrefs((p) => ({ ...p, dietaryRestrictions: e.target.value }))} placeholder="e.g. gluten-free, dairy-free" />
            </div>
            <div>
              <label htmlFor="allergies">Allergies (comma-separated)</label>
              <input id="allergies" value={prefs.allergies} onChange={(e) => setPrefs((p) => ({ ...p, allergies: e.target.value }))} placeholder="e.g. peanuts, shellfish" />
            </div>
            <div style={{ background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: "4px 16px" }}>
              <CheckRow label="Include Ayurvedic suggestions" sub="Adds traditional wellness recommendations to your plan" checked={prefs.includeAyurvedic} onChange={(v) => setPrefs((p) => ({ ...p, includeAyurvedic: v }))} />
              <CheckRow label="Anti-inflammatory guidance" sub="Prioritises omega-3 and anti-inflammatory foods" checked={prefs.includeAntiInflammatory} onChange={(v) => setPrefs((p) => ({ ...p, includeAntiInflammatory: v }))} />
            </div>
            {hpStatus && <Alert variant={hpStatus.type === "ok" ? "success" : "error"}>{hpStatus.msg}</Alert>}
            <Button type="submit" block loading={hpSaving}>{hpSaving ? "Saving…" : "Save Preferences"}</Button>

            <div style={{ marginTop: 6, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
              <div className="text-sm text-secondary mb-3" style={{ lineHeight: 1.6 }}>
                Generate or regenerate your personalised 90-day plan based on your saved clinical profile and preferences.
              </div>
              <Button block leftIcon={<Sparkles size={18} strokeWidth={1.5} />} loading={planGenerating} onClick={generatePlan}>
                {planGenerating ? "Generating…" : "Generate My 90-Day Plan"}
              </Button>
              {planStatus && <div className="mt-3"><Alert variant={planGenerating ? "info" : "success"}>{planStatus}</Alert></div>}
              {planError && <div className="mt-3"><Alert variant="error">{planError}</Alert></div>}
            </div>
          </form>
        )}
      </Card>

      {/* Daily reminder */}
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell size={18} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
          <h2 style={{ margin: 0 }}>Daily Reminder</h2>
        </div>
        <div className="text-sm text-secondary mb-4">Get a notification if you haven't logged your meals and progress yet.</div>

        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: isPushSupported() ? "pointer" : "not-allowed" }}>
          <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>Remind me daily</span>
          <input
            type="checkbox"
            checked={reminderEnabled}
            disabled={reminderSaving || !isPushSupported()}
            onChange={(e) => handleReminderToggle(e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
        </label>

        {!isPushSupported() && (
          <div className="text-xs text-muted mt-2" style={{ lineHeight: 1.5 }}>
            Notifications need the app installed to your home screen first (iPhone: open in Safari, tap Share, then "Add to Home Screen").
          </div>
        )}

        {isPushSupported() && (
          <div style={{ marginTop: 16, opacity: reminderEnabled ? 1 : 0.5 }}>
            <label htmlFor="reminderTime">Reminder time</label>
            <input
              id="reminderTime"
              type="time"
              value={reminderTime}
              disabled={!reminderEnabled || reminderSaving}
              onChange={(e) => handleReminderTimeChange(e.target.value)}
            />
          </div>
        )}

        {reminderStatus && (
          <div className="mt-3">
            <Alert variant={reminderStatus.type === "ok" ? "success" : "error"}>{reminderStatus.msg}</Alert>
          </div>
        )}
      </Card>

      {/* Change password */}
      <Card className="mb-4">
        <h2 className="mb-3">Change Password</h2>
        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label htmlFor="currentPw">Current Password</label>
            <input id="currentPw" type="password" autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
          </div>
          <div>
            <label htmlFor="newPw">New Password</label>
            <input id="newPw" type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            <div className="field-hint">Minimum 12 characters</div>
          </div>
          <div>
            <label htmlFor="confirmPw">Confirm New Password</label>
            <input id="confirmPw" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
          {pwStatus && <Alert variant={pwStatus.type === "ok" ? "success" : "error"}>{pwStatus.msg}</Alert>}
          <Button type="submit" block loading={saving}>{saving ? "Updating…" : "Update Password"}</Button>
        </form>
      </Card>

      <Button variant="destructive" block leftIcon={<LogOut size={18} strokeWidth={1.5} />} onClick={handleLogout}>
        Sign Out
      </Button>

      <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", marginTop: 16 }}>
        <Link to="/terms" style={{ color: "inherit" }}>Terms of Service</Link>
        {" · "}
        <Link to="/privacy" style={{ color: "inherit" }}>Privacy Policy</Link>
      </p>
    </div>
  );
}
