import { useState } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { addObligation } from '@/features/ledger/ledgerSlice';
import { parseAmountToMinor } from '@/features/transactions/selectors';
import { suggestedCounterparties } from '@/data/generateObligations';
import { OBLIGATION_KINDS, type ObligationDirection, type ObligationKind } from '@/types/ledger';
import { shiftDateInput, toDateInputValue } from '@/utils/date';
import styles from './LedgerForm.module.css';

interface LedgerFormProps {
  direction: ObligationDirection;
  onDone: () => void;
}

/** Records a new debt in either direction. */
export function LedgerForm({ direction, onDone }: LedgerFormProps) {
  const dispatch = useAppDispatch();
  const isReceivable = direction === 'receivable';

  const todayValue = toDateInputValue(Date.now());
  const [counterparty, setCounterparty] = useState('');
  const [kind, setKind] = useState<ObligationKind>(isReceivable ? 'person' : 'credit-card');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [issuedOn, setIssuedOn] = useState(todayValue);
  const [dueOn, setDueOn] = useState(() => shiftDateInput(todayValue, 30));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const amountMinor = parseAmountToMinor(amount);
  const canSubmit = counterparty.trim() !== '' && amountMinor !== null && amountMinor > 0 && !saving;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (amountMinor === null || amountMinor <= 0 || counterparty.trim() === '') {
      setError('Add a name and an amount greater than zero.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await dispatch(
        addObligation({
          direction,
          counterparty,
          kind,
          reference,
          amountMinor,
          amountPaidMinor: 0,
          issuedOn,
          dueOn,
          notes: '',
        }),
      ).unwrap();
      onDone();
    } catch {
      setError('Could not save that. Your browser may be blocking local storage.');
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} data-testid="ledger-form">
      <div className={styles.field}>
        <label className={styles.label} htmlFor="ledger-counterparty">
          {isReceivable ? 'Who owes you' : 'Who you owe'}
        </label>
        <input
          id="ledger-counterparty"
          className={styles.input}
          list="ledger-counterparty-suggestions"
          placeholder={isReceivable ? 'e.g. Jamie' : 'e.g. Barclaycard'}
          value={counterparty}
          onChange={(event) => setCounterparty(event.target.value)}
          autoComplete="off"
          data-testid="ledger-counterparty"
        />
        <datalist id="ledger-counterparty-suggestions">
          {suggestedCounterparties(direction).map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ledger-kind">
          Type
        </label>
        <select
          id="ledger-kind"
          className={styles.select}
          value={kind}
          onChange={(event) => setKind(event.target.value as ObligationKind)}
          data-testid="ledger-kind"
        >
          {OBLIGATION_KINDS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ledger-amount">
          Amount (£)
        </label>
        <input
          id="ledger-amount"
          type="text"
          inputMode="decimal"
          className={styles.input}
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          data-testid="ledger-amount"
        />
      </div>

      <div className={`${styles.field} ${styles.wide}`}>
        <label className={styles.label} htmlFor="ledger-reference">
          What for
        </label>
        <input
          id="ledger-reference"
          className={styles.input}
          placeholder={isReceivable ? 'e.g. Split dinner' : 'e.g. Statement balance'}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          data-testid="ledger-reference"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ledger-due">
          Due by
        </label>
        <input
          id="ledger-due"
          type="date"
          className={styles.input}
          value={dueOn}
          min={issuedOn}
          onChange={(event) => setDueOn(event.target.value)}
          data-testid="ledger-due"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ledger-issued">
          Since
        </label>
        <input
          id="ledger-issued"
          type="date"
          className={styles.input}
          value={issuedOn}
          max={dueOn}
          onChange={(event) => setIssuedOn(event.target.value)}
          data-testid="ledger-issued"
        />
      </div>

      <div className={styles.footer}>
        {error ? (
          <span className={styles.error} role="alert">
            {error}
          </span>
        ) : null}
        <button type="button" className={styles.cancel} onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className={styles.submit} disabled={!canSubmit} data-testid="ledger-submit">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
