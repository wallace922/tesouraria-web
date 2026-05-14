import React, { useState, useEffect } from 'react';
import PageShell from '../components/PageShell';
import Button from '../components/Button';
import Input from '../components/Input';
import Alert from '../components/Alert';
import {
  getAllPaymentEmpenhos,
  savePaymentEmpenho,
  updatePaymentEmpenho,
  findNpByNumeroEAno,
  findEmpenhoByNumeroEAno,
  findFinancialPlanningByNumber,
} from '../services/api';
import type { PaymentNoteEmpenhoDto } from '../types';
import { formatCurrency, formatCNPJ, formatDate } from '../lib/utils';

// ── Tipos locais ──────────────────────────────────────────────────────────────

interface RowEditState {
  id: number;
  numeroNp: string;
  npAno: string;
  numeroEmpenho: string;
  anoEmpenho: string;
  numeroFP: string;
  valorVinculo: string;
}

interface EditingMap {
  [rowIndex: number]: RowEditState | undefined;
}

// ── Helpers visuais ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'CANCELADA' | 'PAGA' | 'A_PAGAR' }) {
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

// ── Componente principal ──────────────────────────────────────────────────────

export default function Dashboard() {
  const [rows, setRows] = useState<PaymentNoteEmpenhoDto[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(50);

  // Quick-save form
  const [quickNp, setQuickNp] = useState('');
  const [quickNpAno, setQuickNpAno] = useState('');
  const [quickEmpenho, setQuickEmpenho] = useState('');
  const [quickAno, setQuickAno] = useState('');
  const [quickVinculo, setQuickVinculo] = useState('');
  const [savingQuick, setSavingQuick] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSuccess, setQuickSuccess] = useState<string | null>(null);

  // Inline editing
  const [editingMap, setEditingMap] = useState<EditingMap>({});
  const [confirmingMap, setConfirmingMap] = useState<Record<number, boolean>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  // ── Carregamento inicial ───────────────────────────────────────────────────

  async function loadAll(page = 0) {
    setLoadingList(true);
    setListError(null);
    const result = await getAllPaymentEmpenhos(page, pageSize);
    if (result.data) {
      setRows(result.data.content);
      setTotalPages(result.data.totalPages);
      setCurrentPage(result.data.number);
    } else {
      setListError(result.errorMessage ?? 'Erro ao carregar registros.');
    }
    setLoadingList(false);
  }

  useEffect(() => { loadAll(0); }, []);

  // ── Quick Save ─────────────────────────────────────────────────────────────

  async function handleQuickSave() {
    setQuickError(null);
    setQuickSuccess(null);
    const npNum = parseInt(quickNp, 10);
    const empNum = parseInt(quickEmpenho, 10);
    const empAno = parseInt(quickAno, 10);
    const vinculoValor = parseFloat(quickVinculo);

    if (!npNum || !quickNpAno || !empNum || !empAno || isNaN(vinculoValor)) {
      setQuickError('Preencha todos os campos: Nº NP, Ano NP, Nº Empenho, Ano e Valor Vínculo.');
      return;
    }

    setSavingQuick(true);
    const [npResult, empResult] = await Promise.all([
      findNpByNumeroEAno(npNum, parseInt(quickNpAno, 10)),
      findEmpenhoByNumeroEAno(empNum, empAno),
    ]);

    const erros: string[] = [];
    if (!npResult.data) erros.push(`NP nº ${npNum} (${npResult.errorMessage})`);
    if (!empResult.data) erros.push(`Empenho nº ${empNum}/${empAno} (${empResult.errorMessage})`);

    if (erros.length > 0) {
      setQuickError(`Não encontrado(s):\n• ${erros.join('\n• ')}`);
      setSavingQuick(false);
      return;
    }

    const novoDto: PaymentNoteEmpenhoDto = {
      empenhoDto: empResult.data!,
      paymentNoteBasicDto: npResult.data!,
      financialPlanningBasicDto: null,
      value: vinculoValor,
    };

    const saveResult = await savePaymentEmpenho(novoDto);
    if (saveResult.data) {
      setQuickNp('');
      setQuickNpAno('');
      setQuickEmpenho('');
      setQuickAno('');
      setQuickVinculo('');
      setQuickSuccess('Vínculo salvo com sucesso!');
      await loadAll(currentPage);
    } else {
      setQuickError(saveResult.errorMessage ?? 'Erro ao salvar o vínculo.');
    }
    setSavingQuick(false);
  }

  // ── Inline Editing ─────────────────────────────────────────────────────────

  function startEdit(index: number, row: PaymentNoteEmpenhoDto) {
    setRowErrors((prev) => { const n = { ...prev }; delete n[index]; return n; });
    setEditingMap((prev) => ({
      ...prev,
      [index]: {
        id: row.id!,
        numeroNp: String(row.paymentNoteBasicDto.numeroNp),
        npAno: '',
        numeroEmpenho: String(row.empenhoDto.numero),
        anoEmpenho: String(row.empenhoDto.ano),
        numeroFP: row.financialPlanningBasicDto ? String(row.financialPlanningBasicDto.numberId) : '',
        valorVinculo: String(row.value),
      }
    }));
  }

  function cancelEdit(index: number) {
    setEditingMap((prev) => { const n = { ...prev }; delete n[index]; return n; });
    setRowErrors((prev) => { const n = { ...prev }; delete n[index]; return n; });
  }

  function updateEditField(index: number, field: keyof RowEditState, value: string) {
    setEditingMap((prev) => ({ ...prev, [index]: { ...prev[index]!, [field]: value } }));
  }

  async function confirmEdit(index: number, originalRow: PaymentNoteEmpenhoDto) {
    const editState = editingMap[index];
    if (!editState) return;

    const npNum = parseInt(editState.numeroNp, 10);
    const npAno = editState.npAno ? parseInt(editState.npAno, 10) : null;
    const empNum = parseInt(editState.numeroEmpenho, 10);
    const empAno = parseInt(editState.anoEmpenho, 10);
    const fpNum = editState.numeroFP ? parseInt(editState.numeroFP, 10) : null;
    const vinculoValor = editState.valorVinculo ? parseFloat(editState.valorVinculo) : originalRow.value;

    if (!npNum || !empNum || !empAno) {
      setRowErrors((prev) => ({ ...prev, [index]: 'Nº NP, Nº Empenho e Ano são obrigatórios.' }));
      return;
    }

    setConfirmingMap((prev) => ({ ...prev, [index]: true }));

    const [npResult, empResult, fpResult] = await Promise.all([
      findNpByNumeroEAno(npNum, npAno ?? (originalRow.paymentNoteBasicDto.dataLiquidacao.includes('/') ? parseInt(originalRow.paymentNoteBasicDto.dataLiquidacao.split('/')[2], 10) : parseInt(originalRow.paymentNoteBasicDto.dataLiquidacao.split('-')[0], 10))),
      findEmpenhoByNumeroEAno(empNum, empAno),
      fpNum ? findFinancialPlanningByNumber(fpNum) : Promise.resolve({ data: null, status: null, errorMessage: null }),
    ]);

    const erros: string[] = [];
    if (!npResult.data) erros.push(`NP nº ${npNum}`);
    if (!empResult.data) erros.push(`Empenho nº ${empNum}/${empAno}`);
    if (fpNum && !fpResult.data) erros.push(`Financial Planning nº ${fpNum}`);

    if (erros.length > 0) {
      setRowErrors((prev) => ({ ...prev, [index]: `Não encontrado(s): ${erros.join(', ')}` }));
      setConfirmingMap((prev) => ({ ...prev, [index]: false }));
      return;
    }

    const updatedDto: PaymentNoteEmpenhoDto = {
      id: editState.id,
      empenhoDto: empResult.data!,
      paymentNoteBasicDto: npResult.data!,
      financialPlanningBasicDto: fpResult.data ?? null,
      value: isNaN(vinculoValor) ? originalRow.value : vinculoValor,
    };

    const updateResult = await updatePaymentEmpenho(updatedDto);
    if (updateResult.data) {
      cancelEdit(index);
      await loadAll();
    } else {
      setRowErrors((prev) => ({ ...prev, [index]: updateResult.errorMessage ?? 'Erro ao atualizar.' }));
    }
    setConfirmingMap((prev) => ({ ...prev, [index]: false }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      {/* ── Quick Save Bar ─────────────────────────────────────────────────── */}
      <div className="mx-6 mt-6 p-4 glass-panel">
        <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-3 font-bold">
          ▶ Cadastro Rápido de Vínculo
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Nº NP" type="number" placeholder="Ex: 2024001"
            value={quickNp} onChange={(e) => setQuickNp(e.target.value)} className="w-36" />
          <Input label="Ano NP" type="number" placeholder="Ex: 2024"
            value={quickNpAno} onChange={(e) => setQuickNpAno(e.target.value)} className="w-28" />
          <Input label="Nº Empenho" type="number" placeholder="Ex: 12345"
            value={quickEmpenho} onChange={(e) => setQuickEmpenho(e.target.value)} className="w-36" />
          <Input label="Ano Empenho" type="number" placeholder="Ex: 2024"
            value={quickAno} onChange={(e) => setQuickAno(e.target.value)} className="w-32" />
          <Input label="Valor Vínculo" type="number" placeholder="Valor"
            value={quickVinculo} onChange={(e) => setQuickVinculo(e.target.value)} className="w-36" />
          <Button variant="primary" size="md" loading={savingQuick} onClick={handleQuickSave} className="mb-0.5">
            Salvar Vínculo
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {quickError && <Alert variant="error" message={quickError} onClose={() => setQuickError(null)} />}
          {quickSuccess && <Alert variant="success" message={quickSuccess} onClose={() => setQuickSuccess(null)} />}
        </div>
      </div>

      {/* ── Main Table ─────────────────────────────────────────────────────── */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-amber-400 font-bold uppercase tracking-widest text-xs">
            ▶ Vínculos Registrados
            <span className="ml-3 text-stone-500 font-normal normal-case text-xs">
              {loadingList ? 'Carregando...' : `${rows.length} registro(s)`}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadAll(currentPage - 1)}
              disabled={currentPage === 0 || loadingList}
            >
              ← Anterior
            </Button>
            <span className="text-xs text-stone-500">
              Página {currentPage + 1} de {totalPages || 1}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadAll(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || loadingList}
            >
              Próxima →
            </Button>
            <Button variant="ghost" size="sm" onClick={() => loadAll(currentPage)} loading={loadingList} className="ml-2">
              Recarregar
            </Button>
          </div>
        </div>

        {listError && <Alert variant="error" message={listError} onClose={() => setListError(null)} />}

        {loadingList ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-stone-500 text-sm tracking-widest uppercase">Aguarde...</p>
            </div>
          </div>
        ) : rows.length === 0 && !listError ? (
          <div className="flex flex-col items-center justify-center py-24 text-stone-600 gap-2">
            <span className="text-4xl">📋</span>
            <p className="text-sm tracking-widest uppercase">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <div className="overflow-hidden glass-panel p-4">
            <table className="min-w-full text-xs divide-y divide-white/5">
              <thead>
                <tr className="border-b border-stone-600 text-[10px] uppercase tracking-widest text-stone-400 bg-stone-900/40">
                  <th className="px-3 py-3 text-left border-r border-white/10" colSpan={6}>
                    <span className="text-amber-500">■</span> Nota de Pagamento
                  </th>
                  <th className="px-3 py-3 text-left border-r border-white/10" colSpan={1}>
                    <span className="text-amber-500">■</span> Tributação
                  </th>
                  <th className="px-3 py-3 text-left border-r border-white/10" colSpan={1}>
                    <span className="text-amber-500">■</span> Vínculo
                  </th>
                  <th className="px-3 py-3 text-left border-r border-white/10" colSpan={4}>
                    <span className="text-amber-500">■</span> Empenho
                  </th>
                  <th className="px-3 py-3 text-left border-r border-white/10" colSpan={4}>
                    <span className="text-amber-500">■</span> PF
                  </th>
                  <th className="px-3 py-3 text-center" colSpan={1}>Ações</th>
                </tr>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-stone-500 bg-stone-900/20">
                  <th className="px-3 py-2 text-left">Nº NP</th>
                  <th className="px-3 py-2 text-left">Data Liq.</th>
                  <th className="px-3 py-2 text-left">CNPJ</th>
                  <th className="px-3 py-2 text-left">Doc. Origem</th>
                  <th className="px-3 py-2 text-left">NS</th>
                  <th className="px-3 py-2 text-right border-r border-white/10">Valor</th>
                  <th className="px-3 py-2 text-left border-r border-white/10">Impostos</th>
                  <th className="px-3 py-2 text-left">Vínculo</th>
                  <th className="px-3 py-2 text-left">Nº Emp.</th>
                  <th className="px-3 py-2 text-left">Ano</th>
                  <th className="px-3 py-2 text-left">Plano Interno</th>
                  <th className="px-3 py-2 text-left border-r border-white/10">Natureza</th>
                  <th className="px-3 py-2 text-left">Nº PF</th>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Vínculo</th>
                  <th className="px-3 py-2 text-left border-r border-white/10">Origem</th>
                  <th className="px-3 py-2 text-center">—</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const editing = editingMap[index];
                  const confirming = confirmingMap[index] ?? false;
                  const isEditing = !!editing;

                  return (
                    <React.Fragment key={index}>
                      <tr
                        className={`border-b border-stone-800 transition-colors duration-150 ${isEditing ? 'bg-amber-900/20 ring-1 ring-inset ring-amber-600/50' : 'hover:bg-stone-800/30 bg-transparent'
                          }`}
                      >
                        {/* Nº NP */}
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <input type="number" value={editing.numeroNp}
                                onChange={(e) => updateEditField(index, 'numeroNp', e.target.value)}
                                className="w-24 bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" placeholder="Nº NP" />
                              <input type="number" value={editing.npAno}
                                onChange={(e) => updateEditField(index, 'npAno', e.target.value)}
                                className="w-20 bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" placeholder="Ano" />
                            </div>
                          ) : (
                            <span className="text-amber-400 font-bold">{row.paymentNoteBasicDto.numeroNp}</span>
                          )}
                        </td>
                        {/* Data Liq. */}
                        <td className="px-3 py-2.5 text-gray-300">{formatDate(row.paymentNoteBasicDto.dataLiquidacao)}</td>
                        {/* CNPJ */}
                        <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">
                          <span title={row.paymentNoteBasicDto.empresa.nome}>{formatCNPJ(row.paymentNoteBasicDto.empresa.cnpj)}</span>
                          <br />
                          <span className="text-[10px] text-stone-500 truncate max-w-[120px] block">
                            {row.paymentNoteBasicDto.empresa.nome}
                          </span>
                        </td>
                        {/* Doc Origin */}
                        <td className="px-3 py-2.5 text-gray-400">{row.paymentNoteBasicDto.docOrigin}</td>
                        {/* NS */}
                        <td className="px-3 py-2.5 text-gray-400">{row.paymentNoteBasicDto.ns}</td>
                        {/* Valor + Status */}
                        <td className="px-3 py-2.5 text-right border-r border-white/10">
                          <span className="text-amber-300 font-bold block">{formatCurrency(row.paymentNoteBasicDto.value)}</span>
                          <div className="mt-1 flex justify-end">
                            <StatusBadge status={row.paymentNoteBasicDto.status} />
                          </div>
                        </td>
                        {/* Tax */}
                        <td className="px-3 py-2.5 border-r border-white/10">
                          {!row.paymentNoteBasicDto.tax ? (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-stone-800 text-stone-500 border border-white/10">
                              —
                            </span>
                          ) : row.paymentNoteBasicDto.tax?.tipo === 'OPTANTE' ? (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-900/50 text-emerald-300 border border-emerald-700 uppercase tracking-wider">
                              Optante
                            </span>
                          ) : (
                            <div className="space-y-0.5 text-[10px] text-gray-400">
                              <div className="flex justify-between gap-3"><span className="text-stone-500">IR</span><span>{formatCurrency(row.paymentNoteBasicDto.tax.ir ?? 0)}</span></div>
                              <div className="flex justify-between gap-3"><span className="text-stone-500">CSLL</span><span>{formatCurrency(row.paymentNoteBasicDto.tax.csll ?? 0)}</span></div>
                              <div className="flex justify-between gap-3"><span className="text-stone-500">COFINS</span><span>{formatCurrency(row.paymentNoteBasicDto.tax.cofins ?? 0)}</span></div>
                              <div className="flex justify-between gap-3"><span className="text-stone-500">PIS</span><span>{formatCurrency(row.paymentNoteBasicDto.tax.pisPasep ?? 0)}</span></div>
                              <div className="flex justify-between gap-3"><span className="text-stone-500">DARF</span><span>{formatCurrency(row.paymentNoteBasicDto.tax.darf ?? 0)}</span></div>
                            </div>
                          )}
                        </td>
                        {/* Vínculo (Valor) */}
                        <td className="px-3 py-2.5 text-left border-r border-white/10">
                          {isEditing ? (
                            <input type="number" value={editing.valorVinculo}
                              onChange={(e) => updateEditField(index, 'valorVinculo', e.target.value)}
                              className="w-24 bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          ) : (
                            <span className="text-amber-300 font-bold block">{formatCurrency(row.value)}</span>
                          )}
                        </td>
                        {/* Nº Empenho */}
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <input type="number" value={editing.numeroEmpenho}
                              onChange={(e) => updateEditField(index, 'numeroEmpenho', e.target.value)}
                              className="w-24 bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          ) : (
                            <span className="text-amber-400 font-bold">{row.empenhoDto.numero}</span>
                          )}
                        </td>
                        {/* Ano */}
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <input type="number" value={editing.anoEmpenho}
                              onChange={(e) => updateEditField(index, 'anoEmpenho', e.target.value)}
                              className="w-20 bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          ) : (
                            <span className="text-gray-300">{row.empenhoDto.ano}</span>
                          )}
                        </td>
                        {/* Plano Interno */}
                        <td className="px-3 py-2.5 text-gray-400">{row.empenhoDto.internalPlan}</td>
                        {/* Natureza */}
                        <td className="px-3 py-2.5 text-gray-400 border-r border-white/10">{row.empenhoDto.nature}</td>
                        {/* PF: Nº PF */}
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <input type="number" value={editing.numeroFP}
                              onChange={(e) => updateEditField(index, 'numeroFP', e.target.value)}
                              placeholder="opcional"
                              className="w-24 bg-stone-800 border border-stone-600 text-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-stone-600" />
                          ) : row.financialPlanningBasicDto ? (
                            <span className="text-amber-400 font-bold">{row.financialPlanningBasicDto.numberId}</span>
                          ) : (
                            <span className="text-stone-600">—</span>
                          )}
                        </td>
                        {/* PF: Data */}
                        <td className="px-3 py-2.5 text-gray-300">
                          {row.financialPlanningBasicDto ? formatDate(row.financialPlanningBasicDto.data) : <span className="text-stone-600">—</span>}
                        </td>
                        {/* PF: Vínculo */}
                        <td className="px-3 py-2.5 text-gray-400">
                          {row.financialPlanningBasicDto ? row.financialPlanningBasicDto.vinculation : <span className="text-stone-600">—</span>}
                        </td>
                        {/* PF: Origem */}
                        <td className="px-3 py-2.5 text-gray-400 border-r border-white/10">
                          {row.financialPlanningBasicDto ? row.financialPlanningBasicDto.origin : <span className="text-stone-600">—</span>}
                        </td>
                        {/* Ações */}
                        <td className="px-3 py-2.5 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button variant="primary" size="sm" loading={confirming} onClick={() => confirmEdit(index, row)}>
                                ✔ Confirmar
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => cancelEdit(index)} disabled={confirming}>
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <Button variant="secondary" size="sm" onClick={() => startEdit(index, row)}>
                              ✎ Editar
                            </Button>
                          )}
                        </td>
                      </tr>
                      {/* Linha de erro inline */}
                      {rowErrors[index] && (
                        <tr className="bg-transparent">
                          <td colSpan={16} className="px-3 pb-2">
                            <Alert variant="error" message={rowErrors[index]} onClose={() =>
                              setRowErrors((prev) => { const n = { ...prev }; delete n[index]; return n; })
                            } />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
