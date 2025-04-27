import React from "react";

export function WandIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M16.5 2.5l1 1.5h2.5l-1.5 2 1 1.5-2 .5 -.5 2 -1.5 -1 -1.5 1 -.5 -2 -2 -.5 1 -1.5 -1.5 -2h2.5l1 -1.5z" />
      <path d="M13.5 8.5l-7 7c-.5 .5 -1.5 2.5 -2.5 3.5 -1.7 1.7 1.3 4.7 3 3 1 -1 3 -2 3.5 -2.5l7 -7" />
    </svg>
  );
}

export function OwlIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 4c-4.4 0-8 3.6-8 8 0 3.4 2 6.3 5 7.5V20h6v-0.5c3-1.2 5-4.1 5-7.5 0-4.4-3.6-8-8-8z" />
      <circle cx="9" cy="10" r="1.5" />
      <circle cx="15" cy="10" r="1.5" />
      <path d="M10.5 13.5c.5 .8 1.8 .8 3 0" />
      <path d="M8 15c-.7 .9-1.5 2-1.5 3" />
      <path d="M16 15c.7 .9 1.5 2 1.5 3" />
      <path d="M9 3.5c0 0 1.5-1.5 3-1.5 1.5 0 3 1.5 3 1.5" />
    </svg>
  );
}

export function PotionIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M9 2h6v3.5H9z" />
      <path d="M12 5.5v2" />
      <path d="M8 12l-1.2 6.8c-.1 .5 .3 1.2 .8 1.2h8.8c.5 0 .9-.7 .8 -1.2L16 12c0 -2 -1.6 -4.5 -4 -4.5 -2.4 0 -4 2.5 -4 4.5Z" />
      <path d="M14.5 10.5c-1 2 -2.5 2 -3.5 1.8 -1.3 -.3 -2 -1.8 -1 -3.8" />
    </svg>
  );
}

export function HogwartsShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 2 4 5.5V10c0 4.7 3 9 8 11 5-2 8-6.3 8-11V5.5L12 2Z" />
      <path d="M12 22V2" />
      <path d="M4 10h16" />
      <path d="M9 5.5l3-1 3 1" />
      <circle cx="7.5" cy="14" r="1.5" />
      <circle cx="16.5" cy="14" r="1.5" />
      <path d="M12 13.5v3" />
      <path d="M10 18h4" />
    </svg>
  );
}

export function SparkleEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: 6 }).map((_, i) => (
        <div 
          key={i}
          className="absolute w-1 h-1 rounded-full bg-yellow-300"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.7 + 0.3,
            animation: `twinkle ${Math.random() * 3 + 2}s linear infinite ${Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );
}

export function MagicShimmer() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-inherit pointer-events-none">
      <div 
        className="absolute h-full w-[40%] bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
        style={{
          transform: "skewX(-15deg) translateX(-80%)",
          animation: "shimmer 3s infinite",
        }}
      />
    </div>
  );
}

const styles = `
  @keyframes shimmer {
    0% { transform: skewX(-15deg) translateX(-80%); }
    100% { transform: skewX(-15deg) translateX(120%); }
  }
`;

export function WandSparks({ active }: { active: boolean }) {
  if (!active) return null;
  
  return (
    <div className="absolute top-0 right-0 z-10 pointer-events-none">
      {Array.from({ length: 15 }).map((_, i) => (
        <div 
          key={i}
          className="absolute rounded-full bg-yellow-300"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            top: `${Math.random() * 50}%`,
            right: `${Math.random() * 30}%`,
            opacity: Math.random() * 0.7 + 0.3,
            transform: `scale(${Math.random() * 1 + 0.5})`,
            animation: `wandSparkFly ${Math.random() * 2 + 1}s forwards ease-out ${Math.random() * 0.5}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes wandSparkFly {
          0% { 
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% { 
            opacity: 0;
            transform: translate(${Math.random() > 0.5 ? '-' : ''}${Math.random() * 50 + 20}px, -${Math.random() * 50 + 30}px) scale(0);
          }
        }
      `}</style>
    </div>
  );
}