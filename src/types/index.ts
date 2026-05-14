export interface EmpenhoDto {
  numero: number;
  ano: number;
  internalPlan: string;
  nature: number;
}

export interface EmpresaDto {
  nome: string;
  cnpj: string;
}

export interface FinancialPlanningDto {
  numberId: number;
  data: string;
  vinculation: number;
  origin: number;
}

export interface TaxDto {
  tipo?: 'OPTANTE' | 'NAO_OPTANTE';
  codEfd?: number;
  ir?: number;
  csll?: number;
  cofins?: number;
  pisPasep?: number;
  darf?: number;
}

export interface PaymentNoteDto {
  numeroNp: number;
  dataLiquidacao: string;
  empresa: EmpresaDto;
  docOrigin: string;
  ns: string;
  value: number;
  status: 'CANCELADA' | 'PAGA' | 'A_PAGAR';
  tax: TaxDto | null;
}

export interface PaymentNoteEmpenhoDto {
  id?: number;
  paymentNoteBasicDto: PaymentNoteDto;
  empenhoDto: EmpenhoDto;
  financialPlanningBasicDto: FinancialPlanningDto | null;
  value: number;
}