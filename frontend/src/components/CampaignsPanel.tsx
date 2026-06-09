import { useStore, type FlashDeal } from '../store/useStore';

const ITEM_EMOJI: Record<string, string> = {
  water: '💧',
  food: '🍔',
  merchandise: '👕',
};

function DealCard({ deal }: { deal: FlashDeal }) {
  const emoji = ITEM_EMOJI[deal.item] ?? '🎟️';
  return (
    <div className="p-3 bg-blue-950/60 rounded-lg border border-blue-800/50 flex flex-col gap-1">
      <div className="flex justify-between items-start gap-2">
        <span className="font-bold text-blue-200 text-sm leading-tight">
          {emoji} {deal.headline}
        </span>
        <span className="text-xs text-blue-500 shrink-0">
          {new Date(deal.issued_at || deal.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-xs text-blue-300/80 leading-relaxed">{deal.message}</p>
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        <span className="text-xs font-bold text-green-400 bg-green-900/40 px-2 py-0.5 rounded">
          {deal.discount_pct}% OFF
        </span>
        <span className="text-xs text-blue-400">📍 {deal.zone}</span>
        {deal.vendor_name && (
          <span className="text-xs text-blue-500">🏪 {deal.vendor_name}</span>
        )}
        <span className="text-xs text-blue-600 ml-auto italic">
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
      <p className="text-blue-700 text-sm text-center py-6 italic">
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
