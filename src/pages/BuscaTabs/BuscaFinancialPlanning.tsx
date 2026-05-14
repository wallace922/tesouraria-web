import { useState } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import EditIconButton from '../../components/EditIconButton';
import { findFinancialPlanningByNumber, getAllFinancialPlanning, updateFinancialPlanning } from '../../services/api';
import type { FinancialPlanningDto } from '../../types';
import { formatDate, toInputDate } from '../../lib/utils';
import { SectionTitle, TableContainer } from './Shared';
import { useEntitySearch } from '../../hooks/useEntitySearch';

export default function BuscaFinancialPlanning() {
  const [sId, setSId]         = useState('');
  const [numberId, setNumberId] = useState('');
  const [data, setData]       = useState('');
  const [vinculation, setVinculation] = useState('');
  const [origin, setOrigin]   = useState('');

  const {
    loading, error, setError,
    allResults,
    showAll,
    found, setFound,
    editing, setEditing,
    saving, saveError,
    success,
    handleSearchRequest,
    handleGetAllRequest,
    handleSaveRequest,
  } = useEntitySearch<FinancialPlanningDto>();

  const handleEdit = (e: FinancialPlanningDto) => {
    setFound(e);
    setNumberId(String(e.numberId));
    setData(toInputDate(e.data));
    setVinculation(String(e.vinculation));
    setOrigin(String(e.origin));
    setEditing(true);
  };

  const handleSave = () => {
    if (!found) return;
    const payload: FinancialPlanningDto = {
      ...found,
      numberId: parseInt(numberId, 10),
      data,
      vinculation: parseInt(vinculation, 10),
      origin: parseInt(origin, 10),
    };
    handleSaveRequest(() => updateFinancialPlanning(payload), 'Financial Planning atualizado!', handleGetAll);
  };

  const handleSearch = () => {
    if (!sId) { setError('Informe o Nº ID.'); return; }
    handleSearchRequest(
      () => findFinancialPlanningByNumber(parseInt(sId, 10)),
      (data) => { handleEdit(data); }
    );
  };

  const handleGetAll = () => {
    handleGetAllRequest(() => getAllFinancialPlanning());
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <SectionTitle>Buscar Financial Planning por Nº ID</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
        <Input label="Nº ID" type="number" placeholder="1001" value={sId}
          onChange={(e) => { setSId(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="w-36" />
        <Button variant="ghost" size="md" loading={loading} onClick={handleSearch}>🔍 Buscar</Button>
        <Button variant="ghost" size="md" loading={loading} onClick={handleGetAll}>🔍 Buscar Todos</Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

      {editing && found && (
        <div className="glass-panel p-5 animate-fadeIn mt-6 max-w-2xl">
          <SectionTitle>Atualizar Financial Planning</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Input label="Nº ID" type="number" value={numberId} onChange={e => setNumberId(e.target.value)} />
            <Input label="Data" type="date" value={data} onChange={e => setData(e.target.value)} />
            <Input label="Vinculação" type="number" value={vinculation} onChange={e => setVinculation(e.target.value)} />
            <Input label="Origem" type="number" value={origin} onChange={e => setOrigin(e.target.value)} />
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
        <TableContainer title="Resultados" count={allResults.length}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500 text-xs uppercase border-b border-white/10">
                <th className="py-2 pr-4">Nº ID</th>
                <th className="py-2 pr-4">Data</th>
                <th className="py-2 pr-4">Vinculação</th>
                <th className="py-2 pr-4">Origem</th>
                <th className="py-2 pr-4 w-8">✏️</th>
              </tr>
            </thead>
            <tbody>
              {allResults.map((e, i) => (
                <tr key={i} className="border-b border-stone-800 hover:bg-stone-800/30">
                  <td className="py-2 pr-4 text-amber-300 font-mono">#{e.numberId}</td>
                  <td className="py-2 pr-4 text-gray-300">{formatDate(e.data)}</td>
                  <td className="py-2 pr-4 text-gray-300">{e.vinculation}</td>
                  <td className="py-2 pr-4 text-stone-500">{e.origin}</td>
                  <td className="py-2 pr-4 w-8">
                    <EditIconButton onClick={() => handleEdit(e)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      )}
    </div>
  );
}
