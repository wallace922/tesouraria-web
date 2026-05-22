
import type { PaymentNoteDto } from '../types';
import { formatCNPJ, formatCurrency, formatDate } from '../lib/utils';
import EditIconButton from './EditIconButton';

function StatusBadge({ status }: { status: PaymentNoteDto['status'] }) {
  const map: Record<string, string> = {
    CANCELADA: 'bg-red-900/60 text-red-300 border border-red-700',
    PAGA: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
    A_PAGAR: 'bg-amber-900/60 text-amber-300 border border-amber-600',
  };
  const label: Record<string, string> = {
    CANCELADA: 'Cancelada',
    PAGA: 'Paga',
    A_PAGAR: 'A Pagar',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${map[status]}`}>
      {label[status]}
    </span>
  );
}

interface SearchResultTableProps {
  data: PaymentNoteDto[];
  onEdit: (np: PaymentNoteDto) => void;
}

function NpCard({ np, onEdit }: { np: PaymentNoteDto; onEdit: () => void }) {
  return (
    <div className="glass-panel p-3 animate-fadeIn">
      <div className="flex items-start justify-between mb-2">
        <span className="text-amber-400 font-bold font-mono text-sm">NP {np.numeroNp}</span>
        <StatusBadge status={np.status} />
      </div>
      <div className="text-xs text-gray-300 mb-2">
        <span className="text-stone-500">{np.empresa?.nome || '—'}</span>
        <br />
        <span className="text-stone-500 font-mono">{np.empresa?.cnpj ? formatCNPJ(np.empresa.cnpj) : '—'}</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-amber-300 font-bold">{formatCurrency(np.value)}</span>
          <span className="text-stone-500 text-xs ml-2">{formatDate(np.dataLiquidacao)}</span>
        </div>
        <EditIconButton onClick={onEdit} />
      </div>
      <div className="text-[10px] text-stone-500 mt-1">
        Doc: {np.docOrigin} | {np.tax?.tipo || 'Sem taxa'}
      </div>
    </div>
  );
}

export default function SearchResultTable({ data, onEdit }: SearchResultTableProps) {
  return (
    <>
      {/* Mobile: card view */}
      <div className="space-y-3 md:hidden">
        {data.map((np, i) => (
          <NpCard key={i} np={np} onEdit={() => onEdit(np)} />
        ))}
      </div>

      {/* Desktop: table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 text-xs uppercase border-b border-white/10">
              <th className="py-2 pr-3 whitespace-nowrap">Nº NP</th>
              <th className="py-2 pr-3 whitespace-nowrap">Data Liq.</th>
              <th className="py-2 pr-3 whitespace-nowrap">Empresa</th>
              <th className="py-2 pr-3 whitespace-nowrap">CNPJ</th>
              <th className="py-2 pr-3 whitespace-nowrap">Doc. Origem</th>
              <th className="py-2 pr-3 whitespace-nowrap">Valor</th>
              <th className="py-2 pr-3 whitespace-nowrap">Status</th>
              <th className="py-2 pr-3 whitespace-nowrap">Taxa</th>
              <th className="py-2 pr-3 whitespace-nowrap">IR</th>
              <th className="py-2 pr-3 whitespace-nowrap">CSLL</th>
              <th className="py-2 pr-3 whitespace-nowrap">COFINS</th>
              <th className="py-2 pr-3 whitespace-nowrap">PIS</th>
              <th className="py-2 pr-3 whitespace-nowrap">DARF</th>
              <th className="py-2 pr-3 w-8">✏️</th>
            </tr>
          </thead>
          <tbody className="max-h-60 sm:max-h-80 overflow-y-auto">
            {data.map((np, i) => (
              <tr key={i} className="border-b border-stone-800 hover:bg-stone-800/30">
                <td className="py-2 pr-3 text-amber-300 font-mono whitespace-nowrap">{np.numeroNp}</td>
                <td className="py-2 pr-3 text-gray-300 whitespace-nowrap">{formatDate(np.dataLiquidacao)}</td>
                <td className="py-2 pr-3 text-gray-300">{np.empresa?.nome || '—'}</td>
                <td className="py-2 pr-3 text-stone-500 font-mono whitespace-nowrap">
                  {np.empresa?.cnpj ? formatCNPJ(np.empresa.cnpj) : '—'}
                </td>
                <td className="py-2 pr-3 text-stone-500">{np.docOrigin}</td>
                <td className="py-2 pr-3 text-amber-300 whitespace-nowrap">{formatCurrency(np.value)}</td>
                <td className="py-2 pr-3 text-stone-500 whitespace-nowrap">{np.status}</td>
                <td className="py-2 pr-3 text-stone-500">{np.tax?.tipo || '—'}</td>
                <td className="py-2 pr-3 text-stone-500">
                  {np.tax?.tipo === 'NAO_OPTANTE' ? formatCurrency(np.tax?.ir ?? 0) : '—'}
                </td>
                <td className="py-2 pr-3 text-stone-500">
                  {np.tax?.tipo === 'NAO_OPTANTE' ? formatCurrency(np.tax?.csll ?? 0) : '—'}
                </td>
                <td className="py-2 pr-3 text-stone-500">
                  {np.tax?.tipo === 'NAO_OPTANTE' ? formatCurrency(np.tax?.cofins ?? 0) : '—'}
                </td>
                <td className="py-2 pr-3 text-stone-500">
                  {np.tax?.tipo === 'NAO_OPTANTE' ? formatCurrency(np.tax?.pisPasep ?? 0) : '—'}
                </td>
                <td className="py-2 pr-3 text-stone-500">
                  {np.tax?.tipo === 'NAO_OPTANTE' ? formatCurrency(np.tax?.darf ?? 0) : '—'}
                </td>
                <td className="py-2 pr-3 w-8">
                  <EditIconButton onClick={() => onEdit(np)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
