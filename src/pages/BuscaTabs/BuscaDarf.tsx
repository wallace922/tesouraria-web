import React, { useState } from 'react';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import Select from '../../components/Select';
import Input from '../../components/Input';
import PaginationControls from '../../components/PaginationControls';
import TaxItemsDisplay from '../../components/TaxItemsDisplay';
import { SectionTitle } from './Shared';
import { getPaymentEmpenhoByMesAno } from '../../services/api';
import type { PaymentNoteVinculacaoDto } from '../../types';
import { formatCurrency, formatDate, formatCNPJ } from '../../lib/utils';

// ── DescriptionCell ───────────────────────────────────────────────────────────

function DescriptionCell({ text, className = '' }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 60;

  if (!isLong) {
    return <span className={className} title={text}>{text}</span>;
  }

  return (
    <span className={className}>
      {expanded ? (
        <>
          <span className="break-words whitespace-pre-wrap">{text}</span>
          {' '}
          <button
            onClick={() => setExpanded(false)}
            className="text-amber-500/70 hover:text-amber-400 text-[10px] font-bold ml-1 focus:outline-none"
          >
            ▲ menos
          </button>
        </>
      ) : (
        <>
          <span className="truncate block max-w-[200px]" title={text}>{text}</span>
          <button
            onClick={() => setExpanded(true)}
            className="text-amber-500/70 hover:text-amber-400 text-[10px] font-bold focus:outline-none"
          >
            ▼ mais
          </button>
        </>
      )}
    </span>
  );
}

// ── Constantes ────────────────────────────────────────────────────────────────

const MONTH_OPTIONS = [
  { value: '1',  label: 'Janeiro'   },
  { value: '2',  label: 'Fevereiro' },
  { value: '3',  label: 'Março'     },
  { value: '4',  label: 'Abril'     },
  { value: '5',  label: 'Maio'      },
  { value: '6',  label: 'Junho'     },
  { value: '7',  label: 'Julho'     },
  { value: '8',  label: 'Agosto'    },
  { value: '9',  label: 'Setembro'  },
  { value: '10', label: 'Outubro'   },
  { value: '11', label: 'Novembro'  },
  { value: '12', label: 'Dezembro'  },
];

const PAGE_SIZE = 20;

// Número de colunas da tabela principal (usado em colSpan)
const COL_COUNT = 9;

// ── Helpers visuais ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    CANCELADA: 'bg-red-900/60 text-red-300 border border-red-700',
    PAGA:      'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
    A_PAGAR:   'bg-amber-900/60 text-amber-300 border border-amber-600',
    LIQUIDADO: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
  };
  const label: Record<string, string> = {
    CANCELADA: 'Cancelada', PAGA: 'Paga', A_PAGAR: 'A Pagar', LIQUIDADO: 'Liquidado',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${map[status] ?? 'bg-stone-700 text-stone-300 border border-stone-600'}`}>
      {label[status] ?? status}
    </span>
  );
}

import type { PaymentNoteItemDto } from '../../types';

/** Extrai codigoReceita e taxRuleDescription de um item específico. */
function getItemTaxMeta(item: PaymentNoteItemDto) {
  return {
    codigoReceita: item.tax?.codigoReceita ?? null,
    taxRuleDescription: item.tax?.taxRuleDescription ?? null,
    codEfd: item.tax?.codEfd ?? null,
    taxStatus: item.tax?.taxStatus ?? null,
    calculatedItems: item.tax?.calculatedItems ?? [],
  };
}

// ── Lógica de agrupamento ─────────────────────────────────────────────────────

interface GroupItem {
  np: PaymentNoteVinculacaoDto;
  itemDto: PaymentNoteItemDto;
  meta: ReturnType<typeof getItemTaxMeta>;
}

interface Group {
  codigoReceita: number | null;
  description: string | null;
  items: GroupItem[];
  subtotalValor: number;
  subtotalImpostos: number;
}

function groupByCodigoReceita(results: PaymentNoteVinculacaoDto[]): Group[] {
  const map = new Map<string, Group>();

  for (const np of results) {
    const naoOptanteItems = (np.items ?? []).filter(it => it.tax?.tipo === 'NAO_OPTANTE');
    
    // Fallback caso a NP não tenha itens não-optantes (aparece num grupo "sem imposto")
    if (naoOptanteItems.length === 0) {
      const key = 'SEM_CODIGO';
      if (!map.has(key)) {
        map.set(key, { codigoReceita: null, description: null, items: [], subtotalValor: 0, subtotalImpostos: 0 });
      }
      map.get(key)!.items.push({
        np,
        itemDto: np.items?.[0] ?? { value: np.value, description: null, tax: null } as any,
        meta: { codigoReceita: null, taxRuleDescription: null, codEfd: null, taxStatus: null, calculatedItems: [] }
      });
      continue;
    }

    for (const item of naoOptanteItems) {
      const meta = getItemTaxMeta(item);
      const key = String(meta.codigoReceita ?? 'SEM_CODIGO');
      if (!map.has(key)) {
        map.set(key, {
          codigoReceita: meta.codigoReceita,
          description: meta.taxRuleDescription,
          items: [],
          subtotalValor: 0,
          subtotalImpostos: 0,
        });
      }
      map.get(key)!.items.push({ np, itemDto: item, meta });
    }
  }

  // Subtotais por ITEM único dentro de cada grupo (evita dupla contagem se a NP tiver múltiplos PFs)
  for (const group of map.values()) {
    const seen = new Set<string>();
    for (const groupItem of group.items) {
      const itemKey = groupItem.itemDto.id ? String(groupItem.itemDto.id) : `${groupItem.np.numeroNp}-${groupItem.itemDto.value}`;
      if (seen.has(itemKey)) continue;
      seen.add(itemKey);
      group.subtotalValor += groupItem.itemDto.value;
      group.subtotalImpostos += groupItem.meta.calculatedItems.reduce((s: number, i: {amount: number}) => s + i.amount, 0);
    }
  }

  return Array.from(map.values());
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function BuscaDarf() {
  const [mes, setMes]           = useState('');
  const [ano, setAno]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [results, setResults]             = useState<PaymentNoteVinculacaoDto[]>([]);
  const [currentPage, setCurrentPage]     = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searched, setSearched]           = useState(false);

  // ── Busca ─────────────────────────────────────────────────────────────────

  async function fetchPage(page: number) {
    const mesNum = parseInt(mes, 10);
    const anoNum = parseInt(ano, 10);
    if (!mesNum || mesNum < 1 || mesNum > 12) {
      setError('Selecione um mês válido (1–12).');
      return;
    }
    if (!anoNum || anoNum < 1900 || anoNum > 2050) {
      setError('Informe um ano válido (1900–2050).');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getPaymentEmpenhoByMesAno(mesNum, anoNum, page, PAGE_SIZE);
    if (result.data) {
      const d = result.data as any;
      setResults(d.content ?? []);
      setCurrentPage(d.pageNumber ?? d.page ?? 0);
      setTotalPages(d.totalPages ?? 0);
      setTotalElements(d.totalElements ?? 0);
      setSearched(true);
    } else {
      setError(result.errorMessage ?? 'Erro ao buscar relatório.');
    }
    setLoading(false);
  }

  function handleSearch() { setCurrentPage(0); fetchPage(0); }

  // ── Totais globais da página ──────────────────────────────────────────────

  // Totais por NP única (evita dupla contagem de NPs com múltiplos PFs)
  const totalVinculo = (() => {
    const seen = new Set<number>();
    return results.reduce((s, r) => {
      if (seen.has(r.numeroNp)) return s;
      seen.add(r.numeroNp);
      return s + r.value;
    }, 0);
  })();
  const totalImpostos = (() => {
    const seen = new Set<string>();
    return results.reduce((s, r) => {
      const npItems = r.items ?? [];
      let npTaxes = 0;
      for (const item of npItems) {
        if (item.tax?.tipo !== 'NAO_OPTANTE') continue;
        const itemKey = item.id ? String(item.id) : `${r.numeroNp}-${item.value}`;
        if (seen.has(itemKey)) continue;
        seen.add(itemKey);
        
        npTaxes += (item.tax?.calculatedItems ?? []).reduce((si: number, i: {amount: number}) => si + i.amount, 0);
      }
      return s + npTaxes;
    }, 0);
  })();
  const mesLabel = MONTH_OPTIONS.find(m => m.value === mes)?.label ?? '';

  // Agrupamento calculado derivado dos resultados
  const groups = groupByCodigoReceita(results);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <div className="glass-panel p-4 sm:p-5">
        <SectionTitle>Relatório de DARF por Mês/Ano do PF</SectionTitle>
        <p className="text-xs text-stone-500 mb-4">
          Lista todas as Notas de Pagamento vinculadas a um PF no período informado,
          agrupadas e ordenadas por Código de Receita.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Mês"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="w-full sm:w-44"
            options={[{ value: '', label: 'Selecione o mês' }, ...MONTH_OPTIONS]}
          />
          <Input
            label="Ano"
            type="number"
            placeholder="Ex: 2025"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full sm:w-32"
          />
          <Button variant="primary" size="md" loading={loading} onClick={handleSearch} className="mb-0.5 w-full sm:w-auto">
            🔍 Gerar Relatório
          </Button>
        </div>
        {error && (
          <div className="mt-3">
            <Alert variant="error" message={error} onClose={() => setError(null)} />
          </div>
        )}
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-stone-500 text-sm tracking-widest uppercase">Gerando relatório...</p>
          </div>
        </div>
      )}

      {/* ── Resultados ────────────────────────────────────────────────────── */}
      {searched && !loading && (
        results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-600 gap-2">
            <span className="text-4xl">📋</span>
            <p className="text-sm tracking-widest uppercase">Nenhuma nota encontrada para o período.</p>
          </div>
        ) : (
          <>
            {/* ── Painel de resumo global ──────────────────────────────────── */}
            <div className="glass-panel p-4 flex flex-wrap gap-6 items-center">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-stone-500">Total de Registros</p>
                <p className="text-amber-400 font-black text-xl">{totalElements}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-stone-500">Grupos (Cód. Receita)</p>
                <p className="text-amber-400 font-black text-xl">{groups.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-stone-500">Soma Vínculos</p>
                <p className="text-amber-400 font-black text-xl">{formatCurrency(totalVinculo)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-stone-500">Total Impostos (pág.)</p>
                <p className="text-amber-400 font-black text-xl">{formatCurrency(totalImpostos)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-stone-500">Período</p>
                <p className="text-gray-300 font-bold text-sm">{mesLabel} / {ano}</p>
              </div>
            </div>

            {/* ── Paginação (topo) ─────────────────────────────────────────── */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              loading={loading}
              onPrevious={() => fetchPage(currentPage - 1)}
              onNext={() => fetchPage(currentPage + 1)}
              onGoToPage={(page) => fetchPage(page)}
            />

            {/* ── Tabela agrupada por Código de Receita ─────────────────────── */}
            <div className="glass-panel overflow-hidden">
              {/* Cabeçalho fixo da tabela */}
              <div className="px-4 pt-4 pb-2">
                <SectionTitle>
                  Notas de Pagamento — {mesLabel}/{ano} ({totalElements})
                </SectionTitle>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs divide-y divide-white/5 min-w-[860px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-stone-500 border-b border-white/10 bg-stone-900/30 sticky top-0">
                      <th className="px-3 py-2 text-left">Nº NP</th>
                      <th className="px-3 py-2 text-left">Data Liq.</th>
                      <th className="px-3 py-2 text-left">Empresa</th>
                      <th className="px-3 py-2 text-left">Doc. Origem</th>
                      <th className="px-3 py-2 text-right">Valor NP</th>
                      <th className="px-3 py-2 text-right">Vinculação PF</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2 text-center">Cód. EFD</th>
                      <th className="px-3 py-2 text-left">Descrição da Regra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group, gIdx) => (
                      <React.Fragment key={`group-${group.codigoReceita || gIdx}`}>
                        {/* ── Cabeçalho do grupo (Código de Receita) ──────────── */}
                        <tr
                          key={`group-header-${gIdx}`}
                          className="bg-amber-950/40 border-y border-amber-700/30"
                        >
                          <td colSpan={COL_COUNT} className="px-4 py-2">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              {/* Badge do código */}
                              <span className="inline-flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                                  Cód. Receita
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black font-mono text-sm">
                                  {group.codigoReceita ?? '—'}
                                </span>
                              </span>

                              {/* Descrição da regra */}
                              {group.description && (
                                <DescriptionCell
                                  text={group.description}
                                  className="text-gray-300 text-xs font-medium italic"
                                />
                              )}

                              {/* Subtotais do grupo */}
                              <span className="ml-auto flex items-center gap-4 text-[10px] text-stone-500">
                                <span>
                                  <span className="uppercase tracking-widest">Notas: </span>
                                  <span className="text-amber-400 font-bold">{group.items.length}</span>
                                </span>
                                <span>
                                  <span className="uppercase tracking-widest">Vínculos: </span>
                                  <span className="text-amber-400 font-bold">{formatCurrency(group.subtotalValor)}</span>
                                </span>
                                {group.subtotalImpostos > 0 && (
                                  <span>
                                    <span className="uppercase tracking-widest">Impostos: </span>
                                    <span className="text-amber-400 font-bold">{formatCurrency(group.subtotalImpostos)}</span>
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* ── Linhas do grupo ──────────────────────────────────── */}
                        {(() => {
                          const seenItems = new Set<string>();
                          return group.items.map(({ np, itemDto, meta }, index) => {
                            const itemKey = itemDto.id ? String(itemDto.id) : `${np.numeroNp}-${index}`;
                            const isFirstOccurrence = !seenItems.has(itemKey);
                            seenItems.add(itemKey);
                            const hasItems = meta.calculatedItems.length > 0;

                            return (
                              <React.Fragment key={`np-frag-${np.id}-${itemDto.id ?? index}-${np.vinculation || 'no-vinc'}`}>
                                <tr
                                  key={`row-${np.id}-${itemDto.id ?? index}`}
                                  className="border-b border-stone-800/80 hover:bg-stone-800/30 transition-colors"
                                >
                                  <td className="px-3 py-2.5">
                                    <span className="text-amber-400 font-bold">{np.numeroNp}</span>
                                    {!isFirstOccurrence && (
                                      <span className="block text-[10px] text-stone-600 italic">+ PF</span>
                                    )}
                                  </td>

                                  <td className="px-3 py-2.5 text-gray-300 whitespace-nowrap">
                                    {formatDate(np.dataLiquidacao)}
                                  </td>

                                  <td className="px-3 py-2.5">
                                    <span className="block text-gray-300 truncate max-w-[160px]" title={np.empresa.nome}>
                                      {np.empresa.nome}
                                    </span>
                                    <span className="text-[10px] text-stone-500 font-mono">
                                      {formatCNPJ(np.empresa.cnpj)}
                                    </span>
                                  </td>

                                  <td className="px-3 py-2.5 text-gray-400">
                                    {np.docOrigin}
                                    {itemDto.description && (
                                      <span className="block text-[10px] text-stone-500 italic mt-0.5">
                                        Item: {itemDto.description}
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-3 py-2.5 text-right">
                                    <span className="text-amber-300 font-bold">{formatCurrency(itemDto.value)}</span>
                                  </td>

                                  <td className="px-3 py-2.5 text-right">
                                    <span className="text-amber-400 font-bold">{np.vinculation}</span>
                                  </td>

                                  <td className="px-3 py-2.5 text-center">
                                    <StatusBadge status={np.status} />
                                  </td>

                                  <td className="px-3 py-2.5 text-center">
                                    {meta.codEfd != null ? (
                                      <span className="text-gray-300 font-mono">{meta.codEfd}</span>
                                    ) : <span className="text-stone-600">—</span>}
                                  </td>

                                  {/* Descrição da regra */}
                                  <td className="px-3 py-2.5 text-gray-400 max-w-[220px]">
                                    {meta.taxRuleDescription ? (
                                      <DescriptionCell
                                        text={meta.taxRuleDescription}
                                        className="text-gray-300 text-[11px]"
                                      />
                                    ) : (
                                      <span className="text-stone-600">—</span>
                                    )}
                                  </td>
                                </tr>

                                {/* Impostos calculados — sempre visíveis, apenas na 1ª ocorrência da NP */}
                                {hasItems && isFirstOccurrence && (
                                  <tr key={`tax-${np.id}-${itemDto.id ?? index}`} className="bg-stone-900/50 border-b border-stone-700">
                                    <td colSpan={COL_COUNT} className="px-8 py-3">
                                      <div className="max-w-lg">
                                        <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">
                                          <span className="text-amber-500 mr-1">■</span>
                                          Impostos Calculados — NP {np.numeroNp} {itemDto.description ? `(Item: ${itemDto.description})` : ''}
                                        </p>
                                        <TaxItemsDisplay
                                          items={meta.calculatedItems}
                                          taxStatus={meta.taxStatus ?? undefined}
                                          compact
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                {hasItems && !isFirstOccurrence && (
                                  <tr key={`tax-dup-${np.id}-${itemDto.id ?? index}`} className="bg-stone-900/30 border-b border-stone-800">
                                    <td colSpan={COL_COUNT} className="px-8 py-1.5">
                                      <span className="text-[10px] text-stone-600 italic">
                                        ⚠ Impostos já contabilizados na primeira ocorrência deste Item (NP {np.numeroNp} vinculada a múltiplos PF)
                                      </span>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          });
                        })()}

                        {/* ── Rodapé do grupo com subtotais ─────────────────── */}
                        <tr key={`group-footer-${gIdx}`} className="bg-stone-900/60 border-b-2 border-amber-700/20">
                          <td colSpan={6} className="px-4 py-1.5">
                            <span className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">
                              Subtotal — Cód. Receita {group.codigoReceita ?? '—'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <span className="text-amber-300 font-bold text-xs">{formatCurrency(group.subtotalValor)}</span>
                          </td>
                          <td colSpan={3} className="px-3 py-1.5 text-right">
                            {group.subtotalImpostos > 0 && (
                              <span className="text-amber-300 font-bold text-xs">
                                Imp.: {formatCurrency(group.subtotalImpostos)}
                              </span>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Paginação (rodapé) ───────────────────────────────────────── */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              loading={loading}
              onPrevious={() => fetchPage(currentPage - 1)}
              onNext={() => fetchPage(currentPage + 1)}
              onGoToPage={(page) => fetchPage(page)}
            />
          </>
        )
      )}
    </div>
  );
}
