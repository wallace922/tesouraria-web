import type { PaymentNoteItemDto, OptanteStatus, TaxCalculatedItem } from '../types';
import TaxAdjustmentPanel from './TaxAdjustmentPanel';
import Input from './Input';
import Select from './Select';

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface ItemEditState {
  id?: number;
  description: string;
  value: string;
  taxTipo: OptanteStatus;
  codEfd: string;
  manualItems: TaxCalculatedItem[];
  isManualAdjustment: boolean;
}

export const DEFAULT_ITEM: ItemEditState = {
  description: '',
  value: '',
  taxTipo: 'OPTANTE',
  codEfd: '',
  manualItems: [],
  isManualAdjustment: false,
};

export function itemToEditState(item: PaymentNoteItemDto): ItemEditState {
  return {
    id: item.id,
    description: item.description ?? '',
    value: String(item.value),
    taxTipo: item.tax?.tipo ?? 'OPTANTE',
    codEfd: item.tax?.codEfd ? String(item.tax.codEfd) : '',
    manualItems: item.tax?.calculatedItems?.map(i => ({ ...i })) ?? [],
    isManualAdjustment: false,
  };
}

export function editStateToItem(s: ItemEditState): PaymentNoteItemDto {
  return {
    ...(s.id !== undefined ? { id: s.id } : {}),
    description: s.description,
    value: parseFloat(s.value) || 0,
    tax: {
      tipo: s.taxTipo,
      codEfd: s.taxTipo === 'NAO_OPTANTE' && s.codEfd ? parseInt(s.codEfd, 10) : null,
      ...(s.isManualAdjustment && s.manualItems.length > 0
        ? { manualAdjustment: true, calculatedItems: s.manualItems }
        : {}),
    },
  };
}

// ── Componente NpItemEditor ───────────────────────────────────────────────────

interface NpItemEditorProps {
  idx: number;
  item: ItemEditState;
  total: number;
  onChange: (idx: number, next: ItemEditState) => void;
  onRemove: (idx: number) => void;
}

export function NpItemEditor({ idx, item, total, onChange, onRemove }: NpItemEditorProps) {
  function set(patch: Partial<ItemEditState>) {
    onChange(idx, { ...item, ...patch });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-stone-500 font-bold">
          <span className="text-amber-500 mr-1">▶</span>Item {idx + 1}
        </span>
        {total > 1 && (
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="text-[10px] text-red-400 hover:text-red-300 border border-red-700/40 px-2 py-0.5 rounded transition-colors"
          >
            ✕ Remover
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Input
            label="Descrição (opcional)"
            placeholder="Ex: Serviço de manutenção"
            value={item.description}
            onChange={e => set({ description: e.target.value })}
          />
        </div>
        <Input
          label="Valor (R$)"
          type="number"
          step="0.01"
          placeholder="Ex: 1500.00"
          value={item.value}
          onChange={e => set({ value: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        <div className="w-48">
          <Select
            label="Tipo de Tributação"
            value={item.taxTipo}
            onChange={e => set({
              taxTipo: e.target.value as OptanteStatus,
              codEfd: '',
              manualItems: [],
              isManualAdjustment: false,
            })}
            options={[
              { value: 'OPTANTE', label: 'OPTANTE' },
              { value: 'NAO_OPTANTE', label: 'NÃO OPTANTE' },
            ]}
          />
        </div>
        {item.taxTipo === 'NAO_OPTANTE' && (
          <div className="animate-fadeIn space-y-2">
            <Input
              label="Cód. EFD"
              type="number"
              placeholder="Ex: 17001"
              value={item.codEfd}
              onChange={e => set({ codEfd: e.target.value })}
              className="w-48"
            />
            <p className="text-stone-500 text-xs">
              O backend calculará os impostos automaticamente ao salvar.
            </p>
            {item.manualItems.length > 0 && (
              <div className="animate-fadeIn">
                <TaxAdjustmentPanel
                  items={item.manualItems}
                  onChange={(items, manual) => set({ manualItems: items, isManualAdjustment: manual })}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
