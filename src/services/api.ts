import axios, { AxiosError } from 'axios';
import type {
  PaymentNoteEmpenhoDto,
  PaymentNoteDto,
  EmpenhoDto,
  FinancialPlanningDto,
  EmpresaDto,
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

// ── PaymentNoteEmpenho ────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  first: boolean;
  last: boolean;
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
}

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

export async function updatePaymentEmpenho(dto: PaymentNoteEmpenhoDto): Promise<ApiResult<PaymentNoteEmpenhoDto>> {
  try {
    const payload = {
      id: dto.id,
      empenhoDto: dto.empenhoDto,
      paymentNoteBasicDto: {
        ...dto.paymentNoteBasicDto,
        dataLiquidacao: formatDate(dto.paymentNoteBasicDto.dataLiquidacao),
      },
      financialPlanningBasicDto: dto.financialPlanningBasicDto
        ? {
          ...dto.financialPlanningBasicDto,
          data: formatDate(dto.financialPlanningBasicDto.data),
        }
        : null,
      value: dto.value,
    };
    const res = await apiInstance.put<PaymentNoteEmpenhoDto>('/PaymentEmpenho', payload);
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

export async function getAllNp(): Promise<ApiResult<PaymentNoteDto[]>> {
  try {
    const res = await apiInstance.get<PaymentNoteDto[]>('/Np');
    return { data: res.data || [], status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function savePaymentNote(dto: PaymentNoteDto): Promise<ApiResult<PaymentNoteDto>> {
  try {
    const res = await apiInstance.post<PaymentNoteDto>('/Np', dto);
    return { data: res.data, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function updatePaymentNote(dto: PaymentNoteDto): Promise<ApiResult<PaymentNoteDto>> {
  try {
    const payload = {
      ...dto,
      dataLiquidacao: formatDate(dto.dataLiquidacao),
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

export async function getAllEmpenho(): Promise<ApiResult<EmpenhoDto[]>> {
  try {
    const res = await apiInstance.get<EmpenhoDto[]>('/Empenho');
    return { data: res.data || [], status: res.status, errorMessage: null };
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

export async function findFinancialPlanningByNumber(numberId: number): Promise<ApiResult<FinancialPlanningDto>> {
  try {
    const res = await apiInstance.get<FinancialPlanningDto[] | FinancialPlanningDto>('/FinancialPlanning', { params: { numberId } });
    const data = Array.isArray(res.data) ? res.data[0] : res.data;
    return { data: data || null, status: res.status, errorMessage: null };
  } catch (e) { return handleError(e); }
}

export async function getAllFinancialPlanning(): Promise<ApiResult<FinancialPlanningDto[]>> {
  try {
    const res = await apiInstance.get<FinancialPlanningDto[]>('/FinancialPlanning');
    return { data: res.data || [], status: res.status, errorMessage: null };
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

export async function getAllEmpresa(): Promise<ApiResult<EmpresaDto[]>> {
  try {
    const res = await apiInstance.get<EmpresaDto[]>('/Empresa');
    return { data: res.data || [], status: res.status, errorMessage: null };
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
