import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Static stars for background - no random calculations on render
const STARS = Array.from({ length: 50 }).map(() => ({
  width: Math.random() * 2 + 1,
  height: Math.random() * 2 + 1,
  top: Math.random() * 100,
  left: Math.random() * 100,
  opacity: Math.random() * 0.7 + 0.3,
  duration: Math.random() * 3 + 2,
  delay: Math.random() * 2
}));

export const HogwartsBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#0a0c14]">
      {/* Animated stars in the background - using pre-calculated positions */}
      <div className="absolute inset-0">
        {STARS.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${star.width}px`,
              height: `${star.height}px`,
              top: `${star.top}%`,
              left: `${star.left}%`,
              opacity: star.opacity,
              animation: `twinkle ${star.duration}s linear infinite ${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Hogwarts castle silhouette */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[25vh] opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='800' height='200' viewBox='0 0 800 200' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 200H800V170H760V150H740V130H720V110H700V90H680V110H660V130H640V150H620V130H600V150H580V135H560V120H540V100H520V80H500V60H480V40H460V20H440V0H420V20H400V40H380V60H360V80H340V100H320V120H300V135H280V150H260V130H240V150H220V130H200V110H180V90H160V110H140V130H120V150H100V170H40V200H0Z' fill='%23A17A35'/%3E%3C/svg%3E")`,
          backgroundSize: "contain",
          backgroundPosition: "bottom center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Magical mist/fog */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[20vh]"
        style={{
          background: "linear-gradient(to top, rgba(20, 21, 26, 0.3), transparent)",
        }}
      />
    </div>
  );
};

// Pre-defined positions for floating elements to prevent re-renders
const FEATHERS_POSITION = {
  top: "40%",
  right: "20%"
};

export const FloatingFeather: React.FC = () => {
  return (
    <motion.div
      className="absolute z-10 w-10 h-10 opacity-60 pointer-events-none"
      style={{
        top: FEATHERS_POSITION.top,
        right: FEATHERS_POSITION.right,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M35 5C30.587 9.413 26.173 13.827 20 10C13.827 6.173 10.5 12.5 5 15C-0.5 17.5 10 25 15 30C20 35 30 40 30 30C30 20 40 15 35 5Z' stroke='%23D6B65B' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
      initial={{ y: 0, x: 0, rotate: 0 }}
      animate={{
        y: [0, -20, 0],
        x: [0, 10, 0, -10, 0],
        rotate: [0, 10, 0, -10, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

// Pre-calculated positions for magical particles
const PARTICLES = Array.from({ length: 10 }).map(() => ({
  size: Math.random() * 4 + 2,
  blur: Math.random() + 0.5,
  x: Math.random() * 100,
  y: Math.random() * 100,
  duration: Math.random() * 10 + 10,
  delay: Math.random() * 5
}));

export const MagicalParticles: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      {PARTICLES.map((particle, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-yellow-300"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: 0.15,
            filter: `blur(${particle.blur}px)`,
            top: `${particle.y}%`,
            left: `${particle.x}%`,
            animation: `float ${particle.duration}s ease-in-out infinite ${particle.delay}s`
          }}
        />
      ))}
    </div>
  );
};

// Fixed positions for scrolls
const SCROLL_POSITIONS = [
  { top: "15%", left: "5%", rotate: 0, delay: 0 },
  { top: "60%", right: "8%", rotate: 15, delay: 2 }
];

export const FloatingScrolls: React.FC = () => {
  return (
    <>
      {SCROLL_POSITIONS.map((pos, index) => (
        <div
          key={index}
          className="absolute opacity-20 pointer-events-none"
          style={{
            top: pos.top,
            left: pos.left,
            right: pos.right,
            width: "40px",
            height: "60px",
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='60' viewBox='0 0 40 60' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 5H35V55H5V5Z' stroke='%23D6B65B' stroke-width='2'/%3E%3Cpath d='M5 5C2.5 2.5 10 0 20 0C30 0 37.5 2.5 35 5' stroke='%23D6B65B' stroke-width='2'/%3E%3Cpath d='M5 55C2.5 57.5 10 60 20 60C30 60 37.5 57.5 35 55' stroke='%23D6B65B' stroke-width='2'/%3E%3Cpath d='M10 15H30' stroke='%23D6B65B' stroke-width='1'/%3E%3Cpath d='M10 25H30' stroke='%23D6B65B' stroke-width='1'/%3E%3Cpath d='M10 35H30' stroke='%23D6B65B' stroke-width='1'/%3E%3Cpath d='M10 45H20' stroke='%23D6B65B' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            transform: `rotate(${pos.rotate}deg)`,
            animation: `floatSlow 8s ease-in-out infinite ${pos.delay}s`
          }}
        />
      ))}
    </>
  );
};

export const LoginSuccessEffect: React.FC<{ active: boolean }> = ({ active }) => {
  const [showEffect, setShowEffect] = useState(false);
  
  useEffect(() => {
    if (active) {
      setShowEffect(true);
      const timer = setTimeout(() => {
        setShowEffect(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [active]);
  
  if (!showEffect) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Central glow */}
      <div
        className="absolute w-20 h-20 bg-amber-300 rounded-full login-success-glow"
      />
      
      {/* Golden sparks */}
      <div className="success-sparks" />
    </div>
  );
};

export const LoginErrorEffect: React.FC<{ active: boolean }> = ({ active }) => {
  const [showEffect, setShowEffect] = useState(false);
  
  useEffect(() => {
    if (active) {
      setShowEffect(true);
      const timer = setTimeout(() => {
        setShowEffect(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [active]);
  
  if (!showEffect) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Red flash */}
      <div className="absolute inset-0 bg-red-900/30 error-flash" />
      
      {/* Smoke effect */}
      <div 
        className="absolute h-40 w-40 rounded-full error-smoke"
        style={{ 
          background: "radial-gradient(circle, rgba(155, 8, 10, 0.5) 0%, rgba(155, 8, 10, 0) 70%)",
          filter: "blur(10px)"
        }}
      />
    </div>
  );
};