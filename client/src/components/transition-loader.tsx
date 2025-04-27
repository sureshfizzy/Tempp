import { useEffect } from 'react';
import { ClapperboardIcon } from "lucide-react";

// Create a simpler, more direct approach that won't cause white flashes
export function showGlobalLoader(message = "Loading...") {
  // Create the loader container if it doesn't exist
  let loader = document.getElementById('global-transition-loader');
  
  if (!loader) {
    // Create container element
    loader = document.createElement('div');
    loader.id = 'global-transition-loader';
    loader.style.position = 'fixed';
    loader.style.top = '0';
    loader.style.left = '0';
    loader.style.width = '100%';
    loader.style.height = '100%';
    loader.style.backgroundColor = '#0f172a'; // slate-950
    loader.style.display = 'flex';
    loader.style.alignItems = 'center';
    loader.style.justifyContent = 'center';
    loader.style.zIndex = '9999';
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s';
    
    // Create content
    const content = document.createElement('div');
    content.style.textAlign = 'center';
    
    // Add icon
    const iconWrapper = document.createElement('div');
    iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8"></path><path d="M4 11v-3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3"></path><path d="M14 11V7a3 3 0 0 0-3-3v0a3 3 0 0 0-3 3v4"></path></svg>`;
    iconWrapper.style.marginBottom = '1rem';
    iconWrapper.style.animation = 'pulse 2s infinite';
    
    // Add message
    const messageEl = document.createElement('h2');
    messageEl.id = 'loader-message';
    messageEl.textContent = message;
    messageEl.style.color = 'white';
    messageEl.style.fontSize = '1.5rem';
    messageEl.style.fontWeight = 'bold';
    messageEl.style.marginBottom = '1rem';
    
    // Add progress bar
    const progressContainer = document.createElement('div');
    progressContainer.style.position = 'relative';
    progressContainer.style.width = '200px';
    progressContainer.style.height = '4px';
    progressContainer.style.backgroundColor = 'rgba(255,255,255,0.1)';
    progressContainer.style.borderRadius = '9999px';
    progressContainer.style.overflow = 'hidden';
    progressContainer.style.margin = '0 auto';
    
    const progressBar = document.createElement('div');
    progressBar.style.position = 'absolute';
    progressBar.style.top = '0';
    progressBar.style.left = '0';
    progressBar.style.height = '100%';
    progressBar.style.backgroundColor = '#3b82f6'; // primary blue
    progressBar.style.animation = 'loaderProgress 1.5s ease-in-out infinite';
    progressBar.style.borderRadius = '9999px';
    progressContainer.appendChild(progressBar);
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      @keyframes loaderProgress {
        0% { width: 0%; left: 0; }
        50% { width: 100%; left: 0; }
        100% { width: 0%; left: 100%; }
      }
      
      #global-transition-loader .icon {
        color: #3b82f6;
      }
    `;
    
    // Assemble elements
    content.appendChild(iconWrapper);
    content.appendChild(messageEl);
    content.appendChild(progressContainer);
    loader.appendChild(content);
    document.head.appendChild(styles);
    document.body.appendChild(loader);
  } else {
    // If loader exists, just update the message
    const messageEl = loader.querySelector('#loader-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
    
    // Make sure it's in the document
    if (!document.body.contains(loader)) {
      document.body.appendChild(loader);
    }
  }
  
  // Force a reflow to ensure the transition works
  loader.offsetHeight;
  
  // Show the loader
  loader.style.opacity = '1';
  loader.style.display = 'flex';
}

export function hideGlobalLoader() {
  const loader = document.getElementById('global-transition-loader');
  if (loader) {
    // Fade out
    loader.style.opacity = '0';
    
    // Then hide after transition completes
    setTimeout(() => {
      loader.style.display = 'none';
    }, 300); // Match the transition duration
  }
}

// Component to attach to React lifecycle
export function TransitionLoader() {
  useEffect(() => {
    // Create the loader on component mount but keep it hidden
    showGlobalLoader();
    hideGlobalLoader();
    
    // Intercept all form submissions and link clicks
    const handleNavigation = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      // If it's a link with an href that points to a different page (not an anchor or external link)
      if (link) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/') && href !== window.location.pathname) {
          showGlobalLoader("Loading page...");
        }
      }
    };
    
    // On any click, check if it's a navigation element
    document.addEventListener('click', handleNavigation);
    
    // Also handle history based navigation
    const handlePopState = () => {
      showGlobalLoader("Loading page...");
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      document.removeEventListener('click', handleNavigation);
      window.removeEventListener('popstate', handlePopState);
      hideGlobalLoader();
    };
  }, []);

  return null;
}

// A version that renders directly in React
export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block mb-4">
          <ClapperboardIcon className="h-20 w-20 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{message}</h2>
        <div className="relative w-48 h-1 bg-gray-800 rounded-full overflow-hidden mt-4 mx-auto">
          <div className="absolute top-0 left-0 h-full bg-primary animate-[loader-progress_1.5s_ease-in-out_infinite]"></div>
        </div>
      </div>
    </div>
  );
}