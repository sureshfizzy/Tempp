import React from "react";
import { motion } from "framer-motion";

/**
 * A floating feather component that gently floats in the air,
 * reminiscent of a quill pen from the Harry Potter universe
 */
export const FloatingFeather: React.FC<{ 
  delay?: number;
  x?: number; 
  y?: number;
}> = ({ delay = 0, x = 0, y = 0 }) => {
  return (
    <motion.div
      style={{
        position: 'absolute',
        width: '50px',
        height: '100px',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='100' viewBox='0 0 50 100' fill='none'%3E%3Cpath d='M25 5C25 5 20 15 22 30C24 45 30 60 25 80C20 100 20 95 25 95C30 95 30 100 25 80C20 60 26 45 28 30C30 15 25 5 25 5Z' fill='rgba(255, 255, 255, 0.7)'/%3E%3C/svg%3E")`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        left: `${x}%`,
        top: `${y}%`,
        opacity: 0.6,
        zIndex: 1
      }}
      initial={{ y: -20, x: 0, rotate: 0, opacity: 0 }}
      animate={{ 
        y: [0, -20, 0], 
        x: [0, 10, 0],
        rotate: [0, 5, 0, -5, 0],
        opacity: 0.6
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
        delay: delay
      }}
    />
  );
};

/**
 * A gentle shimmer effect that sweeps across text or UI elements,
 * mimicking a magical spell or enchantment
 */
export const MagicShimmer: React.FC<{
  children: React.ReactNode;
  delay?: number;
}> = ({ children, delay = 0 }) => {
  return (
    <div className="relative overflow-hidden">
      {children}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatDelay: 5,
          ease: "easeInOut",
          delay
        }}
      />
    </div>
  );
};

/**
 * Hogwarts castle background with animated elements
 */
export const HogwartsBackground: React.FC = () => {
  return (
    <div 
      className="absolute inset-0 bg-cover bg-center"
      style={{
        backgroundImage: "url('https://i.imgur.com/OoRYt7V.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.6)',
        zIndex: -10
      }}
    >
      {/* Animated stars/magical particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{ opacity: 0.1 }}
            animate={{ 
              opacity: [0.1, 0.8, 0.1],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>
      
      {/* Fog/mist overlay */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-t from-blue-900/30 to-transparent"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />
    </div>
  );
};

/**
 * A magical wand cursor trail that follows mouse movements
 */
export const WandSparkle: React.FC = () => {
  const [sparks, setSparks] = React.useState<{id: number, x: number, y: number}[]>([]);
  const [isActive, setIsActive] = React.useState(false);
  const nextId = React.useRef(0);
  
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isActive) return;
      
      // Only add sparks occasionally to avoid too many particles
      if (Math.random() > 0.3) return;
      
      setSparks((prev) => [
        ...prev.slice(-20), // keep only the last 20 sparks
        { id: nextId.current++, x: e.clientX, y: e.clientY }
      ]);
    };
    
    const handleMouseDown = () => setIsActive(true);
    const handleMouseUp = () => setIsActive(false);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isActive]);
  
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {sparks.map((spark) => (
        <motion.div
          key={spark.id}
          className="absolute h-2 w-2 rounded-full bg-yellow-200"
          style={{ left: spark.x, top: spark.y }}
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 0, y: spark.y - 10 - Math.random() * 20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          onAnimationComplete={() => {
            setSparks(current => current.filter(s => s.id !== spark.id));
          }}
        />
      ))}
    </div>
  );
};

/**
 * Magic button with a wand-like glow effect when hovered
 */
export const MagicButton: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  isLoading?: boolean;
}> = ({ onClick, disabled = false, children, isLoading = false }) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="relative overflow-hidden w-full font-medium rounded-md 
                bg-gradient-to-r from-amber-600 to-amber-400 
                text-white py-3 px-4 shadow-xl transition-all
                disabled:opacity-50 disabled:cursor-not-allowed"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Inner content */}
      <span className="relative z-10 flex items-center justify-center">
        {isLoading ? (
          <>
            <motion.div
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            Loading...
          </>
        ) : children}
      </span>
      
      {/* Magical glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-yellow-300/0 via-yellow-300/40 to-yellow-300/0"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.8 }}
      />
    </motion.button>
  );
};

/**
 * Magical paper for forms, styled like parchment from the Wizarding World
 */
export const MagicParchment: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <motion.div
      className="bg-gradient-to-b from-amber-50 to-amber-100 
                rounded-lg p-6 shadow-lg border border-amber-200
                backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        backgroundImage: "url('data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23e5bc63' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E')"
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Input field styled like a magical scroll/parchment
 */
export const MagicInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 bg-amber-50/90 border border-amber-200 
                 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 
                 focus:border-amber-400 transition-all duration-300
                 placeholder:text-amber-900/40 text-amber-900
                 ${props.className || ''}`}
    />
  );
};