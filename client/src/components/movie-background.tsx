import { useEffect, useState } from 'react';
import placeholderSvg from '../assets/movie-placeholder.svg';

// Define static background images
// Prioritize smaller, optimized images for better performance
const staticBackgrounds = {
  // Use the placeholder SVG which is very small and loads quickly
  placeholder: placeholderSvg,
  
  // Jellyfin official backgrounds
  dark: 'https://raw.githubusercontent.com/jellyfin/jellyfin-web/master/src/assets/img/banner-dark.jpg',
  light: 'https://raw.githubusercontent.com/jellyfin/jellyfin-web/master/src/assets/img/banner-light.jpg',
};

interface MovieBackgroundProps {
  className?: string;
  static?: boolean;  // New prop to enable static background for mobile
  variant?: 'light' | 'dark'; // Control which background to use
}

export function MovieBackground({ 
  className = '', 
  static: isStatic = false, 
  variant = 'dark' 
}: MovieBackgroundProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [backgroundsLoaded, setBackgroundsLoaded] = useState<boolean[]>([true, false, false]);
  const [backgroundUrl, setBackgroundUrl] = useState(staticBackgrounds.placeholder);
  
  // For animated background (desktop)
  const movieBackgrounds = [
    staticBackgrounds.placeholder,
    staticBackgrounds.dark,
    staticBackgrounds.light,
  ];
  
  // For static background (mobile)
  useEffect(() => {
    if (isStatic) {
      // Use the variant if specified, otherwise use dark
      setBackgroundUrl(variant === 'light' ? staticBackgrounds.light : staticBackgrounds.dark);
      
      // Pre-load the image
      const img = new Image();
      img.onload = () => {
        setBackgroundUrl(img.src);
      };
      img.onerror = () => {
        // Fallback to placeholder on error
        setBackgroundUrl(staticBackgrounds.placeholder);
      };
      img.src = variant === 'light' ? staticBackgrounds.light : staticBackgrounds.dark;
    }
  }, [isStatic, variant]);
  
  // Change background every 10 seconds for desktop animation
  useEffect(() => {
    if (isStatic) return; // Skip animation for static backgrounds
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % movieBackgrounds.length);
    }, 15000); // Longer interval for less distraction
    
    return () => clearInterval(interval);
  }, [isStatic, movieBackgrounds.length]);

  // Static background for mobile
  if (isStatic) {
    return (
      <div className={`absolute inset-0 overflow-hidden ${className}`}>
        <div
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat`}
          style={{
            backgroundImage: `url(${backgroundUrl})`,
          }}
        />
        {/* Overlay for better text visibility - darker for mobile */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/90" />
      </div>
    );
  }

  // Animated background for desktop
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {movieBackgrounds.map((bg, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 bg-cover bg-center bg-no-repeat`}
          style={{
            backgroundImage: `url(${bg})`,
            opacity: index === currentIndex ? 1 : 0,
          }}
        />
      ))}
      {/* Overlay for better text visibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/40 backdrop-blur-sm" />
    </div>
  );
}

export function getRandomMovieBackground() {
  // Array of available backgrounds excluding placeholder
  const backgrounds = [staticBackgrounds.dark, staticBackgrounds.light];
  return backgrounds[Math.floor(Math.random() * backgrounds.length)];
}