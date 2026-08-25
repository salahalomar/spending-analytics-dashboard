import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'dark' | 'light';

export interface UiState {
  theme: Theme;
  /** Id of the row whose details are shown in the docked panel, if any. */
  selectedTransactionId: string | null;
  filtersPanelOpen: boolean;
}

const THEME_STORAGE_KEY = 'spending-analytics:theme';

/**
 * Reads the persisted theme, falling back to the OS preference. Wrapped in a
 * try/catch because `localStorage` throws in private-mode Safari and in some
 * embedded webviews.
 */
export function readInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // Ignore and fall through to the media query.
  }

  if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }

  return 'dark';
}

export const initialState: UiState = {
  theme: readInitialTheme(),
  selectedTransactionId: null,
  filtersPanelOpen: true,
};

function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Persistence is best-effort.
  }
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    themeToggled(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      persistTheme(state.theme);
    },
    themeSet(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
      persistTheme(state.theme);
    },
    /** Clicking the already-selected row clears the selection again. */
    transactionSelected(state, action: PayloadAction<string>) {
      state.selectedTransactionId =
        state.selectedTransactionId === action.payload ? null : action.payload;
    },
    transactionDeselected(state) {
      state.selectedTransactionId = null;
    },
    filtersPanelToggled(state) {
      state.filtersPanelOpen = !state.filtersPanelOpen;
    },
  },
});

export const {
  themeToggled,
  themeSet,
  transactionSelected,
  transactionDeselected,
  filtersPanelToggled,
} = uiSlice.actions;

export default uiSlice.reducer;
