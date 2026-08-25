import reducer, {
  categoriesCleared,
  categoriesSet,
  categoryToggled,
  dateFromChanged,
  datePresetApplied,
  dateToChanged,
  filtersReset,
  initialState,
  maxAmountChanged,
  merchantQueryChanged,
  minAmountChanged,
  sortChanged,
  sortDirectionChanged,
  statusToggled,
} from './filtersSlice';

describe('filtersSlice', () => {
  it('starts with the full dataset range and no narrowing', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.merchantQuery).toBe('');
    expect(state.categories).toEqual([]);
    expect(state.dateFrom).toBe('2024-01-01');
    expect(state.dateTo).toBe('2025-12-31');
    expect(state.sortField).toBe('date');
    expect(state.sortDirection).toBe('desc');
  });

  it('stores the merchant query verbatim', () => {
    expect(reducer(initialState, merchantQueryChanged('  Tesco ')).merchantQuery).toBe('  Tesco ');
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
      let state = reducer(initialState, categoriesSet(['Groceries', 'Travel', 'Health']));
      state = reducer(state, categoryToggled('Travel'));
      expect(state.categories).toEqual(['Groceries', 'Health']);
    });

    it('clears every selection', () => {
      const state = reducer(initialState, categoriesSet(['Groceries', 'Travel']));
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
      const state = reducer({ ...initialState, dateTo: '2025-01-31' }, dateFromChanged('2025-06-01'));
      expect(state.dateFrom).toBe('2025-06-01');
      expect(state.dateTo).toBe('2025-06-01');
    });

    it('pulls the start date back when the end moves before it', () => {
      const state = reducer({ ...initialState, dateFrom: '2025-06-01' }, dateToChanged('2025-01-31'));
      expect(state.dateFrom).toBe('2025-01-31');
      expect(state.dateTo).toBe('2025-01-31');
    });

    it('leaves a coherent range alone', () => {
      const state = reducer(initialState, dateFromChanged('2025-03-01'));
      expect(state).toMatchObject({ dateFrom: '2025-03-01', dateTo: '2025-12-31' });
    });

    it('applies relative presets from the end of the dataset', () => {
      expect(reducer(initialState, datePresetApplied('30d'))).toMatchObject({
        dateFrom: '2025-12-01',
        dateTo: '2025-12-31',
      });
      expect(reducer(initialState, datePresetApplied('12m'))).toMatchObject({
        dateFrom: '2024-12-31',
        dateTo: '2025-12-31',
      });
    });

    it('restores the whole dataset for the all-time preset', () => {
      const narrowed = reducer(initialState, datePresetApplied('30d'));
      expect(reducer(narrowed, datePresetApplied('all'))).toMatchObject({
        dateFrom: '2024-01-01',
        dateTo: '2025-12-31',
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

    it('defaults merchant to ascending, since A–Z is the useful order', () => {
      expect(reducer(initialState, sortChanged('merchant'))).toMatchObject({
        sortField: 'merchant',
        sortDirection: 'asc',
      });
    });

    it('can be set directly', () => {
      expect(reducer(initialState, sortDirectionChanged('asc')).sortDirection).toBe('asc');
    });
  });

  it('returns to the initial state on reset', () => {
    let state = reducer(initialState, merchantQueryChanged('tesco'));
    state = reducer(state, categoryToggled('Travel'));
    state = reducer(state, minAmountChanged('25'));
    state = reducer(state, datePresetApplied('30d'));

    expect(reducer(state, filtersReset())).toEqual(initialState);
  });
});
