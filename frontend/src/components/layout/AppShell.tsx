import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';

export default function AppShell() {
  const { token } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="h-screen flex flex-col">
      <Navbar onToggleSidebar={() => setCollapsed(c => !c)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(c => !c)} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
