import { useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { addTransaction } from '@/features/transactions/transactionsSlice';
import { selectDistinctCounterparties } from '@/features/transactions/selectors';
import { parseAmountToMinor } from '@/features/transactions/selectors';
import { categoriesFor, type Category, type TransactionDirection } from '@/types/transaction';
import { toDateInputValue } from '@/utils/date';
import styles from './QuickAddForm.module.css';

function today(): string {
  return toDateInputValue(Date.now());
}

/**
 * Inline entry for a single transaction.
 *
 * Manual bookkeeping lives or dies on how long a row takes to enter, so this
 * is deliberately a keyboard-first strip rather than a modal: tab across,
 * press Enter, and the form resets with the date and direction preserved and
 * focus back on the amount, ready for the next one.
 */
export function QuickAddForm() {
  const dispatch = useAppDispatch();
  const knownCounterparties = useAppSelector(selectDistinctCounterparties);

  const [direction, setDirection] = useState<TransactionDirection>('expense');
  const [date, setDate] = useState(today);
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>(categoriesFor('expense')[0]!);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);
  const categories = useMemo(() => categoriesFor(direction), [direction]);

  function switchDirection(next: TransactionDirection) {
    if (next === direction) return;
    setDirection(next);
    // The previous category belongs to the other side of the ledger.
    setCategory(categoriesFor(next)[0]!);
  }

  const amountMinor = parseAmountToMinor(amount);
  const canSubmit =
    counterparty.trim() !== '' && amountMinor !== null && amountMinor > 0 && !saving;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (counterparty.trim() === '') {
      setError('Add a name so you can find this later.');
      return;
    }
    if (amountMinor === null || amountMinor <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await dispatch(
        addTransaction({
          date,
          direction,
          counterparty,
          category,
          amountMinor,
          paymentMethod: 'Card',
          status: 'completed',
          description: direction === 'income' ? 'Added by you' : 'Added by you',
        }),
      ).unwrap();

      // Keep the date and direction — entering a batch of one day's spending
      // is the common case.
      setCounterparty('');
      setAmount('');
      amountRef.current?.focus();
    } catch {
      setError('Could not save that. Your browser may be blocking local storage.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void handleSubmit(event)}
      data-testid="quick-add-form"
    >
      <div className={styles.field}>
        <span className={styles.label} id="quick-add-direction">
          Type
        </span>
        <div className={styles.toggle} role="group" aria-labelledby="quick-add-direction">
          <button
            type="button"
            className={`${styles.toggleButton} ${styles.toggleOut}`}
            aria-pressed={direction === 'expense'}
            onClick={() => switchDirection('expense')}
            data-testid="quick-add-expense"
          >
            Out
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${styles.toggleIn}`}
            aria-pressed={direction === 'income'}
            onClick={() => switchDirection('income')}
            data-testid="quick-add-income"
          >
            In
          </button>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="quick-add-date">
          Date
        </label>
        <input
          id="quick-add-date"
          type="date"
          className={styles.input}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          data-testid="quick-add-date"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="quick-add-counterparty">
          {direction === 'income' ? 'From' : 'Paid to'}
        </label>
        <input
          id="quick-add-counterparty"
          className={styles.input}
          list="known-counterparties"
          placeholder={direction === 'income' ? 'e.g. Monthly Salary' : 'e.g. Tesco'}
          value={counterparty}
          onChange={(event) => setCounterparty(event.target.value)}
          autoComplete="off"
          data-testid="quick-add-counterparty"
        />
        <datalist id="known-counterparties">
          {knownCounterparties.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="quick-add-category">
          Category
        </label>
        <select
          id="quick-add-category"
          className={styles.select}
          value={category}
          onChange={(event) => setCategory(event.target.value as Category)}
          data-testid="quick-add-category"
        >
          {categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="quick-add-amount">
          Amount (£)
        </label>
        <input
          id="quick-add-amount"
          ref={amountRef}
          type="text"
          inputMode="decimal"
          className={`${styles.input} ${amount !== '' && amountMinor === null ? styles.invalid : ''}`}
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          data-testid="quick-add-amount"
        />
      </div>

      <button
        type="submit"
        className={styles.submit}
        disabled={!canSubmit}
        data-testid="quick-add-submit"
      >
        {saving ? 'Adding…' : 'Add'}
      </button>

      {error ? (
        <p className={styles.error} role="alert" data-testid="quick-add-error">
          {error}
        </p>
      ) : (
        <p className={styles.hint}>Saved in this browser only — nothing is uploaded anywhere.</p>
      )}
    </form>
  );
}
