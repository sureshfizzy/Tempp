import { motion } from 'framer-motion';
import { Film, Clapperboard, Popcorn, Video, Ticket } from 'lucide-react';

export function CinemaDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated Film Elements */}
      <motion.div 
        className="absolute top-10 right-10"
        animate={{ 
          rotate: [0, 10, 0, -10, 0],
          y: [0, -10, 0, 10, 0]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity,
          repeatType: "reverse"
        }}
      >
        <Film className="text-primary/60 h-12 w-12" />
      </motion.div>

      <motion.div 
        className="absolute bottom-20 left-10"
        animate={{ 
          rotate: [0, -10, 0, 10, 0],
          x: [0, 10, 0, -10, 0]
        }}
        transition={{ 
          duration: 6, 
          repeat: Infinity,
          repeatType: "reverse",
          delay: 1
        }}
      >
        <Clapperboard className="text-primary/60 h-10 w-10" />
      </motion.div>

      <motion.div 
        className="absolute top-1/3 left-5"
        animate={{ 
          rotate: [0, 15, 0, -15, 0],
          scale: [1, 1.1, 1, 0.9, 1]
        }}
        transition={{ 
          duration: 7, 
          repeat: Infinity,
          repeatType: "reverse",
          delay: 2
        }}
      >
        <Popcorn className="text-primary/60 h-8 w-8" />
      </motion.div>

      <motion.div 
        className="absolute top-1/4 right-5"
        animate={{ 
          rotate: 360
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <Video className="text-primary/60 h-8 w-8" />
      </motion.div>

      <motion.div 
        className="absolute bottom-10 right-10"
        animate={{ 
          y: [0, -15, 0],
          rotate: [0, 5, 0, -5, 0]
        }}
        transition={{ 
          duration: 5, 
          repeat: Infinity,
          repeatType: "reverse",
          delay: 1.5
        }}
      >
        <Ticket className="text-primary/60 h-10 w-10" />
      </motion.div>

      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-primary/5 blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-blue-600/5 blur-3xl translate-x-1/4 translate-y-1/4"></div>
      <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full bg-primary/5 blur-2xl"></div>
    </div>
  );
}