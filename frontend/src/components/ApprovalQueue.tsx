import { useState } from 'react';
import { useStore, type PendingApproval } from '../store/useStore';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

const ACTION_COLOR: Record<string, string> = {
  EVACUATE_ZONE: 'text-red-400 border-red-700',
  ALERT_SECURITY: 'text-orange-400 border-orange-700',
  DISPATCH_RESOURCES: 'text-yellow-400 border-yellow-700',
  REROUTE_CROWD: 'text-blue-400 border-blue-700',
};

async function sendDecision(event_id: string, approved: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/approvals/${event_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function ApprovalCard({ approval }: { approval: PendingApproval }) {
  const resolveApproval = useStore((s) => s.resolveApproval);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

  const colorClass = ACTION_COLOR[approval.action] ?? 'text-white border-slate-600';

  async function decide(approved: boolean) {
    setBusy(approved ? 'approve' : 'reject');
    const ok = await sendDecision(approval.event_id, approved);
    if (ok) {
      setDone(approved ? 'approved' : 'rejected');
      resolveApproval(approval.event_id);
    }
    setBusy(null);
  }

  if (done) {
    return (
      <div className={`p-3 rounded-lg border text-xs font-bold uppercase tracking-widest opacity-40 ${colorClass}`}>
        {approval.action} — {done}
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border bg-red-950/40 flex flex-col gap-2 ${colorClass}`}>
      <div className="flex justify-between items-start">
        <span className={`font-bold text-sm uppercase tracking-wide ${colorClass.split(' ')[0]}`}>
          ⚠️ {approval.action}
        </span>
        <span className="text-xs text-red-600">
          {new Date(approval.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-xs text-red-300/70 font-mono truncate">
        Event {approval.event_id.slice(0, 12)}…
      </p>
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => decide(true)}
          disabled={busy !== null}
          className="flex-1 py-1.5 text-xs font-bold uppercase bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded transition-colors"
        >
          {busy === 'approve' ? '…' : '✅ Approve'}
        </button>
        <button
          onClick={() => decide(false)}
          disabled={busy !== null}
          className="flex-1 py-1.5 text-xs font-bold uppercase bg-red-800 hover:bg-red-700 disabled:opacity-50 rounded transition-colors"
        >
          {busy === 'reject' ? '…' : '🚫 Reject'}
        </button>
      </div>
    </div>
  );
}

export function ApprovalQueue() {
  const { pendingApprovals } = useStore();

  if (pendingApprovals.length === 0) {
    return (
      <p className="text-red-900 text-sm text-center py-6 italic">
        No actions awaiting approval
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pendingApprovals.map((a) => (
        <ApprovalCard key={a.event_id} approval={a} />
      ))}
    </div>
  );
}
