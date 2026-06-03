import { useState, useMemo } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import EditIconButton from '../../components/EditIconButton';
import TaxRuleItemEditor from '../../components/TaxRuleItemEditor';
import {
  getTaxRuleById,
  getAllTaxRules,
  updateTaxRule,
  createTaxRuleVersion,
} from '../../services/api';
import type { TaxRuleDto, TaxRuleItemDto } from '../../types';
import { SectionTitle, TableContainer } from './Shared';
import { toInputDate } from '../../lib/utils';

// ── DescriptionCell ───────────────────────────────────────────────────────────

function DescriptionCell({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 60;

  if (!isLong) {
    return <span title={text}>{text}</span>;
  }

  return (
    <span>
      {expanded ? (
        <>
          <span className="break-words whitespace-pre-wrap">{text}</span>
          {' '}
          <button
            onClick={() => setExpanded(false)}
            className="text-amber-500/70 hover:text-amber-400 text-[10px] font-bold ml-1 focus:outline-none"
            title="Recolher"
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
            title="Ver descrição completa"
          >
            ▼ mais
          </button>
        </>
      )}
    </span>
  );
}

// ── Tipos locais ──────────────────────────────────────────────────────────────

type Mode =
  | 'idle'
  | 'edit-details'       // PUT — corrigir description/items de uma versão existente
  | 'new-version'        // POST — criar nova versão (nova vigência)
  | 'end-validity';      // PUT — encerrar vigência de uma regra ativa

// ── Helper: vigência em aberto ─────────────────────────────────────────────

function isOpen(rule: TaxRuleDto): boolean {
  return !rule.dataFimVigencia;
}

/**
 * Sugere o 1º dia do próximo mês em formato YYYY-MM-DD (para <input type="date">).
 */
function nextMonthFirstDay(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** Data de hoje em YYYY-MM-DD */
function todayInputDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function BuscaTaxRule() {
  const [sId, setSId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lista completa
  const [allResults, setAllResults] = useState<TaxRuleDto[]>([]);
  const [showAll, setShowAll] = useState(false);

  // Regra selecionada + modo de operação
  const [selected, setSelected] = useState<TaxRuleDto | null>(null);
  const [mode, setMode] = useState<Mode>('idle');

  // Campos do formulário (edit-details e new-version)
  const [description, setDescription] = useState('');
  const [codigoReceita, setCodigoReceita] = useState('');
  const [inicioVigencia, setInicioVigencia] = useState('');  // YYYY-MM-DD (input)
  const [fimVigencia, setFimVigencia] = useState('');        // YYYY-MM-DD (input)
  const [items, setItems] = useState<TaxRuleItemDto[]>([]);

  // Feedback
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Agrupamento por codEfd ─────────────────────────────────────────────────

  const groupedByCodEfd = useMemo(() => {
    const map = new Map<number, TaxRuleDto[]>();
    for (const rule of allResults) {
      const group = map.get(rule.codEfd) ?? [];
      group.push(rule);
      map.set(rule.codEfd, group);
    }
    // Ordenar versões de cada grupo: mais recente primeiro
    for (const [cod, versions] of map) {
      map.set(
        cod,
        versions.sort((a, b) => {
          const toTs = (d: string) => {
            const [day, mon, yr] = d.split('/');
            return new Date(`${yr}-${mon}-${day}`).getTime();
          };
          return toTs(b.dataInicioVigencia) - toTs(a.dataInicioVigencia);
        })
      );
    }
    return map;
  }, [allResults]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  function resetState() {
    setError(null);
    setAllResults([]);
    setShowAll(false);
    setSelected(null);
    setMode('idle');
    setSaveError(null);
    setSuccess(null);
  }

  function closeForm() {
    setMode('idle');
    setSelected(null);
    setSaveError(null);
    if (allResults.length > 0) setShowAll(true);
  }

  // ── Abrir formulários ──────────────────────────────────────────────────────

  function openEditDetails(rule: TaxRuleDto) {
    setSelected(rule);
    setDescription(rule.description);
    setCodigoReceita(String(rule.codigoReceita));
    setInicioVigencia(toInputDate(rule.dataInicioVigencia));
    setFimVigencia(rule.dataFimVigencia ? toInputDate(rule.dataFimVigencia) : '');
    setItems(rule.items.map(it => ({ ...it })));
    setMode('edit-details');
    setShowAll(false);
    setSaveError(null);
    setSuccess(null);
  }

  function openNewVersion(baseRule: TaxRuleDto) {
    setSelected(baseRule);
    setDescription(baseRule.description);
    setCodigoReceita(String(baseRule.codigoReceita));
    setInicioVigencia(nextMonthFirstDay());
    setFimVigencia('');
    setItems(baseRule.items.map(it => ({ ...it })));
    setMode('new-version');
    setShowAll(false);
    setSaveError(null);
    setSuccess(null);
  }

  function openEndValidity(rule: TaxRuleDto) {
    setSelected(rule);
    setDescription(rule.description);
    setCodigoReceita(String(rule.codigoReceita));
    setInicioVigencia(toInputDate(rule.dataInicioVigencia));
    setFimVigencia(todayInputDate());
    setItems(rule.items.map(it => ({ ...it })));
    setMode('end-validity');
    setShowAll(false);
    setSaveError(null);
    setSuccess(null);
  }

  // ── Busca ─────────────────────────────────────────────────────────────────

  async function handleSearchById() {
    if (!sId) { setError('Informe o ID da regra.'); return; }
    resetState();
    setLoading(true);
    const res = await getTaxRuleById(parseInt(sId, 10));
    if (res.data) {
      setAllResults([res.data]);
      setShowAll(true);
    } else {
      setError(res.errorMessage ?? 'Regra não encontrada.');
    }
    setLoading(false);
  }

  async function handleGetAll() {
    resetState();
    setLoading(true);
    const res = await getAllTaxRules();
    if (res.data && res.data.length > 0) {
      setAllResults(res.data);
      setShowAll(true);
    } else {
      setError('Nenhuma regra de imposto encontrada.');
    }
    setLoading(false);
  }

  // ── Salvar — Editar Detalhes (PUT) ────────────────────────────────────────

  async function handleSaveEditDetails() {
    if (!selected || selected.id === undefined) return;
    if (!description.trim()) { setSaveError('A descrição é obrigatória.'); return; }
    if (description.trim().length > 300) { setSaveError('A descrição deve ter no máximo 300 caracteres.'); return; }
    if (!codigoReceita) { setSaveError('O Código de Receita é obrigatório.'); return; }
    if (!inicioVigencia) { setSaveError('A data de início de vigência é obrigatória.'); return; }
    if (items.some(it => !it.taxType.trim())) { setSaveError('Todos os tipos de imposto devem ser preenchidos.'); return; }

    setSaving(true); setSaveError(null);
    const res = await updateTaxRule(selected.id, {
      codigoReceita: parseInt(codigoReceita, 10),
      description: description.trim(),
      dataInicioVigencia: inicioVigencia,  // formatDate é aplicado dentro de updateTaxRule
      dataFimVigencia: fimVigencia || null,
      items,
    });
    if (res.data) {
      setSuccess('Regra atualizada com sucesso!');
      // Atualizar item na lista local
      setAllResults(prev => prev.map(r => r.id === res.data!.id ? res.data! : r));
      setTimeout(() => { setSuccess(null); closeForm(); }, 2000);
    } else {
      setSaveError(res.errorMessage ?? 'Erro ao atualizar.');
    }
    setSaving(false);
  }

  // ── Salvar — Nova Versão (POST) ───────────────────────────────────────────

  async function handleSaveNewVersion() {
    if (!selected) return;
    if (!description.trim()) { setSaveError('A descrição é obrigatória.'); return; }
    if (description.trim().length > 300) { setSaveError('A descrição deve ter no máximo 300 caracteres.'); return; }
    if (!codigoReceita) { setSaveError('O Código de Receita é obrigatório.'); return; }
    if (!inicioVigencia) { setSaveError('A data de início de vigência é obrigatória.'); return; }
    if (items.some(it => !it.taxType.trim())) { setSaveError('Todos os tipos de imposto devem ser preenchidos.'); return; }

    setSaving(true); setSaveError(null);
    const res = await createTaxRuleVersion({
      codEfd: selected.codEfd,
      codigoReceita: parseInt(codigoReceita, 10),
      description: description.trim(),
      dataInicioVigencia: inicioVigencia,
      dataFimVigencia: fimVigencia || null,
      items,
    });
    if (res.data) {
      setSuccess('Nova versão criada com sucesso! A versão anterior foi encerrada automaticamente.');
      // Recarregar lista completa para refletir a nova versão e o encerramento anterior
      const refresh = await getAllTaxRules();
      if (refresh.data) setAllResults(refresh.data);
      setTimeout(() => { setSuccess(null); closeForm(); }, 2500);
    } else {
      setSaveError(res.errorMessage ?? 'Erro ao criar nova versão.');
    }
    setSaving(false);
  }

  // ── Salvar — Encerrar Vigência (PUT) ──────────────────────────────────────

  async function handleSaveEndValidity() {
    if (!selected || selected.id === undefined) return;
    if (!fimVigencia) { setSaveError('Informe a data de encerramento da vigência.'); return; }

    setSaving(true); setSaveError(null);
    const res = await updateTaxRule(selected.id, {
      codigoReceita: selected.codigoReceita,
      description: selected.description,
      dataInicioVigencia: toInputDate(selected.dataInicioVigencia),
      dataFimVigencia: fimVigencia,
      items: selected.items,
    });
    if (res.data) {
      setSuccess('Vigência encerrada com sucesso!');
      setAllResults(prev => prev.map(r => r.id === res.data!.id ? res.data! : r));
      setTimeout(() => { setSuccess(null); closeForm(); }, 2000);
    } else {
      setSaveError(res.errorMessage ?? 'Erro ao encerrar vigência.');
    }
    setSaving(false);
  }

  // ── Rótulo do modo ────────────────────────────────────────────────────────

  const modeLabel = {
    'idle': '',
    'edit-details': 'Editar Detalhes',
    'new-version': 'Criar Nova Versão',
    'end-validity': 'Encerrar Vigência',
  }[mode];

  const handleSave = mode === 'edit-details'
    ? handleSaveEditDetails
    : mode === 'new-version'
      ? handleSaveNewVersion
      : handleSaveEndValidity;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Painel de busca */}
      <div className="glass-panel p-5">
        <SectionTitle>Buscar Regra de Imposto</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="ID da Regra"
            type="number"
            placeholder="1"
            value={sId}
            onChange={(e) => { setSId(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchById()}
            className="w-full sm:w-36"
          />
          <Button variant="ghost" size="md" loading={loading} onClick={handleSearchById}>
            🔍 Buscar por ID
          </Button>
          <Button variant="ghost" size="md" loading={loading} onClick={handleGetAll}>
            🔍 Buscar Todas
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

      {/* ── Formulário: Editar Detalhes / Nova Versão / Encerrar Vigência ── */}
      {mode !== 'idle' && selected && (
        <div className="glass-panel p-5 animate-fadeIn space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-wrap items-center gap-3">
            <SectionTitle>{modeLabel}</SectionTitle>
            <span className="text-amber-400 font-mono text-xs">ID #{selected.id}</span>
            {mode === 'new-version' && (
              <span className="text-xs text-stone-400 bg-amber-900/20 border border-amber-700/40 rounded px-2 py-0.5">
                Será criado um novo registro via POST
              </span>
            )}
            {mode === 'end-validity' && (
              <span className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded px-2 py-0.5">
                A regra atual será encerrada via PUT
              </span>
            )}
          </div>

          {/* Cód. EFD e Cód. Receita — sempre somente leitura */}
          <div className="flex items-center gap-6 p-3 rounded-lg border border-white/10 bg-black/20 max-w-md">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Cód. EFD</p>
              <p className="text-amber-400 font-mono font-bold text-lg">{selected.codEfd}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Cód. Receita</p>
              {mode === 'edit-details' || mode === 'new-version' ? (
                <input
                  type="number"
                  value={codigoReceita}
                  onChange={e => setCodigoReceita(e.target.value)}
                  placeholder="1001"
                  className="w-24 rounded border border-white/10 bg-black/40 text-amber-300 font-mono font-bold px-2 py-0.5 text-sm focus:outline-none focus:border-amber-500/60"
                />
              ) : (
                <p className="text-amber-400 font-mono font-bold text-lg">{selected.codigoReceita}</p>
              )}
            </div>
            <p className="text-stone-600 text-xs self-end">EFD não editável</p>
          </div>

          {/* Campos do formulário */}
          {mode !== 'end-validity' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Descrição <span className="text-amber-500">*</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="bg-black/60 border border-white/20 text-gray-200 text-sm rounded-md px-3 py-2 placeholder-stone-500 focus:outline-none focus:ring-2 focus:border-amber-500 focus:ring-amber-500/30 transition-all duration-150 resize-none"
                />
                <p className="text-[10px] text-stone-600">Descrição: {description.length}/300 caracteres</p>
              </div>
            </div>
          )}

          {/* Datas de vigência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            {/* Início de Vigência */}
            {mode !== 'end-validity' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                  Início de Vigência <span className="text-amber-500">*</span>
                </label>
                <input
                  type="date"
                  value={inicioVigencia}
                  onChange={e => setInicioVigencia(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500/60"
                  readOnly={mode === 'edit-details'}
                />
                {mode === 'edit-details' && (
                  <p className="text-[10px] text-stone-600">Início de vigência não pode ser alterado neste modo.</p>
                )}
              </div>
            )}

            {/* Fim de Vigência */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                Fim de Vigência
                {mode !== 'end-validity' && <span className="text-stone-600 ml-1">(opcional)</span>}
                {mode === 'end-validity' && <span className="text-amber-500 ml-1">*</span>}
              </label>
              <input
                type="date"
                value={fimVigencia}
                onChange={e => setFimVigencia(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500/60"
              />
              {mode !== 'end-validity' && (
                <p className="text-[10px] text-stone-600">Deixe em branco se a regra não tem previsão de encerramento.</p>
              )}
            </div>
          </div>

          {/* Itens de imposto — ocultos no modo encerrar vigência */}
          {mode !== 'end-validity' && (
            <div className="max-w-2xl">
              <SectionTitle>Itens de Imposto</SectionTitle>
              <TaxRuleItemEditor items={items} onChange={setItems} />
            </div>
          )}

          {/* Aviso contextual */}
          {mode === 'end-validity' && (
            <div className="max-w-2xl rounded-lg border border-red-700/30 bg-red-900/10 p-3">
              <p className="text-red-400 text-xs">
                ⚠️ Esta ação irá definir a <strong>data de fim de vigência</strong> da regra atual via PUT.
                A regra não será excluída, apenas terá seu período encerrado.
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleSave} loading={saving}>
              {mode === 'edit-details' && 'Salvar Alterações'}
              {mode === 'new-version' && '✨ Criar Nova Versão'}
              {mode === 'end-validity' && '🔒 Encerrar Vigência'}
            </Button>
            <Button variant="ghost" onClick={closeForm}>Cancelar</Button>
          </div>

          {saveError && <Alert variant="error" message={saveError} onClose={() => setSaveError(null)} />}
          {success && <Alert variant="success" message={success} onClose={() => setSuccess(null)} />}
        </div>
      )}

      {/* ── Tabela agrupada por codEfd ── */}
      {showAll && mode === 'idle' && allResults.length > 0 && (
        <TableContainer title="Regras de Imposto" count={allResults.length}>
          <div className="space-y-0">
            {Array.from(groupedByCodEfd.entries()).map(([codEfd, versions]) => {
              const activeVersion = versions.find(v => isOpen(v));
              return (
                <div key={codEfd} className="border-b border-white/5 last:border-b-0">
                  {/* Cabeçalho do grupo */}
                  <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-black/20">
                    <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Cód. EFD</span>
                    <span className="text-amber-400 font-mono font-bold text-base">{codEfd}</span>
                    {activeVersion && (
                      <>
                        <span className="text-stone-600 text-xs">|</span>
                        <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Cód. Receita</span>
                        <span className="text-amber-300 font-mono font-bold text-sm">{activeVersion.codigoReceita}</span>
                      </>
                    )}
                    <span className="text-stone-500 text-xs">{versions.length} versão(ões)</span>
                    {activeVersion && (
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => openNewVersion(activeVersion)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-amber-600/40 text-amber-400 text-xs hover:bg-amber-900/20 transition-colors"
                          title="Criar nova versão com nova vigência"
                        >
                          ✨ Nova Versão
                        </button>
                        <button
                          onClick={() => openEndValidity(activeVersion)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-red-700/40 text-red-400 text-xs hover:bg-red-900/20 transition-colors"
                          title="Encerrar a vigência da versão ativa"
                        >
                          🔒 Encerrar Vigência
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Versões do grupo */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-stone-500 text-[10px] uppercase tracking-wider border-b border-white/5">
                        <th className="py-1.5 px-3">ID</th>
                        <th className="py-1.5 px-3">Cód. Receita</th>
                        <th className="py-1.5 px-3">Descrição</th>
                        <th className="py-1.5 px-3">Início Vigência</th>
                        <th className="py-1.5 px-3">Fim Vigência</th>
                        <th className="py-1.5 px-3">Status</th>
                        <th className="py-1.5 px-3">Impostos</th>
                        <th className="py-1.5 px-3 w-8">✏️</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map((rule) => {
                        const open = isOpen(rule);
                        return (
                          <tr
                            key={rule.id}
                            className={`border-b border-stone-800/50 hover:bg-stone-800/20 ${!open ? 'opacity-60' : ''}`}
                          >
                            <td className="py-2 px-3 text-amber-300 font-mono text-xs">{rule.id}</td>
                            <td className="py-2 px-3 text-amber-400 font-mono font-bold text-xs">{rule.codigoReceita}</td>
                            <td className="py-2 px-3 text-gray-300 text-xs max-w-[220px]">
                              <DescriptionCell text={rule.description} />
                            </td>
                            <td className="py-2 px-3 text-gray-300 font-mono text-xs">{rule.dataInicioVigencia}</td>
                            <td className="py-2 px-3 font-mono text-xs">
                              {rule.dataFimVigencia
                                ? <span className="text-stone-400">{rule.dataFimVigencia}</span>
                                : <span className="text-emerald-400">—</span>
                              }
                            </td>
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                                open
                                  ? 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50'
                                  : 'text-stone-500 bg-stone-900/30 border-stone-700/50'
                              }`}>
                                {open ? 'Em Vigor' : 'Encerrada'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-stone-400 text-xs">
                              {rule.items.length > 0 ? rule.items.map(it => it.taxType).join(', ') : '—'}
                            </td>
                            <td className="py-2 px-3 w-8">
                              <EditIconButton
                                onClick={() => openEditDetails(rule)}
                                title="Editar detalhes desta versão"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </TableContainer>
      )}
    </div>
  );
}
