import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Folder, FileVideo2, Music, BookOpen, Image, Film, Tv2, Video } from 'lucide-react';

interface EnabledFoldersDisplayProps {
  userId: string;
  folderList: string[];
}

interface FolderInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
}

// Map folder types to icons
const folderTypeIcons: Record<string, React.ReactNode> = {
  movies: <Film className="h-4 w-4 text-indigo-400" />,
  tvshows: <Tv2 className="h-4 w-4 text-blue-400" />,
  music: <Music className="h-4 w-4 text-green-400" />,
  books: <BookOpen className="h-4 w-4 text-yellow-400" />,
  photos: <Image className="h-4 w-4 text-purple-400" />,
  homevideos: <Video className="h-4 w-4 text-pink-400" />,
  mixed: <Folder className="h-4 w-4 text-orange-400" />,
};

// Common keywords to help identify folder types
const folderTypeKeywords: Record<string, string[]> = {
  movies: ['movie', 'film', 'cinema', 'flick'],
  tvshows: ['tv', 'show', 'series', 'episode', 'season'],
  music: ['music', 'song', 'audio', 'mp3', 'album', 'artist'],
  books: ['book', 'ebook', 'audiobook', 'reading'],
  photos: ['photo', 'picture', 'image', 'gallery'],
  homevideos: ['video', 'home', 'personal', 'family'],
};

// Get an icon based on folder name
const getFolderIcon = (folderName: string): React.ReactNode => {
  const lowerName = folderName.toLowerCase();
  
  // Check for keywords in the folder name
  for (const [type, keywords] of Object.entries(folderTypeKeywords)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return folderTypeIcons[type];
    }
  }
  
  // Default to mixed/folder icon
  return folderTypeIcons.mixed;
};

const EnabledFoldersDisplay: React.FC<EnabledFoldersDisplayProps> = ({ userId, folderList }) => {
  const [folderCount, setFolderCount] = useState(0);
  const [folderDetails, setFolderDetails] = useState<FolderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (folderList && folderList.length > 0) {
      setFolderCount(folderList.length);
      fetchFolderDetails();
    } else {
      setIsLoading(false);
    }
    
    async function fetchFolderDetails() {
      setIsLoading(true);
      try {
        // First try to get library folders from the server
        const response = await fetch('/api/users/library-folders');
        
        if (response.ok) {
          const folders = await response.json();
          
          // Map folder IDs to names from the server response
          const mappedFolders = folderList.map(folderId => {
            const folderInfo = folders.find((f: any) => f.id === folderId);
            return {
              id: folderId,
              name: folderInfo?.name || `Media Library ${folderId.substring(0, 4)}`,
              icon: folderInfo?.name ? getFolderIcon(folderInfo.name) : folderTypeIcons.mixed
            };
          });
          
          setFolderDetails(mappedFolders);
        } else {
          // Fallback to generating names
          const generatedNames = [
            'Movies', 'TV Shows', 'Music', 'Photos', 'Books', 
            'Anime', 'Documentaries', 'Home Videos', 'Podcasts', 
            'Audiobooks', 'Sports', 'Comedy', 'Drama', 'News',
            'Kids', 'Educational', 'Action', 'Classics'
          ];
          
          const mappedFolders = folderList.map((folderId, index) => {
            const name = generatedNames[index % generatedNames.length];
            return {
              id: folderId,
              name,
              icon: getFolderIcon(name)
            };
          });
          
          setFolderDetails(mappedFolders);
        }
      } catch (error) {
        console.error('Error fetching folder details:', error);
        
        // Generate fallback names on error
        const fallbackFolders = folderList.map((folderId, index) => ({
          id: folderId,
          name: `Media Library ${index + 1}`,
          icon: getFolderIcon(`Media ${index + 1}`)
        }));
        
        setFolderDetails(fallbackFolders);
      } finally {
        setIsLoading(false);
      }
    }
  }, [folderList, userId]);
  
  if (!folderList || folderList.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-4">
      <motion.div 
        className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 p-3 rounded-lg border border-blue-800/20 overflow-hidden"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-blue-300 font-medium">
            <Database className="h-3.5 w-3.5 inline-block mr-1.5 text-blue-400" />
            Library Access
          </span>
          <span className="text-xs bg-blue-900/40 text-blue-200 px-2 py-0.5 rounded-full border border-blue-800/30">
            {folderCount} {folderCount === 1 ? 'folder' : 'folders'}
          </span>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-2">
            <motion.div 
              className="h-4 w-4 border-2 border-blue-400 rounded-full border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {folderDetails.map((folder, index) => (
              <motion.div
                key={folder.id}
                className="px-2 py-1 rounded bg-blue-900/20 border border-blue-800/10 flex items-center"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 400,
                  damping: 15
                }}
                whileHover={{ 
                  scale: 1.05, 
                  backgroundColor: "rgba(30, 58, 138, 0.3)" 
                }}
              >
                {folder.icon}
                <span className="text-xs text-blue-300 ml-1.5">
                  {folder.name}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default EnabledFoldersDisplay;