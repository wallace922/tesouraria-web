// ── Shared ────────────────────────────────────────────────────────────────────

export type OptanteStatus = 'OPTANTE' | 'NAO_OPTANTE';
export type TaxStatus = 'CALCULATED' | 'PENDING' | 'EXEMPT';

// ── Empenho ───────────────────────────────────────────────────────────────────

export interface EmpenhoDto {
  id?: number;
  numero: number;
  ano: number;
  /** Opcional no backend — pode ser null em registros antigos. */
  fontDeOrigin?: number;
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
 * No POST/PUT padrão, apenas `tipo` e `codEfd` são enviados e o backend
 * calcula os impostos automaticamente.
 *
 * Modo de ajuste manual: quando `manualAdjustment: true` é enviado, o
 * backend ignora o cálculo automático e persiste os valores de `calculatedItems`
 * exatamente como enviados pelo frontend.
 */
export interface TaxDto {
  id?: number;
  tipo: OptanteStatus;
  codEfd: number | null;
  /** Código de agrupamento de receita — presente nos retornos do backend. */
  codigoReceita?: number;
  /**
   * Descrição legível da TaxRule vigente no momento do cálculo.
   * Campo somente-leitura (read-only) — não deve ser enviado em POST/PUT.
   * Pode ser null para notas antigas ou com status PENDING/EXEMPT.
   */
  taxRuleDescription?: string | null;
  taxStatus?: TaxStatus;
  calculatedItems?: TaxCalculatedItem[];
  /**
   * Flag de ajuste manual de impostos.
   * Quando true, o backend salva os `calculatedItems` enviados sem recalcular.
   * Usado para corrigir divergências de arredondamento de 1 centavo.
   */
  manualAdjustment?: boolean;
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
  /**
   * Data de pagamento efetivo — somente preenchido quando status === 'PAGA'.
   * O backend zera automaticamente se o status mudar para outro valor.
   * Formato: dd/MM/yyyy (retorno da API) ou yyyy-MM-dd (input HTML).
   */
  datePayment?: string | null;
}

// ── PaymentNote + Empenho (vínculo principal) ─────────────────────────────────

export interface PaymentNoteEmpenhoDto {
  id?: number;
  paymentNoteBasicDto: PaymentNoteDto;
  empenhoDto: EmpenhoDto;
  financialPlanningBasicDto: FinancialPlanningDto | null;
  value: number;
}

// ── Novos DTOs de relatório ───────────────────────────────────────────────────

/**
 * PaymentNoteVinculacaoDto — retornado por GET /API/PaymentEmpenho/por-mes-ano
 * Contém todos os campos de PaymentNoteDto mais o campo `vinculation` do PF.
 */
export interface PaymentNoteVinculacaoDto {
  id: number;
  numeroNp: number;
  dataLiquidacao: string;
  empresa: EmpresaDto;
  docOrigin: string;
  value: number;
  status: 'CANCELADA' | 'PAGA' | 'A_PAGAR';
  vinculation: number;
  tax: TaxDto | null;
}

/**
 * PaymentNoteEmpenhoBasicDto — retornado por GET /API/PaymentEmpenho/sem-planejamento
 * e GET /API/PaymentEmpenho (lista geral).
 *
 * ATENÇÃO: os nomes das propriedades batem exatamente com o backend Java:
 *   paymentNoteBasicDto, empenhoDto, financialPlanningBasicDto
 */
export interface PaymentNoteEmpenhoBasicDto {
  id: number;
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