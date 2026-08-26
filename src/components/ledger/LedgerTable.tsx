import { useAppDispatch } from '@/app/hooks';
import { deleteObligation, settleObligation } from '@/features/ledger/ledgerSlice';
import type { ObligationView } from '@/features/ledger/selectors';
import { OBLIGATION_KINDS, type ObligationDirection, type ObligationStatus } from '@/types/ledger';
import { formatCurrency } from '@/utils/format';
import { formatDate } from '@/utils/date';
import { EmptyState } from '@/components/common/EmptyState';
import styles from './LedgerPage.module.css';

const STATUS_CLASS: Record<ObligationStatus, string> = {
  overdue: styles.statusOverdue!,
  outstanding: styles.statusOutstanding!,
  'part-paid': styles.statusPartPaid!,
  settled: styles.statusSettled!,
  'written-off': styles.statusWrittenOff!,
};

const STATUS_LABEL: Record<ObligationStatus, string> = {
  overdue: 'Overdue',
  outstanding: 'Outstanding',
  'part-paid': 'Part paid',
  settled: 'Settled',
  'written-off': 'Written off',
};

function kindLabel(kind: string): string {
  return OBLIGATION_KINDS.find((candidate) => candidate.id === kind)?.label ?? kind;
}

/** Human phrasing for the due date, relative to today. */
function dueLabel(daysUntilDue: number): string {
  if (daysUntilDue === 0) return 'due today';
  if (daysUntilDue === 1) return 'due tomorrow';
  if (daysUntilDue > 0) return `in ${daysUntilDue} days`;
  if (daysUntilDue === -1) return '1 day late';
  return `${Math.abs(daysUntilDue)} days late`;
}

interface LedgerTableProps {
  views: readonly ObligationView[];
  direction: ObligationDirection;
  onAdd: () => void;
}

/**
 * The ledger list.
 *
 * Deliberately a plain table rather than the virtualised list used for
 * transactions: a personal ledger runs to dozens of rows, not tens of
 * thousands, and windowing that would add machinery with nothing to earn.
 */
export function LedgerTable({ views, direction, onAdd }: LedgerTableProps) {
  const dispatch = useAppDispatch();
  const isReceivable = direction === 'receivable';

  if (views.length === 0) {
    return (
      <EmptyState
        title={isReceivable ? 'Nobody owes you anything' : 'You have no debts recorded'}
        message={
          isReceivable
            ? 'When you lend money or cover someone’s share, record it here so it does not get forgotten.'
            : 'Add credit cards, loans, or money you have borrowed to see what you owe in one place.'
        }
        actionLabel={isReceivable ? 'Record money owed to you' : 'Record something you owe'}
        onAction={onAdd}
      />
    );
  }

  return (
    <div className={styles.tableScroll}>
      <table className={styles.table} data-testid="ledger-table">
        <thead>
          <tr>
            <th scope="col">{isReceivable ? 'Who owes you' : 'Who you owe'}</th>
            <th scope="col">Type</th>
            <th scope="col">Due</th>
            <th scope="col">Status</th>
            <th scope="col" className={styles.numericCell}>
              Outstanding
            </th>
            <th scope="col" className={styles.numericCell}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {views.map((view) => {
            const { obligation, status } = view;
            const isOpen = status !== 'settled' && status !== 'written-off';

            return (
              <tr key={obligation.id} data-testid="ledger-row" data-status={status}>
                <td>
                  <span className={styles.name}>{obligation.counterparty}</span>
                  {obligation.reference ? (
                    <span className={styles.reference}>{obligation.reference}</span>
                  ) : null}
                </td>
                <td>
                  <span className={styles.kind}>{kindLabel(obligation.kind)}</span>
                </td>
                <td>
                  {formatDate(Date.parse(`${obligation.dueOn}T00:00:00.000Z`))}
                  {isOpen ? (
                    <span
                      className={`${styles.due} ${status === 'overdue' ? styles.dueOverdue : ''}`}
                    >
                      {' · '}
                      {dueLabel(view.daysUntilDue)}
                    </span>
                  ) : null}
                </td>
                <td>
                  <span className={`${styles.status} ${STATUS_CLASS[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                </td>
                <td className={styles.numericCell}>
                  {formatCurrency(view.outstandingMinor)}
                  {obligation.amountPaidMinor > 0 && isOpen ? (
                    <span className={styles.reference}>
                      {formatCurrency(obligation.amountPaidMinor)} paid
                    </span>
                  ) : null}
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.action}
                      disabled={!isOpen}
                      onClick={() =>
                        void dispatch(
                          settleObligation({
                            id: obligation.id,
                            amountMinor: view.outstandingMinor,
                          }),
                        )
                      }
                      aria-label={
                        isReceivable
                          ? `Mark ${formatCurrency(view.outstandingMinor)} from ${obligation.counterparty} as received`
                          : `Mark ${formatCurrency(view.outstandingMinor)} to ${obligation.counterparty} as paid`
                      }
                      data-testid="settle-obligation"
                    >
                      {isReceivable ? 'Mark received' : 'Mark paid'}
                    </button>
                    {obligation.userEntered ? (
                      <button
                        type="button"
                        className={`${styles.action} ${styles.actionDanger}`}
                        onClick={() => void dispatch(deleteObligation(obligation.id))}
                        aria-label={`Delete the record for ${obligation.counterparty}`}
                        data-testid="delete-obligation"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
