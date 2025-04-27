import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Folder, FileVideo2, Music, BookOpen, Image, Film, Tv2 } from 'lucide-react';

interface EnabledFoldersDisplayProps {
  userId: string;
  folderList: string[];
}

// Maps folder IDs to more user-friendly names and icons
const getFolderIcon = (index: number) => {
  const icons = [
    <Film className="h-4 w-4 text-indigo-400" />,
    <Tv2 className="h-4 w-4 text-blue-400" />,
    <Music className="h-4 w-4 text-green-400" />,
    <BookOpen className="h-4 w-4 text-yellow-400" />,
    <Image className="h-4 w-4 text-purple-400" />,
    <FileVideo2 className="h-4 w-4 text-pink-400" />,
    <Folder className="h-4 w-4 text-orange-400" />,
  ];
  
  return icons[index % icons.length];
};

const EnabledFoldersDisplay: React.FC<EnabledFoldersDisplayProps> = ({ userId, folderList }) => {
  const [folderCount, setFolderCount] = useState(0);
  
  useEffect(() => {
    if (folderList && folderList.length > 0) {
      setFolderCount(folderList.length);
    }
  }, [folderList]);
  
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
        
        <div className="flex flex-wrap gap-1.5">
          {folderList.map((folderId, index) => (
            <motion.div
              key={folderId}
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
              {getFolderIcon(index)}
              <span className="text-xs text-blue-300 ml-1.5">
                Library {index + 1}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default EnabledFoldersDisplay;