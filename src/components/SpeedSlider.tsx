import React from 'react';
import { Download } from 'lucide-react';

interface SpeedSliderProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
}

const SpeedSlider: React.FC<SpeedSliderProps> = ({
  value,
  onChange,
  max = 100,
  min = 0
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const slider = document.querySelector('.speed-slider-track') as HTMLElement;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newValue = Math.round(percentage * max);

    onChange(newValue);
  };

  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: '12px',
        fontWeight: 500
      }}>
        Max download speed
      </label>

      <div
        className="speed-slider-track"
        style={{
          position: 'relative',
          height: '12px',
          background: '#2a2a3e',
          borderRadius: '6px',
          border: '2px solid #3f3f5a',
          cursor: 'pointer',
          userSelect: 'none',
          marginBottom: '16px'
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${percentage}%`,
          background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
          borderRadius: '4px',
          transition: isDragging ? 'none' : 'width 0.2s ease',
          boxShadow: '0 0 8px rgba(124, 58, 237, 0.4)',
        }} />

        <div style={{
          position: 'absolute',
          left: `${percentage}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '24px',
          height: '24px',
          background: '#ffffff',
          borderRadius: '50%',
          border: '3px solid #7c3aed',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: isDragging ? 'none' : 'left 0.2s ease',
        }}>
          <Download size={12} style={{ color: '#7c3aed' }} />
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {value === 0 ? 'Unlimited' : `${value} MB/s`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            style={{
              width: '120px',
              height: '6px',
              cursor: 'pointer',
              accentColor: '#7c3aed',
            }}
          />
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
            style={{
              width: '70px',
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(124, 58, 237, 0.2)',
              border: '2px solid rgba(124, 58, 237, 0.4)',
              color: '#ffffff',
              fontSize: '0.85rem',
              textAlign: 'center',
              outline: 'none',
            }}
            min={min}
            max={max}
          />
        </div>
      </div>
    </div>
  );
};

export default SpeedSlider;
