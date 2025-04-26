import { useEffect, useState } from 'react';
import placeholderSvg from '../assets/movie-placeholder.svg';

// Import movie backgrounds - using both local placeholder and remote URLs
// Add more cinematic/theater backgrounds
const movieBackgrounds = [
  placeholderSvg, // Placeholder that will always work
  'https://raw.githubusercontent.com/jellyfin/jellyfin-web/master/src/assets/img/banner-light.jpg',
  'https://raw.githubusercontent.com/jellyfin/jellyfin-web/master/src/assets/img/banner-dark.jpg',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=1920&auto=format&fit=crop',
];

interface MovieBackgroundProps {
  className?: string;
}

export function MovieBackground({ className = '' }: MovieBackgroundProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Change background every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % movieBackgrounds.length);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

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
  return movieBackgrounds[Math.floor(Math.random() * movieBackgrounds.length)];
}