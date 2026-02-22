/**
 * Smart renderer for AI-generated class plans.
 * Detects ALL-CAPS section headers and formats bullet points cleanly,
 * even if the AI leaks markdown artifacts.
 */
export function PlanDisplay({ text, className = '' }: { text: string; className?: string }) {
  // Strip any remaining markdown artifacts on the client side too
  const cleaned = text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^---+$/gm, '')
    .trim();

  const lines = cleaned.split('\n');

  return (
    <div className={`text-sm space-y-0.5 ${className}`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Empty line = spacer between sections
        if (!trimmed) {
          return <div key={i} className="h-2" />;
        }

        // ALL-CAPS line (3+ chars, no lowercase) = section header
        const isHeader = /^[A-Z][A-Z\s\-—:()""']{2,}$/.test(trimmed);
        if (isHeader) {
          return (
            <p key={i} className="font-bold text-forest-700 dark:text-forest-400 text-xs uppercase tracking-wide pt-2 first:pt-0">
              {trimmed}
            </p>
          );
        }

        // Bullet line: starts with - or •
        const bulletMatch = trimmed.match(/^[-•]\s*(.*)/);
        if (bulletMatch) {
          return (
            <p key={i} className="text-forest-600 dark:text-blush-300 pl-3 relative">
              <span className="absolute left-0 text-blush-400 dark:text-blush-500">-</span>
              {bulletMatch[1]}
            </p>
          );
        }

        // Regular text line
        return (
          <p key={i} className="text-forest-600 dark:text-blush-300">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
