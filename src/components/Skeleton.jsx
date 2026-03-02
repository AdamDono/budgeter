/**
 * Skeleton loader component for loading states
 * Usage:
 *   <Skeleton width="100%" height="20px" />
 *   <Skeleton variant="card" />
 *   <Skeleton variant="stat" count={4} />
 */
export function Skeleton({ width = '100%', height = '16px', borderRadius = '8px', className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton height="14px" width="40%" className="mb-2" />
      <Skeleton height="32px" width="60%" className="mb-3" />
      <Skeleton height="12px" width="80%" />
    </div>
  )
}

export function SkeletonTransaction() {
  return (
    <div className="skeleton-transaction">
      <div className="skeleton-tx-left">
        <Skeleton height="14px" width="120px" className="mb-2" />
        <Skeleton height="12px" width="80px" />
      </div>
      <div className="skeleton-tx-right">
        <Skeleton height="16px" width="70px" />
      </div>
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="skeleton-dashboard">
      {/* Summary Cards */}
      <div className="summary-grid mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="summary-card">
            <Skeleton height="48px" width="48px" borderRadius="12px" className="mb-3" />
            <Skeleton height="12px" width="60%" className="mb-2" />
            <Skeleton height="24px" width="80%" />
          </div>
        ))}
      </div>

      {/* Dashboard grid */}
      <div className="dashboard-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="dashboard-card">
            <div className="card-header mb-3">
              <Skeleton height="18px" width="50%" />
            </div>
            {[...Array(4)].map((_, j) => (
              <SkeletonTransaction key={j} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Skeleton
