import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Tag, X, Music, Utensils, Palette } from "lucide-react";
import { insertActivitySchema } from "@shared/schema";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = insertActivitySchema.extend({
  tags: z.array(
    z.object({
      name: z.string(),
      color: z.enum(["secondary", "accent", "default"])
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

interface NewIdeaDialogProps {
  onAddActivity: (activity: FormValues) => void;
}

export function NewIdeaDialog({ onAddActivity }: NewIdeaDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [selectedTagColor, setSelectedTagColor] = useState<"secondary" | "accent" | "default">("default");

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      date: "TBD",
      location: "",
      isPrivate: false,
      isFeatured: false,
      icon: "music",
      iconBgClass: "bg-primary bg-opacity-30",
      attendees: 0,
      tags: [],
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

  const onSubmit = (data: FormValues) => {
    // In a real app, this would call an API to save the activity
    onAddActivity(data);
    toast({
      title: "New idea added!",
      description: `Your activity "${data.title}" has been added.`,
    });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-opacity-80 text-white font-medium rounded-lg transition-colors duration-200 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus mr-2">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          New Idea
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-dark-surface text-light border-gray-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add New Activity Idea</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new activity to add to your collection.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Burlesque Night"
                      className="bg-dark border-gray-700 focus:border-primary"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="TBD or specific date"
                          className="bg-dark border-gray-700 focus:border-primary pl-9"
                          {...field}
                        />
                      </div>
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
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Venue or location"
                          className="bg-dark border-gray-700 focus:border-primary pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-3">
                    <div>
                      <FormLabel>Private Event</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-3">
                    <div>
                      <FormLabel>Featured</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-dark border-gray-700">
                        <SelectValue placeholder="Select an icon type">
                          {field.value === "music" && (
                            <div className="flex items-center gap-2">
                              <Music className="h-4 w-4 text-primary" />
                              <span>Music</span>
                            </div>
                          )}
                          {field.value === "cocktail" && (
                            <div className="flex items-center gap-2">
                              <Utensils className="h-4 w-4 text-secondary" />
                              <span>Cocktail</span>
                            </div>
                          )}
                          {field.value === "art" && (
                            <div className="flex items-center gap-2">
                              <Palette className="h-4 w-4 text-accent" />
                              <span>Art</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-dark-surface border-gray-700">
                      <SelectItem value="music" className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-primary" />
                        <span>Music</span>
                      </SelectItem>
                      <SelectItem value="cocktail" className="flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-secondary" />
                        <span>Cocktail</span>
                      </SelectItem>
                      <SelectItem value="art" className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-accent" />
                        <span>Art</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="iconBgClass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon Background</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-dark border-gray-700">
                        <SelectValue placeholder="Select a background color">
                          {field.value === "bg-primary bg-opacity-30" && (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 bg-primary rounded-full"></div>
                              <span>Purple</span>
                            </div>
                          )}
                          {field.value === "bg-secondary bg-opacity-30" && (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 bg-secondary rounded-full"></div>
                              <span>Blue</span>
                            </div>
                          )}
                          {field.value === "bg-accent bg-opacity-30" && (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 bg-accent rounded-full"></div>
                              <span>Pink</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-dark-surface border-gray-700">
                      <SelectItem value="bg-primary bg-opacity-30" className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-primary rounded-full"></div>
                        <span>Purple</span>
                      </SelectItem>
                      <SelectItem value="bg-secondary bg-opacity-30" className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-secondary rounded-full"></div>
                        <span>Blue</span>
                      </SelectItem>
                      <SelectItem value="bg-accent bg-opacity-30" className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-accent rounded-full"></div>
                        <span>Pink</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Tags</FormLabel>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-grow">
                  <Tag className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tags (e.g., Nightlife, Trendy)"
                    className="bg-dark border-gray-700 focus:border-primary pl-9"
                  />
                </div>
                <Select
                  value={selectedTagColor}
                  onValueChange={(value: "secondary" | "accent" | "default") => setSelectedTagColor(value)}
                >
                  <SelectTrigger className="bg-dark border-gray-700 w-32">
                    <SelectValue placeholder="Color">
                      {selectedTagColor && (
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${
                            selectedTagColor === 'secondary' ? 'bg-secondary' : 
                            selectedTagColor === 'accent' ? 'bg-accent' : 'bg-gray-400'
                          }`}></div>
                          <span>
                            {selectedTagColor === 'secondary' ? 'Blue' : 
                             selectedTagColor === 'accent' ? 'Pink' : 'Gray'}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-dark-surface border-gray-700">
                    <SelectItem value="default" className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
                      <span>Gray</span>
                    </SelectItem>
                    <SelectItem value="secondary" className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-secondary rounded-full"></div>
                      <span>Blue</span>
                    </SelectItem>
                    <SelectItem value="accent" className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-accent rounded-full"></div>
                      <span>Pink</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddTag}
                  variant="outline"
                  className="border-gray-700 hover:bg-primary hover:text-white"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {form.watch("tags").map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant={tag.color === "secondary" ? "secondary" : tag.color === "accent" ? "destructive" : "default"}
                    className="flex items-center gap-1 bg-dark"
                  >
                    {tag.name}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveTag(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <DialogClose asChild>
                <Button variant="outline" className="border-gray-700">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="bg-accent hover:bg-opacity-80">
                Add Activity
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default NewIdeaDialog;