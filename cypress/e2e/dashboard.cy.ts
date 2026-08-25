/// <reference types="cypress" />

/**
 * The end-to-end journey a user takes through the dashboard: load the full
 * dataset, narrow it down from several directions, inspect a transaction and
 * clear back to the start. Everything here runs against the production build.
 */
/**
 * Asserts that every currently rendered row contains `text`.
 *
 * This has to be a single retryable assertion rather than `.each()` over the
 * result of `cy.get`: the merchant search is debounced, so `cy.get` would
 * happily resolve against the pre-filter rows and then assert on element
 * references React has already replaced.
 */
function everyRenderedRowShouldContain(text: string): void {
  cy.get('[data-testid="transaction-row"]')
    .should('have.length.greaterThan', 0)
    .and(($rows) => {
      const offenders = [...$rows].filter((row) => !row.textContent?.includes(text));
      expect(offenders, `rows not showing "${text}"`).to.have.length(0);
    });
}

describe('Spending analytics dashboard', () => {
  beforeEach(() => {
    cy.visitDashboard();
  });

  it('walks the full analysis flow', () => {
    // ---- 1. The dataset loads and the headline figures are populated ----
    cy.byTestId('dataset-summary').should('contain', '50,000 transactions');
    cy.byTestId('result-count').should('contain', '50,000 of 50,000');
    cy.byTestId('summary-total')
      .invoke('text')
      .should('match', /^£[\d,]+\.\d{2}$/);
    cy.byTestId('summary-count').should('have.text', '50,000');

    // ---- 2. Only a window of the 50,000 rows is ever in the DOM ----
    cy.renderedRowCount().should('be.lessThan', 40);

    // ---- 3. Scrolling moves the window without growing it ----
    cy.byTestId('transaction-row').first().invoke('attr', 'data-transaction-id').as('firstId');
    cy.byTestId('transaction-viewport').scrollTo(0, 20_000);

    cy.get('@firstId').then((firstId) => {
      cy.byTestId('transaction-row')
        .first()
        .invoke('attr', 'data-transaction-id')
        .should('not.equal', firstId);
    });
    cy.renderedRowCount().should('be.lessThan', 40);
    cy.byTestId('transaction-viewport').scrollTo(0, 0);

    // ---- 4. Filtering by category narrows the list and the charts ----
    cy.byTestId('category-chip-Groceries').click().should('have.attr', 'aria-pressed', 'true');

    cy.byTestId('result-count')
      .invoke('text')
      .should('match', /^[\d,]+ of 50,000 transactions match$/);
    everyRenderedRowShouldContain('Groceries');
    cy.byTestId('category-bar-chart').find('li').should('have.length', 1);

    // ---- 5. Searching by merchant narrows it further ----
    cy.byTestId('merchant-search').type('tesco');
    everyRenderedRowShouldContain('Tesco');
    cy.byTestId('summary-top-category').should('have.text', 'Groceries');

    // ---- 6. A date preset restricts the range ----
    cy.byTestId('date-preset-90d').click();
    cy.byTestId('date-from').should('have.value', '2025-10-02');
    cy.byTestId('date-to').should('have.value', '2025-12-31');

    // ---- 7. Sorting by amount reorders the list ----
    cy.byTestId('sort-amount').click().should('have.attr', 'aria-pressed', 'true');
    cy.byTestId('transaction-row').then(($rows) => {
      const amounts = [...$rows].map(($row) => {
        const text = $row.querySelector('[class*="amountCell"]')?.textContent ?? '0';
        return Number(text.replace(/[£,]/g, ''));
      });
      // Descending by default.
      expect(amounts).to.deep.equal([...amounts].sort((a, b) => b - a));
    });

    // ---- 8. Selecting a row opens its details ----
    cy.byTestId('transaction-detail').should('not.exist');
    cy.byTestId('transaction-row').first().click();
    cy.byTestId('transaction-detail').should('be.visible').and('contain', 'Tesco');
    cy.byTestId('close-detail').click();
    cy.byTestId('transaction-detail').should('not.exist');

    // ---- 9. Resetting restores the whole dataset ----
    cy.byTestId('reset-filters').click();
    cy.byTestId('merchant-search').should('have.value', '');
    cy.byTestId('category-chip-Groceries').should('have.attr', 'aria-pressed', 'false');
    cy.byTestId('result-count').should('contain', '50,000 of 50,000');
    cy.byTestId('summary-count').should('have.text', '50,000');
  });

  it('keeps the rendered row count flat while scrolling deep into the list', () => {
    cy.renderedRowCount().then((initialCount) => {
      expect(initialCount).to.be.lessThan(40);

      cy.byTestId('transaction-viewport').scrollTo('bottom');
      cy.byTestId('transaction-row').should('have.length.lessThan', 40);

      // The last row of a 50,000 item list should be reachable.
      cy.byTestId('transaction-row').last().should('be.visible');
      cy.get('[class*="footer"]').should('contain', 'of 50,000');
    });
  });

  it('reports no results rather than an empty screen', () => {
    cy.byTestId('merchant-search').type('a-merchant-that-does-not-exist');

    cy.byTestId('empty-state').should('be.visible');
    cy.byTestId('transaction-row').should('not.exist');
    cy.byTestId('summary-count').should('have.text', '0');

    cy.contains('button', 'Reset filters').click();
    cy.byTestId('result-count').should('contain', '50,000 of 50,000');
  });

  it('remembers the chosen theme across a reload', () => {
    cy.get('html')
      .invoke('attr', 'data-theme')
      .then((initial) => {
        const next = initial === 'dark' ? 'light' : 'dark';

        cy.byTestId('theme-toggle').click();
        cy.get('html').should('have.attr', 'data-theme', next);

        cy.reload();
        cy.get('html').should('have.attr', 'data-theme', next);
      });
  });
});
