import type { ReactNode } from 'react';
import styles from './ChartCard.module.css';

interface ChartCardProps {
  title: string;
  caption?: string;
  children: ReactNode;
  testId?: string;
}

export function ChartCard({ title, caption, children, testId }: ChartCardProps) {
  return (
    <section className={styles.card} data-testid={testId}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {caption ? <span className={styles.caption}>{caption}</span> : null}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
