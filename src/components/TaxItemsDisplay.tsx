import type { TaxCalculatedItem, TaxStatus } from '../types';
import { formatCurrency } from '../lib/utils';

// ── Badge de status do imposto ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaxStatus, { label: string; className: string }> = {
  CALCULATED: { label: 'Calculado', className: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50' },
  PENDING:    { label: 'Pendente',  className: 'text-amber-400 bg-amber-900/30 border-amber-700/50' },
  EXEMPT:     { label: 'Isento',   className: 'text-stone-400 bg-stone-900/30 border-stone-700/50' },
};

function TaxStatusBadge({ status }: { status: TaxStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider font-bold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Exibição de um item calculado ─────────────────────────────────────────────

function TaxItemRow({ item }: { item: TaxCalculatedItem }) {
  const pct = (item.rate * 100).toFixed(4).replace(/\.?0+$/, '') + '%';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 text-sm">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 font-mono w-20">
          {item.taxType}
        </span>
        <span className="text-stone-500 text-xs">{pct}</span>
      </div>
      <span className="text-gray-200 font-mono text-xs">{formatCurrency(item.amount)}</span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface TaxItemsDisplayProps {
  items: TaxCalculatedItem[];
  taxStatus?: TaxStatus;
  /** Se true, renderiza em modo compacto (sem título) */
  compact?: boolean;
}

/**
 * Exibe a lista dinâmica de impostos calculados retornada pelo backend.
 * Funciona com qualquer número/tipo de itens — não há campos hardcoded.
 */
export default function TaxItemsDisplay({ items, taxStatus, compact = false }: TaxItemsDisplayProps) {
  if (!items || items.length === 0) {
    return (
      <span className="text-stone-600 text-xs italic">Sem impostos calculados</span>
    );
  }

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-1">
      {!compact && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
            Impostos
          </span>
          {taxStatus && <TaxStatusBadge status={taxStatus} />}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-1">
        {items.map((item, idx) => (
          <TaxItemRow key={idx} item={item} />
        ))}
        {/* Total */}
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/10">
          <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Total Retido</span>
          <span className="text-amber-400 font-bold font-mono text-sm">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
