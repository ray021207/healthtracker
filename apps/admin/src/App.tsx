import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { useAuth } from "./lib/auth";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { CreatePatientPage } from "./pages/CreatePatientPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EditHealthProfilePage } from "./pages/EditHealthProfilePage";
import { GeneratePlanPage } from "./pages/GeneratePlanPage";
import { LegalPage } from "./pages/LegalPage";
import { LoginPage } from "./pages/LoginPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";
import { PatientProgressPage } from "./pages/PatientProgressPage";
import { PatientsListPage } from "./pages/PatientsListPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ViewPlanPage } from "./pages/ViewPlanPage";

function RequireAuth() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/terms" element={<LegalPage />} />
      <Route path="/privacy" element={<LegalPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientsListPage />} />
          <Route path="/patients/create" element={<CreatePatientPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/patients/:id/health-profile" element={<EditHealthProfilePage />} />
          <Route path="/patients/:id/progress" element={<PatientProgressPage />} />
          <Route path="/plans/generate" element={<GeneratePlanPage />} />
          <Route path="/plans/view" element={<ViewPlanPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
