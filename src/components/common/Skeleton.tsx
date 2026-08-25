import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: string;
}

export function Skeleton({ width = '100%', height = '16px', radius }: SkeletonProps) {
  return (
    <div
      className={styles.skeleton}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/** Placeholder rows shown while the dataset is being generated. */
export function SkeletonRows({ count = 8, height = '56px' }: { count?: number; height?: string }) {
  return (
    <div className={styles.stack} data-testid="skeleton-rows">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={height} />
      ))}
    </div>
  );
}
