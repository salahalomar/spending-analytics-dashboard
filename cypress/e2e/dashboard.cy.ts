/// <reference types="cypress" />

/**
 * The journey through the dashboard, against the production build: read the
 * overall position, drill into transactions, record something by hand, and
 * work both sides of the ledger.
 */
describe('Personal finance dashboard', () => {
  beforeEach(() => {
    cy.visitApp();
    cy.clearLocalData();
    cy.visitApp();
  });

  it('opens on the overview with the whole position', () => {
    cy.byTestId('overview-income').invoke('text').should('match', /^£[\d,]+\.\d{2}$/);
    cy.byTestId('overview-expense').invoke('text').should('match', /^£[\d,]+\.\d{2}$/);
    cy.byTestId('overview-net').invoke('text').should('match', /^[+-]?£[\d,]+\.\d{2}$/);
    cy.byTestId('overview-owed-to-you').should('be.visible');
    cy.byTestId('overview-you-owe').should('be.visible');

    cy.byTestId('top-debtors').should('be.visible');
    cy.byTestId('top-creditors').should('be.visible');
  });

  it('moves between the four sections and keeps the URL in step', () => {
    cy.byTestId('nav-transactions').click();
    cy.location('pathname').should('eq', '/transactions');
    cy.byTestId('transactions-page').should('be.visible');

    cy.byTestId('nav-owed-to-me').click();
    cy.location('pathname').should('eq', '/owed-to-me');
    cy.byTestId('ledger-page-receivable').should('be.visible');

    cy.byTestId('nav-i-owe').click();
    cy.location('pathname').should('eq', '/i-owe');
    cy.byTestId('ledger-page-payable').should('be.visible');

    cy.byTestId('nav-overview').click();
    cy.location('pathname').should('eq', '/');
  });

  it('keeps only a window of rows in the DOM, however far you scroll', () => {
    cy.byTestId('nav-transactions').click();

    cy.byTestId('transaction-row').should('have.length.lessThan', 40);
    cy.byTestId('transaction-row').first().invoke('attr', 'data-transaction-id').as('firstId');

    cy.byTestId('transaction-viewport').scrollTo(0, 20_000);
    cy.get('@firstId').then((firstId) => {
      cy.byTestId('transaction-row')
        .first()
        .invoke('attr', 'data-transaction-id')
        .should('not.equal', firstId);
    });
    cy.byTestId('transaction-row').should('have.length.lessThan', 40);

    cy.byTestId('transaction-viewport').scrollTo('bottom');
    cy.byTestId('transaction-row').should('have.length.lessThan', 40);
  });

  it('holds up when the stress dataset is loaded', () => {
    cy.byTestId('stress-toggle').click();
    cy.byTestId('dataset-summary', { timeout: 30_000 }).should('contain', '50,000');

    cy.byTestId('nav-transactions').click();
    cy.byTestId('rendered-count').should('contain', '50,000 rows');
    cy.byTestId('transaction-row').should('have.length.lessThan', 40);
  });

  it('records a transaction you type in, and remembers it after a reload', () => {
    cy.byTestId('nav-transactions').click();

    cy.byTestId('quick-add-counterparty').type('Corner Shop');
    cy.byTestId('quick-add-amount').type('14.20');
    cy.byTestId('quick-add-category').select('Groceries');
    cy.byTestId('quick-add-submit').click();

    // The form clears itself, ready for the next entry.
    cy.byTestId('quick-add-counterparty').should('have.value', '');
    cy.byTestId('quick-add-amount').should('have.value', '');

    cy.byTestId('counterparty-search').type('Corner Shop');
    cy.byTestId('transaction-row').should('have.length', 1).and('contain', '£14.20');

    cy.reload();
    cy.byTestId('dataset-summary', { timeout: 30_000 }).should('contain', 'transactions');
    cy.byTestId('counterparty-search').type('Corner Shop');
    cy.byTestId('transaction-row').should('have.length', 1).and('contain', 'Corner Shop');
  });

  it('narrows everything from one filter', () => {
    cy.byTestId('nav-transactions').click();
    cy.byTestId('category-chip-Groceries').click().should('have.attr', 'aria-pressed', 'true');

    cy.byTestId('transaction-row')
      .should('have.length.greaterThan', 0)
      .and(($rows) => {
        const wrong = [...$rows].filter((row) => !row.textContent?.includes('Groceries'));
        expect(wrong, 'rows outside the chosen category').to.have.length(0);
      });

    cy.byTestId('reset-filters').click();
    cy.byTestId('category-chip-Groceries').should('have.attr', 'aria-pressed', 'false');
  });

  it('switches the dashboard between money in and money out', () => {
    cy.byTestId('nav-transactions').click();

    cy.byTestId('direction-income').click();
    cy.byTestId('transaction-row')
      .should('have.length.greaterThan', 0)
      .and(($rows) => {
        const wrong = [...$rows].filter((row) => row.dataset.direction !== 'income');
        expect(wrong, 'outgoing rows while filtered to income').to.have.length(0);
      });

    cy.byTestId('direction-expense').click();
    cy.byTestId('transaction-row').and(($rows) => {
      const wrong = [...$rows].filter((row) => row.dataset.direction !== 'expense');
      expect(wrong, 'incoming rows while filtered to spending').to.have.length(0);
    });
  });

  it('records and settles something you are owed', () => {
    const poundsFrom = (text: string) => Number(text.replace(/[^0-9.]/g, ''));

    cy.byTestId('nav-owed-to-me').click();
    cy.byTestId('ledger-outstanding')
      .invoke('text')
      .then((text) => poundsFrom(text))
      .as('outstandingBefore');

    cy.byTestId('toggle-ledger-form').click();
    cy.byTestId('ledger-counterparty').type('Alex Reid');
    cy.byTestId('ledger-amount').type('60');
    cy.byTestId('ledger-reference').type('Concert ticket');
    cy.byTestId('ledger-submit').click();

    cy.byTestId('ledger-table').should('contain', 'Alex Reid').and('contain', '£60.00');

    // The new debt lifts the outstanding balance by exactly its amount.
    cy.get<number>('@outstandingBefore').then((before) => {
      cy.byTestId('ledger-outstanding')
        .invoke('text')
        .then((text) => {
          expect(poundsFrom(text)).to.be.closeTo(before + 60, 0.01);
        });
    });

    // Settling it takes it back out again.
    cy.contains('[data-testid="ledger-row"]', 'Alex Reid').within(() => {
      cy.byTestId('settle-obligation').click();
    });
    cy.contains('[data-testid="ledger-row"]', 'Alex Reid').should('contain', 'Settled');

    cy.get<number>('@outstandingBefore').then((before) => {
      cy.byTestId('ledger-outstanding')
        .invoke('text')
        .then((text) => {
          expect(poundsFrom(text)).to.be.closeTo(before, 0.01);
        });
    });
  });

  it('shows what you owe, with the overdue ones called out', () => {
    cy.byTestId('nav-i-owe').click();

    cy.byTestId('ledger-page-payable').should('be.visible');
    cy.byTestId('ledger-outstanding').invoke('text').should('match', /^£[\d,]+\.\d{2}$/);
    cy.byTestId('ledger-ageing').should('be.visible');
    cy.get('[data-testid="ledger-row"]').should('have.length.greaterThan', 0);
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
