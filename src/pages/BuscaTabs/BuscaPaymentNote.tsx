import { useState } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import Select from '../../components/Select';
import SearchResultTable from '../../components/SearchResultTable';
import { findNpByNumeroEAno, getAllNp, updatePaymentNote } from '../../services/api';
import type { PaymentNoteDto, TaxDto } from '../../types';
import { formatCNPJ, toInputDate } from '../../lib/utils';
import { SectionTitle, ReadField } from './Shared';
import { useEntitySearch } from '../../hooks/useEntitySearch';

export default function BuscaPaymentNote() {
  const [sNumero, setSNumero] = useState('');
  const [sAno, setSAno]       = useState('');

  const [numeroNp, setNumeroNp] = useState('');
  const [dataLiq, setDataLiq] = useState('');
  const [docOrigin, setDocOrigin] = useState('');
  const [ns, setNs] = useState('');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<PaymentNoteDto['status']>('A_PAGAR');
  const [taxTipo, setTaxTipo] = useState<TaxDto['tipo'] | ''>('');
  const [codEfd, setCodEfd] = useState('');
  const [ir, setIr] = useState('');
  const [csll, setCsll] = useState('');
  const [cofins, setCofins] = useState('');
  const [pisPasep, setPisPasep] = useState('');
  const [darf, setDarf] = useState('');

  const {
    loading: searching, error, setError,
    allResults,
    showAll,
    found, setFound,
    editing, setEditing,
    saving, saveError,
    success,
    handleSearchRequest,
    handleGetAllRequest,
    handleSaveRequest,
  } = useEntitySearch<PaymentNoteDto>();

  const handleEdit = (np: PaymentNoteDto) => {
    setFound(np);
    setNumeroNp(String(np.numeroNp));
    setDataLiq(toInputDate(np.dataLiquidacao));
    setDocOrigin(np.docOrigin);
    setNs(np.ns);
    setValue(String(np.value));
    setStatus(np.status);
    setTaxTipo(np.tax?.tipo ?? '');
    setCodEfd(String(np.tax?.codEfd ?? 0));
    setIr(String(np.tax?.ir ?? 0));
    setCsll(String(np.tax?.csll ?? 0));
    setCofins(String(np.tax?.cofins ?? 0));
    setPisPasep(String(np.tax?.pisPasep ?? 0));
    setDarf(String(np.tax?.darf ?? 0));
    setEditing(true);
  };

  const handleSave = () => {
    if (!found) return;
    const payload: PaymentNoteDto = {
      ...found,
      numeroNp: parseInt(numeroNp, 10),
      dataLiquidacao: dataLiq,
      docOrigin,
      ns,
      value: parseFloat(value),
      status,
    };
    handleSaveRequest(() => updatePaymentNote(payload), 'Payment Note atualizada!', handleGetAll);
  };

  const handleSearch = () => {
    if (!sNumero || !sAno) { setError('Informe Nº NP e Ano.'); return; }
    handleSearchRequest(
      () => findNpByNumeroEAno(parseInt(sNumero, 10), parseInt(sAno, 10)),
      (data) => { handleEdit(data); }
    );
  };

  const handleGetAll = () => {
    handleGetAllRequest(() => getAllNp());
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <SectionTitle>Buscar Payment Note por Nº e Ano</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
        <Input label="Nº NP" type="number" placeholder="2024001" value={sNumero} onChange={(e) => { setSNumero(e.target.value); setError(null); }} className="w-36" />
        <Input label="Ano" type="number" placeholder="2024" value={sAno} onChange={(e) => { setSAno(e.target.value); setError(null); }} className="w-44" />
        <Button variant="ghost" size="md" loading={searching} onClick={handleSearch}>🔍 Buscar</Button>
        <Button variant="ghost" size="md" loading={searching} onClick={handleGetAll}>🔍 Buscar Todos</Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

      {editing && found && (
        <div className="glass-panel p-5 animate-fadeIn mt-6">
          <SectionTitle>Atualizar Payment Note</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-2xl">
            <Input label="Nº NP" type="number" value={numeroNp} onChange={e => setNumeroNp(e.target.value)} />
            <Input label="Data Liq." type="date" value={dataLiq} onChange={e => setDataLiq(e.target.value)} />
            <Input label="Doc. Origem" value={docOrigin} onChange={e => setDocOrigin(e.target.value)} />
            <Input label="NS" value={ns} onChange={e => setNs(e.target.value)} />
            <Input label="Valor" type="number" value={value} onChange={e => setValue(e.target.value)} />
            <Select label="Status" value={status} onChange={e => setStatus(e.target.value as PaymentNoteDto['status'])} options={[
              { value: 'A_PAGAR', label: 'A PAGAR' },
              { value: 'PAGA', label: 'PAGA' },
              { value: 'CANCELADA', label: 'CANCELADA' },
            ]} />
          </div>

          <SectionTitle>Empresa</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-xl">
            <ReadField label="Nome" value={found.empresa?.nome || ''} />
            <ReadField label="CNPJ" value={found.empresa?.cnpj ? formatCNPJ(found.empresa.cnpj) : ''} />
          </div>

          <SectionTitle>Tributação</SectionTitle>
          <div className="max-w-2xl">
            <Select label="Tipo Taxa" value={taxTipo} onChange={e => setTaxTipo(e.target.value as TaxDto['tipo'] | '')} options={[
              { value: 'OPTANTE', label: 'OPTANTE' },
              { value: 'NAO_OPTANTE', label: 'NÃO OPTANTE' },
            ]} />
            {taxTipo === 'NAO_OPTANTE' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                <Input label="Cód. EFD" type="number" value={codEfd} onChange={e => setCodEfd(e.target.value)} />
                <Input label="IR" type="number" value={ir} onChange={e => setIr(e.target.value)} />
                <Input label="CSLL" type="number" value={csll} onChange={e => setCsll(e.target.value)} />
                <Input label="COFINS" type="number" value={cofins} onChange={e => setCofins(e.target.value)} />
                <Input label="PIS/Pasep" type="number" value={pisPasep} onChange={e => setPisPasep(e.target.value)} />
                <Input label="DARF" type="number" value={darf} onChange={e => setDarf(e.target.value)} />
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-6">
            <Button onClick={handleSave} loading={saving}>Salvar Alterações</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
          {saveError && <Alert variant="error" message={saveError} />}
          {success && <Alert variant="success" message={success} />}
        </div>
      )}

      {showAll && !editing && allResults.length > 0 && (
        <SearchResultTable data={allResults} onEdit={handleEdit} />
      )}
    </div>
  );
}
