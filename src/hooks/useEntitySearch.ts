import { useState } from 'react';
import { ApiResult } from '../services/api';

export function useEntitySearch<T>() {
  // Search state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // List state
  const [allResults, setAllResults] = useState<T[]>([]);
  const [showAll, setShowAll] = useState(false);

  // Edit state
  const [found, setFound] = useState<T | null>(null);
  const [editing, setEditing] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetSearch = () => {
    setError(null);
    setAllResults([]);
    setShowAll(false);
    setFound(null);
  };

  const handleSearchRequest = async (
    request: () => Promise<ApiResult<T>>,
    onSuccess?: (data: T) => void
  ) => {
    resetSearch();
    setLoading(true);
    const res = await request();
    if (res.data) {
      if (onSuccess) onSuccess(res.data);
      else setFound(res.data);
    } else {
      setError(res.errorMessage ?? 'Registro não encontrado.');
    }
    setLoading(false);
  };

  const handleGetAllRequest = async (request: () => Promise<ApiResult<T[]>>) => {
    resetSearch();
    setLoading(true);
    const res = await request();
    if (res.data && res.data.length > 0) {
      setAllResults(res.data);
      setShowAll(true);
    } else {
      setError('Nenhum registro encontrado.');
    }
    setLoading(false);
  };

  const handleSaveRequest = async (
    request: () => Promise<ApiResult<T>>,
    successMessage: string,
    onSuccessCallback?: () => void
  ) => {
    if (!found) return;
    setSaving(true);
    setSaveError(null);
    const res = await request();
    if (res.data) {
      setSuccess(successMessage);
      setTimeout(() => setSuccess(null), 3000);
      setEditing(false);
      if (showAll && onSuccessCallback) onSuccessCallback();
    } else {
      setSaveError(res.errorMessage || 'Erro ao atualizar.');
    }
    setSaving(false);
  };

  return {
    loading, error, setError,
    allResults, setAllResults,
    showAll, setShowAll,
    found, setFound,
    editing, setEditing,
    saving, setSaving,
    saveError, setSaveError,
    success, setSuccess,
    resetSearch,
    handleSearchRequest,
    handleGetAllRequest,
    handleSaveRequest,
  };
}
