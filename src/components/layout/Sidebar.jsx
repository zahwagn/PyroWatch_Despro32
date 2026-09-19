import { LayoutDashboard, Map, Bot, Settings } from 'lucide-react'
import Logo from '../../assets/pyrowatch_sidebar.svg'

const navItems = [
  { icon: LayoutDashboard, label: 'Monitoring', active: true },
  { icon: Map, label: 'Hotspot Map' },
  { icon: Bot, label: 'AI Analysis' },
  { icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-forest-800 flex flex-col items-center py-5 gap-6 z-10">
      <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-2xl">
        <img src={Logo} alt="PyroWatch" className="w-8 h-8 object-contain" />
      </div>
      <nav className="flex flex-col gap-1 mt-2">
        {navItems.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            title={label}
            className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-colors ${
              active
                ? 'bg-forest-500 text-white'
                : 'text-forest-300 hover:bg-forest-700 hover:text-white'
            }`}
          >
            <Icon size={17} strokeWidth={1.75} />
          </button>
        ))}
      </nav>
    </aside>
  )
}
