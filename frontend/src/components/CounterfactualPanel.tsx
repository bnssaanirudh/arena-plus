import { XCircle, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import { useStore, type PlanSnapshot } from '../store/useStore';

function PlanCard({ plan, variant }: { plan: PlanSnapshot; variant: 'rejected' | 'corrected' }) {
  const rejected = variant === 'rejected';
  return (
    <div
      className={`flex-1 min-w-0 rounded-lg border p-3 ${
        rejected ? 'bg-red-50/60 border-red-200' : 'bg-emerald-50/60 border-emerald-200'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {rejected ? (
          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        )}
        <span
          className={`text-[10px] font-bold uppercase tracking-widest ${
            rejected ? 'text-red-600' : 'text-emerald-700'
          }`}
        >
          {rejected ? 'Rejected plan' : 'Corrected plan'}
        </span>
      </div>
      <p className={`text-sm font-bold ${rejected ? 'text-red-900 line-through decoration-red-400' : 'text-emerald-900'}`}>
        {plan.action} [{plan.priority}]
      </p>
      <p className="text-xs text-slate-600 mt-0.5">
        water {plan.resources_required?.water ?? 0} · food {plan.resources_required?.food ?? 0}
      </p>
      <p className="text-[11px] text-slate-500 italic mt-1.5 line-clamp-3">{plan.reasoning}</p>
    </div>
  );
}

/**
 * Makes the RAG self-correction loop visible: when the VerificationAgent
 * rejects a plan, the rejected and corrected versions render side by side
 * with the blocking constraint between them. Fed by `counterfactual` WS msgs.
 */
export function CounterfactualPanel() {
  const { counterfactuals } = useStore();
  if (counterfactuals.length === 0) return null;

  return (
    <div className="mt-8 bg-amber-50/50 border border-amber-200/70 p-6 rounded-xl shadow-md">
      <h3 className="text-xl font-bold uppercase mb-4 tracking-widest text-amber-700 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5" />
        Self-Correction — Counterfactual
        <span className="ml-2 text-xs font-normal text-slate-500 normal-case tracking-normal">
          RAG verification rejected a plan and the agent re-planned
        </span>
      </h3>

      <div className="space-y-4">
        {counterfactuals.slice(0, 2).map((c) => (
          <div key={`${c.event_id}-${c.timestamp}`} className="bg-white/70 border border-amber-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[11px] font-bold text-slate-500">
                event {c.event_id.slice(-8)}
              </span>
              <span className="text-[10px] text-slate-400">
                {new Date(c.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-stretch gap-3">
              <PlanCard plan={c.rejected} variant="rejected" />

              {/* The blocking constraint that forced the re-plan */}
              <div className="shrink-0 flex md:flex-col items-center justify-center gap-1 px-2 max-w-[220px] self-center">
                <ArrowRight className="w-5 h-5 text-amber-600 shrink-0 rotate-90 md:rotate-0" />
                <p className="text-[10px] text-amber-800 font-medium text-center leading-snug">
                  {c.blocking[0] ?? c.correction}
                </p>
              </div>

              <PlanCard plan={c.corrected} variant="corrected" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
