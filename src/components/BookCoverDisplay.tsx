import React from 'react';
import { CoverConfig } from '../types';

interface BookCoverDisplayProps {
  cover?: CoverConfig;
  title?: string;
  author?: string;
  genre?: string;
  className?: string;
  aspectRatio?: '2/3' | '3/4';
  showDetails?: boolean;
}

export const BookCoverDisplay: React.FC<BookCoverDisplayProps> = ({
  cover,
  title = 'Untitled',
  author = 'Author',
  genre = 'Fiction',
  className = '',
  aspectRatio = '2/3',
  showDetails = true,
}) => {
  const currentTitle = cover?.title || title;
  const currentAuthor = cover?.author || author;
  const currentSubtitle = cover?.subtitle;
  const currentTagline = cover?.tagline;
  const currentGenre = cover?.genre || genre;
  const showGenre = cover?.showGenre !== false;
  const badgeText = cover?.badgeText;

  // Background style
  const bgType = cover?.bgType || (cover?.bgImage ? 'image' : 'gradient');
  const bgGradient = cover?.bgGradient || 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #09090b 100%)';
  const bgColor = cover?.bgColor || '#18181b';
  const bgImage = cover?.bgImage;

  // Typography & Align
  const fontFamilyClass = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
    display: 'font-serif tracking-tight'
  }[cover?.fontFamily || 'serif'];

  const fontStyleClass = cover?.fontStyle === 'italic' ? 'italic' : 'not-italic';
  const fontWeightClass = {
    normal: 'font-normal',
    medium: 'font-medium',
    bold: 'font-bold'
  }[cover?.fontWeight || 'bold'];

  const textAlignClass = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end'
  }[cover?.textAlign || 'center'];

  const titleColor = cover?.titleColor || '#f43f5e';
  const subtitleColor = cover?.subtitleColor || '#e4e4e7';
  const authorColor = cover?.authorColor || '#e4e4e7';

  // Overlay
  const overlayOpacity = typeof cover?.overlayOpacity === 'number' ? cover.overlayOpacity : 0.35;
  const overlayColor = cover?.overlayColor || '#000000';

  let containerStyle: React.CSSProperties = {
    backgroundColor: bgColor,
  };

  if (bgType === 'image' && bgImage) {
    containerStyle = {
      ...containerStyle,
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  } else if (bgType === 'gradient' || !bgImage) {
    containerStyle = {
      ...containerStyle,
      backgroundImage: bgGradient,
    };
  }

  return (
    <div
      style={containerStyle}
      className={`relative rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between p-4 sm:p-5 select-none border border-stone-700/60 transition-transform ${aspectRatio === '2/3' ? 'aspect-[2/3]' : 'aspect-[3/4]'} ${className}`}
    >
      {/* Background Image layer if present */}
      {bgType === 'image' && bgImage && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}

      {/* Contrast Overlay layer */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity"
        style={{
          backgroundColor: overlayColor,
          opacity: overlayOpacity
        }}
      />

      {/* Decorative pattern overlays */}
      {cover?.overlayPattern === 'stars' && (
        <div className="absolute inset-0 bg-[radial-gradient(#f43f5e_1px,transparent_1px)] [background-size:20px_20px] opacity-25 pointer-events-none" />
      )}
      {cover?.overlayPattern === 'dots' && (
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />
      )}
      {cover?.overlayPattern === 'grid' && (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0d_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0d_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      )}
      {cover?.overlayPattern === 'vignette' && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.65)_100%)] pointer-events-none" />
      )}

      {/* Framing double border for literary feel */}
      <div className="absolute inset-2 sm:inset-3 border border-white/10 rounded-lg pointer-events-none" />
      <div className="absolute inset-2.5 sm:inset-3.5 border border-white/5 rounded pointer-events-none" />

      {/* Top Header: Badge & Genre */}
      <div className="relative z-10 flex items-center justify-between gap-1 w-full text-[10px]">
        {badgeText ? (
          <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-stone-200 font-mono tracking-widest uppercase">
            {badgeText}
          </span>
        ) : <span />}

        {showGenre && currentGenre && (
          <span className="px-2 py-0.5 rounded-full bg-rose-950/70 backdrop-blur-md border border-rose-800/60 text-rose-300 font-sans tracking-wider uppercase font-medium">
            {currentGenre}
          </span>
        )}
      </div>

      {/* Center Body: Title & Subtitle & Tagline */}
      <div className={`relative z-10 my-auto flex flex-col w-full py-2 ${textAlignClass}`}>
        <h2
          style={{
            color: titleColor,
            textShadow: '0 2px 10px rgba(0,0,0,0.85), 0 0 20px rgba(0,0,0,0.5)',
          }}
          className={`leading-tight line-clamp-3 ${fontFamilyClass} ${fontStyleClass} ${fontWeightClass} text-base sm:text-lg lg:text-xl drop-shadow-md`}
        >
          {currentTitle}
        </h2>

        {currentSubtitle && (
          <p
            style={{
              color: subtitleColor,
              textShadow: '0 1px 6px rgba(0,0,0,0.9)'
            }}
            className="text-xs sm:text-sm font-sans mt-1 opacity-90 line-clamp-2"
          >
            {currentSubtitle}
          </p>
        )}

        {currentTagline && (
          <p
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}
            className="text-[10px] sm:text-xs font-serif italic text-amber-200/80 mt-1.5 line-clamp-1"
          >
            “{currentTagline}”
          </p>
        )}
      </div>

      {/* Bottom Footer: Author Signature */}
      <div className={`relative z-10 w-full pt-2 border-t border-white/10 ${textAlignClass}`}>
        <p
          style={{
            color: authorColor,
            textShadow: '0 1px 6px rgba(0,0,0,0.9)'
          }}
          className="text-xs tracking-widest uppercase font-mono font-medium truncate"
        >
          {currentAuthor}
        </p>
      </div>
    </div>
  );
};
