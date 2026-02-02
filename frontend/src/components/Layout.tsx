import { Outlet, NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  MapPin, 
  BarChart3, 
  Settings,
  Leaf,
  Bell,
  User,
  Menu
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/farms', icon: MapPin, label: 'Farms' },
  { to: '/analysis', icon: BarChart3, label: 'Analysis' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 border-b bg-card z-50">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-accent rounded-md lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">AgriWatch</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-accent rounded-md relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <button className="p-2 hover:bg-accent rounded-md">
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-14 bottom-0 w-64 border-r bg-card transition-transform z-40",
          !sidebarOpen && "-translate-x-full lg:translate-x-0 lg:w-16"
        )}
      >
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent"
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className={cn(!sidebarOpen && "lg:hidden")}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent"
          >
            <Settings className="h-5 w-5" />
            <span className={cn(!sidebarOpen && "lg:hidden")}>Settings</span>
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main 
        className={cn(
          "pt-14 transition-all",
          sidebarOpen ? "lg:pl-64" : "lg:pl-16"
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
