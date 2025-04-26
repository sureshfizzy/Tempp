import { useEffect, useState } from 'react';

// Define movie backgrounds - use public URLs instead of imports for simplicity
const movieBackgrounds = [
  '/movie-backgrounds/movie1.png',
  '/movie-backgrounds/movie2.png',
  '/movie-backgrounds/movie3.png',
  '/movie-backgrounds/movie4.png',
  '/movie-backgrounds/movie5.png'
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