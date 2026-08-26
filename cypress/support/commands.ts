/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /** Visits a page and waits for the dashboard to finish loading. */
      visitApp(path?: string): Chainable<void>;
      /** Shorthand for `cy.get('[data-testid=...]')`. */
      byTestId(testId: string): Chainable<JQuery<HTMLElement>>;
      /** Clears anything a previous spec saved in the browser. */
      clearLocalData(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('visitApp', (path = '/') => {
  cy.visit(path);
  // The dataset is built client-side, so wait for a real signal rather than an
  // arbitrary sleep.
  cy.get('[data-testid="dataset-summary"]', { timeout: 30_000 }).should('contain', 'transactions');
});

Cypress.Commands.add('byTestId', (testId: string) => cy.get(`[data-testid="${testId}"]`));

Cypress.Commands.add('clearLocalData', () => {
  cy.window().then((win) => {
    win.localStorage.clear();

    // deleteDatabase is asynchronous, and an open connection blocks it. Wait
    // for it to finish, or a record from the previous test is still there.
    return new Cypress.Promise<void>((resolve) => {
      const request = win.indexedDB.deleteDatabase('personal-finance-dashboard');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
});

export {};
