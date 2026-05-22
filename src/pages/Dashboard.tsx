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
import { ReadField } from './BuscaTabs/Shared';

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

function extractNpYear(dataLiquidacao: string): number | null {
  if (!dataLiquidacao) return null;
  if (dataLiquidacao.includes('/')) {
    const parts = dataLiquidacao.split('/');
    return parts.length === 3 ? parseInt(parts[2], 10) : null;
  }
  if (dataLiquidacao.includes('-')) {
    const parts = dataLiquidacao.split('-');
    return parts.length >= 1 ? parseInt(parts[0], 10) : null;
  }
  return null;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Dashboard() {
  const [rows, setRows] = useState<PaymentNoteEmpenhoDto[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize] = useState(50);
  const [pageInput, setPageInput] = useState('');

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

  // Accordion expand
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  function toggleExpand(index: number) {
    setExpandedRows(prev => ({ ...prev, [index]: !prev[index] }));
  }

  // ── Carregamento inicial ───────────────────────────────────────────────────

  async function loadAll(page = 0) {
    setLoadingList(true);
    setListError(null);
    const result = await getAllPaymentEmpenhos(page, pageSize);
    if (result.data) {
      setRows(result.data.content);
      setTotalPages(result.data.totalPages);
      setTotalElements(result.data.totalElements);
      setCurrentPage(result.data.pageNumber);
    } else {
      setListError(result.errorMessage ?? 'Erro ao carregar registros.');
    }
    setLoadingList(false);
  }

  const handleGoToPage = () => {
    const page = parseInt(pageInput, 10) - 1;
    if (!isNaN(page) && page >= 0 && page < totalPages) {
      loadAll(page);
      setPageInput('');
    }
  };

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
    setExpandedRows(prev => ({ ...prev, [index]: true }));
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

    const originalNpYear = extractNpYear(originalRow.paymentNoteBasicDto.dataLiquidacao);
    const npAlterado = npNum !== originalRow.paymentNoteBasicDto.numeroNp || (npAno !== null && npAno !== originalNpYear);
    const empAlterado = empNum !== originalRow.empenhoDto.numero || empAno !== originalRow.empenhoDto.ano;
    const fpAlterado = fpNum !== (originalRow.financialPlanningBasicDto?.numberId ?? null);

    if (!npNum || !empNum || !empAno) {
      setRowErrors((prev) => ({ ...prev, [index]: 'Nº NP, Nº Empenho e Ano são obrigatórios.' }));
      return;
    }

    setConfirmingMap((prev) => ({ ...prev, [index]: true }));

    const npYearToUse = npAno ?? originalNpYear;

    // Buscar apenas se alterado
    const npResult = npAlterado
      ? await findNpByNumeroEAno(npNum, npYearToUse!)
      : { data: originalRow.paymentNoteBasicDto, status: 200, errorMessage: null };

    const empResult = empAlterado
      ? await findEmpenhoByNumeroEAno(empNum, empAno)
      : { data: originalRow.empenhoDto, status: 200, errorMessage: null };

    const fpResult = fpAlterado && fpNum
      ? await findFinancialPlanningByNumber(fpNum)
      : { data: fpAlterado ? null : (originalRow.financialPlanningBasicDto ?? null), status: 200, errorMessage: null };

    const erros: string[] = [];
    if (npAlterado && !npResult.data) erros.push(`NP nº ${npNum}`);
    if (empAlterado && !empResult.data) erros.push(`Empenho nº ${empNum}/${empAno}`);
    if (fpAlterado && fpNum && !fpResult.data) erros.push(`Financial Planning nº ${fpNum}`);

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
      <div className="mx-3 sm:mx-6 mt-6 p-4 glass-panel">
        <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-3 font-bold">
          ▶ Cadastro Rápido de Vínculo
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Nº NP" type="number" placeholder="Ex: 2024001"
            value={quickNp} onChange={(e) => setQuickNp(e.target.value)} className="w-full sm:w-36" />
          <Input label="Ano NP" type="number" placeholder="Ex: 2024"
            value={quickNpAno} onChange={(e) => setQuickNpAno(e.target.value)} className="w-full sm:w-28" />
          <Input label="Nº Empenho" type="number" placeholder="Ex: 12345"
            value={quickEmpenho} onChange={(e) => setQuickEmpenho(e.target.value)} className="w-full sm:w-36" />
          <Input label="Ano Empenho" type="number" placeholder="Ex: 2024"
            value={quickAno} onChange={(e) => setQuickAno(e.target.value)} className="w-full sm:w-32" />
          <Input label="Valor Vínculo" type="number" placeholder="Valor"
            value={quickVinculo} onChange={(e) => setQuickVinculo(e.target.value)} className="w-full sm:w-36" />
          <Button variant="primary" size="md" loading={savingQuick} onClick={handleQuickSave} className="mb-0.5 w-full sm:w-auto">
            Salvar Vínculo
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {quickError && <Alert variant="error" message={quickError} onClose={() => setQuickError(null)} />}
          {quickSuccess && <Alert variant="success" message={quickSuccess} onClose={() => setQuickSuccess(null)} />}
        </div>
      </div>

      {/* ── Main Table ─────────────────────────────────────────────────────── */}
      <div className="px-3 sm:px-6 py-6">
        <div className="mb-4">
          <h2 className="text-amber-400 font-bold uppercase tracking-widest text-xs">
            ▶ Vínculos Registrados
          </h2>
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
          <>
            <div className="glass-panel overflow-hidden">
              {/* Mobile: card view */}
              <div className="space-y-3 p-3 lg:hidden">
                {rows.map((row, index) => {
                  const editing = editingMap[index];
                  const confirming = confirmingMap[index] ?? false;
                  const isEditing = !!editing;

                  return (
                    <div key={index} className={`glass-panel p-3 animate-fadeIn ${isEditing ? 'ring-1 ring-inset ring-amber-600/50' : ''}`}>
                      {isEditing ? (
                        <>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <label className="text-[10px] uppercase tracking-widest text-stone-500 mb-1 block">Nº NP</label>
                              <input type="number" value={editing.numeroNp}
                                onChange={(e) => updateEditField(index, 'numeroNp', e.target.value)}
                                className="w-full bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-widest text-stone-500 mb-1 block">Ano NP</label>
                              <input type="number" value={editing.npAno}
                                onChange={(e) => updateEditField(index, 'npAno', e.target.value)}
                                className="w-full bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-widest text-stone-500 mb-1 block">Nº Empenho</label>
                              <input type="number" value={editing.numeroEmpenho}
                                onChange={(e) => updateEditField(index, 'numeroEmpenho', e.target.value)}
                                className="w-full bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-widest text-stone-500 mb-1 block">Ano Empenho</label>
                              <input type="number" value={editing.anoEmpenho}
                                onChange={(e) => updateEditField(index, 'anoEmpenho', e.target.value)}
                                className="w-full bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] uppercase tracking-widest text-stone-500 mb-1 block">Nº PF (opcional)</label>
                              <input type="number" value={editing.numeroFP}
                                onChange={(e) => updateEditField(index, 'numeroFP', e.target.value)}
                                className="w-full bg-stone-800 border border-stone-600 text-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-stone-600" placeholder="opcional" />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] uppercase tracking-widest text-stone-500 mb-1 block">Valor Vínculo</label>
                              <input type="number" value={editing.valorVinculo}
                                onChange={(e) => updateEditField(index, 'valorVinculo', e.target.value)}
                                className="w-full bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="primary" size="sm" loading={confirming} onClick={() => confirmEdit(index, row)} className="flex-1">
                              ✔ Confirmar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => cancelEdit(index)} disabled={confirming}>
                              ✕ Cancelar
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-amber-400 font-bold font-mono">NP {row.paymentNoteBasicDto.numeroNp}</span>
                            <StatusBadge status={row.paymentNoteBasicDto.status} />
                          </div>
                          <div className="text-xs text-gray-300 mb-2">
                            <span className="text-stone-500">{row.paymentNoteBasicDto.empresa.nome}</span>
                            <br />
                            <span className="text-stone-500 font-mono">{formatCNPJ(row.paymentNoteBasicDto.empresa.cnpj)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-stone-500">Valor NP:</span>
                              <span className="text-amber-300 font-bold ml-1">{formatCurrency(row.paymentNoteBasicDto.value)}</span>
                            </div>
                            <div>
                              <span className="text-stone-500">Vínculo:</span>
                              <span className="text-amber-300 font-bold ml-1">{formatCurrency(row.value)}</span>
                            </div>
                            <div>
                              <span className="text-stone-500">Empenho:</span>
                              <span className="text-amber-400 ml-1">{row.empenhoDto.numero}/{row.empenhoDto.ano}</span>
                            </div>
                            <div>
                              <span className="text-stone-500">Data Liq.:</span>
                              <span className="text-gray-300 ml-1">{formatDate(row.paymentNoteBasicDto.dataLiquidacao)}</span>
                            </div>
                          </div>
                          {row.financialPlanningBasicDto && (
                            <div className="text-xs text-stone-500 mt-1">
                              PF: <span className="text-amber-400">#{row.financialPlanningBasicDto.numberId}</span>
                            </div>
                          )}
                          <div className="mt-3 pt-2 border-t border-white/10 flex justify-end">
                            <Button variant="secondary" size="sm" onClick={() => startEdit(index, row)}>
                              ✎ Editar
                            </Button>
                          </div>
                        </>
                      )}
                      {rowErrors[index] && (
                        <div className="mt-2">
                          <Alert variant="error" message={rowErrors[index]} onClose={() =>
                            setRowErrors((prev) => { const n = { ...prev }; delete n[index]; return n; })
                          } />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table view */}
              <div className="hidden lg:block w-full p-4">
                <table className="w-full text-xs divide-y divide-white/5">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-stone-500 bg-stone-900/20">
                      <th className="px-3 py-2 text-left whitespace-nowrap">Nº NP</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Data Liq.</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Empresa</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Doc. Origem</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">Valor</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap">Status</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Empenho</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Plano Interno</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">PF</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">Vínculo</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const editing = editingMap[index];
                      const confirming = confirmingMap[index] ?? false;
                      const isEditing = !!editing;
                      const isExpanded = expandedRows[index] ?? false;

                      return (
                        <React.Fragment key={index}>
                          <tr
                            className={`border-b border-stone-800 transition-colors duration-150 ${isEditing ? 'bg-amber-900/20 ring-1 ring-inset ring-amber-600/50' : 'hover:bg-stone-800/30 bg-transparent'}`}
                          >
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
                            <td className="px-3 py-2.5 text-gray-300 whitespace-nowrap">{formatDate(row.paymentNoteBasicDto.dataLiquidacao)}</td>
                            <td className="px-3 py-2.5 text-gray-400">
                              <span className="block text-gray-300 truncate max-w-[180px]" title={row.paymentNoteBasicDto.empresa.nome}>{row.paymentNoteBasicDto.empresa.nome}</span>
                              <span className="text-[10px] text-stone-500 font-mono">{formatCNPJ(row.paymentNoteBasicDto.empresa.cnpj)}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-400">{row.paymentNoteBasicDto.docOrigin}</td>
                            <td className="px-3 py-2.5 text-right">
                              <span className="text-amber-300 font-bold">{formatCurrency(row.paymentNoteBasicDto.value)}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <StatusBadge status={row.paymentNoteBasicDto.status} />
                            </td>
                            <td className="px-3 py-2.5">
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <input type="number" value={editing.numeroEmpenho}
                                    onChange={(e) => updateEditField(index, 'numeroEmpenho', e.target.value)}
                                    className="w-20 bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" placeholder="Nº" />
                                  <input type="number" value={editing.anoEmpenho}
                                    onChange={(e) => updateEditField(index, 'anoEmpenho', e.target.value)}
                                    className="w-16 bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" placeholder="Ano" />
                                </div>
                              ) : (
                                <span className="text-amber-400 font-bold">{row.empenhoDto.numero}<span className="text-stone-500 font-normal">/{row.empenhoDto.ano}</span></span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-gray-400">{row.empenhoDto.internalPlan}</td>
                            <td className="px-3 py-2.5">
                              {row.financialPlanningBasicDto ? (
                                <span className="text-amber-400 font-bold">#{row.financialPlanningBasicDto.numberId}</span>
                              ) : (
                                <span className="text-stone-600">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {isEditing ? (
                                <input type="number" value={editing.valorVinculo}
                                  onChange={(e) => updateEditField(index, 'valorVinculo', e.target.value)}
                                  className="w-24 bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                              ) : (
                                <span className="text-amber-300 font-bold">{formatCurrency(row.value)}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isEditing ? (
                                  <>
                                    <Button variant="primary" size="sm" loading={confirming} onClick={() => confirmEdit(index, row)}>
                                      ✔
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => cancelEdit(index)} disabled={confirming}>
                                      ✕
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => toggleExpand(index)}
                                      className={`px-1.5 py-1 rounded text-[10px] font-bold transition-colors ${isExpanded ? 'text-amber-400 bg-amber-500/20' : 'text-stone-500 hover:text-stone-300'}`}
                                      title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                                    >
                                      {isExpanded ? '▲' : '▼'}
                                    </button>
                                    <Button variant="secondary" size="sm" onClick={() => startEdit(index, row)}>
                                      ✎
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Linha de detalhe expansível */}
                          {(isExpanded || isEditing) && (
                            <tr className="bg-stone-900/40 border-b border-stone-700">
                              <td colSpan={11} className="px-4 py-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Tributação */}
                                  <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold"><span className="text-amber-500 mr-1">■</span>Tributação</p>
                                    {!row.paymentNoteBasicDto.tax ? (
                                      <span className="text-stone-600 text-xs">Sem tributação</span>
                                    ) : row.paymentNoteBasicDto.tax.tipo === 'OPTANTE' ? (
                                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-900/50 text-emerald-300 border border-emerald-700 uppercase tracking-wider">Optante</span>
                                    ) : (
                                      <div className="space-y-1">
                                        <ReadField label="Tipo" value="Não Optante" />
                                        <div className="grid grid-cols-2 gap-2">
                                          <ReadField label="IR" value={formatCurrency(row.paymentNoteBasicDto.tax.ir ?? 0)} />
                                          <ReadField label="CSLL" value={formatCurrency(row.paymentNoteBasicDto.tax.csll ?? 0)} />
                                          <ReadField label="COFINS" value={formatCurrency(row.paymentNoteBasicDto.tax.cofins ?? 0)} />
                                          <ReadField label="PIS" value={formatCurrency(row.paymentNoteBasicDto.tax.pisPasep ?? 0)} />
                                          <ReadField label="DARF" value={formatCurrency(row.paymentNoteBasicDto.tax.darf ?? 0)} />
                                          <ReadField label="Cód. EFD" value={row.paymentNoteBasicDto.tax.codEfd ?? 0} />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Empenho — Detalhes */}
                                  <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold"><span className="text-amber-500 mr-1">■</span>Empenho — Detalhes</p>
                                    <ReadField label="Fonte Origem" value={row.empenhoDto.fontDeOrigin} />
                                    <ReadField label="Natureza" value={row.empenhoDto.nature} />
                                  </div>

                                  {/* PF */}
                                  <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold"><span className="text-amber-500 mr-1">■</span>Planejamento Financeiro</p>
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <div>
                                          <label className="text-[10px] uppercase tracking-widest text-stone-500 mb-1 block">Nº PF (opcional)</label>
                                          <input type="number" value={editing.numeroFP}
                                            onChange={(e) => updateEditField(index, 'numeroFP', e.target.value)}
                                            placeholder="opcional"
                                            className="w-full bg-stone-800 border border-stone-600 text-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-stone-600" />
                                        </div>
                                      </div>
                                    ) : row.financialPlanningBasicDto ? (
                                      <>
                                        <ReadField label="Nº PF" value={row.financialPlanningBasicDto.numberId} />
                                        <ReadField label="Data" value={formatDate(row.financialPlanningBasicDto.data)} />
                                        <ReadField label="Vinculação" value={row.financialPlanningBasicDto.vinculation} />
                                        <ReadField label="Origem" value={row.financialPlanningBasicDto.origin} />
                                      </>
                                    ) : (
                                      <span className="text-stone-600 text-xs">Sem PF vinculado</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                          {rowErrors[index] && (
                            <tr className="bg-transparent">
                              <td colSpan={11} className="px-3 pb-2">
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
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-2 gap-4 sm:gap-0">
              <span className="text-xs text-stone-500">
                Página {currentPage + 1} de {totalPages || 1}
                {totalElements > 0 && ` (${totalElements} registros)`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => loadAll(currentPage - 1)}
                  disabled={currentPage === 0 || loadingList}
                >
                  ← Anterior
                </Button>
                <Input
                  placeholder="Pág"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
                  className="w-16 text-center text-xs"
                />
                <Button
                  variant="ghost" size="sm"
                  onClick={handleGoToPage}
                  disabled={loadingList}
                >
                  Ir
                </Button>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => loadAll(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1 || loadingList}
                >
                  Próxima →
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
