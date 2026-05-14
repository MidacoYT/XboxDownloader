import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false
}) => {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          position: 'relative',
          width: '52px',
          height: '28px',
          background: checked ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : '#3f3f5a',
          borderRadius: '14px',
          transition: 'all 0.3s ease',
          border: checked ? '2px solid #a855f7' : '2px solid #52525b',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: checked ? '0 0 12px rgba(124, 58, 237, 0.4)' : 'inset 0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '24px' : '2px',
            width: '20px',
            height: '20px',
            background: '#ffffff',
            borderRadius: '50%',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: checked ? '18px' : '10px',
          transform: 'translateY(-50%)',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: checked ? '#ffffff' : '#71717a',
          transition: 'all 0.3s ease',
          opacity: 0.8,
        }} />
      </div>
      {label && (
        <span style={{
          fontSize: '0.875rem',
          color: '#f0f0ff',
          fontWeight: 500,
        }}>
          {label}
        </span>
      )}
    </label>
  );
};

export default ToggleSwitch;
