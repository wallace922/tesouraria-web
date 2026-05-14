import { useState } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import EditIconButton from '../../components/EditIconButton';
import { findEmpenhoByNumeroEAno, getAllEmpenho, updateEmpenho } from '../../services/api';
import type { EmpenhoDto } from '../../types';
import { SectionTitle, TableContainer } from './Shared';
import { useEntitySearch } from '../../hooks/useEntitySearch';

export default function BuscaEmpenho() {
  const [sNumero, setSNumero] = useState('');
  const [sAno, setSAno]       = useState('');
  
  const [numero, setNumero] = useState('');
  const [ano, setAno] = useState('');
  const [internalPlan, setInternalPlan] = useState('');
  const [nature, setNature] = useState('');

  const {
    loading, error, setError,
    allResults, setAllResults,
    showAll, setShowAll,
    found, setFound,
    editing, setEditing,
    saving, saveError, setSaveError,
    success, setSuccess,
    resetSearch,
    handleSearchRequest,
    handleGetAllRequest,
    handleSaveRequest
  } = useEntitySearch<EmpenhoDto>();

  const handleEdit = (e: EmpenhoDto) => {
    setFound(e);
    setNumero(String(e.numero));
    setAno(String(e.ano));
    setInternalPlan(e.internalPlan);
    setNature(String(e.nature));
    setEditing(true);
  };

  const handleSave = () => {
    if (!found) return;
    const payload: EmpenhoDto = { 
      ...found, 
      numero: parseInt(numero, 10), 
      ano: parseInt(ano, 10), 
      internalPlan, 
      nature: parseInt(nature, 10) 
    };
    handleSaveRequest(
      () => updateEmpenho(payload),
      'Empenho atualizado com sucesso!',
      handleGetAll
    );
  };

  const handleSearch = () => {
    if (!sNumero || !sAno) {
      resetSearch();
      setError('Informe Nº e Ano.');
      return;
    }
    handleSearchRequest(
      () => findEmpenhoByNumeroEAno(parseInt(sNumero, 10), parseInt(sAno, 10)),
      handleEdit
    );
  };

  const handleGetAll = () => {
    handleGetAllRequest(() => getAllEmpenho());
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <SectionTitle>Buscar Empenho por Número e Ano</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
        <Input label="Nº Empenho" type="number" placeholder="12345" value={sNumero} onChange={(e) => { setSNumero(e.target.value); setError(null); setAllResults([]); setShowAll(false); }} className="w-36" />
        <Input label="Ano"        type="number" placeholder="2024"  value={sAno}    onChange={(e) => { setSAno(e.target.value); setError(null); setAllResults([]); setShowAll(false); }} className="w-28" />
        <Button variant="ghost" size="md" loading={loading} onClick={handleSearch}>🔍 Buscar</Button>
        <Button variant="ghost" size="md" loading={loading} onClick={handleGetAll}>🔍 Buscar Todos</Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

      {editing && found && (
        <div className="glass-panel p-5 animate-fadeIn mt-6 max-w-2xl">
          <SectionTitle>Atualizar Empenho</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Input label="Nº Empenho" type="number" value={numero} onChange={e => setNumero(e.target.value)} />
            <Input label="Ano" type="number" value={ano} onChange={e => setAno(e.target.value)} />
            <Input label="Plano Interno" value={internalPlan} onChange={e => setInternalPlan(e.target.value)} />
            <Input label="Natureza" type="number" value={nature} onChange={e => setNature(e.target.value)} />
          </div>
          <div className="flex gap-4 mt-6">
            <Button onClick={handleSave} loading={saving}>Salvar Alterações</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
          {saveError && <Alert variant="error" message={saveError} onClose={() => setSaveError(null)} />}
          {success && <Alert variant="success" message={success} onClose={() => setSuccess(null)} />}
        </div>
      )}

      {showAll && !editing && allResults.length > 0 && (
        <TableContainer title="Resultados" count={allResults.length}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500 text-xs uppercase border-b border-white/10">
                <th className="py-2 pr-4">Nº</th>
                <th className="py-2 pr-4">Ano</th>
                <th className="py-2 pr-4">Plano Interno</th>
                <th className="py-2 pr-4">Natureza</th>
                <th className="py-2 pr-4 w-8">✏️</th>
              </tr>
            </thead>
            <tbody>
              {allResults.map((e, i) => (
                <tr key={i} className="border-b border-stone-800 hover:bg-stone-800/30">
                  <td className="py-2 pr-4 text-amber-300 font-mono">{e.numero}</td>
                  <td className="py-2 pr-4 text-gray-300">{e.ano}</td>
                  <td className="py-2 pr-4 text-gray-300">{e.internalPlan}</td>
                  <td className="py-2 pr-4 text-stone-500">{e.nature}</td>
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
