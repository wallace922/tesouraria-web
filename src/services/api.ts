import axios, { AxiosError } from 'axios';
import type {
  PaymentNoteEmpenhoDto,
  PaymentNoteDto,
  EmpenhoDto,
  FinancialPlanningDto,
  EmpresaDto,
  TaxRuleDto,
  PaymentNoteVinculacaoDto,
  PaymentNoteEmpenhoBasicDto,
} from '../types';
import { formatDate } from '../lib/utils';

// ── Instância ─────────────────────────────────────────────────────────────────

export const apiInstance = axios.create({
  baseURL: 'http://localhost:8080/API',
  headers: { 'Content-Type': 'application/json' },
});

// ── Tipo de resultado estruturado ─────────────────────────────────────────────

export interface ApiResult<T> {
  data: T | null;
  status: number | null;
  errorMessage: string | null;
}

function handleError<T>(error: unknown): ApiResult<T> {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? null;
    if (status === 404) {
      return { data: null, status: 404, errorMessage: 'Registro não encontrado.' };
    }
    if (status === 400) {
      return { data: null, status: 400, errorMessage: 'Dados inválidos. Verifique os campos e tente novamente.' };
    }
    if (status !== null && status >= 500) {
      return { data: null, status, errorMessage: 'Falha na comunicação com o servidor. Tente mais tarde.' };
    }
    return { data: null, status, errorMessage: error.message };
  }
  console.error('[api] erro inesperado', error);
  return { data: null, status: null, errorMessage: 'Erro inesperado. Consulte o console.' };
}

// ── Paginação ─────────────────────────────────────────────────────────────────

export interface PageDto<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
}

export type PaginatedResponse<T> = PageDto<T>;

// ── PaymentNoteEmpenho ────────────────────────────────────────────────────────

export async function getAllPaymentEmpenhos(
  page: number = 0,
  size: number = 20
): Promise<ApiResult<PaginatedResponse<PaymentNoteEmpenhoDto>>> {
  try {
    const res = await apiInstance.get<PaginatedResponse<PaymentNoteEmpenhoDto>>('/PaymentEmpenho', {
      params: { page, size },
    });
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function savePaymentEmpenho(dto: PaymentNoteEmpenhoDto): Promise<ApiResult<PaymentNoteEmpenhoDto>> {
  try {
    const res = await apiInstance.post<PaymentNoteEmpenhoDto>('/PaymentEmpenho', dto);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

/**
 * PUT /API/PaymentEmpenho
 * O Java PaymentNoteEmpenhoBasicDto usa os campos:
 *   paymentNoteBasicDto  → { numeroNp, dataLiquidacao }
 *   empenhoDto           → { numero, ano }
 *   financialPlanningBasicDto → { numero, data } | null
 *
 * Atenção: os nomes devem bater com os campos do DTO Java (o mesmo que o GET retorna).
 */
export async function updatePaymentEmpenho(
  id: number,
  payload: {
    paymentNote:       { numeroNp: number; dataLiquidacao: string };
    empenho:           { numero: number; ano: number };
    financialPlanning: { numero: number; data: string } | null;
    value: number;
  }
): Promise<ApiResult<PaymentNoteEmpenhoBasicDto>> {
  try {
    const body = {
      id,
      paymentNoteBasicDto: {
        numeroNp:       payload.paymentNote.numeroNp,
        dataLiquidacao: formatDate(payload.paymentNote.dataLiquidacao),
      },
      empenhoDto: {
        numero: payload.empenho.numero,
        ano:    payload.empenho.ano,
      },
      financialPlanningBasicDto: payload.financialPlanning
        ? {
            numero: payload.financialPlanning.numero,
            data:   formatDate(payload.financialPlanning.data),
          }
        : null,
      value: payload.value,
    };
    const res = await apiInstance.put<PaymentNoteEmpenhoBasicDto>('/PaymentEmpenho', body);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

/**
 * GET /API/PaymentEmpenho/por-mes-ano
 * Relatório de PaymentNotes associadas a FinancialPlanning em um mês/ano.
 */
export async function getPaymentEmpenhoByMesAno(
  mes: number,
  ano: number,
  page: number = 0,
  size: number = 20
): Promise<ApiResult<PaginatedResponse<PaymentNoteVinculacaoDto>>> {
  try {
    const res = await apiInstance.get<PaginatedResponse<PaymentNoteVinculacaoDto>>('/PaymentEmpenho/por-mes-ano', {
      params: { mes, ano, page, size },
    });
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

/**
 * GET /API/PaymentEmpenho/sem-planejamento
 * Lista vínculos PaymentNoteEmpenho sem FinancialPlanning associado.
 */
export async function getPaymentEmpenhoSemPlanejamento(
  page: number = 0,
  size: number = 20
): Promise<ApiResult<PaginatedResponse<PaymentNoteEmpenhoBasicDto>>> {
  try {
    const res = await apiInstance.get<PaginatedResponse<PaymentNoteEmpenhoBasicDto>>('/PaymentEmpenho/sem-planejamento', {
      params: { page, size },
    });
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

// ── PaymentNote (NP) ──────────────────────────────────────────────────────────

export async function findNpByNumeroEAno(numeroNp: number, date: number): Promise<ApiResult<PaymentNoteDto>> {
  try {
    const res = await apiInstance.get<PaymentNoteDto[] | PaymentNoteDto>(`/Np/${numeroNp}/${date}`);
    const data = Array.isArray(res.data) ? res.data[0] : res.data;
    return { data: data || null, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function getAllNp(
  page: number = 0,
  size: number = 50
): Promise<ApiResult<PaginatedResponse<PaymentNoteDto>>> {
  try {
    const res = await apiInstance.get<PaginatedResponse<PaymentNoteDto>>('/Np', {
      params: { page, size },
    });
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function savePaymentNote(dto: PaymentNoteDto): Promise<ApiResult<PaymentNoteDto>> {
  try {
    // Envia apenas tipo e codEfd no tax — o backend calcula os itens
    const payload = {
      numeroNp: dto.numeroNp,
      dataLiquidacao: formatDate(dto.dataLiquidacao),
      empresa: { cnpj: dto.empresa.cnpj },
      docOrigin: dto.docOrigin,
      value: dto.value,
      status: dto.status,
      tax: dto.tax ? { tipo: dto.tax.tipo, codEfd: dto.tax.codEfd } : null,
    };
    const res = await apiInstance.post<PaymentNoteDto>('/Np', payload);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function updatePaymentNote(dto: PaymentNoteDto): Promise<ApiResult<PaymentNoteDto>> {
  try {
    // Envia apenas tipo e codEfd no tax — o backend recalcula os itens
    const payload = {
      numeroNp: dto.numeroNp,
      dataLiquidacao: formatDate(dto.dataLiquidacao),
      empresa: { cnpj: dto.empresa.cnpj },
      docOrigin: dto.docOrigin,
      value: dto.value,
      status: dto.status,
      tax: dto.tax ? { tipo: dto.tax.tipo, codEfd: dto.tax.codEfd } : null,
    };
    const res = await apiInstance.put<PaymentNoteDto>('/Np', payload);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

// ── Empenho ───────────────────────────────────────────────────────────────────

export async function findEmpenhoByNumeroEAno(numero: number, date: number): Promise<ApiResult<EmpenhoDto>> {
  try {
    const res = await apiInstance.get<EmpenhoDto[] | EmpenhoDto>(`/Empenho/${numero}/${date}`);
    const data = Array.isArray(res.data) ? res.data[0] : res.data;
    return { data: data || null, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function getAllEmpenho(
  page: number = 0,
  size: number = 50
): Promise<ApiResult<PaginatedResponse<EmpenhoDto>>> {
  try {
    const res = await apiInstance.get<PaginatedResponse<EmpenhoDto>>('/Empenho', {
      params: { page, size },
    });
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function saveEmpenho(dto: EmpenhoDto): Promise<ApiResult<EmpenhoDto>> {
  try {
    const res = await apiInstance.post<EmpenhoDto>('/Empenho', dto);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function updateEmpenho(dto: EmpenhoDto): Promise<ApiResult<EmpenhoDto>> {
  try {
    const res = await apiInstance.put<EmpenhoDto>('/Empenho', dto);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

// ── FinancialPlanning ─────────────────────────────────────────────────────────

export async function findFinancialPlanningByNumber(numero: number, ano: number): Promise<ApiResult<FinancialPlanningDto>> {
  try {
    const res = await apiInstance.get<FinancialPlanningDto>(`/FinancialPlanning/${numero}/${ano}`);
    return { data: res.data || null, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function getAllFinancialPlanning(
  page: number = 0,
  size: number = 50
): Promise<ApiResult<PaginatedResponse<FinancialPlanningDto>>> {
  try {
    const res = await apiInstance.get<PaginatedResponse<FinancialPlanningDto>>('/FinancialPlanning', {
      params: { page, size },
    });
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function saveFinancialPlanning(dto: FinancialPlanningDto): Promise<ApiResult<FinancialPlanningDto>> {
  try {
    const formattedDto = { ...dto, data: formatDate(dto.data) };
    const res = await apiInstance.post<FinancialPlanningDto>('/FinancialPlanning', formattedDto);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function updateFinancialPlanning(dto: FinancialPlanningDto): Promise<ApiResult<FinancialPlanningDto>> {
  try {
    const formattedDto = { ...dto, data: formatDate(dto.data) };
    const res = await apiInstance.put<FinancialPlanningDto>('/FinancialPlanning', formattedDto);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

// ── Empresa ───────────────────────────────────────────────────────────────────

export async function findEmpresaByCnpj(cnpj: string): Promise<ApiResult<EmpresaDto>> {
  try {
    const res = await apiInstance.get<EmpresaDto[] | EmpresaDto>(`/Empresa/${cnpj}`);
    const dataArray = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
    const data = dataArray.find((e) => String(e.cnpj).replace(/\D/g, '') === cnpj) || dataArray[0] || null;
    return { data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function getAllEmpresa(
  page: number = 0,
  size: number = 50
): Promise<ApiResult<PaginatedResponse<EmpresaDto>>> {
  try {
    const res = await apiInstance.get<PaginatedResponse<EmpresaDto>>('/Empresa', {
      params: { page, size },
    });
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function saveEmpresa(dto: EmpresaDto): Promise<ApiResult<EmpresaDto>> {
  try {
    const res = await apiInstance.post<EmpresaDto>('/Empresa', dto);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function updateEmpresa(dto: EmpresaDto): Promise<ApiResult<EmpresaDto>> {
  try {
    const res = await apiInstance.put<EmpresaDto>('/Empresa', dto);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

// ── TaxRule ───────────────────────────────────────────────────────────────────

/**
 * GET /API/TaxRule — retorna lista simples (sem paginação), todas as versões.
 */
export async function getAllTaxRules(): Promise<ApiResult<TaxRuleDto[]>> {
  try {
    const res = await apiInstance.get<TaxRuleDto[]>('/TaxRule');
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

/**
 * GET /API/TaxRule/{id}
 */
export async function getTaxRuleById(id: number): Promise<ApiResult<TaxRuleDto>> {
  try {
    const res = await apiInstance.get<TaxRuleDto>(`/TaxRule/${id}`);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

/**
 * POST /API/TaxRule — Cria uma nova versão de uma regra para um codEfd.
 * Se já existir uma versão em aberto (dataFimVigencia nula), o backend encerra
 * a versão anterior automaticamente, definindo sua dataFimVigencia.
 */
export async function createTaxRuleVersion(dto: Omit<TaxRuleDto, 'id'>): Promise<ApiResult<TaxRuleDto>> {
  try {
    const payload = {
      ...dto,
      dataInicioVigencia: formatDate(dto.dataInicioVigencia),
      dataFimVigencia: dto.dataFimVigencia ? formatDate(dto.dataFimVigencia) : null,
    };
    const res = await apiInstance.post<TaxRuleDto>('/TaxRule', payload);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

/**
 * PUT /API/TaxRule/{id} — Edita detalhes menores de uma versão específica.
 * Use para corrigir `description`, `codigoReceita` ou `items`, ou para encerrar vigência
 * fornecendo `dataFimVigencia`. Não cria nova versão.
 * codEfd não é editável — o backend ignora o campo se enviado.
 */
export async function updateTaxRule(
  id: number,
  dto: Omit<TaxRuleDto, 'id' | 'codEfd'>
): Promise<ApiResult<TaxRuleDto>> {
  try {
    const payload = {
      ...dto,
      codigoReceita: dto.codigoReceita,
      dataInicioVigencia: formatDate(dto.dataInicioVigencia),
      dataFimVigencia: dto.dataFimVigencia ? formatDate(dto.dataFimVigencia) : null,
    };
    const res = await apiInstance.put<TaxRuleDto>(`/TaxRule/${id}`, payload);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

