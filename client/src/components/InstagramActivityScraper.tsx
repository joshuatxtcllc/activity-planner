import React, { useState, useEffect } from 'react';
import { 
  Instagram, CheckCircle, XCircle, MapPin, Clock, DollarSign, Tag,
  RefreshCw, Search, AlertCircle, Settings, Users, Bookmark, Eye
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EnhancedActivityType } from '@/lib/activityModel';

// Mock Instagram API classes to be replaced with real implementation
class InstagramActivityScraper {
  private activities: any[] = [];
  private pendingActivities: any[] = [];
  
  constructor(private activityWheel: any) {}
  
  async scrapeInstagramPosts(posts: any[], options = {}) {
    // Process posts and extract activities
    const processed = posts.map(post => {
      const activity = this.extractActivityFromPost(post);
      
      return {
        activity,
        post,
        confidence: 85 // Sample confidence score
      };
    });
    
    this.pendingActivities = processed;
    return processed;
  }
  
  extractActivityFromPost(post: any) {
    // Extract activity from post based on caption, location, etc.
    const { caption, location } = post;
    
    // Determine category from caption
    let category = 'ENTERTAINMENT';
    if (caption.toLowerCase().includes('food') || caption.toLowerCase().includes('restaurant')) {
      category = 'FOOD_DRINK';
    } else if (caption.toLowerCase().includes('hike') || caption.toLowerCase().includes('outdoor')) {
      category = 'OUTDOOR';
    }
    
    // Create an activity with extracted data
    return {
      id: `activity_${Math.random().toString(36).substr(2, 9)}`,
      title: location?.name || 'Instagram Activity',
      description: caption || 'Activity from Instagram',
      category,
      costLevel: 'MEDIUM',
      timeCommitment: 'SHORT',
      location: location?.name || 'Unknown Location',
      isPrivate: false,
      seasonality: ['ALL_YEAR'],
      tags: caption?.match(/#(\w+)/g)?.map((tag: string) => tag.substring(1)) || [],
      imageUrl: post.imageUrl,
      dateAdded: new Date(),
      icon: 'art',
      iconBgClass: 'bg-accent/10'
    };
  }
  
  getPendingActivities() {
    return this.pendingActivities;
  }
  
  approveActivity(activityId: string) {
    const activityItem = this.pendingActivities.find(item => item.activity.id === activityId);
    if (activityItem) {
      this.activities.push(activityItem.activity);
      this.pendingActivities = this.pendingActivities.filter(item => item.activity.id !== activityId);
      return true;
    }
    return false;
  }
  
  rejectActivity(activityId: string) {
    this.pendingActivities = this.pendingActivities.filter(item => item.activity.id !== activityId);
    return true;
  }
}

class InstagramAPIWrapper {
  constructor() {}
  
  async getSavedPosts() {
    try {
      // Get user media from the API
      const response = await fetch('/api/instagram/media');
      if (!response.ok) {
        throw new Error('Failed to fetch Instagram media');
      }
      
      const mediaData = await response.json();
      
      // Check if we have media data
      if (!mediaData || !mediaData.data || !Array.isArray(mediaData.data)) {
        return this.getFallbackPosts();
      }
      
      // Transform the Instagram API response into our format
      return mediaData.data.map((post: any) => {
        // Extract location data from caption if available
        const locationMatch = post.caption ? post.caption.match(/@([^#\s]+)/) : null;
        const location = {
          name: locationMatch ? locationMatch[1] : 'Unknown Location',
          coordinates: null
        };
        
        return {
          id: post.id,
          caption: post.caption || '',
          location,
          timestamp: post.timestamp,
          imageUrl: post.media_url || post.thumbnail_url,
          url: post.permalink,
          poster: post.username
        };
      });
    } catch (error) {
      console.error('Error fetching Instagram posts:', error);
      
      // Return fallback data if the real API fails
      return this.getFallbackPosts();
    }
  }
  
  async getUserPosts(username: string, options = {}) {
    try {
      // Check if we're using our own user's posts
      const userResponse = await fetch('/api/instagram/user');
      if (!userResponse.ok) {
        throw new Error('Failed to fetch Instagram user');
      }
      
      const userData = await userResponse.json();
      
      // If the username matches the current user, use the media endpoint
      if (userData.username === username) {
        return this.getSavedPosts();
      }
      
      // For other users, we need to handle this differently
      // Currently, the Instagram Basic Display API doesn't allow fetching other users' media
      // We would need to upgrade to Instagram Graph API with proper permissions
      
      // Return fallback data for now
      return this.getFallbackUserPosts(username);
    } catch (error) {
      console.error(`Error fetching posts for ${username}:`, error);
      
      // Return fallback data if the real API fails
      return this.getFallbackUserPosts(username);
    }
  }
  
  // Fallback methods for demonstration and development
  private getFallbackPosts() {
    return [
      {
        id: '1',
        caption: 'Just tried the amazing sushi at Kata Robata! Must order the omakase - totally worth the price! 📍 Houston #sushi #omakase #foodie',
        location: { name: 'Kata Robata', coordinates: { latitude: 29.7623, longitude: -95.3639 } },
        timestamp: new Date().toISOString(),
        imageUrl: 'https://placehold.co/300x300',
        url: 'https://instagram.com/p/example1',
        poster: 'your_account'
      },
      {
        id: '2',
        caption: 'Perfect hiking spot at Buffalo Bayou Park! Free and beautiful views of downtown. Go early to beat the heat! 🌳 #houston #hiking #outdoor #fitness',
        location: { name: 'Buffalo Bayou Park', coordinates: { latitude: 29.7633, longitude: -95.3906 } },
        timestamp: new Date().toISOString(),
        imageUrl: 'https://placehold.co/300x300',
        url: 'https://instagram.com/p/example2',
        poster: 'your_account'
      }
    ];
  }
  
  private getFallbackUserPosts(username: string) {
    // Provide sample data based on username for demonstration
    if (username === 'foodie_houston') {
      return [
        {
          id: `${username}_1`,
          caption: `HOT NEW RESTAURANT ALERT! 🔥 Just checked out Bloom & Bee at The Post Oak Hotel and it's my new favorite brunch spot in the city. The avocado toast with poached eggs is next level, and their mimosa flight is Instagram gold. #houston #brunch #foodie`,
          location: { name: 'Bloom & Bee', coordinates: { latitude: 29.7390, longitude: -95.4615 } },
          timestamp: new Date().toISOString(),
          imageUrl: 'https://placehold.co/300x300',
          url: `https://instagram.com/p/${username}_example1`,
          poster: username
        }
      ];
    } else {
      return [
        {
          id: `${username}_1`,
          caption: `Weekend adventure! Found this amazing spot downtown. #adventure #outdoors`,
          location: { name: 'Downtown Area', coordinates: null },
          timestamp: new Date().toISOString(),
          imageUrl: 'https://placehold.co/300x300',
          url: `https://instagram.com/p/${username}_example1`,
          poster: username
        }
      ];
    }
  }
}

// Main component
interface InstagramActivityScraperProps {
  onActivitiesAdded: (activities: EnhancedActivityType[]) => void;
}

export default function InstagramActivityScraperComponent({ onActivitiesAdded }: InstagramActivityScraperProps) {
  const { toast } = useToast();
  const [scraper, setScraper] = useState<InstagramActivityScraper | null>(null);
  const [api, setApi] = useState<InstagramAPIWrapper | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingActivities, setPendingActivities] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<string[]>([]);
  const [newInfluencer, setNewInfluencer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeTab, setActiveTab] = useState('pending');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    autoAddToWheel: false,
    requireManualApproval: true,
    filterByLocation: true,
    locationRadius: 30,
    userLocation: { latitude: 29.7604, longitude: -95.3698 } // Default location
  });
  
  // Initialize scraper
  useEffect(() => {
    // Mock activity wheel
    const activityWheel = { addActivity: (activity: any) => console.log('Adding activity:', activity) };
    const newScraper = new InstagramActivityScraper(activityWheel);
    setScraper(newScraper);
    
    // Load saved influencers from localStorage
    const savedInfluencers = localStorage.getItem('instagram_influencers');
    if (savedInfluencers) {
      setInfluencers(JSON.parse(savedInfluencers));
    }
  }, []);
  
  // Check if we're already connected to Instagram
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/instagram/status');
        const data = await response.json();
        
        if (data.connected) {
          setIsConnected(true);
          // Initialize the API - we'll use the backend as a proxy
          setApi(new InstagramAPIWrapper());
          
          // Auto-process saved posts if we're connected
          setTimeout(() => {
            processSavedPosts();
          }, 500);
        }
      } catch (error) {
        console.error('Error checking Instagram connection:', error);
      }
    };
    
    checkConnection();
  }, []);
  
  // Connect to Instagram using real OAuth flow
  const connectInstagram = async () => {
    try {
      // Redirect to Instagram authorization
      window.location.href = '/api/instagram/auth';
    } catch (error) {
      console.error('Error connecting to Instagram:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to Instagram. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Process saved posts
  const processSavedPosts = async () => {
    if (!scraper || !api) return;
    
    setIsProcessing(true);
    try {
      // Fetch saved posts from Instagram
      const savedPosts = await api.getSavedPosts();
      
      // Process posts through scraper
      await scraper.scrapeInstagramPosts(savedPosts, settings);
      setPendingActivities(scraper.getPendingActivities());
      
      toast({
        title: "Posts Processed",
        description: `Found ${scraper.getPendingActivities().length} potential activities in your saved posts.`,
      });
    } catch (error) {
      console.error('Error processing saved posts:', error);
      toast({
        title: "Error",
        description: "Failed to process saved posts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Add new influencer
  const addInfluencer = () => {
    if (!newInfluencer.trim() || influencers.includes(newInfluencer)) return;
    
    const updatedInfluencers = [...influencers, newInfluencer.trim()];
    setInfluencers(updatedInfluencers);
    localStorage.setItem('instagram_influencers', JSON.stringify(updatedInfluencers));
    setNewInfluencer('');
    
    toast({
      title: "Influencer Added",
      description: `${newInfluencer} has been added to your influencer list.`,
    });
  };
  
  // Remove influencer
  const removeInfluencer = (username: string) => {
    const updatedInfluencers = influencers.filter(inf => inf !== username);
    setInfluencers(updatedInfluencers);
    localStorage.setItem('instagram_influencers', JSON.stringify(updatedInfluencers));
    
    toast({
      title: "Influencer Removed",
      description: `${username} has been removed from your influencer list.`,
    });
  };
  
  // Monitor influencers
  const monitorInfluencers = async () => {
    if (!scraper || !api || influencers.length === 0) return;
    
    setIsProcessing(true);
    try {
      // Process each influencer
      for (const username of influencers) {
        const posts = await api.getUserPosts(username);
        await scraper.scrapeInstagramPosts(posts, settings);
      }
      
      setPendingActivities(scraper.getPendingActivities());
      
      toast({
        title: "Influencers Monitored",
        description: `Found ${scraper.getPendingActivities().length} potential activities from your influencers.`,
      });
    } catch (error) {
      console.error('Error monitoring influencers:', error);
      toast({
        title: "Error",
        description: "Failed to monitor influencers. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Approve an activity
  const approveActivity = (activityId: string) => {
    if (!scraper) return;
    
    scraper.approveActivity(activityId);
    setPendingActivities(scraper.getPendingActivities());
    
    // Get the approved activity and pass it to the parent component
    const approvedActivity = pendingActivities.find(item => item.activity.id === activityId)?.activity;
    if (approvedActivity && onActivitiesAdded) {
      onActivitiesAdded([approvedActivity]);
    }
    
    toast({
      title: "Activity Approved",
      description: "The activity has been added to your activities list.",
    });
  };
  
  // Reject an activity
  const rejectActivity = (activityId: string) => {
    if (!scraper) return;
    
    scraper.rejectActivity(activityId);
    setPendingActivities(scraper.getPendingActivities());
    
    toast({
      title: "Activity Rejected",
      description: "The activity has been removed from the queue.",
      variant: "default"
    });
  };
  
  // Approve all activities
  const approveAll = () => {
    if (!scraper) return;
    
    const approvedActivities = pendingActivities.map(item => item.activity);
    
    pendingActivities.forEach(item => {
      scraper.approveActivity(item.activity.id);
    });
    
    setPendingActivities([]);
    
    if (onActivitiesAdded && approvedActivities.length > 0) {
      onActivitiesAdded(approvedActivities);
    }
    
    toast({
      title: "All Activities Approved",
      description: `${approvedActivities.length} activities have been added to your list.`,
    });
  };
  
  // Filter pending activities
  const filteredActivities = pendingActivities.filter(item => {
    const matchesText = 
      item.activity.title.toLowerCase().includes(filterText.toLowerCase()) ||
      item.activity.location.toLowerCase().includes(filterText.toLowerCase());
    
    const matchesCategory = selectedCategory === 'ALL' || item.activity.category === selectedCategory;
    
    return matchesText && matchesCategory;
  });
  
  // Activity card component
  const ActivityCard = ({ item }: { item: any }) => {
    const { activity, confidence, post } = item;
    
    const getConfidenceColor = (conf: number) => {
      if (conf >= 80) return 'bg-green-100 text-green-700';
      if (conf >= 60) return 'bg-yellow-100 text-yellow-700';
      return 'bg-red-100 text-red-700';
    };
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {activity.title}
                <Badge variant="outline" className={getConfidenceColor(confidence)}>
                  {confidence}% match
                </Badge>
              </CardTitle>
              <CardDescription>{activity.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-2">
          <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-2">
            <span className="flex items-center gap-1">
              <MapPin size={14} /> {activity.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} /> {activity.timeCommitment}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={14} /> {activity.costLevel}
            </span>
            <span className="flex items-center gap-1">
              <Tag size={14} /> {activity.category}
            </span>
          </div>
          
          {activity.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {activity.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-2 text-xs text-gray-500">
          <span>From Instagram</span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 text-red-600"
              onClick={() => rejectActivity(activity.id)}
            >
              <XCircle size={20} />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 text-green-600"
              onClick={() => approveActivity(activity.id)}
            >
              <CheckCircle size={20} />
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };
  
  if (!isConnected) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="border-gray-800 bg-dark-surface">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Instagram size={48} className="text-accent" />
            </div>
            <CardTitle className="text-center">Connect Instagram</CardTitle>
            <CardDescription className="text-center">
              Connect your Instagram account to discover activities from your saved posts and favorite influencers.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button 
              onClick={connectInstagram} 
              className="bg-gradient-to-r from-purple-600 to-pink-500 text-white"
            >
              <Instagram className="mr-2 h-4 w-4" />
              Connect with Instagram
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Instagram size={24} className="text-pink-500" />
          <h2 className="text-2xl font-bold">Instagram Activities</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings size={20} />
        </Button>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Import Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="manual-approval"
                checked={settings.requireManualApproval}
                onCheckedChange={(checked) => 
                  setSettings({...settings, requireManualApproval: checked})
                }
              />
              <Label htmlFor="manual-approval">Require manual approval</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="filter-location"
                checked={settings.filterByLocation}
                onCheckedChange={(checked) => 
                  setSettings({...settings, filterByLocation: checked})
                }
              />
              <Label htmlFor="filter-location">Filter by location</Label>
            </div>
            
            {settings.filterByLocation && (
              <div className="ml-6">
                <Label htmlFor="radius">Distance radius (miles)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={settings.locationRadius}
                  onChange={(e) => 
                    setSettings({...settings, locationRadius: parseInt(e.target.value)})
                  }
                  className="w-24"
                  min="1"
                  max="100"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            <AlertCircle className="mr-2 h-4 w-4" />
            Pending Activities
            {pendingActivities.length > 0 && (
              <Badge className="ml-2">{pendingActivities.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="influencers" className="flex-1">
            <Users className="mr-2 h-4 w-4" />
            Influencers
            {influencers.length > 0 && (
              <Badge className="ml-2">{influencers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-6">
          {/* Actions Bar */}
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Search activities..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="FOOD_DRINK">Food & Drink</SelectItem>
                  <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                  <SelectItem value="ENTERTAINMENT">Entertainment</SelectItem>
                  <SelectItem value="CULTURE">Culture</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={processSavedPosts}
                disabled={isProcessing}
                className="flex-1 md:flex-none"
              >
                <Bookmark className="mr-2 h-4 w-4" />
                {isProcessing ? "Processing..." : "Process Saved"}
                {isProcessing && <RefreshCw className="ml-2 h-4 w-4 animate-spin" />}
              </Button>
              <Button
                variant="outline"
                onClick={monitorInfluencers}
                disabled={isProcessing || influencers.length === 0}
                className="flex-1 md:flex-none"
              >
                <Eye className="mr-2 h-4 w-4" />
                {isProcessing ? "Checking..." : "Check Influencers"}
                {isProcessing && <RefreshCw className="ml-2 h-4 w-4 animate-spin" />}
              </Button>
              {pendingActivities.length > 0 && (
                <Button
                  onClick={approveAll}
                  className="flex-1 md:flex-none"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve All
                </Button>
              )}
            </div>
          </div>
          
          {/* Activities List */}
          {filteredActivities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActivities.map((item) => (
                <ActivityCard key={item.activity.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-dark-surface">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-1">No activities found</h3>
              <p className="text-gray-500">
                {pendingActivities.length === 0
                  ? "Process your saved posts or check influencers to find activities"
                  : "No activities match your current filters"}
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="influencers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Influencers</CardTitle>
              <CardDescription>
                Add Instagram influencers to monitor for new activity ideas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="Enter influencer username"
                  value={newInfluencer}
                  onChange={(e) => setNewInfluencer(e.target.value)}
                />
                <Button onClick={addInfluencer} disabled={!newInfluencer.trim()}>
                  Add
                </Button>
              </div>
              
              {influencers.length > 0 ? (
                <div className="space-y-2">
                  {influencers.map((username) => (
                    <div
                      key={username}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <Instagram size={16} />
                        </div>
                        <span>@{username}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInfluencer(username)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircle size={18} />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg">
                  <Users className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-gray-500">No influencers added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}