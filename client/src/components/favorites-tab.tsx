import { useQuery } from "@tanstack/react-query";
import { getUserFavorites } from "@/lib/jellyfin";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, Film, Star, Tv2 } from "lucide-react";

interface FavoritesTabProps {
  jellyfinUserId: string;
  getItemLink: (itemId: string) => string;
  openJellyfin: () => void;
}

export default function FavoritesTab({ jellyfinUserId, getItemLink, openJellyfin }: FavoritesTabProps) {
  // Fetch user favorites
  const favoritesQuery = useQuery<{ Items: any[], TotalRecordCount: number }>({
    queryKey: ["/api/users", jellyfinUserId, "favorites"],
    queryFn: async () => {
      if (!jellyfinUserId) {
        return { Items: [], TotalRecordCount: 0 };
      }
      
      return getUserFavorites(jellyfinUserId);
    },
    enabled: !!jellyfinUserId,
    staleTime: 300000, // 5 minutes
  });

  return (
    <div>
      {favoritesQuery.isLoading ? (
        <div className="flex justify-center items-center h-32">
          {/* Cinema-inspired loading animation */}
          <div className="relative h-12 w-12">
            <motion.div
              className="absolute inset-0 rounded-full border-t-2 border-pink-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-t-2 border-blue-300 opacity-70"
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>
      ) : favoritesQuery.data && favoritesQuery.data.Items && favoritesQuery.data.Items.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {favoritesQuery.data.Items.slice(0, 5).map((item, index) => (
              <motion.div 
                key={`${item.Id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-black/30 p-3 rounded-lg border border-pink-900/40 shadow-inner hover:shadow-pink-800/10 hover:bg-black/40 transition-all"
              >
                <div className="flex items-center">
                  {/* Item Image */}
                  <motion.div 
                    className="relative"
                    whileHover={{ scale: 1.05 }}
                  >
                    <a href={getItemLink(item.Id)} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="h-16 w-28 rounded bg-blue-900/30 overflow-hidden relative">
                        <img 
                          src={`/api/users/${jellyfinUserId}/item-image/${item.Id}`} 
                          alt={item.Name} 
                          className="h-full w-full object-cover transition-opacity duration-500 opacity-100"
                          onError={(e) => {
                            // Replace broken image with placeholder
                            (e.target as HTMLImageElement).style.opacity = '0';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
                      </div>
                    </a>
                  </motion.div>
                  
                  {/* Favorite Item Info */}
                  <div className="ml-4 flex-1">
                    <a 
                      href={getItemLink(item.Id)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-100 hover:text-blue-200 hover:underline truncate block font-medium text-sm transition-colors"
                    >
                      {item.Name}
                    </a>
                    <div className="text-xs text-blue-400/80 mt-1 flex items-center">
                      {/* Icon based on media type */}
                      {item.Type === "Movie" ? (
                        <Film className="h-3 w-3 mr-1" />
                      ) : item.Type === "Series" ? (
                        <Tv2 className="h-3 w-3 mr-1" />
                      ) : (
                        <Star className="h-3 w-3 mr-1" />
                      )}
                      
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-pink-900/30 to-purple-900/30 text-pink-200 border border-pink-800/20">
                        {item.Type === "Movie" ? "Movie" : 
                         item.Type === "Series" ? "Series" : 
                         item.Type === "Episode" ? "Episode" : item.Type}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          className="text-center py-12 rounded-xl bg-gradient-to-b from-transparent to-pink-950/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Heart className="h-16 w-16 mx-auto mb-4 text-pink-700/50" />
            <p className="text-blue-200 font-medium">No favorites yet</p>
            <p className="text-blue-400/60 text-sm mt-1 mb-4">Mark items as favorites in Jellyfin to see them here</p>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                className="bg-pink-950/40 text-pink-200 border border-pink-800/40 hover:bg-pink-900/30"
                onClick={openJellyfin}
              >
                Browse media
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}