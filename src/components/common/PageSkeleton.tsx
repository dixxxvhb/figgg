// Skeleton loader shown during lazy route loading — better perceived performance than a spinner

function Bone({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton ${className}`} />
  );
}

export function PageSkeleton() {
  return (
    <div className="page-w px-4 pt-6 space-y-4" role="status" aria-label="Loading">
      {/* Header area */}
      <div className="space-y-2">
        <Bone className="h-4 w-32" />
        <Bone className="h-7 w-56" />
      </div>

      {/* Hero card */}
      <Bone className="h-40 w-full !rounded-xl" />

      {/* Content cards */}
      <Bone className="h-24 w-full !rounded-xl" />
      <Bone className="h-20 w-full !rounded-xl" />
      <Bone className="h-16 w-full !rounded-xl" />
    </div>
  );
}
