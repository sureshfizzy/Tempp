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
        console.log("No Jellyfin user ID provided");
        return { Items: [], TotalRecordCount: 0 };
      }
      
      try {
        console.log(`Fetching favorites for user: ${jellyfinUserId}`);
        const result = await getUserFavorites(jellyfinUserId);
        console.log("Favorites data:", result);
        
        // Additional debugging for items data
        if (result && result.Items && result.Items.length > 0) {
          console.log(`Found ${result.Items.length} favorites`);
          console.log("First favorite item:", result.Items[0]);
        } else {
          console.log("No favorites found or empty result");
          console.log("Raw result:", JSON.stringify(result));
        }
        
        return result;
      } catch (error) {
        console.error("Error fetching favorites:", error);
        throw error;
      }
    },
    enabled: !!jellyfinUserId,
    staleTime: 300000, // 5 minutes
    retry: 2, // Retry failed requests up to 2 times
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
                className="group rounded-lg overflow-hidden transition-all bg-gradient-to-r from-blue-950 to-blue-900/80 hover:from-blue-900 hover:to-blue-800/80 border border-blue-800/30 hover:border-blue-700/50 shadow-md hover:shadow-blue-900/20"
              >
                <a 
                  href={getItemLink(item.Id)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="flex items-center">
                    {/* Item Image */}
                    <motion.div className="relative flex-shrink-0"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {item.ImageTags?.Primary || (item.ImageTags && Object.keys(item.ImageTags).length > 0) ? (
                        <div className="relative">
                          <div className="absolute -inset-0.5 rounded-lg bg-blue-500/20 blur-sm"></div>
                          <div className="h-20 w-14 rounded-lg overflow-hidden relative shadow-lg shadow-blue-900/30">
                            <img 
                              src={`/api/users/${jellyfinUserId}/item-image/${item.Id}${
                                item.ImageTags?.Primary 
                                  ? `?tag=${item.ImageTags.Primary}` 
                                  : item.ImageTags && Object.keys(item.ImageTags).length > 0 
                                    ? `?tag=${Object.values(item.ImageTags)[0]}` 
                                    : ''
                              }`} 
                              alt={item.Name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.log(`Image error for item ${item.Id} (${item.Name})`);
                                console.log(`Image tags:`, item.ImageTags);
                                
                                const img = e.currentTarget as HTMLImageElement;
                                img.onerror = null;
                                img.style.display = 'none';
                                
                                const fallbackEl = img.nextElementSibling as HTMLElement;
                                if (fallbackEl) {
                                  fallbackEl.style.display = 'flex';
                                }
                              }}
                            />
                            <div className="h-full w-full rounded-lg bg-blue-900/80 hidden items-center justify-center absolute inset-0">
                              <Film className="h-6 w-6 text-blue-300" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="absolute -inset-0.5 rounded-lg bg-blue-500/20 blur-sm"></div>
                          <div className="h-20 w-14 rounded-lg bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center relative shadow-lg shadow-blue-900/30">
                            <Film className="h-6 w-6 text-blue-300" />
                          </div>
                        </div>
                      )}
                    </motion.div>
                    
                    {/* Media Details */}
                    <div className="flex-1 p-4">
                      <p className="font-semibold text-blue-100 group-hover:text-white transition-colors duration-200 mb-1">
                        {item.Name}
                      </p>
                      
                      {item.SeriesName && (
                        <p className="text-sm text-blue-300/80">
                          {item.SeriesName} {item.SeasonName ? `• ${item.SeasonName}` : ''}
                        </p>
                      )}
                      
                      <div className="flex items-center mt-1.5">
                        {item.ProductionYear && (
                          <span className="text-xs text-blue-400/80 mr-2">
                            {item.ProductionYear}
                          </span>
                        )}
                        
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-200 border border-blue-800/30">
                          {item.Type === "Movie" ? "Movie" : 
                          item.Type === "Series" ? "Series" : 
                          item.Type === "Episode" ? "Episode" : item.Type}
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          className="text-center py-12 rounded-xl bg-gradient-to-b from-transparent to-blue-950/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Heart className="h-16 w-16 mx-auto mb-4 text-blue-700/50" />
            <p className="text-blue-200 font-medium">No favorites yet</p>
            <p className="text-blue-400/60 text-sm mt-1 mb-4">Mark items as favorites in Jellyfin to see them here</p>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 text-blue-300 border-blue-700/40 bg-blue-900/20 hover:bg-blue-800/30 shadow-lg shadow-blue-900/20"
                onClick={openJellyfin}
              >
                <Play className="mr-2 h-4 w-4" />
                Browse Media
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}