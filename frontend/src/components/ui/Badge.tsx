/**
 * Badge.tsx
 * Enterprise status badge primitive.
 * Adheres strictly to the Anti-Gimmick Design Manifesto:
 * - Geometric border-radius (4px, strictly no rounded-full pills)
 * - Clear semantic status hues without gradient slop
 */
import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  hasDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  hasDot = false,
  className = '',
  style,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: size === 'sm' ? '11px' : '12px',
    lineHeight: 1.2,
    fontWeight: 500,
    padding: size === 'sm' ? '2px 6px' : '3px 8px',
    borderRadius: '4px', // Geometric: 4px standard
    userSelect: 'none',
  };

  const variantStyles: Record<string, { bg: string; color: string; border: string; dot: string }> = {
    success: {
      bg: 'rgba(0, 168, 132, 0.12)',
      color: '#00a884',
      border: 'rgba(0, 168, 132, 0.3)',
      dot: '#00a884',
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.12)',
      color: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.3)',
      dot: '#f59e0b',
    },
    danger: {
      bg: 'rgba(239, 68, 68, 0.12)',
      color: '#ef4444',
      border: 'rgba(239, 68, 68, 0.3)',
      dot: '#ef4444',
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.12)',
      color: '#3b82f6',
      border: 'rgba(59, 130, 246, 0.3)',
      dot: '#3b82f6',
    },
    neutral: {
      bg: 'rgba(134, 150, 160, 0.12)',
      color: '#8696a0',
      border: 'rgba(134, 150, 160, 0.25)',
      dot: '#8696a0',
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <span
      style={{
        ...baseStyles,
        backgroundColor: currentVariant.bg,
        color: currentVariant.color,
        border: `1px solid ${currentVariant.border}`,
        ...style,
      }}
      className={`ui-badge ui-badge-${variant} ${className}`}
      {...props}
    >
      {hasDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: currentVariant.dot,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
};
