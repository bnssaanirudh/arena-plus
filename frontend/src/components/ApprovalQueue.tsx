import { useState } from 'react';
import { useStore, type PendingApproval } from '../store/useStore';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

const ACTION_COLOR: Record<string, string> = {
  EVACUATE_ZONE: 'text-red-950 border-red-200 bg-red-50/80',
  ALERT_SECURITY: 'text-orange-950 border-orange-200 bg-orange-50/80',
  DISPATCH_RESOURCES: 'text-amber-950 border-amber-200 bg-amber-50/80',
  REROUTE_CROWD: 'text-blue-950 border-blue-200 bg-blue-50/80',
};

const ACTION_LABEL_COLOR: Record<string, string> = {
  EVACUATE_ZONE: 'text-red-700',
  ALERT_SECURITY: 'text-orange-700',
  DISPATCH_RESOURCES: 'text-amber-700',
  REROUTE_CROWD: 'text-blue-700',
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

  const styleClass = ACTION_COLOR[approval.action] ?? 'text-slate-900 border-slate-200 bg-slate-50/80';
  const labelColor = ACTION_LABEL_COLOR[approval.action] ?? 'text-slate-800';

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
      <div className={`p-3 rounded-lg border text-xs font-bold uppercase tracking-widest opacity-60 ${styleClass}`}>
        {approval.action} — {done}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border flex flex-col gap-2.5 shadow-sm ${styleClass}`}>
      <div className="flex justify-between items-start">
        <span className={`font-bold text-sm uppercase tracking-wide flex items-center gap-1.5 ${labelColor}`}>
          ⚠️ {approval.action.replace('_', ' ')}
        </span>
        <span className="text-[10px] text-slate-500 font-mono font-medium">
          {new Date(approval.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-xs text-slate-600 font-mono truncate">
        Event {approval.event_id.slice(0, 12)}…
      </p>
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => decide(true)}
          disabled={busy !== null}
          className="flex-1 py-2 text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          {busy === 'approve' ? '…' : '✅ Approve'}
        </button>
        <button
          onClick={() => decide(false)}
          disabled={busy !== null}
          className="flex-1 py-2 text-xs font-bold uppercase bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-sm"
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
      <p className="text-red-700/80 text-xs text-center py-8 italic font-light">
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
