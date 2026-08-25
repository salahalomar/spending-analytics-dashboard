import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getDatasetDateRange } from '@/data/generateTransactions';
import { shiftDateInput } from '@/utils/date';
import type { Category, SortDirection, SortField, TransactionStatus } from '@/types/transaction';

const datasetRange = getDatasetDateRange();

/** Quick-select ranges offered above the date inputs. */
export const DATE_PRESETS = [
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: '12m', label: 'Last 12 months', days: 365 },
  { id: 'all', label: 'All time', days: null },
] as const;

export type DatePresetId = (typeof DATE_PRESETS)[number]['id'];

export interface FiltersState {
  /** Raw text from the merchant search box; matching is case-insensitive. */
  merchantQuery: string;
  /** Empty means "every category" rather than "no categories". */
  categories: Category[];
  statuses: TransactionStatus[];
  dateFrom: string;
  dateTo: string;
  /** Inclusive bounds in major units (pounds); empty string means unbounded. */
  minAmount: string;
  maxAmount: string;
  sortField: SortField;
  sortDirection: SortDirection;
}

export const initialState: FiltersState = {
  merchantQuery: '',
  categories: [],
  statuses: [],
  dateFrom: datasetRange.start,
  dateTo: datasetRange.end,
  minAmount: '',
  maxAmount: '',
  sortField: 'date',
  sortDirection: 'desc',
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    merchantQueryChanged(state, action: PayloadAction<string>) {
      state.merchantQuery = action.payload;
    },
    /** Adds the category if absent, removes it if already selected. */
    categoryToggled(state, action: PayloadAction<Category>) {
      const category = action.payload;
      const index = state.categories.indexOf(category);
      if (index === -1) {
        state.categories.push(category);
      } else {
        state.categories.splice(index, 1);
      }
    },
    categoriesCleared(state) {
      state.categories = [];
    },
    statusToggled(state, action: PayloadAction<TransactionStatus>) {
      const status = action.payload;
      const index = state.statuses.indexOf(status);
      if (index === -1) {
        state.statuses.push(status);
      } else {
        state.statuses.splice(index, 1);
      }
    },
    dateFromChanged(state, action: PayloadAction<string>) {
      state.dateFrom = action.payload;
      // Keep the range coherent if the user drags "from" past "to".
      if (state.dateTo && action.payload > state.dateTo) {
        state.dateTo = action.payload;
      }
    },
    dateToChanged(state, action: PayloadAction<string>) {
      state.dateTo = action.payload;
      if (state.dateFrom && action.payload < state.dateFrom) {
        state.dateFrom = action.payload;
      }
    },
    datePresetApplied(state, action: PayloadAction<DatePresetId>) {
      const preset = DATE_PRESETS.find((candidate) => candidate.id === action.payload);
      if (!preset) return;

      if (preset.days === null) {
        state.dateFrom = datasetRange.start;
        state.dateTo = datasetRange.end;
        return;
      }

      state.dateTo = datasetRange.end;
      state.dateFrom = shiftDateInput(datasetRange.end, -preset.days);
    },
    minAmountChanged(state, action: PayloadAction<string>) {
      state.minAmount = action.payload;
    },
    maxAmountChanged(state, action: PayloadAction<string>) {
      state.maxAmount = action.payload;
    },
    /** Re-selecting the active field flips the direction instead of resetting it. */
    sortChanged(state, action: PayloadAction<SortField>) {
      if (state.sortField === action.payload) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortField = action.payload;
        state.sortDirection = action.payload === 'merchant' ? 'asc' : 'desc';
      }
    },
    filtersReset() {
      return initialState;
    },
  },
});

export const {
  merchantQueryChanged,
  categoryToggled,
  categoriesCleared,
  statusToggled,
  dateFromChanged,
  dateToChanged,
  datePresetApplied,
  minAmountChanged,
  maxAmountChanged,
  sortChanged,
  filtersReset,
} = filtersSlice.actions;

export default filtersSlice.reducer;
