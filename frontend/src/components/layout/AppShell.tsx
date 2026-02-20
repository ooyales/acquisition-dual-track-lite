import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function AppShell() {
  const { token } = useAuthStore();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="h-screen flex flex-col">
      <Navbar
        onToggleSidebar={() => {
          if (isMobile) {
            setMobileMenuOpen(o => !o);
          } else {
            setCollapsed(c => !c);
          }
        }}
        isMobile={isMobile}
      />

      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={isMobile ? false : collapsed}
          onCollapse={() => setCollapsed(c => !c)}
          isMobile={isMobile}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        <main className={`flex-1 overflow-y-auto bg-gray-50 ${isMobile ? 'p-4' : 'p-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
