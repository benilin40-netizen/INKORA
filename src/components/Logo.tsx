import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
  brandName?: string;
  tagline?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
  onClick,
  brandName = 'INOKORA',
  tagline = 'Your imagination, in print.'
}) => {
  const [imgSrc, setImgSrc] = useState('/logo.svg');
  const [imgError, setImgError] = useState(false);

  const handleImgError = () => {
    if (imgSrc === '/logo.svg') {
      setImgSrc('/logo.png');
    } else if (imgSrc === '/logo.png') {
      setImgSrc('/favicon.svg');
    } else {
      setImgError(true);
    }
  };

  // Dimensions mapped by size
  const sizeMap = {
    sm: {
      img: 'w-7 h-7',
      title: 'text-base',
      tagline: 'text-[9px]',
      gap: 'gap-2'
    },
    md: {
      img: 'w-10 h-10',
      title: 'text-xl',
      tagline: 'text-[10px]',
      gap: 'gap-3'
    },
    lg: {
      img: 'w-14 h-14',
      title: 'text-2xl sm:text-3xl',
      tagline: 'text-xs',
      gap: 'gap-3.5'
    },
    xl: {
      img: 'w-18 h-18',
      title: 'text-3xl sm:text-4xl',
      tagline: 'text-sm',
      gap: 'gap-4'
    }
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${sizeMap.gap} select-none ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
      role={onClick ? 'button' : 'banner'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Logo Graphic: Real Public Asset with Responsive Aspect Ratio & object-fit: contain */}
      <div className={`relative ${sizeMap.img} flex-shrink-0 flex items-center justify-center transition-transform ${
        onClick ? 'group-hover:scale-105' : ''
      }`}>
        {!imgError ? (
          <img
            src={imgSrc}
            alt={`${brandName} Logo`}
            className="w-full h-full object-contain filter drop-shadow-md"
            onError={handleImgError}
            loading="eager"
          />
        ) : (
          /* Graceful, consistent vector badge fallback */
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-amber-600 via-rose-700 to-amber-800 p-0.5 shadow-lg shadow-rose-950/40">
            <div className="w-full h-full rounded-[10px] bg-[#0c0a09] flex items-center justify-center text-amber-400">
              <BookOpen className="w-3/5 h-3/5" />
            </div>
          </div>
        )}
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col text-left leading-tight">
        <span
          className={`font-serif tracking-wider font-bold bg-gradient-to-r from-stone-100 via-rose-100 to-amber-200 bg-clip-text text-transparent ${sizeMap.title}`}
        >
          {brandName}
        </span>
        {showTagline && tagline && (
          <span className={`tracking-widest text-stone-400 uppercase font-sans ${sizeMap.tagline}`}>
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
};
