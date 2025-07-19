import React from 'react';

interface AIRobotLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
}

const AIRobotLogo: React.FC<AIRobotLogoProps> = ({ 
  className = "", 
  size = 'md',
  animated = false 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const robotSizeClasses = {
    sm: 'w-3/4 h-3/4',
    md: 'w-3/4 h-3/4',
    lg: 'w-3/4 h-3/4', 
    xl: 'w-3/4 h-3/4'
  };

  const eyeSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
    xl: 'w-3 h-3'
  };

  const mouthSizeClasses = {
    sm: 'w-2 h-0.5',
    md: 'w-3 h-0.5',
    lg: 'w-4 h-0.5',
    xl: 'w-5 h-0.5'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Soft Circle Background with Gradient Glow */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/30 via-blue-500/20 to-blue-600/10 backdrop-blur-sm ${animated ? 'robot-glow' : 'shadow-[0_0_30px_rgba(59,130,246,0.4)]'}`}>
        {/* Inner glow effect */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-300/20 via-blue-400/10 to-transparent"></div>
      </div>
      
      {/* Robot Head */}
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        <div className={`${robotSizeClasses[size]} bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg relative ${animated ? 'animate-bounce' : ''}`}>
          {/* Eyes */}
          <div className={`absolute top-2 left-2 ${eyeSizeClasses[size]} bg-yellow-400 rounded-sm shadow-[0_0_8px_rgba(250,204,21,0.8)] ${animated ? 'robot-eye-blink' : ''}`}></div>
          <div className={`absolute top-2 right-2 ${eyeSizeClasses[size]} bg-yellow-400 rounded-sm shadow-[0_0_8px_rgba(250,204,21,0.8)] ${animated ? 'robot-eye-blink' : ''}`}></div>
          
          {/* Mouth */}
          <div className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 ${mouthSizeClasses[size]} bg-red-400 rounded-full ${animated ? 'robot-mouth-talk' : ''}`}></div>
          
          {/* Side Accents */}
          <div className="absolute top-1/2 -left-1 w-1 h-1 bg-green-400 rounded-full"></div>
          <div className="absolute top-1/2 -right-1 w-1 h-1 bg-yellow-400 rounded-full"></div>
          
          {/* Top Antennae */}
          <div className="absolute -top-1 left-1 w-1 h-1 bg-blue-300 rounded-sm"></div>
          <div className="absolute -top-1 right-1 w-1 h-1 bg-blue-300 rounded-sm"></div>
        </div>
      </div>
    </div>
  );
};

export default AIRobotLogo; 