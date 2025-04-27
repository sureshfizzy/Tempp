import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const HogwartsBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#14151a]">
      {/* Animated stars in the background */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.7 + 0.3,
              animation: `twinkle ${Math.random() * 3 + 2}s linear infinite ${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Distant castle silhouette */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[30vh] opacity-20"
        style={{
          background: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDgwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMjAwSDgwMFYxNzBINzYwVjE1MEg3NDBWMTMwSDcyMFYxMTBINzAwVjkwSDY4MFYxMTBINjYwVjEzMEg2NDBWMTUwSDYyMFYxMzBINjAwVjE1MEg1ODBWMTM1SDU2MFYxMjBINTQwVjEwMEg1MjBWODBINTAwVjYwSDQ4MFY0MEg0NjBWMjBINDQwVjBINDIwVjIwSDQwMFY0MEgzODBWNjBIMzYwVjgwSDM0MFYxMDBIMzIwVjEyMEgzMDBWMTM1SDI4MFYxNTBIMjYwVjEzMEgyNDBWMTUwSDIyMFYxMzBIMjAwVjExMEgxODBWOTBIMTYwVjExMEgxNDBWMTMwSDEyMFYxNTBIMTAwVjE3MEg0MFYyMDBIMFoiIGZpbGw9IiNGRkZGRkYiLz48L3N2Zz4=')",
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
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Floating objects */}
      <motion.div
        className="absolute"
        style={{
          top: "20%",
          left: "10%",
          width: "50px",
          height: "30px",
          background: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA1MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNSAxNUMxMCA1IDIwIDUgMjUgMTVDMzAgMjUgNDAgMjUgNDUgMTUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+')",
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.2,
        }}
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0, -5, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute"
        style={{
          top: "30%",
          right: "15%",
          width: "30px",
          height: "30px",
          background: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAzMCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNSIgY3k9IjE1IiByPSIxMCIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTUgMFYzMCIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMCAxNUgzMCIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=')",
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.15,
        }}
        animate={{
          y: [0, 15, 0],
          rotate: [0, 180],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

export const FloatingFeather: React.FC = () => {
  return (
    <motion.div
      className="absolute z-10 w-10 h-10 opacity-70 pointer-events-none"
      style={{
        top: "40%",
        right: "20%",
        background: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMzUgNUMzMC41ODcgOS40MTMgMjYuMTczIDEzLjgyNyAyMCAxMEMxMy44MjcgNi4xNzMgMTAuNSAxMi41IDUgMTVDLTAuNSAxNy41IDEwIDI1IDE1IDMwQzIwIDM1IDMwIDQwIDMwIDMwQzMwIDIwIDQwIDE1IDM1IDVaIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')",
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
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

export const MagicalParticles: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-yellow-300"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            opacity: Math.random() * 0.3 + 0.1,
            filter: `blur(${Math.random() + 0.5}px)`,
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          animate={{
            y: [null, Math.random() * -100 - 50],
            opacity: [null, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 10,
          }}
        />
      ))}
    </div>
  );
};

export const FloatingScrolls: React.FC = () => {
  return (
    <>
      <motion.div
        className="absolute opacity-20 pointer-events-none"
        style={{
          top: "15%",
          left: "5%",
          width: "40px",
          height: "60px",
          background: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA0MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNSA1SDM1VjU1SDVWNVoiIHN0cm9rZT0iI0Q2QjY1QiIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTUgNUMyLjUgMi41IDEwIDAgMjAgMEMzMCAwIDM3LjUgMi41IDM1IDUiIHN0cm9rZT0iI0Q2QjY1QiIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTUgNTVDMi41IDU3LjUgMTAgNjAgMjAgNjBDMzAgNjAgMzcuNSA1Ny41IDM1IDU1IiBzdHJva2U9IiNENkI2NUIiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0xMCAxNUgzMCIgc3Ryb2tlPSIjRDZCNjVCIiBzdHJva2Utd2lkdGg9IjEiLz48cGF0aCBkPSJNMTAgMjVIMzAiIHN0cm9rZT0iI0Q2QjY1QiIgc3Ryb2tlLXdpZHRoPSIxIi8+PHBhdGggZD0iTTEwIDM1SDMwIiBzdHJva2U9IiNENkI2NUIiIHN0cm9rZS13aWR0aD0iMSIvPjxwYXRoIGQ9Ik0xMCA0NUgzMCIgc3Ryb2tlPSIjRDZCNjVCIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')",
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        animate={{
          y: [0, -15, 0],
          rotate: [0, 5, 0, -5, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: Math.random() * 2,
        }}
      />

      <motion.div
        className="absolute opacity-15 pointer-events-none"
        style={{
          top: "60%",
          right: "8%",
          width: "40px",
          height: "60px",
          background: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA0MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNSA1SDM1VjU1SDVWNVoiIHN0cm9rZT0iI0Q2QjY1QiIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTUgNUMyLjUgMi41IDEwIDAgMjAgMEMzMCAwIDM3LjUgMi41IDM1IDUiIHN0cm9rZT0iI0Q2QjY1QiIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTUgNTVDMi41IDU3LjUgMTAgNjAgMjAgNjBDMzAgNjAgMzcuNSA1Ny41IDM1IDU1IiBzdHJva2U9IiNENkI2NUIiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0xMCAxNUgzMCIgc3Ryb2tlPSIjRDZCNjVCIiBzdHJva2Utd2lkdGg9IjEiLz48cGF0aCBkPSJNMTAgMjVIMzAiIHN0cm9rZT0iI0Q2QjY1QiIgc3Ryb2tlLXdpZHRoPSIxIi8+PHBhdGggZD0iTTEwIDM1SDMwIiBzdHJva2U9IiNENkI2NUIiIHN0cm9rZS13aWR0aD0iMSIvPjxwYXRoIGQ9Ik0xMCA0NUgyMCIgc3Ryb2tlPSIjRDZCNjVCIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')",
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transform: "rotate(15deg)",
        }}
        animate={{
          y: [0, -10, 0],
          rotate: [15, 25, 15, 5, 15],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: Math.random() * 2,
        }}
      />
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
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [active]);
  
  if (!showEffect) return null;
  
  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Central glow */}
      <motion.div
        className="absolute w-20 h-20 bg-yellow-300 rounded-full"
        style={{ filter: "blur(40px)" }}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 15], opacity: [1, 0] }}
        transition={{ duration: 1.5 }}
      />
      
      {/* Sparks */}
      <div className="relative">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-yellow-300"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              top: 0,
              left: 0,
            }}
            initial={{ x: 0, y: 0 }}
            animate={{ 
              x: (Math.random() - 0.5) * 600, 
              y: (Math.random() - 0.5) * 600,
              opacity: [1, 0],
            }}
            transition={{ duration: Math.random() * 1 + 1 }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export const LoginErrorEffect: React.FC<{ active: boolean }> = ({ active }) => {
  const [showEffect, setShowEffect] = useState(false);
  
  useEffect(() => {
    if (active) {
      setShowEffect(true);
      const timer = setTimeout(() => {
        setShowEffect(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [active]);
  
  if (!showEffect) return null;
  
  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      {/* Red flash */}
      <motion.div
        className="absolute inset-0 bg-red-900/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0] }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Smoke effect */}
      <motion.div
        className="absolute h-40 w-40 rounded-full"
        style={{ 
          background: "radial-gradient(circle, rgba(155, 8, 10, 0.5) 0%, rgba(155, 8, 10, 0) 70%)",
          filter: "blur(10px)"
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 3], opacity: [0, 0.7, 0] }}
        transition={{ duration: 1 }}
      />
    </motion.div>
  );
};