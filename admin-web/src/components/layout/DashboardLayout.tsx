import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header path={location.pathname} />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
