import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Film, Clock } from "lucide-react";
import { formatDate } from "@/lib/jellyfin";
import { UserActivity } from "@shared/schema";

interface RecentActivityTabProps {
  jellyfinUserId: string;
  getItemLink: (itemId: string) => string;
  openJellyfin: () => void;
}

export default function RecentActivityTab({ jellyfinUserId, getItemLink, openJellyfin }: RecentActivityTabProps) {
  // Fetch watch history
  const watchHistoryQuery = useQuery<{ Items: UserActivity[], TotalRecordCount: number }>({
    queryKey: ["/api/users", jellyfinUserId, "watch-history"],
    queryFn: async () => {
      if (!jellyfinUserId) {
        return { Items: [], TotalRecordCount: 0 };
      }
      
      const response = await fetch(`/api/users/${jellyfinUserId}/watch-history?limit=10`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch watch history: ${errorText}`);
      }
      
      return await response.json();
    },
    enabled: !!jellyfinUserId,
    staleTime: 60000, // 1 minute
  });

  return (
    <div>
      {watchHistoryQuery.isLoading ? (
        <div className="flex justify-center items-center h-32">
          {/* Cinema-inspired loading animation */}
          <div className="relative h-12 w-12">
            <motion.div
              className="absolute inset-0 rounded-full border-t-2 border-blue-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-t-2 border-indigo-300 opacity-70"
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>
      ) : watchHistoryQuery.data && watchHistoryQuery.data.Items && watchHistoryQuery.data.Items.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {watchHistoryQuery.data.Items.slice(0, 5).map((activity, index) => (
              <motion.div 
                key={`${activity.Id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-black/30 p-3 rounded-lg border border-blue-900/40 shadow-inner hover:shadow-blue-800/10 hover:bg-black/40 transition-all"
              >
                <div className="flex items-center">
                  {/* Item Image */}
                  <motion.div 
                    className="relative"
                    whileHover={{ scale: 1.05 }}
                  >
                    <a href={getItemLink(activity.ItemId)} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="h-16 w-28 rounded bg-blue-900/30 overflow-hidden relative">
                        <img 
                          src={`/api/users/${jellyfinUserId}/item-image/${activity.ItemId}`} 
                          alt={activity.Name} 
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
                  
                  {/* Activity Info */}
                  <div className="ml-4 flex-1">
                    <a 
                      href={getItemLink(activity.ItemId)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-100 hover:text-blue-200 hover:underline truncate block font-medium text-sm transition-colors"
                    >
                      {activity.Name}
                    </a>
                    <div className="text-xs text-blue-400/80 mt-1 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(activity.Date)}
                      
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-900/30 to-indigo-900/30 text-blue-300 border border-blue-800/20">
                        {activity.Type === "Movie" ? "Movie" : "Episode"}
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
            <Film className="h-16 w-16 mx-auto mb-4 text-blue-700/50" />
            <p className="text-blue-200 font-medium">No watch history available</p>
            <p className="text-blue-400/60 text-sm mt-1 mb-4">Start watching to see your activity here</p>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                className="bg-blue-950/40 text-blue-200 border border-blue-800/40 hover:bg-blue-900/30"
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