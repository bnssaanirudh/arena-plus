import { useStore, type FlashDeal } from '../store/useStore';

const ITEM_EMOJI: Record<string, string> = {
  water: '💧',
  food: '🍔',
  merchandise: '👕',
};

function DealCard({ deal }: { deal: FlashDeal }) {
  const emoji = ITEM_EMOJI[deal.item] ?? '🎟️';
  return (
    <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200/80 flex flex-col gap-1.5 shadow-sm">
      <div className="flex justify-between items-start gap-2">
        <span className="font-bold text-blue-900 text-sm leading-tight">
          {emoji} {deal.headline}
        </span>
        <span className="text-[10px] text-blue-500 font-mono shrink-0 font-medium">
          {new Date(deal.issued_at || deal.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-xs text-blue-800/95 leading-relaxed font-light">{deal.message}</p>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          {deal.discount_pct}% OFF
        </span>
        <span className="text-[10px] font-medium text-blue-700 bg-blue-100/50 px-2 py-0.5 rounded-full">📍 {deal.zone}</span>
        {deal.vendor_name && (
          <span className="text-[10px] font-medium text-blue-800 bg-blue-100/50 px-2 py-0.5 rounded-full">🏪 {deal.vendor_name}</span>
        )}
        <span className="text-[9px] text-blue-500/70 ml-auto italic font-medium">
          via {deal.drafted_by}
        </span>
      </div>
    </div>
  );
}

export function CampaignsPanel() {
  const { flashDeals } = useStore();

  if (flashDeals.length === 0) {
    return (
      <p className="text-blue-500/80 text-xs text-center py-8 italic font-light">
        No campaigns yet — waiting for next surge…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {flashDeals.map((deal, i) => (
        <DealCard key={`${deal.event_id}-${i}`} deal={deal} />
      ))}
    </div>
  );
}

