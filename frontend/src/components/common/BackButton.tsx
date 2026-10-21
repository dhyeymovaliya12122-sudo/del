import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

interface BackButtonProps {
  onClick?: () => void;
  onBack?: () => void;
  label?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  onBack,
  label = 'Back',
  style,
  className,
}) => {
  const goBack = useUIStore((s) => s.goBack);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trigger = onBack || onClick;
    if (trigger) {
      trigger();
    } else {
      goBack();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`wa-universal-back-btn ${className || ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 13px',
        borderRadius: 8,
        background: 'rgba(45, 212, 191, 0.08)',
        border: '1px solid rgba(45, 212, 191, 0.35)',
        color: '#2dd4bf',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(8px)',
        userSelect: 'none',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(45, 212, 191, 0.18)';
        e.currentTarget.style.borderColor = 'rgba(45, 212, 191, 0.65)';
        e.currentTarget.style.color = '#ffffff';
        e.currentTarget.style.transform = 'translateX(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = (style?.background as string) || 'rgba(45, 212, 191, 0.08)';
        e.currentTarget.style.borderColor = (style?.borderColor as string) || 'rgba(45, 212, 191, 0.35)';
        e.currentTarget.style.color = (style?.color as string) || '#2dd4bf';
        e.currentTarget.style.transform = 'none';
      }}
      title="Go to previous page (Back)"
    >
      <ArrowLeft size={15} />
      <span>{label}</span>
    </button>
  );
};

export default BackButton;
