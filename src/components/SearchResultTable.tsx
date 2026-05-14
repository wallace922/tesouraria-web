
import type { PaymentNoteDto } from '../types';
import { formatCNPJ, formatCurrency, formatDate } from '../lib/utils';
import EditIconButton from './EditIconButton';

interface SearchResultTableProps {
  data: PaymentNoteDto[];
  onEdit: (np: PaymentNoteDto) => void;
}

export default function SearchResultTable({ data, onEdit }: SearchResultTableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-stone-500 text-xs uppercase border-b border-white/10">
          <th className="py-2 pr-3">Nº NP</th>
          <th className="py-2 pr-3">Data Liq.</th>
          <th className="py-2 pr-3">Empresa</th>
          <th className="py-2 pr-3">CNPJ</th>
          <th className="py-2 pr-3">Doc. Origem</th>
          <th className="py-2 pr-3">NS</th>
          <th className="py-2 pr-3">Valor</th>
          <th className="py-2 pr-3">Status</th>
          <th className="py-2 pr-3">Taxa</th>
          <th className="py-2 pr-3">IR</th>
          <th className="py-2 pr-3">CSLL</th>
          <th className="py-2 pr-3">COFINS</th>
          <th className="py-2 pr-3">PIS</th>
          <th className="py-2 pr-3">DARF</th>
          <th className="py-2 pr-3 w-8">✏️</th>
        </tr>
      </thead>
      <tbody className="max-h-80 overflow-y-auto">
        {data.map((np, i) => (
          <tr key={i} className="border-b border-stone-800 hover:bg-stone-800/30">
            <td className="py-2 pr-3 text-amber-300 font-mono">{np.numeroNp}</td>
            <td className="py-2 pr-3 text-gray-300">{formatDate(np.dataLiquidacao)}</td>
            <td className="py-2 pr-3 text-gray-300">{np.empresa?.nome || '—'}</td>
            <td className="py-2 pr-3 text-stone-500 font-mono">
              {np.empresa?.cnpj ? formatCNPJ(np.empresa.cnpj) : '—'}
            </td>
            <td className="py-2 pr-3 text-stone-500">{np.docOrigin}</td>
            <td className="py-2 pr-3 text-stone-500">{np.ns}</td>
            <td className="py-2 pr-3 text-amber-300">{formatCurrency(np.value)}</td>
            <td className="py-2 pr-3 text-stone-500">{np.status}</td>
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
  );
}
