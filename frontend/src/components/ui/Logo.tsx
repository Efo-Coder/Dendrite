import React from 'react';
import { LOGO_SRC } from '../../config/brand';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  style
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-14 h-14',
    xl: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`} style={style}>
      <img
        src={LOGO_SRC}
        alt="Dendrite"
        className={sizeClasses[size]}
      />
      {showText && (
        <h1 className={`${textSizeClasses[size]} font-bold text-(--ink)`}>
          Dendrite
        </h1>
      )}
    </div>
  );
};

export default Logo;
