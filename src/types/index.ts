// ── Shared ────────────────────────────────────────────────────────────────────

export type OptanteStatus = 'OPTANTE' | 'NAO_OPTANTE';
export type TaxStatus = 'CALCULATED' | 'PENDING' | 'EXEMPT';

// ── Empenho ───────────────────────────────────────────────────────────────────

export interface EmpenhoDto {
  id?: number;
  numero: number;
  ano: number;
  fontDeOrigin: number;
  internalPlan: string;
  nature: number;
}

// ── Empresa ───────────────────────────────────────────────────────────────────

export interface EmpresaDto {
  id?: number;
  nome: string;
  cnpj: string;
}

// ── Financial Planning ────────────────────────────────────────────────────────

export interface FinancialPlanningDto {
  id?: number;
  numero: number;
  data: string;
  vinculation: number;
  origin: number;
}

// ── Tax ───────────────────────────────────────────────────────────────────────

/**
 * Item calculado de imposto — retornado pelo backend após POST/PUT/GET.
 * A lista é dinâmica: pode conter qualquer tipo (IR, CSLL, COFINS, etc.)
 * dependendo da TaxRule associada ao codEfd.
 */
export interface TaxCalculatedItem {
  taxType: string;   // "IR", "CSLL", "COFINS", "PIS_PASEP", "DARF", etc.
  rate: number;      // alíquota decimal (ex: 0.012 = 1,2%)
  amount: number;    // valor calculado (ex: 120.00)
}

/**
 * TaxDto — estrutura da tributação de uma PaymentNote.
 *
 * No POST/PUT apenas `tipo` e `codEfd` são enviados.
 * `taxStatus` e `calculatedItems` são retornados pelo backend.
 */
export interface TaxDto {
  id?: number;
  tipo: OptanteStatus;
  codEfd: number;
  taxStatus?: TaxStatus;
  calculatedItems?: TaxCalculatedItem[];
}

// ── Payment Note ──────────────────────────────────────────────────────────────

export interface PaymentNoteDto {
  id?: number;
  numeroNp: number;
  dataLiquidacao: string;
  empresa: EmpresaDto;
  docOrigin: string;
  value: number;
  status: 'CANCELADA' | 'PAGA' | 'A_PAGAR';
  tax: TaxDto | null;
}

// ── PaymentNote + Empenho (vínculo principal) ─────────────────────────────────

export interface PaymentNoteEmpenhoDto {
  id?: number;
  paymentNoteBasicDto: PaymentNoteDto;
  empenhoDto: EmpenhoDto;
  financialPlanningBasicDto: FinancialPlanningDto | null;
  value: number;
}

// ── Tax Rule ──────────────────────────────────────────────────────────────────

/**
 * Item de uma regra de imposto — define tipo e alíquota.
 * A lista é dinâmica: cada TaxRule pode ter um conjunto diferente de tipos.
 */
export interface TaxRuleItemDto {
  taxType: string;   // "IR", "CSLL", "COFINS", "PIS_PASEP", "DARF", ou qualquer outro
  rate: number;      // alíquota decimal (ex: 0.015 = 1,5%)
}

/**
 * TaxRule — regra de tributação cadastrada no sistema, versionada por datas de vigência.
 * Associada a PaymentNote via codEfd.
 *
 * - POST /API/TaxRule → cria nova versão; encerra automaticamente a versão anterior em aberto.
 * - PUT /API/TaxRule/{id} → edita detalhes menores (description, items) sem criar nova versão.
 * - DELETE removido — regras são encerradas via dataFimVigencia, não deletadas.
 */
export interface TaxRuleDto {
  id?: number;
  codEfd: number;
  /** Código de agrupamento de receita — obrigatório. Agrupa diferentes codEfd sob uma mesma receita. */
  codigoReceita: number;
  /** Descrição da regra — suporta até 300 caracteres. */
  description: string;
  /** Data de início de vigência — obrigatório, formato dd/MM/yyyy */
  dataInicioVigencia: string;
  /** Data de fim de vigência — null significa "em vigor" */
  dataFimVigencia: string | null;
  items: TaxRuleItemDto[];
}