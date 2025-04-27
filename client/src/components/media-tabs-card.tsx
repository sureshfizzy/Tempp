import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Film, FileBarChart, Heart } from "lucide-react";
import { motion } from "framer-motion";
import RecentActivityTab from "./recent-activity-tab";
import FavoritesTab from "./favorites-tab";

interface MediaTabsCardProps {
  jellyfinUserId: string;
  getItemLink: (itemId: string) => string;
  openJellyfin: () => void;
}

export default function MediaTabsCard({ jellyfinUserId, getItemLink, openJellyfin }: MediaTabsCardProps) {
  return (
    <Card className="bg-gradient-to-b from-gray-900 to-gray-950 border border-blue-900/40 text-white transition-all duration-300 hover:shadow-xl hover:shadow-blue-800/30 rounded-xl overflow-hidden relative">
      {/* Decorative cinema-inspired elements */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-700 via-indigo-500 to-blue-700 opacity-70"></div>
      <div className="absolute top-10 right-0 w-32 h-32 bg-blue-700/10 blur-[70px] rounded-full"></div>
      
      <Tabs defaultValue="activity" className="relative z-10">
        <CardHeader className="relative z-10 pb-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CardTitle className="flex items-center text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">
              <FileBarChart className="h-5 w-5 mr-2 text-blue-400" />
              Your Media
            </CardTitle>
            <CardDescription className="text-blue-300/70 mb-4">Your Jellyfin activity and favorites</CardDescription>
            
            <TabsList className="bg-black/30 border border-blue-900/30">
              <TabsTrigger 
                value="activity"
                className="data-[state=active]:bg-blue-900/50 data-[state=active]:text-white text-blue-200"
              >
                <Clock className="h-4 w-4 mr-2" />
                Recent Activity
              </TabsTrigger>
              <TabsTrigger 
                value="favorites"
                className="data-[state=active]:bg-blue-900/50 data-[state=active]:text-white text-blue-200"
              >
                <Heart className="h-4 w-4 mr-2" />
                Favorites
              </TabsTrigger>
            </TabsList>
          </motion.div>
        </CardHeader>
        
        {/* Recent Activity Tab */}
        <TabsContent value="activity">
          <CardContent>
            <RecentActivityTab 
              jellyfinUserId={jellyfinUserId} 
              getItemLink={getItemLink}
              openJellyfin={openJellyfin}
            />
          </CardContent>
        </TabsContent>
        
        {/* Favorites Tab */}
        <TabsContent value="favorites">
          <CardContent>
            <FavoritesTab
              jellyfinUserId={jellyfinUserId} 
              getItemLink={getItemLink}
              openJellyfin={openJellyfin}
            />
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}