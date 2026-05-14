import React from 'react';
import icon from '../assets/icon.png';

interface AppLogoProps {
  size?: number;
}

const AppLogo: React.FC<AppLogoProps> = ({ size = 36 }) => {
  return (
    <img
      src={icon}
      alt="App Logo"
      style={{
        width: size,
        height: size,
        borderRadius: '10px',
        boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)',
      }}
    />
  );
};

export default AppLogo;
