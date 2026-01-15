import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Users, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/products', icon: Package, label: 'Products' },
    { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/admin/users', icon: Users, label: 'Users' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-blue-800 rounded-lg transition"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-bold">GameZone Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:text-orange-400 transition">
            View Store
          </Link>
          <button className="flex items-center gap-2 hover:text-orange-400 transition">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`bg-white h-[calc(100vh-64px)] shadow-lg transition-all duration-300 ${
            sidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-blue-50 text-gray-700'
                  }`}
                >
                  <Icon size={20} />
                  {sidebarOpen && <span className="font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
