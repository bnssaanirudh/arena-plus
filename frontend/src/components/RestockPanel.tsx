import { useStore, type RestockBatch, type RestockOrder } from '../store/useStore';

const ITEM_COLOR: Record<string, string> = {
  water: 'text-cyan-400',
  food: 'text-amber-400',
  merchandise: 'text-purple-400',
};

function OrderRow({ order }: { order: RestockOrder }) {
  const color = ITEM_COLOR[order.item] ?? 'text-green-300';
  return (
    <div className="flex items-center gap-2 text-xs py-1.5 border-b border-green-900/30 last:border-0">
      <span className="font-mono text-green-600 w-24 shrink-0">{order.order_id}</span>
      <span className={`font-semibold uppercase w-12 shrink-0 ${color}`}>{order.item}</span>
      <span className="text-green-300 w-10 shrink-0 text-right">{order.quantity}</span>
      <span className="text-green-500 truncate flex-1" title={order.vendor_name}>{order.vendor_name}</span>
      <span className="text-green-700 truncate max-w-[7rem]" title={order.supplier}>→ {order.supplier}</span>
    </div>
  );
}

function BatchBlock({ batch }: { batch: RestockBatch }) {
  return (
    <div className="mb-3 p-3 bg-green-950/40 rounded-lg border border-green-900/40">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-green-600 font-mono">{batch.event_id.slice(0, 8)}…</span>
        <span className="text-xs text-green-700">
          {new Date(batch.timestamp).toLocaleTimeString()}
        </span>
      </div>
      {batch.orders.map((o) => (
        <OrderRow key={o.order_id} order={o} />
      ))}
    </div>
  );
}

export function RestockPanel() {
  const { restockBatches } = useStore();

  if (restockBatches.length === 0) {
    return (
      <p className="text-green-800 text-sm text-center py-6 italic">
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
