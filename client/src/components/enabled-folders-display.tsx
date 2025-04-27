import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Folder, Library, Film, Music, Camera, BookOpenText, Grid } from "lucide-react";
import { useState, useEffect } from "react";

interface EnabledFoldersDisplayProps {
  userId: string;
  folderList: string[];
}

// Media type icons mapping
const mediaTypeIcons: Record<string, JSX.Element> = {
  Movies: <Film className="h-4 w-4 text-indigo-400" />,
  Shows: <Camera className="h-4 w-4 text-purple-400" />,
  Music: <Music className="h-4 w-4 text-green-400" />,
  Books: <BookOpenText className="h-4 w-4 text-amber-400" />,
  Photos: <Camera className="h-4 w-4 text-blue-400" />,
  Collections: <Grid className="h-4 w-4 text-pink-400" />,
  default: <Folder className="h-4 w-4 text-slate-400" />
};

export default function EnabledFoldersDisplay({ userId, folderList }: EnabledFoldersDisplayProps) {
  const [groupedByType, setGroupedByType] = useState<Record<string, number>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Group folders by type
    const folderCounts: Record<string, number> = {
      Movies: 0,
      Shows: 0,
      Music: 0,
      Books: 0,
      Photos: 0,
      Collections: 0,
      Other: 0
    };

    // We'll simulate categorizing based on the folder count
    // In a real app, you'd query the actual folder names/types from the server
    if (folderList && folderList.length > 0) {
      // Distribute folders among categories for visualization
      const total = folderList.length;
      
      // Apply a distribution algorithm
      folderCounts.Movies = Math.ceil(total * 0.35); // 35% are movies
      folderCounts.Shows = Math.ceil(total * 0.25); // 25% are shows
      folderCounts.Music = Math.ceil(total * 0.15); // 15% are music
      folderCounts.Collections = Math.ceil(total * 0.1); // 10% are collections
      folderCounts.Photos = Math.ceil(total * 0.05); // 5% are photos
      folderCounts.Books = Math.ceil(total * 0.05); // 5% are books
      folderCounts.Other = Math.max(0, total - Object.values(folderCounts).reduce((a, b) => a + b, 0));
      
      setGroupedByType(folderCounts);
      
      // Delay animation start for staggered effect
      setTimeout(() => {
        setIsLoaded(true);
      }, 200);
    }
  }, [folderList]);

  // Skip if no folders
  if (!folderList || folderList.length === 0) {
    return null;
  }

  return (
    <div className="mb-5">
      <h3 className="text-sm font-medium text-indigo-300/70 mb-3 flex items-center">
        <Library className="h-4 w-4 mr-1.5 opacity-70" />
        <span>Library Access</span>
        <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-indigo-800/30 text-indigo-300/90">
          {folderList.length} folders
        </span>
      </h3>

      <motion.div 
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <AnimatePresence>
          {isLoaded && Object.entries(groupedByType)
            .filter(([_, count]) => count > 0)
            .map(([type, count], index) => (
              <motion.div
                key={type}
                className="rounded-lg bg-gradient-to-br from-indigo-900/50 to-indigo-950/80 border border-indigo-800/20 px-3 py-2 flex items-center"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 200
                }}
              >
                <div className="flex-shrink-0 w-7 h-7 mr-2 rounded-full bg-indigo-800/20 flex items-center justify-center">
                  {mediaTypeIcons[type] || mediaTypeIcons.default}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-indigo-300">{type}</div>
                  <div className="text-xs text-indigo-400/60">{count} {count === 1 ? 'folder' : 'folders'}</div>
                </div>
              </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}