import { useStore, type RestockBatch, type RestockOrder } from '../store/useStore';

const ITEM_COLOR: Record<string, string> = {
  water: 'text-cyan-700 font-bold',
  food: 'text-amber-700 font-bold',
  merchandise: 'text-purple-700 font-bold',
};

function OrderRow({ order }: { order: RestockOrder }) {
  const color = ITEM_COLOR[order.item] ?? 'text-emerald-700';
  const acked = order.status === 'ACKNOWLEDGED';
  return (
    <div className="flex items-center gap-2 text-xs py-2 border-b border-slate-150 last:border-0">
      <span className="font-mono text-slate-500 w-24 shrink-0">{order.order_id}</span>
      <span className={`uppercase w-12 shrink-0 ${color}`}>{order.item}</span>
      <span className="text-slate-800 w-10 shrink-0 text-right font-mono font-bold">{order.quantity}</span>
      <span className="text-slate-700 truncate flex-1 font-medium" title={order.vendor_name}>{order.vendor_name}</span>
      {/* Status badge — updates live when supplier acks */}
      <span
        className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
          acked
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
        }`}
        title={acked ? `Acked at ${order.ack_at}` : 'Awaiting supplier acknowledgement'}
      >
        {acked ? '✓ acked' : 'ordered'}
      </span>
    </div>
  );
}

function BatchBlock({ batch }: { batch: RestockBatch }) {
  return (
    <div className="mb-3.5 p-3.5 bg-emerald-50/40 rounded-lg border border-emerald-150 flex flex-col gap-2 shadow-sm">
      <div className="flex justify-between items-center mb-1 text-[11px] font-medium text-emerald-800">
        <span className="font-mono font-bold bg-white border border-emerald-100 px-2 py-0.5 rounded">Event: {batch.event_id.slice(0, 8)}…</span>
        <span className="font-mono text-emerald-700/80">
          {new Date(batch.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="flex flex-col">
        {batch.orders.map((o) => (
          <OrderRow key={o.order_id} order={o} />
        ))}
      </div>
    </div>
  );
}

export function RestockPanel() {
  const { restockBatches } = useStore();

  if (restockBatches.length === 0) {
    return (
      <p className="text-emerald-700/80 text-xs text-center py-8 italic font-light">
        No restock orders yet — orders appear after dispatch…
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {restockBatches.map((batch, i) => (
        <BatchBlock key={`${batch.event_id}-${i}`} batch={batch} />
      ))}
    </div>
  );
}
