import { useMemo } from 'react';
import { useStore, type AgentAction, type VerificationInfo } from '../store/useStore';

// ── Stage metadata ────────────────────────────────────────────────────────────
const STAGES: Record<string, { idx: number; label: string; dot: string; text: string }> = {
  pipeline:     { idx: 0, label: 'Pipeline',     dot: 'bg-slate-500',  text: 'text-slate-400'  },
  perception:   { idx: 1, label: '① Perception', dot: 'bg-purple-500', text: 'text-purple-400' },
  planning:     { idx: 2, label: '② Planning',   dot: 'bg-blue-500',   text: 'text-blue-400'   },
  inventory:    { idx: 3, label: '③ Inventory',  dot: 'bg-yellow-500', text: 'text-yellow-400' },
  validation:   { idx: 4, label: '④ Validation', dot: 'bg-green-500',  text: 'text-green-400'  },
  verification: { idx: 5, label: '⑤ Verify',    dot: 'bg-indigo-500', text: 'text-indigo-400' },
  execution:    { idx: 6, label: '⑥ Execution',  dot: 'bg-orange-500', text: 'text-orange-400' },
  marketing:    { idx: 7, label: '⑦ Marketing',  dot: 'bg-pink-500',   text: 'text-pink-400'   },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function stageIdx(stage?: string) {
  return STAGES[stage ?? '']?.idx ?? 99;
}

function shortId(id?: string) {
  return id ? id.slice(-8) : '????????';
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StageRow({ action }: { action: AgentAction }) {
  const meta = STAGES[action.stage ?? ''];
  if (!meta) return null;
  return (
    <div className="flex items-start gap-2 py-1 border-b border-white/5 last:border-0">
      <span className={`shrink-0 mt-[3px] w-2 h-2 rounded-full ${meta.dot}`} />
      <div className="min-w-0 flex-1">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.text}`}>
          {meta.label}
        </span>
        <p className="text-xs text-slate-300 truncate leading-tight mt-0.5">
          {action.action}
        </p>
        {action.reasoning && (
          <p className="text-[10px] text-slate-500 italic truncate leading-tight">
            {action.reasoning}
          </p>
        )}
      </div>
    </div>
  );
}

interface EventGroup {
  eventId: string;
  actions: AgentAction[];
  firstTs: string;
  completed: boolean;
  stageCount: number;
  verification?: VerificationInfo;
}

// ── Main component ────────────────────────────────────────────────────────────
export function EventTimeline() {
  const { agentActions, verifications } = useStore();

  const groups = useMemo<EventGroup[]>(() => {
    const map = new Map<string, AgentAction[]>();
    for (const a of agentActions) {
      if (!a.event_id) continue;
      if (!map.has(a.event_id)) map.set(a.event_id, []);
      map.get(a.event_id)!.push(a);
    }
    return Array.from(map.entries())
      .map(([eventId, actions]) => {
        const sorted = [...actions].sort((a, b) => stageIdx(a.stage) - stageIdx(b.stage));
        const completed = sorted.some(
          (a) => a.stage === 'pipeline' && a.action.toLowerCase().includes('complet'),
        );
        return {
          eventId,
          actions: sorted,
          firstTs: sorted[0]?.timestamp ?? '',
          completed,
          stageCount: sorted.filter((a) => a.stage !== 'pipeline').length,
          verification: verifications[eventId],
        };
      })
      .sort((a, b) => new Date(b.firstTs).getTime() - new Date(a.firstTs).getTime())
      .slice(0, 12);
  }, [agentActions, verifications]);

  return (
    <div className="h-full flex flex-col">
      {groups.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 text-sm italic">
            Waiting for pipeline events… trigger a surge to watch the agents reason.
          </p>
        </div>
      ) : (
        /* Horizontal scroll — each event is a fixed-width card */
        <div className="flex-1 flex gap-4 overflow-x-auto pb-2 pr-1 custom-scrollbar">
          {groups.map((g) => (
            <div
              key={g.eventId}
              className="shrink-0 w-[220px] bg-[#111] border border-white/10 rounded-lg flex flex-col overflow-hidden"
            >
              {/* Card header */}
              <div
                className={`px-3 py-2 flex items-center justify-between border-b border-white/10 ${
                  g.completed ? 'bg-green-950/40' : 'bg-orange-950/30'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      g.completed ? 'bg-green-500' : 'bg-orange-500 animate-pulse'
                    }`}
                  />
                  <span className="font-mono text-[11px] font-bold text-white truncate">
                    {shortId(g.eventId)}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold uppercase tracking-widest ml-1 shrink-0 ${
                    g.completed ? 'text-green-400' : 'text-orange-400'
                  }`}
                >
                  {g.completed ? 'done' : `${g.stageCount}/7`}
                </span>
              </div>

              {/* Timestamp + verification badge */}
              <div className="px-3 pt-1.5 flex items-center justify-between gap-1">
                <span className="text-[10px] text-slate-500">
                  {g.firstTs ? new Date(g.firstTs).toLocaleTimeString() : '—'}
                </span>
                {g.verification && (
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      g.verification.feasible
                        ? 'bg-indigo-900/50 text-indigo-300'
                        : 'bg-amber-900/50 text-amber-300'
                    }`}
                    title={
                      g.verification.feasible
                        ? `RAG: feasible (${g.verification.confidence}) · ${g.verification.constraints_checked} constraint(s) checked`
                        : `RAG: infeasible · ${g.verification.replan_count} self-correction(s) · ${g.verification.correction}`
                    }
                  >
                    {g.verification.feasible
                      ? `⑤ feasible`
                      : `⑤ ↻${g.verification.replan_count}`}
                  </span>
                )}
              </div>

              {/* Stage rows */}
              <div className="flex-1 overflow-y-auto px-3 pb-2 pt-1 custom-scrollbar">
                {g.actions.map((a) => (
                  <StageRow key={`${a.stage}-${a.timestamp}`} action={a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
