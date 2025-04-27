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
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('data:image/jpeg;base64,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')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        filter: 'brightness(0.8)',
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