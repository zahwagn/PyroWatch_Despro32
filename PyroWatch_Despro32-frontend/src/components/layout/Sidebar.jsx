import {
  LayoutDashboard,
  Map,
  BrainCircuit,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import Logo from '../../assets/pyrowatch_sidebar.svg';

const navItems = [
  {
    id: 'monitoring',
    icon: LayoutDashboard,
    label: 'Monitoring',
  },
  {
    id: 'map',
    icon: Map,
    label: 'Hotspot Map',
  },
  {
    id: 'analysis',
    icon: BrainCircuit,
    label: 'Analisis ML',
  },
  {
    id: 'settings',
    icon: Settings,
    label: 'Status Integrasi',
  },
];

export default function Sidebar({
  active = 'monitoring',
  onNavigate = () => {},
  expanded = false,
  onToggle = () => {},
}) {
  return (
    <aside
      className={
        'fixed bottom-4 left-4 top-4 z-[1200] flex flex-col overflow-hidden rounded-3xl bg-forest-900 px-3 py-4 shadow-xl shadow-forest-900/25 transition-[width] duration-300 ' +
        (expanded ? 'w-56' : 'w-16')
      }
    >
      <div className="flex items-center gap-3 px-0.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
          <img
            src={Logo}
            alt="PyroWatch"
            className="h-8 w-8 object-contain"
          />
        </div>

        <span
          className={
            'whitespace-nowrap text-lg font-semibold text-white transition-opacity duration-200 ' +
            (expanded ? 'opacity-100' : 'opacity-0')
          }
        >
          PyroWatch
        </span>
      </div>

      <nav className="mt-8 flex flex-col gap-1.5">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = active === id;

          return (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(id)}
              className={
                'flex h-11 items-center gap-3 rounded-2xl px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 ' +
                (
                  isActive
                    ? 'bg-forest-400 text-white shadow-lg shadow-forest-400/30'
                    : 'text-forest-200 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <Icon
                size={20}
                strokeWidth={2}
                className="shrink-0"
              />

              <span
                className={
                  'whitespace-nowrap text-sm font-medium transition-opacity duration-200 ' +
                  (expanded ? 'opacity-100' : 'opacity-0')
                }
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={expanded}
          title={expanded ? 'Collapse' : 'Expand'}
          className="flex h-11 w-full items-center gap-3 rounded-2xl px-2.5 text-forest-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-300"
        >
          {expanded ? (
            <ChevronsLeft
              size={20}
              strokeWidth={2}
              className="shrink-0"
            />
          ) : (
            <ChevronsRight
              size={20}
              strokeWidth={2}
              className="shrink-0"
            />
          )}

          <span
            className={
              'whitespace-nowrap text-sm font-medium transition-opacity duration-200 ' +
              (expanded ? 'opacity-100' : 'opacity-0')
            }
          >
            Collapse
          </span>
        </button>
      </div>
    </aside>
  );
}