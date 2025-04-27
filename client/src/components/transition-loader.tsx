import { useEffect } from 'react';
import { ClapperboardIcon } from "lucide-react";
import { motion } from "framer-motion";

// Global loading state
let globalLoadingState = false;

// Create a function to show the loader
export function showGlobalLoader(message = "Loading...") {
  globalLoadingState = true;
  
  // Create or update the loader element
  let loaderEl = document.getElementById('global-transition-loader');
  
  if (!loaderEl) {
    loaderEl = document.createElement('div');
    loaderEl.id = 'global-transition-loader';
    loaderEl.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950';
    
    const innerHtml = `
      <div class="text-center">
        <div class="inline-block mb-4">
          <svg class="h-20 w-20 text-primary animate-[spin_3s_ease-in-out_infinite]" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8"></path><path d="M4 11v-3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3"></path><path d="M14 11V7a3 3 0 0 0-3-3v0a3 3 0 0 0-3 3v4"></path></svg>
        </div>
        <h2 id="loader-message" class="text-2xl font-bold text-white mb-2">${message}</h2>
        <div class="relative w-48 h-1 bg-gray-800 rounded-full overflow-hidden mt-4 mx-auto">
          <div class="absolute top-0 left-0 h-full bg-primary animate-[loader-progress_1.5s_ease-in-out_infinite]"></div>
        </div>
      </div>

      <style>
        @keyframes loader-progress {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
      </style>
    `;
    
    loaderEl.innerHTML = innerHtml;
    document.body.appendChild(loaderEl);
  } else {
    // Update the message if the loader already exists
    const messageEl = loaderEl.querySelector('#loader-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
    
    // Make sure the loader is visible
    loaderEl.style.display = 'flex';
  }
}

// Create a function to hide the loader
export function hideGlobalLoader() {
  globalLoadingState = false;
  
  const loaderEl = document.getElementById('global-transition-loader');
  if (loaderEl) {
    // Use a slight delay before removing to ensure the new page is rendered
    setTimeout(() => {
      if (!globalLoadingState) { // Only remove if still not loading
        loaderEl.style.display = 'none';
      }
    }, 300);
  }
}

// A component that can monitor page transitions
export function TransitionLoader() {
  useEffect(() => {
    // When the component unmounts (route change), we want to hide the loader
    return () => {
      hideGlobalLoader();
    };
  }, []);

  return null; // This component doesn't render anything
}

// A component that renders the loading screen directly
export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "loop"
          }}
          className="inline-block mb-4"
        >
          <ClapperboardIcon className="h-20 w-20 text-primary" />
        </motion.div>
        
        <motion.h2 
          className="text-2xl font-bold text-white mb-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {message}
        </motion.h2>
        
        <div className="relative w-48 h-1 bg-gray-800 rounded-full overflow-hidden mt-4 mx-auto">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}