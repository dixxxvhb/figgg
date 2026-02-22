import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableWidgetProps {
  id: string;
  isEditing: boolean;
  label: string;
  children: React.ReactNode;
}

export function SortableWidget({ id, isEditing, label, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isEditing && (
        <div className="flex items-center gap-2 mb-1">
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 text-blush-400 dark:text-blush-500 touch-none rounded-lg hover:bg-blush-100 dark:hover:bg-blush-700 active:bg-blush-200 dark:active:bg-blush-600 transition-colors"
            aria-label={`Drag to reorder ${label}`}
          >
            <GripVertical size={16} />
          </button>
          <span className="text-[11px] font-medium text-blush-400 dark:text-blush-500 uppercase tracking-wider">
            {label}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
