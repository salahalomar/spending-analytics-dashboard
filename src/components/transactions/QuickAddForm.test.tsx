import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/renderWithStore';
import { makeTransactionSet } from '@/test/fixtures';
import { initialState as transactionsInitialState } from '@/features/transactions/transactionsSlice';
import { toDateInputValue } from '@/utils/date';
import { QuickAddForm } from './QuickAddForm';

function renderForm() {
  return {
    user: userEvent.setup(),
    ...renderWithStore(<QuickAddForm />, {
      preloadedState: {
        transactions: {
          ...transactionsInitialState,
          sample: makeTransactionSet(),
          status: 'succeeded',
        },
      },
    }),
  };
}

describe('QuickAddForm', () => {
  it('defaults to money out, dated today', () => {
    renderForm();
    expect(screen.getByTestId('quick-add-expense')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('quick-add-date')).toHaveValue(toDateInputValue(Date.now()));
  });

  it('will not submit without a name and a positive amount', async () => {
    const { user } = renderForm();
    expect(screen.getByTestId('quick-add-submit')).toBeDisabled();

    await user.type(screen.getByTestId('quick-add-counterparty'), 'Corner Shop');
    expect(screen.getByTestId('quick-add-submit')).toBeDisabled();

    await user.type(screen.getByTestId('quick-add-amount'), '12.34');
    expect(screen.getByTestId('quick-add-submit')).toBeEnabled();
  });

  it('rejects an amount of zero', async () => {
    const { user } = renderForm();
    await user.type(screen.getByTestId('quick-add-counterparty'), 'Corner Shop');
    await user.type(screen.getByTestId('quick-add-amount'), '0');

    expect(screen.getByTestId('quick-add-submit')).toBeDisabled();
  });

  it('flags an amount it cannot read', async () => {
    const { user } = renderForm();
    const amount = screen.getByTestId('quick-add-amount');

    await user.type(amount, 'abc');
    expect(amount.className).toMatch(/invalid/);
    expect(screen.getByTestId('quick-add-submit')).toBeDisabled();
  });

  it('saves the transaction in minor units', async () => {
    const { user, store } = renderForm();

    await user.type(screen.getByTestId('quick-add-counterparty'), 'Corner Shop');
    await user.type(screen.getByTestId('quick-add-amount'), '12.34');
    await user.click(screen.getByTestId('quick-add-submit'));

    await waitFor(() => expect(store.getState().transactions.userEntered).toHaveLength(1));
    expect(store.getState().transactions.userEntered[0]).toMatchObject({
      counterparty: 'Corner Shop',
      amountMinor: 1234,
      direction: 'expense',
      category: 'Groceries',
      userEntered: true,
    });
  });

  it('trims the name rather than storing the spaces', async () => {
    const { user, store } = renderForm();

    await user.type(screen.getByTestId('quick-add-counterparty'), '  Corner Shop  ');
    await user.type(screen.getByTestId('quick-add-amount'), '5');
    await user.click(screen.getByTestId('quick-add-submit'));

    await waitFor(() => expect(store.getState().transactions.userEntered).toHaveLength(1));
    expect(store.getState().transactions.userEntered[0]!.counterparty).toBe('Corner Shop');
  });

  it('clears the name and amount but keeps the date and direction, ready for the next one', async () => {
    const { user } = renderForm();

    await user.clear(screen.getByTestId('quick-add-date'));
    await user.type(screen.getByTestId('quick-add-date'), '2025-03-14');
    await user.type(screen.getByTestId('quick-add-counterparty'), 'Corner Shop');
    await user.type(screen.getByTestId('quick-add-amount'), '5');
    await user.click(screen.getByTestId('quick-add-submit'));

    await waitFor(() => expect(screen.getByTestId('quick-add-counterparty')).toHaveValue(''));
    expect(screen.getByTestId('quick-add-amount')).toHaveValue('');
    expect(screen.getByTestId('quick-add-date')).toHaveValue('2025-03-14');
    expect(screen.getByTestId('quick-add-expense')).toHaveAttribute('aria-pressed', 'true');
  });

  it('returns focus to the amount so a run of entries needs no mouse', async () => {
    const { user } = renderForm();

    await user.type(screen.getByTestId('quick-add-counterparty'), 'Corner Shop');
    await user.type(screen.getByTestId('quick-add-amount'), '5');
    await user.click(screen.getByTestId('quick-add-submit'));

    await waitFor(() => expect(screen.getByTestId('quick-add-amount')).toHaveFocus());
  });

  describe('switching direction', () => {
    it('swaps the category list to the other side of the ledger', async () => {
      const { user } = renderForm();
      const category = screen.getByTestId('quick-add-category');

      expect(within(category).queryByText('Groceries')).toBeTruthy();

      await user.click(screen.getByTestId('quick-add-income'));
      expect(within(category).queryByText('Groceries')).toBeFalsy();
      expect(within(category).queryByText('Salary')).toBeTruthy();
    });

    it('resets the category, which belonged to the other side', async () => {
      const { user, store } = renderForm();

      await user.click(screen.getByTestId('quick-add-income'));
      await user.type(screen.getByTestId('quick-add-counterparty'), 'Monthly Salary');
      await user.type(screen.getByTestId('quick-add-amount'), '2500');
      await user.click(screen.getByTestId('quick-add-submit'));

      await waitFor(() => expect(store.getState().transactions.userEntered).toHaveLength(1));
      expect(store.getState().transactions.userEntered[0]).toMatchObject({
        direction: 'income',
        category: 'Salary',
        amountMinor: 250_000,
      });
    });

    it('relabels the name field for money coming in', async () => {
      const { user } = renderForm();
      expect(screen.getByLabelText('Paid to')).toBeInTheDocument();

      await user.click(screen.getByTestId('quick-add-income'));
      expect(screen.getByLabelText('From')).toBeInTheDocument();
    });
  });

  it('offers the names already in the data as suggestions', () => {
    renderForm();
    const list = document.getElementById('known-counterparties');
    expect(list?.querySelectorAll('option').length).toBeGreaterThan(0);
    expect(list?.innerHTML).toContain('Tesco');
  });

  it('says the data stays in the browser', () => {
    renderForm();
    expect(screen.getByText(/saved in this browser only/i)).toBeInTheDocument();
  });
});
