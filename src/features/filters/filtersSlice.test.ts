import { getDatasetDateRange } from '@/data/generateTransactions';
import { shiftDateInput } from '@/utils/date';
import reducer, {
  categoriesCleared,
  categoryToggled,
  dateFromChanged,
  datePresetApplied,
  dateToChanged,
  filtersReset,
  initialState,
  maxAmountChanged,
  counterpartyQueryChanged,
  directionChanged,
  minAmountChanged,
  sortChanged,
  statusToggled,
} from './filtersSlice';

// The sample data ends today, so the expected bounds are derived rather than
// written down — hardcoding them would break every day.
const RANGE = getDatasetDateRange();

describe('filtersSlice', () => {
  it('starts with the full dataset range and no narrowing', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.counterpartyQuery).toBe('');
    expect(state.categories).toEqual([]);
    expect(state.dateFrom).toBe(RANGE.start);
    expect(state.dateTo).toBe(RANGE.end);
    expect(state.sortField).toBe('date');
    expect(state.sortDirection).toBe('desc');
  });

  it('stores the search query verbatim', () => {
    expect(reducer(initialState, counterpartyQueryChanged('  Tesco ')).counterpartyQuery).toBe(
      '  Tesco ',
    );
  });

  describe('direction', () => {
    it('switches which side of the ledger is shown', () => {
      expect(reducer(initialState, directionChanged('income')).direction).toBe('income');
    });

    it('clears the categories, which belong to one side only', () => {
      const withCategory = reducer(initialState, categoryToggled('Groceries'));
      const switched = reducer(withCategory, directionChanged('income'));
      expect(switched.categories).toEqual([]);
    });
  });

  describe('categories', () => {
    it('adds a category that is not selected', () => {
      expect(reducer(initialState, categoryToggled('Groceries')).categories).toEqual(['Groceries']);
    });

    it('removes a category that is already selected', () => {
      const selected = reducer(initialState, categoryToggled('Groceries'));
      expect(reducer(selected, categoryToggled('Groceries')).categories).toEqual([]);
    });

    it('keeps unrelated categories when toggling one off', () => {
      let state = reducer(initialState, categoryToggled('Groceries'));
      state = reducer(state, categoryToggled('Travel'));
      state = reducer(state, categoryToggled('Insurance'));
      state = reducer(state, categoryToggled('Travel'));
      expect(state.categories).toEqual(['Groceries', 'Insurance']);
    });

    it('clears every selection', () => {
      let state = reducer(initialState, categoryToggled('Groceries'));
      state = reducer(state, categoryToggled('Travel'));
      expect(reducer(state, categoriesCleared()).categories).toEqual([]);
    });
  });

  it('toggles statuses independently of categories', () => {
    let state = reducer(initialState, statusToggled('pending'));
    expect(state.statuses).toEqual(['pending']);
    state = reducer(state, statusToggled('pending'));
    expect(state.statuses).toEqual([]);
  });

  describe('date range', () => {
    it('pushes the end date forward when the start moves past it', () => {
      const state = reducer(
        { ...initialState, dateTo: '2025-01-31' },
        dateFromChanged('2025-06-01'),
      );
      expect(state.dateFrom).toBe('2025-06-01');
      expect(state.dateTo).toBe('2025-06-01');
    });

    it('pulls the start date back when the end moves before it', () => {
      const state = reducer(
        { ...initialState, dateFrom: '2025-06-01' },
        dateToChanged('2025-01-31'),
      );
      expect(state.dateFrom).toBe('2025-01-31');
      expect(state.dateTo).toBe('2025-01-31');
    });

    it('leaves a coherent range alone', () => {
      const state = reducer(initialState, dateFromChanged('2025-03-01'));
      expect(state).toMatchObject({ dateFrom: '2025-03-01', dateTo: RANGE.end });
    });

    it('applies relative presets from the end of the dataset', () => {
      expect(reducer(initialState, datePresetApplied('30d'))).toMatchObject({
        dateFrom: shiftDateInput(RANGE.end, -30),
        dateTo: RANGE.end,
      });
      expect(reducer(initialState, datePresetApplied('12m'))).toMatchObject({
        dateFrom: shiftDateInput(RANGE.end, -365),
        dateTo: RANGE.end,
      });
    });

    it('restores the whole dataset for the all-time preset', () => {
      const narrowed = reducer(initialState, datePresetApplied('30d'));
      expect(reducer(narrowed, datePresetApplied('all'))).toMatchObject({
        dateFrom: RANGE.start,
        dateTo: RANGE.end,
      });
    });
  });

  it('keeps amount bounds as raw strings so the inputs stay controlled', () => {
    let state = reducer(initialState, minAmountChanged('10'));
    state = reducer(state, maxAmountChanged(''));
    expect(state.minAmount).toBe('10');
    expect(state.maxAmount).toBe('');
  });

  describe('sorting', () => {
    it('flips direction when the active field is chosen again', () => {
      const state = reducer(initialState, sortChanged('date'));
      expect(state).toMatchObject({ sortField: 'date', sortDirection: 'asc' });
    });

    it('defaults amount and date to descending', () => {
      expect(reducer(initialState, sortChanged('amount'))).toMatchObject({
        sortField: 'amount',
        sortDirection: 'desc',
      });
    });

    it('defaults name to ascending, since A–Z is the useful order', () => {
      expect(reducer(initialState, sortChanged('counterparty'))).toMatchObject({
        sortField: 'counterparty',
        sortDirection: 'asc',
      });
    });
  });

  it('returns to the initial state on reset', () => {
    let state = reducer(initialState, counterpartyQueryChanged('tesco'));
    state = reducer(state, categoryToggled('Insurance'));
    state = reducer(state, minAmountChanged('25'));
    state = reducer(state, datePresetApplied('30d'));

    expect(reducer(state, filtersReset())).toEqual(initialState);
  });
});
