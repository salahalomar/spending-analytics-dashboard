import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore, type AppStore, type RootState } from '@/app/store';

export interface RenderWithStoreOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
  /** Initial URL, for components that read or change the route. */
  route?: string;
}

export interface RenderWithStoreResult extends RenderResult {
  store: AppStore;
}

/**
 * Renders a component against a real store and a real router rather than
 * mocks, so tests exercise the actual reducers, selectors and links.
 */
export function renderWithStore(
  ui: ReactElement,
  {
    preloadedState,
    store = createStore(preloadedState),
    route = '/',
    ...options
  }: RenderWithStoreOptions = {},
): RenderWithStoreResult {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...options }) };
}
