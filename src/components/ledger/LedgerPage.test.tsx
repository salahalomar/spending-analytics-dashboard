import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/renderWithStore';
import { makeObligation } from '@/test/fixtures';
import { initialState as ledgerInitialState } from '@/features/ledger/ledgerSlice';
import type { Obligation } from '@/types/ledger';
import { LedgerPage } from './LedgerPage';

/**
 * Dates are relative to now so the statuses stay stable whenever this runs.
 */
const DAY = 86_400_000;
const dateOffsetByDays = (days: number) =>
  new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

const RECORDS: Obligation[] = [
  makeObligation({
    id: 'r-overdue',
    counterparty: 'Jamie Whitfield',
    amountMinor: 5000,
    dueOn: dateOffsetByDays(-20),
  }),
  makeObligation({
    id: 'r-soon',
    counterparty: 'Priya Raman',
    amountMinor: 8000,
    dueOn: dateOffsetByDays(5),
  }),
  makeObligation({
    id: 'r-part',
    counterparty: 'Tom Callaghan',
    amountMinor: 10_000,
    amountPaidMinor: 4000,
    dueOn: dateOffsetByDays(40),
  }),
  makeObligation({
    id: 'r-settled',
    counterparty: 'Ellie Dawson',
    amountMinor: 3000,
    amountPaidMinor: 3000,
    state: 'settled',
    dueOn: dateOffsetByDays(-60),
  }),
];

function renderPage(
  records: Obligation[] = RECORDS,
  direction: 'receivable' | 'payable' = 'receivable',
) {
  return renderWithStore(<LedgerPage direction={direction} />, {
    preloadedState: {
      ledger: { ...ledgerInitialState, sample: records, status: 'succeeded' },
    },
  });
}

const poundsIn = (text: string | null) => Number((text ?? '').replace(/[^0-9.]/g, ''));

describe('LedgerPage', () => {
  describe('summary', () => {
    it('totals only what is still owed', () => {
      renderPage();
      // 5000 + 8000 + (10000 - 4000); the settled record is excluded.
      expect(poundsIn(screen.getByTestId('ledger-outstanding').textContent)).toBeCloseTo(190, 2);
    });

    it('separates overdue from what is merely due soon', () => {
      renderPage();
      expect(poundsIn(screen.getByTestId('ledger-overdue').textContent)).toBeCloseTo(50, 2);
      expect(poundsIn(screen.getByTestId('ledger-due-soon').textContent)).toBeCloseTo(80, 2);
    });

    it('reports what has been settled separately from the live balance', () => {
      renderPage();
      expect(poundsIn(screen.getByTestId('ledger-settled').textContent)).toBeCloseTo(30, 2);
    });

    it('breaks the balance down by age', () => {
      renderPage();
      expect(screen.getByTestId('ledger-ageing')).toBeInTheDocument();
    });
  });

  describe('table', () => {
    it('lists every record, soonest due first, with the finished ones last', () => {
      renderPage();
      const rows = screen.getAllByTestId('ledger-row');
      expect(rows).toHaveLength(4);
      expect(rows[0]).toHaveTextContent('Jamie Whitfield');
      expect(rows[rows.length - 1]).toHaveTextContent('Ellie Dawson');
    });

    it('derives a status for each record', () => {
      renderPage();
      // Read from the row rather than the label: "Overdue" is also a summary
      // heading and "Outstanding" is also a column header.
      const statuses = screen
        .getAllByTestId('ledger-row')
        .map((row) => row.getAttribute('data-status'));

      expect(statuses).toEqual(['overdue', 'outstanding', 'part-paid', 'settled']);
    });

    it('shows the remainder on a part-paid debt, not the original amount', () => {
      renderPage();
      const row = screen.getByText('Tom Callaghan').closest('tr')!;
      expect(row).toHaveTextContent('£60.00');
      expect(row).toHaveTextContent('£40.00 paid');
    });

    it('says how late an overdue record is', () => {
      renderPage();
      expect(screen.getByText('Jamie Whitfield').closest('tr')).toHaveTextContent('20 days late');
    });

    it('settles a record when the action is used', async () => {
      const user = userEvent.setup();
      renderPage();

      const row = screen.getByText('Jamie Whitfield').closest('tr')!;
      await user.click(within(row).getByTestId('settle-obligation'));

      await waitFor(() =>
        expect(screen.getByText('Jamie Whitfield').closest('tr')).toHaveTextContent('Settled'),
      );
      // Settling it takes it out of the outstanding balance.
      expect(poundsIn(screen.getByTestId('ledger-outstanding').textContent)).toBeCloseTo(140, 2);
    });

    it('cannot settle something already settled', () => {
      renderPage();
      const row = screen.getByText('Ellie Dawson').closest('tr')!;
      expect(within(row).getByTestId('settle-obligation')).toBeDisabled();
    });

    it('only offers delete on records the user added', () => {
      renderPage([
        makeObligation({ id: 'mine', counterparty: 'Mine', userEntered: true }),
        makeObligation({ id: 'sample', counterparty: 'Sample', userEntered: false }),
      ]);

      expect(
        within(screen.getByText('Mine').closest('tr')!).queryByTestId('delete-obligation'),
      ).toBeInTheDocument();
      expect(
        within(screen.getByText('Sample').closest('tr')!).queryByTestId('delete-obligation'),
      ).not.toBeInTheDocument();
    });
  });

  describe('wording', () => {
    it('asks who owes you on the receivable side', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: /money owed to you/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /who owes you/i })).toBeInTheDocument();
    });

    it('asks who you owe on the payable side', () => {
      renderPage(
        [
          makeObligation({
            direction: 'payable',
            counterparty: 'Barclaycard',
            kind: 'credit-card',
          }),
        ],
        'payable',
      );
      expect(screen.getByRole('heading', { name: /money you owe/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /who you owe/i })).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('explains what the section is for and offers a way in', async () => {
      const user = userEvent.setup();
      renderPage([]);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /record money owed to you/i }));
      expect(screen.getByTestId('ledger-form')).toBeInTheDocument();
    });
  });

  describe('adding a record', () => {
    it('opens and closes the form', async () => {
      const user = userEvent.setup();
      renderPage();

      expect(screen.queryByTestId('ledger-form')).not.toBeInTheDocument();
      await user.click(screen.getByTestId('toggle-ledger-form'));
      expect(screen.getByTestId('ledger-form')).toBeInTheDocument();

      await user.click(screen.getByTestId('toggle-ledger-form'));
      expect(screen.queryByTestId('ledger-form')).not.toBeInTheDocument();
    });

    it('will not submit without a name and an amount', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByTestId('toggle-ledger-form'));

      expect(screen.getByTestId('ledger-submit')).toBeDisabled();

      await user.type(screen.getByTestId('ledger-counterparty'), 'Alex');
      expect(screen.getByTestId('ledger-submit')).toBeDisabled();

      await user.type(screen.getByTestId('ledger-amount'), '60');
      expect(screen.getByTestId('ledger-submit')).toBeEnabled();
    });

    it('saves the record and closes the form', async () => {
      const user = userEvent.setup();
      const { store } = renderPage();

      await user.click(screen.getByTestId('toggle-ledger-form'));
      await user.type(screen.getByTestId('ledger-counterparty'), 'Alex Reid');
      await user.type(screen.getByTestId('ledger-amount'), '60');
      await user.type(screen.getByTestId('ledger-reference'), 'Concert ticket');
      await user.click(screen.getByTestId('ledger-submit'));

      await waitFor(() => expect(store.getState().ledger.userEntered).toHaveLength(1));
      expect(store.getState().ledger.userEntered[0]).toMatchObject({
        counterparty: 'Alex Reid',
        amountMinor: 6000,
        reference: 'Concert ticket',
        direction: 'receivable',
      });

      await waitFor(() => expect(screen.queryByTestId('ledger-form')).not.toBeInTheDocument());
      expect(screen.getByTestId('ledger-table')).toHaveTextContent('Alex Reid');
    });

    it('records the debt against the right side of the ledger', async () => {
      const user = userEvent.setup();
      const { store } = renderPage(RECORDS, 'payable');

      await user.click(screen.getByTestId('toggle-ledger-form'));
      await user.type(screen.getByTestId('ledger-counterparty'), 'Amex');
      await user.type(screen.getByTestId('ledger-amount'), '250');
      await user.click(screen.getByTestId('ledger-submit'));

      await waitFor(() =>
        expect(store.getState().ledger.userEntered[0]).toMatchObject({
          direction: 'payable',
          amountMinor: 25_000,
        }),
      );
    });

    it('deletes a record the user added', async () => {
      const user = userEvent.setup();
      const { store } = renderPage();

      await user.click(screen.getByTestId('toggle-ledger-form'));
      await user.type(screen.getByTestId('ledger-counterparty'), 'Alex Reid');
      await user.type(screen.getByTestId('ledger-amount'), '60');
      await user.click(screen.getByTestId('ledger-submit'));
      await waitFor(() => expect(store.getState().ledger.userEntered).toHaveLength(1));

      const row = screen.getByText('Alex Reid').closest('tr')!;
      await user.click(within(row).getByTestId('delete-obligation'));

      await waitFor(() => expect(store.getState().ledger.userEntered).toHaveLength(0));
    });
  });
});
