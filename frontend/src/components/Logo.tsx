import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { themes } from '../themes/themes';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const { theme: themeId } = useSettingsStore();
  const [logoColor, setLogoColor] = useState('#10b981');

  useEffect(() => {
    const theme = themes[themeId];
    if (theme) {
      setLogoColor(theme.colors.accent500);
    }
  }, [themeId]);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-lg`}
        style={{
          backgroundColor: logoColor,
          WebkitMaskImage: 'url(/dendrite.svg)',
          maskImage: 'url(/dendrite.svg)',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
      {showText && (
        <h1 className={`${textSizeClasses[size]} font-bold text-theme-text-primary`}>
          Dendrite
        </h1>
      )}
    </div>
  );
};

export default Logo;
