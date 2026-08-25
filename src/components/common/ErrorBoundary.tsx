import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Called on capture — a real deployment would forward this to Sentry. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time errors below it and shows a recoverable screen instead
 * of React unmounting the whole tree and leaving a blank page.
 *
 * Class component by necessity: `componentDidCatch` has no hook equivalent.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className={styles.boundary} role="alert">
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.message}>
          The dashboard hit an unexpected error and stopped rendering. Retrying rebuilds the view
          from the current state; reloading starts from a clean one.
        </p>
        <pre className={styles.detail}>{error.message}</pre>
        <button type="button" className={styles.retry} onClick={this.handleRetry}>
          Try again
        </button>
      </div>
    );
  }
}
