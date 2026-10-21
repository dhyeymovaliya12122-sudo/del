/**
 * Button.tsx
 * Enterprise design primitive button.
 * Adheres strictly to the Anti-Gimmick Design Manifesto:
 * - Geometric border-radius (6px, strictly no rounded-full pill buttons)
 * - Solid high-contrast palette (strictly no green gradients)
 * - Clean micro-interactions without bouncy animations
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      style,
      ...props
    },
    ref,
  ) => {
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontWeight: 500,
      fontSize: size === 'sm' ? '12px' : size === 'lg' ? '15px' : '13px',
      padding:
        size === 'sm'
          ? '6px 12px'
          : size === 'lg'
          ? '12px 20px'
          : '8px 16px',
      borderRadius: '6px', // Geometric: 6px standard
      border: '1px solid transparent',
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      opacity: disabled || isLoading ? 0.6 : 1,
      transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
      outline: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: '#00a884',
        borderColor: '#00a884',
        color: '#ffffff',
      },
      secondary: {
        backgroundColor: '#202c33',
        borderColor: '#2a3942',
        color: '#e9edef',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: '#2a3942',
        color: '#e9edef',
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        color: '#8696a0',
      },
      danger: {
        backgroundColor: '#ea4335',
        borderColor: '#ea4335',
        color: '#ffffff',
      },
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={{ ...baseStyles, ...variantStyles[variant], ...style }}
        className={`ui-btn ui-btn-${variant} ui-btn-${size} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
