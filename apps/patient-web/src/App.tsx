import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import LoginPage from "./pages/LoginPage";
import LegalPage from "./pages/LegalPage";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import PlanPage from "./pages/PlanPage";
import TrackPage from "./pages/TrackPage";
import ProgressPage from "./pages/ProgressPage";
import ProfilePage from "./pages/ProfilePage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { accessToken } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={accessToken ? <Navigate to="/home" replace /> : <LoginPage />} />
      <Route path="/terms" element={<LegalPage />} />
      <Route path="/privacy" element={<LegalPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<HomePage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="track" element={<TrackPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to={accessToken ? "/home" : "/login"} replace />} />
    </Routes>
  );
}
