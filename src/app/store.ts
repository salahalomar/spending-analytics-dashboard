import {
  combineReducers,
  configureStore,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';
import transactionsReducer from '@/features/transactions/transactionsSlice';
import filtersReducer from '@/features/filters/filtersSlice';
import uiReducer from '@/features/ui/uiSlice';
import ledgerReducer from '@/features/ledger/ledgerSlice';

export const rootReducer = combineReducers({
  transactions: transactionsReducer,
  ledger: ledgerReducer,
  filters: filtersReducer,
  ui: uiReducer,
});

/** Derived from the reducer, not from the store, so the types stay acyclic. */
export type RootState = ReturnType<typeof rootReducer>;

export function createStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // The 50,000-row array is large and already immutable by construction.
        // Deep-freezing and deep-scanning it on every dispatch costs hundreds
        // of milliseconds in development for no practical benefit.
        serializableCheck: false,
        immutableCheck: false,
      }),
  });
}

export const store = createStore();

export type AppStore = ReturnType<typeof createStore>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  UnknownAction
>;
