import React from 'react';

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
      <div className={`${sizeClasses[size]} rounded-lg overflow-hidden flex items-center justify-center`}>
        <img 
          src="/dendrite_green.svg" 
          alt="Dendrite Logo"
          className="w-full h-full object-contain"
          style={{
            // Schneidet den Hintergrund außerhalb des Vierecks weg
            clipPath: 'inset(0)',
            // Stellt sicher, dass nur der Inhalt des Vierecks sichtbar ist
            objectFit: 'contain'
          }}
        />
      </div>
      {showText && (
        <h1 className={`${textSizeClasses[size]} font-bold text-dark-text-primary`}>
          Dendrite
        </h1>
      )}
    </div>
  );
};

export default Logo;
