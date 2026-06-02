import { useState } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import Select from '../../components/Select';
import EditIconButton from '../../components/EditIconButton';
import PaginationControls from '../../components/PaginationControls';
import TaxItemsDisplay from '../../components/TaxItemsDisplay';
import { findNpByNumeroEAno, getAllNp, updatePaymentNote, findEmpresaByCnpj } from '../../services/api';
import type { PaymentNoteDto, OptanteStatus, TaxStatus } from '../../types';
import { toInputDate, formatCurrency, formatDate } from '../../lib/utils';
import { SectionTitle, TableContainer, applyCnpjMask } from './Shared';
import { useEntitySearch } from '../../hooks/useEntitySearch';

const NP_STATUS_STYLE: Record<PaymentNoteDto['status'], string> = {
  PAGA:      'text-emerald-400 bg-emerald-900/30 border-emerald-700/50',
  CANCELADA: 'text-red-400 bg-red-900/30 border-red-700/50',
  A_PAGAR:   'text-amber-400 bg-amber-900/30 border-amber-700/50',
};

const TAX_STATUS_LABEL: Record<TaxStatus, string> = {
  CALCULATED: '✔ Calculado',
  PENDING:    '⏳ Pendente',
  EXEMPT:     '— Isento',
};

export default function BuscaPaymentNote() {
  const [sNumero, setSNumero] = useState('');
  const [sAno, setSAno]       = useState('');
  const [numeroNp, setNumeroNp] = useState('');
  const [dataLiq, setDataLiq] = useState('');
  const [docOrigin, setDocOrigin] = useState('');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<PaymentNoteDto['status']>('A_PAGAR');
  const [cnpj, setCnpj] = useState('');
  const [cnpjValid, setCnpjValid] = useState<boolean | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState('');
  const [taxTipo, setTaxTipo] = useState<OptanteStatus>('OPTANTE');
  const [codEfd, setCodEfd] = useState('');

  const {
    loading: searching, error, setError,
    allResults, setAllResults,
    showAll, setShowAll,
    currentPage, totalPages, totalElements,
    found, setFound,
    editing, setEditing,
    saving, saveError, setSaveError,
    success, setSuccess,
    handleSearchRequest,
    handleGetAllRequest,
    handleNextPage,
    handlePreviousPage,
    handleGoToPage,
    handleSaveRequest,
  } = useEntitySearch<PaymentNoteDto>();

  const handleEdit = (np: PaymentNoteDto) => {
    setFound(np);
    setNumeroNp(String(np.numeroNp));
    setDataLiq(toInputDate(np.dataLiquidacao));
    setDocOrigin(np.docOrigin);
    setValue(String(np.value));
    setStatus(np.status);
    setCnpj(applyCnpjMask(np.empresa?.cnpj || ''));
    setEmpresaNome(np.empresa?.nome || '');
    setCnpjValid(true);
    setCnpjError(null);
    setTaxTipo(np.tax?.tipo ?? 'OPTANTE');
    setCodEfd(np.tax?.codEfd ? String(np.tax.codEfd) : '');
    setEditing(true);
  };

  const handleSave = () => {
    if (!found) return;
    if (!cnpjValid) { setSaveError('Valide o CNPJ antes de salvar.'); return; }
    if (taxTipo === 'NAO_OPTANTE' && !codEfd) { setSaveError('Informe o Cód. EFD para tributação Não Optante.'); return; }
    const payload: PaymentNoteDto = {
      ...found,
      numeroNp: parseInt(numeroNp, 10),
      dataLiquidacao: dataLiq,
      docOrigin,
      value: parseFloat(value),
      status,
      empresa: { nome: empresaNome, cnpj: cnpj.replace(/\D/g, '') },
      tax: { tipo: taxTipo, codEfd: taxTipo === 'NAO_OPTANTE' ? parseInt(codEfd, 10) : 0 },
    };
    handleSaveRequest(() => updatePaymentNote(payload), 'Payment Note atualizada!', () => handleGetAllRequest(getAllNp));
  };

  function handleCnpj(v: string) { setCnpj(applyCnpjMask(v)); setCnpjValid(null); setCnpjError(null); setEmpresaNome(''); }

  async function handleCnpjBlur() {
    const raw = cnpj.replace(/\D/g, '');
    if (raw.length !== 14) { setCnpjError('CNPJ inválido. Deve conter 14 dígitos.'); setCnpjValid(false); return; }
    if (found && raw === found.empresa?.cnpj) { setCnpjValid(true); setEmpresaNome(found.empresa.nome); return; }
    setCnpjLoading(true); setCnpjError(null);
    const result = await findEmpresaByCnpj(raw);
    if (result.data) { setCnpjValid(true); setEmpresaNome(result.data.nome); }
    else { setCnpjValid(false); setCnpjError('Empresa não encontrada. Cadastre a empresa primeiro.'); }
    setCnpjLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <SectionTitle>Buscar Payment Note por Nº e Ano</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Nº NP" type="number" placeholder="2024001" value={sNumero}
            onChange={(e) => { setSNumero(e.target.value); setError(null); setAllResults([]); setShowAll(false); }}
            onKeyDown={(e) => e.key === 'Enter' && (() => { if (!sNumero || !sAno) { setError('Informe Nº NP e Ano.'); return; } handleSearchRequest(() => findNpByNumeroEAno(parseInt(sNumero, 10), parseInt(sAno, 10)), handleEdit); })()}
            className="w-full sm:w-36" />
          <Input label="Ano" type="number" placeholder="2024" value={sAno}
            onChange={(e) => { setSAno(e.target.value); setError(null); setAllResults([]); setShowAll(false); }}
            className="w-full sm:w-28" />
          <Button variant="ghost" size="md" loading={searching} onClick={() => {
            if (!sNumero || !sAno) { setError('Informe Nº NP e Ano.'); return; }
            handleSearchRequest(() => findNpByNumeroEAno(parseInt(sNumero, 10), parseInt(sAno, 10)), handleEdit);
          }}>🔍 Buscar</Button>
          <Button variant="ghost" size="md" loading={searching} onClick={() => handleGetAllRequest(getAllNp)}>🔍 Buscar Todos</Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

      {editing && found && (
        <div className="glass-panel p-5 animate-fadeIn space-y-6">
          <SectionTitle>Atualizar Payment Note</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl">
            <Input label="Nº NP" type="number" value={numeroNp} onChange={e => setNumeroNp(e.target.value)} />
            <Input label="Data Liq." type="date" value={dataLiq} onChange={e => setDataLiq(e.target.value)} />
            <Input label="Doc. Origem" value={docOrigin} onChange={e => setDocOrigin(e.target.value)} />
            <Input label="Valor (R$)" type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} />
            <Select label="Status" value={status} onChange={e => setStatus(e.target.value as PaymentNoteDto['status'])} options={[
              { value: 'A_PAGAR', label: 'A PAGAR' },
              { value: 'PAGA', label: 'PAGA' },
              { value: 'CANCELADA', label: 'CANCELADA' },
            ]} />
          </div>

          <div>
            <SectionTitle>Empresa (Validação por CNPJ)</SectionTitle>
            <div className="max-w-sm space-y-2">
              <div className="flex items-end gap-3">
                <Input label="CNPJ da Empresa" placeholder="XX.XXX.XXX/XXXX-XX" value={cnpj}
                  onChange={(e) => handleCnpj(e.target.value)} onBlur={handleCnpjBlur}
                  maxLength={18} className="flex-1" error={cnpjError ?? undefined} />
                {cnpjLoading && (
                  <span className="mb-2 text-stone-400 text-xs flex items-center gap-1">
                    <span className="inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Buscando...
                  </span>
                )}
              </div>
              {cnpjValid === true && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
                  <span>✔</span><span>{empresaNome}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionTitle>Tributação</SectionTitle>
            <div className="space-y-4 max-w-2xl">
              <div className="w-full sm:w-48">
                <Select label="Tipo de Tributação" value={taxTipo}
                  onChange={e => setTaxTipo(e.target.value as OptanteStatus)} options={[
                    { value: 'OPTANTE', label: 'OPTANTE' },
                    { value: 'NAO_OPTANTE', label: 'NÃO OPTANTE' },
                  ]} />
              </div>
              {taxTipo === 'NAO_OPTANTE' && (
                <div className="animate-fadeIn">
                  <Input label="Cód. EFD" type="number" placeholder="17001" value={codEfd}
                    onChange={e => setCodEfd(e.target.value)} className="w-full sm:w-48" />
                  <p className="text-stone-500 text-xs mt-1">Os impostos serão recalculados pelo backend após salvar.</p>
                </div>
              )}
              {found.tax?.calculatedItems && found.tax.calculatedItems.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">Impostos calculados (atual)</p>
                  <TaxItemsDisplay items={found.tax.calculatedItems} taxStatus={found.tax.taxStatus} compact />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleSave} loading={saving} disabled={cnpjValid === false || cnpjLoading}>Salvar Alterações</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
          {saveError && <Alert variant="error" message={saveError} onClose={() => setSaveError(null)} />}
          {success && <Alert variant="success" message={success} onClose={() => setSuccess(null)} />}
        </div>
      )}

      {showAll && !editing && allResults.length > 0 && (
        <>
          <TableContainer title="Resultados" count={allResults.length}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500 text-xs uppercase border-b border-white/10">
                  <th className="py-2 pr-4">Nº NP</th>
                  <th className="py-2 pr-4">Data Liq.</th>
                  <th className="py-2 pr-4">Empresa</th>
                  <th className="py-2 pr-4">Valor</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Tributação</th>
                  <th className="py-2 pr-4 w-8">✏️</th>
                </tr>
              </thead>
              <tbody>
                {allResults.map((np, i) => (
                  <tr key={i} className="border-b border-stone-800 hover:bg-stone-800/30">
                    <td className="py-2 pr-4 text-amber-300 font-mono">{np.numeroNp}</td>
                    <td className="py-2 pr-4 text-gray-300 whitespace-nowrap">{formatDate(np.dataLiquidacao)}</td>
                    <td className="py-2 pr-4 text-gray-300 text-xs">{np.empresa?.nome ?? '—'}</td>
                    <td className="py-2 pr-4 text-gray-200 font-mono text-xs">{formatCurrency(np.value)}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${NP_STATUS_STYLE[np.status]}`}>
                        {np.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {np.tax ? (
                        <div className="text-xs space-y-0.5">
                          <div className="text-stone-400">{np.tax.tipo}</div>
                          {np.tax.taxStatus && (
                            <div className="text-[10px] text-stone-500">
                              {TAX_STATUS_LABEL[np.tax.taxStatus]}
                            </div>
                          )}
                        </div>
                      ) : <span className="text-stone-600 text-xs">—</span>}
                    </td>
                    <td className="py-2 pr-4 w-8">
                      <EditIconButton onClick={() => handleEdit(np)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
          <PaginationControls currentPage={currentPage} totalPages={totalPages} totalElements={totalElements}
            loading={searching}
            onPrevious={() => handlePreviousPage(getAllNp)}
            onNext={() => handleNextPage(getAllNp)}
            onGoToPage={(page) => handleGoToPage(page, getAllNp)} />
        </>
      )}
    </div>
  );
}