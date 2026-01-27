import { Loader2 } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]" role="status" aria-label="Loading">
      <Loader2 size={32} className="animate-spin text-forest-500" />
    </div>
  );
}
