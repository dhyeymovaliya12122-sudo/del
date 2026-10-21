/**
 * Card.tsx
 * Modular container primitives: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter.
 * Adheres strictly to the Anti-Gimmick Design Manifesto:
 * - Subtle 1px borders (#2a3942 / #e9edef)
 * - 6px border radius (geometric, clean)
 * - Zero excessive glowing or fuzzy drop-shadows
 */
import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'bordered';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  style,
  ...props
}) => {
  const bgStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: '#111b21',
      border: '1px solid #202c33',
    },
    muted: {
      backgroundColor: '#0c1317',
      border: '1px solid #1f2c34',
    },
    bordered: {
      backgroundColor: '#111b21',
      border: '1px solid #2a3942',
    },
  };

  return (
    <div
      style={{
        borderRadius: '6px',
        padding: '16px',
        ...bgStyles[variant],
        ...style,
      }}
      className={`ui-card ui-card-${variant} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  style,
  ...props
}) => (
  <div
    style={{
      marginBottom: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      ...style,
    }}
    className={`ui-card-header ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  style,
  ...props
}) => (
  <h3
    style={{
      margin: 0,
      fontSize: '15px',
      fontWeight: 600,
      color: '#e9edef',
      ...style,
    }}
    className={`ui-card-title ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  style,
  ...props
}) => (
  <p
    style={{
      margin: 0,
      fontSize: '13px',
      color: '#8696a0',
      lineHeight: 1.4,
      ...style,
    }}
    className={`ui-card-description ${className}`}
    {...props}
  >
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  style,
  ...props
}) => (
  <div
    style={{ ...style }}
    className={`ui-card-content ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  style,
  ...props
}) => (
  <div
    style={{
      marginTop: '16px',
      paddingTop: '12px',
      borderTop: '1px solid #202c33',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '8px',
      ...style,
    }}
    className={`ui-card-footer ${className}`}
    {...props}
  >
    {children}
  </div>
);
