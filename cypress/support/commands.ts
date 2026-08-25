/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Visits the dashboard and waits for the full dataset to be generated. */
      visitDashboard(): Chainable<void>;
      /** Shorthand for `cy.get('[data-testid=...]')`. */
      byTestId(testId: string): Chainable<JQuery<HTMLElement>>;
      /** The number of transaction rows actually mounted in the DOM. */
      renderedRowCount(): Chainable<number>;
    }
  }
}

Cypress.Commands.add('visitDashboard', () => {
  cy.visit('/');
  // The dataset is built client-side, so wait for the real count rather than
  // an arbitrary sleep.
  cy.get('[data-testid="rendered-count"]', { timeout: 30_000 }).should('contain', '50,000 rows');
  cy.get('[data-testid="transaction-row"]').should('have.length.greaterThan', 0);
});

Cypress.Commands.add('byTestId', (testId: string) => cy.get(`[data-testid="${testId}"]`));

Cypress.Commands.add('renderedRowCount', () =>
  cy.get('[data-testid="transaction-row"]').its('length'),
);

export {};
