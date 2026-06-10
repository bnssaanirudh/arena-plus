import { useMemo } from 'react';
import { Clock, Package, DollarSign, Store } from 'lucide-react';
import { useStore } from '../store/useStore';

/**
 * Cumulative estimated impact of every autonomous dispatch this session.
 * Fed by `impact` WS messages (one per executed pipeline).
 */
export function ImpactStrip() {
  const { impacts } = useStore();

  const totals = useMemo(
    () =>
      impacts.reduce(
        (acc, i) => ({
          minutes: acc.minutes + (i.response_time_saved_min ?? 0),
          units: acc.units + (i.units_dispatched ?? 0),
          revenue: acc.revenue + (i.revenue_protected_usd ?? 0),
          vendors: acc.vendors + (i.vendors_engaged ?? 0),
        }),
        { minutes: 0, units: 0, revenue: 0, vendors: 0 },
      ),
    [impacts],
  );

  const cards = [
    {
      icon: Clock,
      label: 'Response time saved',
      value: `${totals.minutes.toFixed(0)} min`,
      accent: 'text-orange-600 bg-orange-50 border-orange-200/60',
    },
    {
      icon: Package,
      label: 'Units auto-dispatched',
      value: totals.units.toLocaleString(),
      accent: 'text-blue-600 bg-blue-50 border-blue-200/60',
    },
    {
      icon: DollarSign,
      label: 'Revenue protected',
      value: `$${totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      accent: 'text-emerald-600 bg-emerald-50 border-emerald-200/60',
    },
    {
      icon: Store,
      label: 'Vendor engagements',
      value: totals.vendors.toLocaleString(),
      accent: 'text-indigo-600 bg-indigo-50 border-indigo-200/60',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`border rounded-xl p-4 flex items-center gap-3 shadow-sm ${c.accent}`}
        >
          <c.icon className="w-7 h-7 shrink-0" />
          <div className="min-w-0">
            <p className="text-2xl font-black leading-none text-black">{c.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80 truncate">
              {c.label}
            </p>
          </div>
        </div>
      ))}
      <p className="col-span-2 lg:col-span-4 text-[10px] text-slate-400 -mt-2">
        * Estimated vs. an 18-minute manual ops cycle · {impacts.length} intervention(s) this session
      </p>
    </div>
  );
}
