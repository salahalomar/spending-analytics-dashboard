import reducer, {
  filtersPanelToggled,
  initialState,
  themeSet,
  themeToggled,
  transactionDeselected,
  transactionSelected,
} from './uiSlice';

describe('uiSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('toggles between the two themes', () => {
    const dark = { ...initialState, theme: 'dark' as const };
    const light = reducer(dark, themeToggled());
    expect(light.theme).toBe('light');
    expect(reducer(light, themeToggled()).theme).toBe('dark');
  });

  it('persists the chosen theme', () => {
    reducer(initialState, themeSet('light'));
    expect(localStorage.getItem('spending-analytics:theme')).toBe('light');
  });

  it('selects a transaction', () => {
    expect(reducer(initialState, transactionSelected('txn_1')).selectedTransactionId).toBe('txn_1');
  });

  it('clears the selection when the same row is chosen again', () => {
    const selected = reducer(initialState, transactionSelected('txn_1'));
    expect(reducer(selected, transactionSelected('txn_1')).selectedTransactionId).toBeNull();
  });

  it('switches directly between rows', () => {
    const selected = reducer(initialState, transactionSelected('txn_1'));
    expect(reducer(selected, transactionSelected('txn_2')).selectedTransactionId).toBe('txn_2');
  });

  it('deselects explicitly', () => {
    const selected = reducer(initialState, transactionSelected('txn_1'));
    expect(reducer(selected, transactionDeselected()).selectedTransactionId).toBeNull();
  });

  it('toggles the filters panel', () => {
    const closed = reducer(initialState, filtersPanelToggled());
    expect(closed.filtersPanelOpen).toBe(!initialState.filtersPanelOpen);
  });
});
