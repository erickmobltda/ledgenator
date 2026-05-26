import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { LoginPage } from '@/features/auth/LoginPage';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/features/dashboard/HomePage';
import { OperationsPage } from '@/features/operations/OperationsPage';
import { BrokersPage } from '@/features/brokers/BrokersPage';
import { ProfilePage } from '@/features/profile/ProfilePage';

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!session) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="operations" element={<OperationsPage />} />
        <Route path="brokers" element={<BrokersPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
