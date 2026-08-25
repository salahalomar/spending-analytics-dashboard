import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, type AppStore, type RootState } from '@/app/store';

export interface RenderWithStoreOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
}

export interface RenderWithStoreResult extends RenderResult {
  store: AppStore;
}

/**
 * Renders a component against a real store rather than a mocked one, so tests
 * exercise the actual reducers and selectors.
 */
export function renderWithStore(
  ui: ReactElement,
  { preloadedState, store = createStore(preloadedState), ...options }: RenderWithStoreOptions = {},
): RenderWithStoreResult {
  function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...options }) };
}
