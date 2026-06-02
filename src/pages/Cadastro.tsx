import React, { useState } from 'react';
import PageShell from '../components/PageShell';
import Tabs, { Tab } from '../components/Tabs';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Alert from '../components/Alert';
import TaxItemsDisplay from '../components/TaxItemsDisplay';
import TaxRuleItemEditor from '../components/TaxRuleItemEditor';
import {
  saveEmpresa,
  saveEmpenho,
  saveFinancialPlanning,
  savePaymentNote,
  createTaxRuleVersion,
  findEmpresaByCnpj,
} from '../services/api';
import type {
  EmpresaDto,
  EmpenhoDto,
  FinancialPlanningDto,
  PaymentNoteDto,
  TaxRuleDto,
  TaxRuleItemDto,
  OptanteStatus,
} from '../types';
import { formatCNPJ, formatCurrency, formatDate } from '../lib/utils';

// ── Tabs config ───────────────────────────────────────────────────────────────

const TABS: Tab[] = [
  { key: 'empresa',           label: 'Empresa',            icon: '🏢' },
  { key: 'empenho',           label: 'Empenho',            icon: '📄' },
  { key: 'financialPlanning', label: 'Financial Planning', icon: '📊' },
  { key: 'paymentNote',       label: 'Payment Note',       icon: '💰' },
  { key: 'taxRule',           label: 'Regra de Imposto',   icon: '📋' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-4">
      <span className="text-amber-500 mr-2">▶</span>{children}
    </p>
  );
}

function SuccessCard<T>({ data, renderFn }: { data: T; renderFn: (d: T) => React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-emerald-700 bg-emerald-900/20 p-5 shadow-inner animate-fadeIn">
      <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
        <span>✔</span> Registro criado com sucesso
      </p>
      <div className="text-sm text-gray-300 space-y-1 font-mono">{renderFn(data)}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex gap-2">
      <span className="text-stone-500 w-40 shrink-0">{label}:</span>
      <span className="text-amber-300 font-bold">{value}</span>
    </div>
  );
}

function applyCnpjMask(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

// ── Sub-formulário: Empresa ───────────────────────────────────────────────────

function FormEmpresa() {
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<EmpresaDto | null>(null);

  function handleCnpj(v: string) { setCnpj(applyCnpjMask(v)); }

  async function handleSave() {
    setError(null); setSuccess(null);
    if (!nome.trim() || cnpj.replace(/\D/g, '').length !== 14) {
      setError('Preencha o Nome e um CNPJ válido (14 dígitos).');
      return;
    }
    setLoading(true);
    const dto: EmpresaDto = { nome: nome.trim(), cnpj: cnpj.replace(/\D/g, '') };
    const result = await saveEmpresa(dto);
    if (result.data) { setSuccess(result.data); setNome(''); setCnpj(''); }
    else { setError(result.errorMessage ?? 'Erro ao salvar empresa.'); }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <SectionTitle>Dados da Empresa</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <Input label="Nome" placeholder="Razão Social" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input label="CNPJ" placeholder="XX.XXX.XXX/XXXX-XX" value={cnpj} onChange={(e) => handleCnpj(e.target.value)} maxLength={18} />
        </div>
        <div className="mt-6 space-y-3">
          {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}
          <Button variant="primary" loading={loading} onClick={handleSave}>Cadastrar Empresa</Button>
        </div>
      </div>
      {success && (
        <SuccessCard data={success} renderFn={(d) => (
          <>
            {d.id !== undefined && <Field label="ID" value={d.id} />}
            <Field label="Nome" value={d.nome} />
            <Field label="CNPJ" value={formatCNPJ(d.cnpj)} />
          </>
        )} />
      )}
    </div>
  );
}

// ── Sub-formulário: Empenho ───────────────────────────────────────────────────

function FormEmpenho() {
  const [numero, setNumero] = useState('');
  const [ano, setAno] = useState('');
  const [fontDeOrigin, setFontDeOrigin] = useState('');
  const [internalPlan, setInternalPlan] = useState('');
  const [nature, setNature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<EmpenhoDto | null>(null);

  async function handleSave() {
    setError(null); setSuccess(null);
    if (!numero || !ano || !fontDeOrigin || !internalPlan || !nature) {
      setError('Todos os campos são obrigatórios.');
      return;
    }
    setLoading(true);
    const dto: EmpenhoDto = {
      numero: parseInt(numero, 10),
      ano: parseInt(ano, 10),
      fontDeOrigin: parseInt(fontDeOrigin, 10),
      internalPlan: internalPlan.trim(),
      nature: parseInt(nature, 10),
    };
    const result = await saveEmpenho(dto);
    if (result.data) {
      setSuccess(result.data);
      setNumero(''); setAno(''); setFontDeOrigin(''); setInternalPlan(''); setNature('');
    } else { setError(result.errorMessage ?? 'Erro ao salvar.'); }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <SectionTitle>Dados do Empenho</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-2xl">
          <Input label="Nº Empenho" type="number" placeholder="12345" value={numero} onChange={(e) => setNumero(e.target.value)} />
          <Input label="Ano" type="number" placeholder="2024" value={ano} onChange={(e) => setAno(e.target.value)} />
          <Input label="Fonte de Origem" type="number" placeholder="100" value={fontDeOrigin} onChange={(e) => setFontDeOrigin(e.target.value)} />
          <Input label="Plano Interno" placeholder="PI-001" value={internalPlan} onChange={(e) => setInternalPlan(e.target.value)} />
          <Input label="Natureza" type="number" placeholder="339030" value={nature} onChange={(e) => setNature(e.target.value)} />
        </div>
        <div className="mt-6 space-y-3">
          {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}
          <Button variant="primary" loading={loading} onClick={handleSave}>Cadastrar Empenho</Button>
        </div>
      </div>
      {success && (
        <SuccessCard data={success} renderFn={(d) => (
          <>
            {d.id !== undefined && <Field label="ID" value={d.id} />}
            <Field label="Nº Empenho" value={d.numero} />
            <Field label="Ano" value={d.ano} />
            <Field label="Fonte de Origem" value={d.fontDeOrigin} />
            <Field label="Plano Interno" value={d.internalPlan} />
            <Field label="Natureza" value={d.nature} />
          </>
        )} />
      )}
    </div>
  );
}

// ── Sub-formulário: Financial Planning ───────────────────────────────────────

function FormFinancialPlanning() {
  const [numero, setNumero] = useState('');
  const [data, setData] = useState('');
  const [vinculation, setVinculation] = useState('');
  const [origin, setOrigin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<FinancialPlanningDto | null>(null);

  async function handleSave() {
    setError(null); setSuccess(null);
    if (!numero || !data || !vinculation || !origin) { setError('Todos os campos são obrigatórios.'); return; }
    setLoading(true);
    const dto: FinancialPlanningDto = {
      numero: parseInt(numero, 10),
      data,
      vinculation: parseInt(vinculation, 10),
      origin: parseInt(origin, 10),
    };
    const result = await saveFinancialPlanning(dto);
    if (result.data) {
      setSuccess(result.data);
      setNumero(''); setData(''); setVinculation(''); setOrigin('');
    } else { setError(result.errorMessage ?? 'Erro ao salvar financial planning.'); }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <SectionTitle>Dados do Financial Planning</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-2xl">
          <Input label="Número" type="number" placeholder="1001" value={numero} onChange={(e) => setNumero(e.target.value)} />
          <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          <Input label="Vinculação" type="number" placeholder="0" value={vinculation} onChange={(e) => setVinculation(e.target.value)} />
          <Input label="Origem" type="number" placeholder="0" value={origin} onChange={(e) => setOrigin(e.target.value)} />
        </div>
        <div className="mt-6 space-y-3">
          {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}
          <Button variant="primary" loading={loading} onClick={handleSave}>Cadastrar Financial Planning</Button>
        </div>
      </div>
      {success && (
        <SuccessCard data={success} renderFn={(d) => (
          <>
            {d.id !== undefined && <Field label="ID" value={d.id} />}
            <Field label="Número" value={d.numero} />
            <Field label="Data" value={formatDate(d.data)} />
            <Field label="Vinculação" value={d.vinculation} />
            <Field label="Origem" value={d.origin} />
          </>
        )} />
      )}
    </div>
  );
}

// ── Sub-formulário: Payment Note ─────────────────────────────────────────────

function FormPaymentNote() {
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
  // Tributação — apenas tipo e codEfd (backend calcula os itens)
  const [taxTipo, setTaxTipo] = useState<OptanteStatus>('OPTANTE');
  const [codEfd, setCodEfd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<PaymentNoteDto | null>(null);

  function handleCnpj(v: string) { setCnpj(applyCnpjMask(v)); setCnpjValid(null); setCnpjError(null); setEmpresaNome(''); }

  async function handleCnpjBlur() {
    const raw = cnpj.replace(/\D/g, '');
    if (raw.length !== 14) { setCnpjError('CNPJ inválido. Deve conter 14 dígitos.'); setCnpjValid(false); return; }
    setCnpjLoading(true); setCnpjError(null);
    const result = await findEmpresaByCnpj(raw);
    if (result.data) { setCnpjValid(true); setEmpresaNome(result.data.nome); }
    else { setCnpjValid(false); setCnpjError('Empresa não encontrada para este CNPJ. Cadastre a empresa primeiro.'); }
    setCnpjLoading(false);
  }

  async function handleSave() {
    setError(null); setSuccess(null);
    if (!numeroNp || !dataLiq || !docOrigin || !value) { setError('Preencha todos os campos obrigatórios.'); return; }
    if (!cnpjValid) { setError('Valide o CNPJ antes de salvar (campo deve estar com empresa encontrada).'); return; }
    if (taxTipo === 'NAO_OPTANTE' && !codEfd) { setError('Informe o Cód. EFD para tributo Não Optante.'); return; }
    setLoading(true);

    const dto: PaymentNoteDto = {
      numeroNp: parseInt(numeroNp, 10),
      dataLiquidacao: formatDate(dataLiq),
      empresa: { nome: empresaNome, cnpj: cnpj.replace(/\D/g, '') },
      docOrigin: docOrigin.trim(),
      value: parseFloat(value),
      status,
      tax: {
        tipo: taxTipo,
        codEfd: taxTipo === 'NAO_OPTANTE' ? parseInt(codEfd, 10) : 0,
      },
    };

    const result = await savePaymentNote(dto);
    if (result.data) {
      setSuccess(result.data);
      setNumeroNp(''); setDataLiq(''); setDocOrigin(''); setValue('');
      setCnpj(''); setCnpjValid(null); setEmpresaNome('');
      setTaxTipo('OPTANTE'); setCodEfd(''); setStatus('A_PAGAR');
    } else { setError(result.errorMessage ?? 'Erro ao salvar Payment Note.'); }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5 space-y-6">
        <div>
          <SectionTitle>Dados Principais</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl">
            <Input label="Nº NP" type="number" placeholder="2024001" value={numeroNp} onChange={(e) => setNumeroNp(e.target.value)} />
            <Input label="Data Liquidação" type="date" value={dataLiq} onChange={(e) => setDataLiq(e.target.value)} />
            <Input label="Doc. Origem" placeholder="DOC-001" value={docOrigin} onChange={(e) => setDocOrigin(e.target.value)} />
            <Input label="Valor (R$)" type="number" step="0.01" placeholder="0.00" value={value} onChange={(e) => setValue(e.target.value)} />
            <Select label="Status" value={status} onChange={e => setStatus(e.target.value as PaymentNoteDto['status'])} options={[
              { value: 'A_PAGAR', label: 'A PAGAR' },
              { value: 'PAGA', label: 'PAGA' },
              { value: 'CANCELADA', label: 'CANCELADA' },
            ]} />
          </div>
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

        {/* Tributação — apenas tipo e codEfd */}
        <div>
          <SectionTitle>Tributação</SectionTitle>
          <div className="space-y-4 max-w-2xl">
            <div className="w-full sm:w-48">
              <Select label="Tipo de Tributação" value={taxTipo} onChange={e => setTaxTipo(e.target.value as OptanteStatus)} options={[
                { value: 'OPTANTE', label: 'OPTANTE' },
                { value: 'NAO_OPTANTE', label: 'NÃO OPTANTE' },
              ]} />
            </div>
            {taxTipo === 'NAO_OPTANTE' && (
              <div className="animate-fadeIn">
                <Input label="Cód. EFD" type="number" placeholder="17001" value={codEfd}
                  onChange={(e) => setCodEfd(e.target.value)} className="w-full sm:w-48" />
                <p className="text-stone-500 text-xs mt-1">
                  O backend calculará os impostos automaticamente com base na Regra de Imposto do Cód. EFD.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}
          <Button variant="primary" loading={loading} disabled={cnpjValid === false || loading} onClick={handleSave}>
            Cadastrar Payment Note
          </Button>
        </div>
      </div>

      {success && (
        <SuccessCard data={success} renderFn={(d) => (
          <>
            {d.id !== undefined && <Field label="ID" value={d.id} />}
            <Field label="Nº NP" value={d.numeroNp} />
            <Field label="Data Liq." value={formatDate(d.dataLiquidacao)} />
            <Field label="Empresa" value={d.empresa.nome} />
            <Field label="CNPJ" value={formatCNPJ(d.empresa.cnpj)} />
            <Field label="Doc. Origem" value={d.docOrigin} />
            <Field label="Valor" value={formatCurrency(d.value)} />
            <Field label="Status" value={d.status} />
            <Field label="Tributação" value={d.tax?.tipo ?? '—'} />
            {d.tax?.tipo === 'NAO_OPTANTE' && d.tax.codEfd && (
              <Field label="Cód. EFD" value={d.tax.codEfd} />
            )}
            {/* Impostos calculados retornados pelo backend */}
            {d.tax?.calculatedItems && d.tax.calculatedItems.length > 0 && (
              <div className="mt-4">
                <TaxItemsDisplay items={d.tax.calculatedItems} taxStatus={d.tax.taxStatus} />
              </div>
            )}
          </>
        )} />
      )}
    </div>
  );
}

// ── Sub-formulário: Tax Rule ──────────────────────────────────────────────────

function FormTaxRule() {
  const [codEfd, setCodEfd] = useState('');
  const [codigoReceita, setCodigoReceita] = useState('');
  const [description, setDescription] = useState('');
  const [inicioVigencia, setInicioVigencia] = useState('');
  const [fimVigencia, setFimVigencia] = useState('');
  const [items, setItems] = useState<TaxRuleItemDto[]>([{ taxType: '', rate: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<TaxRuleDto | null>(null);

  async function handleSave() {
    setError(null); setSuccess(null);
    if (!codEfd) { setError('Informe o Cód. EFD.'); return; }
    if (!codigoReceita) { setError('Informe o Código de Receita.'); return; }
    if (!description.trim()) { setError('A descrição é obrigatória.'); return; }
    if (description.trim().length > 300) { setError('A descrição deve ter no máximo 300 caracteres.'); return; }
    if (!inicioVigencia) { setError('A data de início de vigência é obrigatória.'); return; }
    if (items.length === 0) { setError('Adicione pelo menos um imposto.'); return; }
    if (items.some(it => !it.taxType.trim())) { setError('Todos os tipos de imposto devem ser preenchidos.'); return; }
    if (items.some(it => it.rate <= 0)) { setError('Todas as alíquotas devem ser maiores que zero.'); return; }
    setLoading(true);

    const dto: Omit<TaxRuleDto, 'id'> = {
      codEfd: parseInt(codEfd, 10),
      codigoReceita: parseInt(codigoReceita, 10),
      description: description.trim(),
      dataInicioVigencia: inicioVigencia,
      dataFimVigencia: fimVigencia || null,
      items,
    };

    const result = await createTaxRuleVersion(dto);
    if (result.data) {
      setSuccess(result.data);
      setCodEfd(''); setCodigoReceita(''); setDescription('');
      setInicioVigencia(''); setFimVigencia('');
      setItems([{ taxType: '', rate: 0 }]);
    } else { setError(result.errorMessage ?? 'Erro ao cadastrar Regra de Imposto.'); }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5 space-y-6">
        <div>
          <SectionTitle>Dados da Regra de Imposto</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
            <Input label="Cód. EFD" type="number" placeholder="17001" value={codEfd} onChange={(e) => setCodEfd(e.target.value)} />
            <Input label="Código de Receita" type="number" placeholder="1001" value={codigoReceita} onChange={(e) => setCodigoReceita(e.target.value)} />
            <Input label="Descrição" placeholder="Serviços de Tecnologia..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
          </div>
          <p className="text-[10px] text-stone-600 mt-1">Descrição: {description.length}/300 caracteres</p>
        </div>

        <div>
          <SectionTitle>Vigência</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                Início de Vigência <span className="text-amber-500">*</span>
              </label>
              <input
                type="date"
                value={inicioVigencia}
                onChange={e => setInicioVigencia(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500/60"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                Fim de Vigência <span className="text-stone-600 ml-1">(opcional)</span>
              </label>
              <input
                type="date"
                value={fimVigencia}
                onChange={e => setFimVigencia(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500/60"
              />
              <p className="text-[10px] text-stone-600">Deixe em branco se não há previsão de encerramento.</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl">
          <SectionTitle>Itens de Imposto</SectionTitle>
          <TaxRuleItemEditor items={items} onChange={setItems} />
        </div>

        <div className="space-y-3">
          {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}
          <Button variant="primary" loading={loading} onClick={handleSave}>
            Cadastrar Regra de Imposto
          </Button>
        </div>
      </div>

      {success && (
        <SuccessCard data={success} renderFn={(d) => (
          <>
            {d.id !== undefined && <Field label="ID" value={d.id} />}
            <Field label="Cód. EFD" value={d.codEfd} />
            <Field label="Cód. Receita" value={d.codigoReceita} />
            <Field label="Descrição" value={d.description} />
            <Field label="Início Vigência" value={d.dataInicioVigencia} />
            <Field label="Fim Vigência" value={d.dataFimVigencia ?? 'Em aberto'} />
            <div className="mt-3">
              <span className="text-stone-500">Impostos configurados:</span>
              <div className="mt-1 space-y-1">
                {d.items.map((it, idx) => (
                  <div key={idx} className="flex gap-4">
                    <span className="text-amber-300 font-bold w-24">{it.taxType}</span>
                    <span className="text-gray-300">{(it.rate * 100).toFixed(4).replace(/\.?0+$/, '')}%</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )} />
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────


export default function Cadastro() {
  const [activeTab, setActiveTab] = useState('empresa');

  return (
    <PageShell>
      <div className="mx-3 sm:mx-6 mt-3 sm:mt-6 px-3 sm:px-6 pt-3 sm:pt-6 pb-2 glass-panel">
        <h2 className="text-amber-400 font-black uppercase tracking-widest text-sm mb-4">
          ＋ Cadastro
        </h2>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      <div className="px-3 sm:px-6 py-6">
        {activeTab === 'empresa'           && <FormEmpresa />}
        {activeTab === 'empenho'           && <FormEmpenho />}
        {activeTab === 'financialPlanning' && <FormFinancialPlanning />}
        {activeTab === 'paymentNote'       && <FormPaymentNote />}
        {activeTab === 'taxRule'           && <FormTaxRule />}
      </div>
    </PageShell>
  );
}
