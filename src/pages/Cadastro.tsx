import React, { useState } from 'react';
import PageShell from '../components/PageShell';
import Tabs, { Tab } from '../components/Tabs';
import Button from '../components/Button';
import Input from '../components/Input';
import Alert from '../components/Alert';
import {
  saveEmpresa,
  saveEmpenho,
  saveFinancialPlanning,
  savePaymentNote,
  findEmpresaByCnpj,
} from '../services/api';
import type {
  EmpresaDto,
  EmpenhoDto,
  FinancialPlanningDto,
  PaymentNoteDto,
  TaxDto,
} from '../types';
import { formatCNPJ, formatCurrency, formatDate } from '../lib/utils';

// ── Tabs config ───────────────────────────────────────────────────────────────

const TABS: Tab[] = [
  { key: 'empresa', label: 'Empresa', icon: '🏢' },
  { key: 'empenho', label: 'Empenho', icon: '📄' },
  { key: 'financialPlanning', label: 'Financial Planning', icon: '📊' },
  { key: 'paymentNote', label: 'Payment Note', icon: '💰' },
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
    setError(null);
    setSuccess(null);
    if (!nome.trim() || cnpj.replace(/\D/g, '').length !== 14) {
      setError('Preencha o Nome e um CNPJ válido (14 dígitos).');
      return;
    }
    setLoading(true);
    const dto: EmpresaDto = { nome: nome.trim(), cnpj: cnpj.replace(/\D/g, '') };
    const result = await saveEmpresa(dto);
    if (result.data) {
      setSuccess(result.data);
      setNome(''); setCnpj('');
    } else {
      setError(result.errorMessage ?? 'Erro ao salvar empresa.');
    }
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
  const [internalPlan, setInternalPlan] = useState('');
  const [nature, setNature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<EmpenhoDto | null>(null);

  async function handleSave() {
    setError(null); setSuccess(null);
    if (!numero || !ano || !internalPlan || !nature) {
      setError('Todos os campos são obrigatórios.');
      return;
    }
    setLoading(true);
    const dto: EmpenhoDto = {
      numero: parseInt(numero, 10),
      ano: parseInt(ano, 10),
      internalPlan: internalPlan.trim(),
      nature: parseInt(nature, 10),
    };
    const result = await saveEmpenho(dto);
    if (result.data) {
      setSuccess(result.data);
      setNumero(''); setAno(''); setInternalPlan(''); setNature('');
    } else {
      setError(result.errorMessage ?? 'Erro ao salvar empenho.');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <SectionTitle>Dados do Empenho</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
          <Input label="Nº Empenho" type="number" placeholder="12345" value={numero} onChange={(e) => setNumero(e.target.value)} />
          <Input label="Ano" type="number" placeholder="2024" value={ano} onChange={(e) => setAno(e.target.value)} />
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
            <Field label="Nº Empenho" value={d.numero} />
            <Field label="Ano" value={d.ano} />
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
  const [numberId, setNumberId] = useState('');
  const [data, setData] = useState('');
  const [vinculation, setVinculation] = useState('');
  const [origin, setOrigin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<FinancialPlanningDto | null>(null);

  async function handleSave() {
    setError(null); setSuccess(null);
    if (!numberId || !data || !vinculation || !origin) {
      setError('Todos os campos são obrigatórios.');
      return;
    }
    setLoading(true);
    const dto: FinancialPlanningDto = {
      numberId: parseInt(numberId, 10),
      data,
      vinculation: parseInt(vinculation, 10),
      origin: parseInt(origin, 10),
    };
    const result = await saveFinancialPlanning(dto);
    if (result.data) {
      setSuccess(result.data);
      setNumberId(''); setData(''); setVinculation(''); setOrigin('');
    } else {
      setError(result.errorMessage ?? 'Erro ao salvar financial planning.');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <SectionTitle>Dados do Financial Planning</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
          <Input label="Nº ID" type="number" placeholder="1001" value={numberId} onChange={(e) => setNumberId(e.target.value)} />
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
            <Field label="Nº ID" value={d.numberId} />
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
  const [ns, setNs] = useState('');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<PaymentNoteDto['status']>('A_PAGAR');
  const [cnpj, setCnpj] = useState('');
  const [cnpjValid, setCnpjValid] = useState<boolean | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState('');
  const [taxTipo, setTaxTipo] = useState<TaxDto['tipo']>('OPTANTE');
  const [codEfd, setCodEfd] = useState('');
  const [ir, setIr] = useState('');
  const [csll, setCsll] = useState('');
  const [cofins, setCofins] = useState('');
  const [pisPasep, setPisPasep] = useState('');
  const [darf, setDarf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<PaymentNoteDto | null>(null);

  function handleCnpj(v: string) {
    setCnpj(applyCnpjMask(v));
    setCnpjValid(null);
    setCnpjError(null);
    setEmpresaNome('');
  }

  async function handleCnpjBlur() {
    const raw = cnpj.replace(/\D/g, '');
    if (raw.length !== 14) {
      setCnpjError('CNPJ inválido. Deve conter 14 dígitos.');
      setCnpjValid(false);
      return;
    }
    setCnpjLoading(true);
    setCnpjError(null);
    const result = await findEmpresaByCnpj(raw);
    if (result.data) {
      setCnpjValid(true);
      setEmpresaNome(result.data.nome);
    } else {
      setCnpjValid(false);
      setCnpjError('Empresa não encontrada para este CNPJ. Cadastre a empresa primeiro.');
    }
    setCnpjLoading(false);
  }

  async function handleSave() {
    setError(null); setSuccess(null);
    if (!numeroNp || !dataLiq || !docOrigin || !ns || !value) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!cnpjValid) {
      setError('Valide o CNPJ antes de salvar (campo deve estar com empresa encontrada).');
      return;
    }
    if (taxTipo === 'NAO_OPTANTE' && !codEfd) {
      setError('Informe o Cód. EFD para tributo Não Optante.');
      return;
    }
    setLoading(true);

    const tax: TaxDto = taxTipo === 'OPTANTE'
      ? { tipo: 'OPTANTE', codEfd: 0, ir: 0, csll: 0, cofins: 0, pisPasep: 0, darf: 0 }
      : {
        tipo: 'NAO_OPTANTE',
        codEfd: parseInt(codEfd, 10),
        ir: parseFloat(ir) || 0,
        csll: parseFloat(csll) || 0,
        cofins: parseFloat(cofins) || 0,
        pisPasep: parseFloat(pisPasep) || 0,
        darf: parseFloat(darf) || 0,
      };

    const dto: PaymentNoteDto = {
      numeroNp: parseInt(numeroNp, 10),
      dataLiquidacao: formatDate(dataLiq),
      empresa: { nome: empresaNome, cnpj: cnpj.replace(/\D/g, '') },
      docOrigin: docOrigin.trim(),
      ns: ns.trim(),
      value: parseFloat(value),
      status,
      tax,
    };

    const result = await savePaymentNote(dto);
    if (result.data) {
      setSuccess(result.data);
      setNumeroNp(''); setDataLiq(''); setDocOrigin(''); setNs(''); setValue('');
      setCnpj(''); setCnpjValid(null); setEmpresaNome('');
      setTaxTipo('OPTANTE'); setCodEfd(''); setIr(''); setCsll(''); setCofins(''); setPisPasep(''); setDarf('');
      setStatus('A_PAGAR');
    } else {
      setError(result.errorMessage ?? 'Erro ao salvar Payment Note.');
    }
    setLoading(false);
  }

  const saveDisabled = cnpjValid === false || loading;

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5 space-y-6">
        <div>
        <SectionTitle>Dados Principais</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
          <Input label="Nº NP" type="number" placeholder="2024001" value={numeroNp} onChange={(e) => setNumeroNp(e.target.value)} />
          <Input label="Data Liquidação" type="date" value={dataLiq} onChange={(e) => setDataLiq(e.target.value)} />
          <Input label="Doc. Origem" placeholder="DOC-001" value={docOrigin} onChange={(e) => setDocOrigin(e.target.value)} />
          <Input label="NS" placeholder="NS-001" value={ns} onChange={(e) => setNs(e.target.value)} />
          <Input label="Valor (R$)" type="number" step="0.01" placeholder="0.00" value={value} onChange={(e) => setValue(e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-stone-400">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PaymentNoteDto['status'])}
              className="bg-stone-900 border border-stone-600 text-gray-200 text-sm rounded-md px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="A_PAGAR">A Pagar</option>
              <option value="PAGA">Paga</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empresa via CNPJ */}
      <div>
        <SectionTitle>Empresa (Validação por CNPJ)</SectionTitle>
        <div className="max-w-sm space-y-2">
          <div className="flex items-end gap-3">
            <Input
              label="CNPJ da Empresa"
              placeholder="XX.XXX.XXX/XXXX-XX"
              value={cnpj}
              onChange={(e) => handleCnpj(e.target.value)}
              onBlur={handleCnpjBlur}
              maxLength={18}
              className="flex-1"
              error={cnpjError ?? undefined}
            />
            {cnpjLoading && (
              <span className="mb-2 text-stone-400 text-xs flex items-center gap-1">
                <span className="inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                Buscando...
              </span>
            )}
          </div>
          {cnpjValid === true && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
              <span>✔</span>
              <span>{empresaNome}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tributação */}
      <div>
        <SectionTitle>Tributação</SectionTitle>
        <div className="space-y-4 max-w-2xl">
          <div className="flex flex-col gap-1 w-48">
            <label className="text-xs font-semibold uppercase tracking-widest text-stone-400">Tipo de Tributação</label>
            <select
              value={taxTipo}
              onChange={(e) => setTaxTipo(e.target.value as TaxDto['tipo'])}
              className="bg-stone-900 border border-stone-600 text-gray-200 text-sm rounded-md px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="OPTANTE">Optante</option>
              <option value="NAO_OPTANTE">Não Optante</option>
            </select>
          </div>

          {taxTipo === 'NAO_OPTANTE' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-fadeIn">
              <Input label="Cód. EFD" type="number" placeholder="5929" value={codEfd} onChange={(e) => setCodEfd(e.target.value)} />
              <Input label="IR (R$)" type="number" step="0.01" placeholder="0.00" value={ir} onChange={(e) => setIr(e.target.value)} />
              <Input label="CSLL (R$)" type="number" step="0.01" placeholder="0.00" value={csll} onChange={(e) => setCsll(e.target.value)} />
              <Input label="COFINS (R$)" type="number" step="0.01" placeholder="0.00" value={cofins} onChange={(e) => setCofins(e.target.value)} />
              <Input label="PIS/Pasep (R$)" type="number" step="0.01" placeholder="0.00" value={pisPasep} onChange={(e) => setPisPasep(e.target.value)} />
              <Input label="DARF (R$)" type="number" step="0.01" placeholder="0.00" value={darf} onChange={(e) => setDarf(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}
        <Button variant="primary" loading={loading} disabled={saveDisabled} onClick={handleSave}>
          Cadastrar Payment Note
        </Button>
      </div>
      </div>

      {success && (
        <SuccessCard data={success} renderFn={(d) => (
          <>
            <Field label="Nº NP" value={d.numeroNp} />
            <Field label="Data Liq." value={formatDate(d.dataLiquidacao)} />
            <Field label="Empresa" value={d.empresa.nome} />
            <Field label="CNPJ" value={formatCNPJ(d.empresa.cnpj)} />
            <Field label="Doc. Origem" value={d.docOrigin} />
            <Field label="NS" value={d.ns} />
            <Field label="Valor" value={formatCurrency(d.value)} />
            <Field label="Status" value={d.status} />
            <Field label="Tributação" value={d.tax?.tipo ?? '—'} />
            {d.tax?.tipo === 'NAO_OPTANTE' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                <Field label="Cód. EFD" value={d.tax?.codEfd ?? 0} />
                <Field label="IR" value={formatCurrency(d.tax?.ir ?? 0)} />
                <Field label="CSLL" value={formatCurrency(d.tax?.csll ?? 0)} />
                <Field label="COFINS" value={formatCurrency(d.tax?.cofins ?? 0)} />
                <Field label="PIS/Pasep" value={formatCurrency(d.tax?.pisPasep ?? 0)} />
                <Field label="DARF" value={formatCurrency(d.tax?.darf ?? 0)} />
              </div>
            )}
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
      <div className="mx-6 mt-6 px-6 pt-6 pb-2 glass-panel">
        <h2 className="text-amber-400 font-black uppercase tracking-widest text-sm mb-4">
          ＋ Cadastro
        </h2>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      <div className="px-6 py-6">
        {activeTab === 'empresa' && <FormEmpresa />}
        {activeTab === 'empenho' && <FormEmpenho />}
        {activeTab === 'financialPlanning' && <FormFinancialPlanning />}
        {activeTab === 'paymentNote' && <FormPaymentNote />}
      </div>
    </PageShell>
  );
}
