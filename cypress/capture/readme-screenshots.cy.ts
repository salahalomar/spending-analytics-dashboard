/// <reference types="cypress" />

/**
 * Not a test — a small utility that captures the images used in the README, so
 * they can be regenerated from the real app instead of being pasted in by hand.
 *
 *   npm run capture:screenshots
 */
describe('README screenshots', () => {
  it('captures the dashboard in both themes', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('spending-analytics:theme', 'dark');
      },
    });

    cy.get('[data-testid="rendered-count"]', { timeout: 30_000 }).should('contain', '50,000 rows');
    // Let the bar widths finish their transition before capturing.
    cy.wait(600);
    cy.screenshot('dashboard-dark', { capture: 'viewport', overwrite: true });

    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('html').should('have.attr', 'data-theme', 'light');
    cy.wait(400);
    cy.screenshot('dashboard-light', { capture: 'viewport', overwrite: true });
  });
});
