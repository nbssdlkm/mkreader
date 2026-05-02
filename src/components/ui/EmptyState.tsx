import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${compact ? 'py-6 gap-2' : 'py-16 gap-3'}`}>
      {icon && <div className="text-text/30">{icon}</div>}
      <p className={`font-medium text-text/50 ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
      {description && <p className={`text-text/30 text-center max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>}
    </div>
  );
}
