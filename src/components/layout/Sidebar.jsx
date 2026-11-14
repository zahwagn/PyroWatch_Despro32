import {
  LayoutDashboard,
  Map,
  Bot,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import Logo from '../../assets/pyrowatch_sidebar.svg'

const navItems = [
  { id: 'monitoring', icon: LayoutDashboard, label: 'Home' },
  { id: 'map', icon: Map, label: 'Hotspot Map' },
  { id: 'ai', icon: Bot, label: 'AI Analysis' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({
  active = 'monitoring',
  onNavigate = () => {},
  expanded = false,
  onToggle = () => {},
}) {
  return (
    <aside
      className={`fixed left-4 top-4 bottom-4 z-[1200] flex flex-col rounded-3xl bg-forest-900 px-3 py-4 shadow-xl shadow-forest-900/25 overflow-hidden transition-[width] duration-300 ease-out ${
        expanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-0.5">
        <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-white/10 rounded-2xl">
          <img src={Logo} alt="PyroWatch" className="w-8 h-8 object-contain" />
        </div>
        <span
          className={`text-lg font-semibold text-white whitespace-nowrap transition-opacity duration-200 ${
            expanded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          PyroWatch
        </span>
      </div>

      {/* Menu */}
      <nav className="flex flex-col gap-1.5 mt-8">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              title={label}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-3 h-11 px-2.5 rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 ${
                isActive
                  ? 'bg-forest-400 text-white shadow-lg shadow-forest-400/30'
                  : 'text-forest-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={20} strokeWidth={2} className="shrink-0" />
              <span
                className={`text-sm font-medium whitespace-nowrap transition-opacity duration-200 ${
                  expanded ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Toggle expand / collapse */}
      <div className="mt-auto pt-3 border-t border-white/10">
        <button
          onClick={onToggle}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={expanded}
          title={expanded ? 'Collapse' : 'Expand'}
          className="w-full flex items-center gap-3 h-11 px-2.5 rounded-2xl text-forest-200 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-300"
        >
          {expanded ? (
            <ChevronsLeft size={20} strokeWidth={2} className="shrink-0" />
          ) : (
            <ChevronsRight size={20} strokeWidth={2} className="shrink-0" />
          )}
          <span
            className={`text-sm font-medium whitespace-nowrap transition-opacity duration-200 ${
              expanded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Collapse
          </span>
        </button>
      </div>
    </aside>
  )
}