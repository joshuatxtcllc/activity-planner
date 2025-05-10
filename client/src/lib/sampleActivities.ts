import { EnhancedActivityType, createEnhancedActivity } from './activityModel';

// Sample activities for demonstration
export const sampleActivities: EnhancedActivityType[] = [
  createEnhancedActivity({
    id: 1,
    title: "Jazz Night at Blue Note",
    description: "Experience live jazz music at the famous Blue Note venue with world-class musicians in an intimate setting.",
    category: "ENTERTAINMENT",
    costLevel: "MEDIUM",
    timeCommitment: "SHORT",
    location: "Blue Note Jazz Club, New York",
    date: "Fri, May 15",
    tags: [
      { name: "Music", color: "secondary" },
      { name: "Nightlife", color: "accent" },
      { name: "Jazz", color: "default" }
    ],
    attendees: 42
  }),
  createEnhancedActivity({
    id: 2,
    title: "Hiking at Runyon Canyon",
    description: "Enjoy breathtaking views of Los Angeles on this moderately challenging 3-mile loop trail.",
    category: "OUTDOOR",
    costLevel: "FREE",
    timeCommitment: "MEDIUM",
    location: "Runyon Canyon Park, Los Angeles",
    date: "Sat, May 16",
    tags: [
      { name: "Hiking", color: "secondary" },
      { name: "Nature", color: "accent" },
      { name: "Views", color: "default" }
    ],
    attendees: 15
  }),
  createEnhancedActivity({
    id: 3,
    title: "Wine Tasting Tour",
    description: "Explore the Napa Valley region with a guided tour of three premium wineries with tastings included.",
    category: "FOOD_DRINK",
    costLevel: "HIGH",
    timeCommitment: "LONG",
    location: "Napa Valley, California",
    date: "Sun, May 17",
    tags: [
      { name: "Wine", color: "secondary" },
      { name: "Tasting", color: "accent" },
      { name: "Tour", color: "default" }
    ],
    attendees: 28
  }),
  createEnhancedActivity({
    id: 4,
    title: "MoMA Contemporary Art Tour",
    description: "Guided tour of the Museum of Modern Art's contemporary collection with insights into artist techniques and history.",
    category: "CULTURE",
    costLevel: "MEDIUM",
    timeCommitment: "SHORT",
    location: "Museum of Modern Art, New York",
    date: "Wed, May 20",
    tags: [
      { name: "Art", color: "secondary" },
      { name: "Museum", color: "accent" },
      { name: "Tour", color: "default" }
    ],
    attendees: 22
  }),
  createEnhancedActivity({
    id: 5,
    title: "Yoga at Sunset Beach",
    description: "Relaxing yoga session on the beach at sunset. All experience levels welcome. Bring your own mat.",
    category: "RELAXING",
    costLevel: "LOW",
    timeCommitment: "SHORT",
    location: "Venice Beach, Los Angeles",
    date: "Thu, May 21",
    tags: [
      { name: "Yoga", color: "secondary" },
      { name: "Beach", color: "accent" },
      { name: "Wellness", color: "default" }
    ],
    attendees: 18
  }),
  createEnhancedActivity({
    id: 6,
    title: "Beach Volleyball Tournament",
    description: "Join or watch the annual beach volleyball tournament with teams from across the region competing.",
    category: "ACTIVE",
    costLevel: "FREE",
    timeCommitment: "LONG",
    location: "Manhattan Beach, Los Angeles",
    date: "Sat, May 23",
    tags: [
      { name: "Sports", color: "secondary" },
      { name: "Beach", color: "accent" },
      { name: "Competition", color: "default" }
    ],
    attendees: 96
  }),
  createEnhancedActivity({
    id: 7,
    title: "Cooking Class: Italian Pasta",
    description: "Learn to make authentic handmade pasta from scratch with an experienced Italian chef.",
    category: "FOOD_DRINK",
    costLevel: "MEDIUM",
    timeCommitment: "MEDIUM",
    location: "Culinary Institute, Downtown",
    date: "Mon, May 25",
    tags: [
      { name: "Cooking", color: "secondary" },
      { name: "Italian", color: "accent" },
      { name: "Class", color: "default" }
    ],
    attendees: 12
  }),
  createEnhancedActivity({
    id: 8,
    title: "Rock Climbing Intro Session",
    description: "Try indoor rock climbing with professional instruction. All equipment provided.",
    category: "ACTIVE",
    costLevel: "MEDIUM",
    timeCommitment: "SHORT",
    location: "Vertical World Climbing Gym",
    date: "Tue, May 26",
    tags: [
      { name: "Climbing", color: "secondary" },
      { name: "Active", color: "accent" },
      { name: "Indoor", color: "default" }
    ],
    attendees: 8
  }),
  createEnhancedActivity({
    id: 9,
    title: "Poetry Reading Night",
    description: "Local poets share their work in an intimate coffee shop setting.",
    category: "CULTURE",
    costLevel: "LOW",
    timeCommitment: "SHORT",
    location: "Brewing Stories Cafe",
    date: "Wed, May 27",
    tags: [
      { name: "Poetry", color: "secondary" },
      { name: "Literature", color: "accent" },
      { name: "Cafe", color: "default" }
    ],
    attendees: 25
  }),
  createEnhancedActivity({
    id: 10,
    title: "Virtual Reality Experience",
    description: "Try the latest VR technologies with a variety of immersive games and experiences.",
    category: "ENTERTAINMENT",
    costLevel: "MEDIUM",
    timeCommitment: "SHORT",
    location: "Digital Dimensions VR Arcade",
    date: "Thu, May 28",
    tags: [
      { name: "VR", color: "secondary" },
      { name: "Technology", color: "accent" },
      { name: "Gaming", color: "default" }
    ],
    attendees: 30
  })
];