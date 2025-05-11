import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  MapPin, 
  Tag, 
  X, 
  Music, 
  Utensils, 
  Palette, 
  DollarSign,
  Clock,
  Users
} from "lucide-react";
import { insertActivitySchema } from "@shared/schema";
import { EnhancedActivityType } from "@/lib/activityModel";
import { 
  CategoryType, 
  CostLevelType, 
  TimeCommitmentType, 
  SeasonType,
  activityCategories,
  costLevels,
  timeCommitments,
  seasons
} from "@/lib/activityCategories";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { CategoryBadge, CostLevelBadge, TimeCommitmentBadge } from "@/components/CategoryBadge";

// Define the form schema with extended validation
const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000),
  category: z.string() as z.ZodType<CategoryType>,
  costLevel: z.string() as z.ZodType<CostLevelType>,
  timeCommitment: z.string() as z.ZodType<TimeCommitmentType>,
  location: z.string().min(2, "Location must be at least 2 characters"),
  isPrivate: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  seasonality: z.array(z.string() as z.ZodType<SeasonType>).min(1, "Select at least one season"),
  tags: z.array(
    z.object({
      name: z.string(),
      color: z.enum(["secondary", "accent", "default"])
    })
  ),
  date: z.string().optional(),
  icon: z.enum(["music", "cocktail", "art"]),
  iconBgClass: z.string(),
  contactInfo: z.string().optional(),
  attendees: z.number().default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface ActivityCreationFormProps {
  onAddActivity: (activity: EnhancedActivityType) => void;
}

export function ActivityCreationForm({ onAddActivity }: ActivityCreationFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [selectedTagColor, setSelectedTagColor] = useState<"secondary" | "accent" | "default">("default");

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "ENTERTAINMENT",
      costLevel: "MEDIUM",
      timeCommitment: "MEDIUM",
      location: "",
      isPrivate: false,
      isFeatured: false,
      seasonality: ["ALL_YEAR"],
      icon: "music",
      iconBgClass: "bg-primary/10",
      tags: [],
      attendees: 0,
    },
  });

  const handleAddTag = () => {
    if (tagInput.trim() !== "") {
      const currentTags = form.getValues("tags");
      form.setValue("tags", [
        ...currentTags, 
        { name: tagInput.trim(), color: selectedTagColor }
      ]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (index: number) => {
    const currentTags = form.getValues("tags");
    form.setValue("tags", currentTags.filter((_, i) => i !== index));
  };

  const selectedCategory = form.watch("category");
  const selectedCostLevel = form.watch("costLevel");
  const selectedTimeCommitment = form.watch("timeCommitment");
  const selectedIcon = form.watch("icon");

  const getIconClass = (iconType: string) => {
    return selectedIcon === iconType 
      ? "bg-accent/20 border-accent" 
      : "bg-gray-800 border-gray-700 hover:bg-gray-700";
  };

  const onSubmit = async (data: FormValues) => {
    try {
      // Prepare the activity data
      const activityData = {
        ...data,
        // Include required fields for the EnhancedActivityType
        id: Date.now().toString(), // Temporary ID that will be replaced by the server
        dateAdded: new Date(),
        lastSelected: null,
        timesSelected: 0,
      } as EnhancedActivityType;
      
      // Call the onAddActivity prop
      onAddActivity(activityData);
      
      // Show success toast
      toast({
        title: "New activity added!",
        description: `Your activity "${data.title}" has been added successfully.`,
      });
      
      // Close dialog and reset form
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error adding activity:", error);
      toast({
        title: "Error",
        description: "Failed to add activity. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/80 text-white font-medium rounded-lg transition-colors duration-200 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus mr-2">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Create New Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background border-border sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Activity</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add a new activity to your collection. Fill out the form below with your activity details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Basic Information Section */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Rooftop Jazz Night"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the activity in detail..."
                          className="resize-none min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Where will this activity take place?"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Info (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Phone, website, email, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                {/* Categories Section */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(activityCategories).map(([value, { label, description }]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center">
                                <CategoryBadge 
                                  category={value as CategoryType} 
                                  size="sm" 
                                  className="mr-2"
                                />
                                <span>{label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedCategory && (
                        <div className="mt-2">
                          <CategoryBadge 
                            category={selectedCategory} 
                            withLabel
                          />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="costLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Level</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a cost level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(costLevels).map(([value, { label, description }]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center">
                                <CostLevelBadge 
                                  costLevel={value as CostLevelType} 
                                  size="sm" 
                                  className="mr-2" 
                                />
                                <span>{label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedCostLevel && (
                        <div className="mt-2">
                          <CostLevelBadge 
                            costLevel={selectedCostLevel} 
                          />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeCommitment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Commitment</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time commitment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(timeCommitments).map(([value, { label, description }]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center">
                                <TimeCommitmentBadge 
                                  timeCommitment={value as TimeCommitmentType} 
                                  size="sm" 
                                  className="mr-2" 
                                />
                                <span>{label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTimeCommitment && (
                        <div className="mt-2">
                          <TimeCommitmentBadge 
                            timeCommitment={selectedTimeCommitment} 
                          />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seasonality"
                  render={() => (
                    <FormItem>
                      <FormLabel>Seasonality</FormLabel>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {Object.entries(seasons).map(([season, { label, color }]) => (
                          <FormField
                            key={season}
                            control={form.control}
                            name="seasonality"
                            render={({ field }) => {
                              const isSelected = field.value?.includes(season as SeasonType);
                              return (
                                <FormItem
                                  key={season}
                                  className="flex flex-row items-start space-x-2 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        const currentSeasons = [...field.value];
                                        if (checked) {
                                          if (!currentSeasons.includes(season as SeasonType)) {
                                            field.onChange([...currentSeasons, season as SeasonType]);
                                          }
                                        } else {
                                          field.onChange(
                                            currentSeasons.filter((s) => s !== season)
                                          );
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    <span className={`inline-block w-3 h-3 rounded-full mr-1 ${color}`}></span>
                                    {label}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Tags Section */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.getValues("tags").map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant={tag.color as any}
                        className="flex items-center gap-1 text-sm py-1"
                      >
                        <span>{tag.name}</span>
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleRemoveTag(index)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Select 
                      value={selectedTagColor} 
                      onValueChange={(val) => setSelectedTagColor(val as any)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="secondary">Purple</SelectItem>
                        <SelectItem value="accent">Accent</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleAddTag}
                    >
                      Add
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Icon Selection */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <div className="flex gap-4 mt-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={`p-4 rounded-md border ${getIconClass("music")}`}
                            onClick={() => form.setValue("icon", "music")}
                          >
                            <Music className="h-6 w-6" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Music & Entertainment</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={`p-4 rounded-md border ${getIconClass("cocktail")}`}
                            onClick={() => form.setValue("icon", "cocktail")}
                          >
                            <Utensils className="h-6 w-6" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Food & Drinks</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={`p-4 rounded-md border ${getIconClass("art")}`}
                            onClick={() => form.setValue("icon", "art")}
                          >
                            <Palette className="h-6 w-6" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Art & Culture</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Privacy Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                    <div className="space-y-0.5">
                      <FormLabel>Private Activity</FormLabel>
                      <FormDescription className="text-xs">
                        Only visible to you
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                    <div className="space-y-0.5">
                      <FormLabel>Featured Activity</FormLabel>
                      <FormDescription className="text-xs">
                        Highlight on dashboard
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <DialogClose asChild>
                <Button variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="bg-accent hover:bg-accent/80">
                Create Activity
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default ActivityCreationForm;