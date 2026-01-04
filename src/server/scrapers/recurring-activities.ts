import logger from "../utils/logger";
import type { NewEvent } from "../../shared/schema";
import { generateEventHash } from "../utils/deduplication";
import { getNextFridays } from "../utils/date-utils";

/**
 * Generate recurring and always-available activities in Houston
 * These are popular spots and regular events that don't require scraping
 */
export async function generateRecurringActivities(): Promise<NewEvent[]> {
  try {
    logger.info("Generating recurring Houston activities");

    const events: NewEvent[] = [];
    const fridays = getNextFridays(4);

    // Define recurring activities that happen regularly in Houston
    const recurringActivities = [
      // Museums (open most days)
      {
        title: "Visit Museum of Fine Arts Houston",
        description: "Explore one of the largest art museums in the United States with over 70,000 works spanning 6,000 years of history.",
        venue: "Museum of Fine Arts Houston",
        address: "1001 Bissonnet St",
        category: "arts",
        url: "https://www.mfah.org/",
        isFree: false,
        priceMin: 1500, // $15
        priceMax: 2500, // $25
      },
      {
        title: "Houston Museum of Natural Science",
        description: "Discover exhibits on astronomy, space science, Native American culture, paleontology, energy, chemistry, and more.",
        venue: "Houston Museum of Natural Science",
        address: "5555 Hermann Park Dr",
        category: "arts",
        url: "https://www.hmns.org/",
        isFree: false,
        priceMin: 2500, // $25
        priceMax: 3000, // $30
      },
      {
        title: "Space Center Houston",
        description: "NASA's official visitor center featuring space artifacts, exhibits, and tours of NASA Johnson Space Center.",
        venue: "Space Center Houston",
        address: "1601 E NASA Pkwy",
        category: "arts",
        url: "https://www.spacecenter.org/",
        isFree: false,
        priceMin: 3000, // $30
        priceMax: 4000, // $40
      },
      {
        title: "Contemporary Arts Museum Houston",
        description: "Free admission to cutting-edge contemporary art exhibitions in a striking stainless steel building.",
        venue: "Contemporary Arts Museum Houston",
        address: "5216 Montrose Blvd",
        category: "arts",
        url: "https://camh.org/",
        isFree: true,
      },

      // Parks and Outdoor Activities
      {
        title: "Hermann Park Exploration",
        description: "Enjoy 445 acres of green space with Japanese Garden, Miller Outdoor Theatre, pedal boats, and walking trails.",
        venue: "Hermann Park",
        address: "6001 Fannin St",
        category: "outdoor",
        url: "https://www.hermannpark.org/",
        isFree: true,
      },
      {
        title: "Buffalo Bayou Park Adventure",
        description: "Bike, hike, or kayak along 160 acres of green space with trails, public art, and skyline views.",
        venue: "Buffalo Bayou Park",
        address: "1800 Allen Pkwy",
        category: "outdoor",
        url: "https://buffalobayou.org/",
        isFree: true,
      },
      {
        title: "Discovery Green Activities",
        description: "Downtown park featuring interactive fountains, public art, lawn games, and regular free events.",
        venue: "Discovery Green",
        address: "1500 McKinney St",
        category: "outdoor",
        url: "https://www.discoverygreen.com/",
        isFree: true,
      },

      // Food & Markets (weekend events)
      {
        title: "Urban Harvest Farmers Market",
        description: "Weekly farmers market with fresh produce, artisan goods, and prepared foods from local vendors.",
        venue: "Eastside",
        address: "3000 Richmond Ave",
        category: "food",
        url: "https://urbanharvest.org/",
        isFree: true,
        daysOfWeek: [6], // Saturday only
      },
      {
        title: "Heights Mercantile Food Hall",
        description: "Explore diverse food vendors, local breweries, and outdoor seating at this popular Heights destination.",
        venue: "Heights Mercantile",
        address: "714 Yale St",
        category: "food",
        url: "https://heightsmercantile.com/",
        isFree: true,
      },

      // Nightlife & Entertainment
      {
        title: "Live Music on Main Street",
        description: "Explore Houston's vibrant Main Street entertainment district with live music venues and bars.",
        venue: "Main Street Square",
        address: "1001 Main St",
        category: "music",
        url: "https://www.downtownhouston.org/",
        isFree: true,
        daysOfWeek: [5, 6], // Friday and Saturday
      },
      {
        title: "Midtown Nightlife Experience",
        description: "Discover Midtown's bars, clubs, and live music venues in Houston's premier nightlife district.",
        venue: "Midtown",
        address: "Midtown, Houston",
        category: "music",
        url: "https://www.visithoustontexas.com/",
        isFree: true,
        daysOfWeek: [5, 6], // Friday and Saturday
      },

      // Sports & Fitness
      {
        title: "Hiking & Biking Heights Trail",
        description: "Enjoy 6 miles of paved trail connecting parks, neighborhoods, and local businesses.",
        venue: "Heights Hike & Bike Trail",
        address: "Heights Blvd",
        category: "fitness",
        url: "https://www.houstontx.gov/parks/",
        isFree: true,
      },
      {
        title: "Memorial Park Loop",
        description: "Run, walk, or bike the popular 3-mile loop at one of Houston's largest urban parks.",
        venue: "Memorial Park",
        address: "6501 Memorial Dr",
        category: "fitness",
        url: "https://memorialparkconservancy.org/",
        isFree: true,
      },

      // Shopping & Culture
      {
        title: "Houston Livestock Show and Rodeo Trail Rides",
        description: "Experience authentic Texas culture at the world's largest livestock show and rodeo (seasonal: Feb-Mar).",
        venue: "NRG Stadium",
        address: "NRG Pkwy",
        category: "culture",
        url: "https://www.rodeohouston.com/",
        isFree: false,
        priceMin: 2000,
        priceMax: 10000,
        seasonal: true, // Only show in Feb-Mar
      },
      {
        title: "Rice Village Shopping",
        description: "Browse boutiques, restaurants, and shops in this walkable, tree-lined shopping district.",
        venue: "Rice Village",
        address: "2400-2600 University Blvd",
        category: "other",
        url: "https://www.ricevillagehouston.com/",
        isFree: true,
      },
      {
        title: "The Galleria Shopping Experience",
        description: "Shop at Texas's largest mall with 400+ stores, restaurants, and indoor ice skating.",
        venue: "The Galleria",
        address: "5085 Westheimer Rd",
        category: "other",
        url: "https://www.simon.com/mall/the-galleria",
        isFree: true,
      },

      // Art & Theater
      {
        title: "Houston Theater District Shows",
        description: "Catch a show in the Theater District, home to 9 performing arts organizations.",
        venue: "Theater District",
        address: "Downtown Houston",
        category: "arts",
        url: "https://www.theaterdistricthouston.org/",
        isFree: false,
        priceMin: 2500,
        priceMax: 15000,
      },
      {
        title: "Graffiti Park Street Art",
        description: "Explore Houston's famous street art park featuring vibrant murals and graffiti walls.",
        venue: "Graffiti Park",
        address: "2011 Leeland St",
        category: "arts",
        url: "https://www.houstontx.gov/",
        isFree: true,
      },

      // Weekend-specific
      {
        title: "Sunday Funday at Kirby Ice House",
        description: "Enjoy live music, food trucks, and outdoor games at this popular beer garden.",
        venue: "Kirby Ice House",
        address: "3333 Eastside St",
        category: "food",
        url: "https://www.kirbyicehouse.com/",
        isFree: true,
        daysOfWeek: [0], // Sunday only
      },
    ];

    const now = new Date();
    const currentMonth = now.getMonth();

    // Generate events for each upcoming weekend
    for (const friday of fridays) {
      for (const activity of recurringActivities) {
        // Skip seasonal events if not in season
        if (activity.seasonal && !(currentMonth === 1 || currentMonth === 2)) {
          continue;
        }

        // If activity has specific days of week, create events for those days
        if (activity.daysOfWeek && activity.daysOfWeek.length > 0) {
          for (const dayOfWeek of activity.daysOfWeek) {
            const eventDate = new Date(friday);
            const fridayDay = friday.getDay(); // Should be 5 (Friday)

            // Calculate offset from Friday
            let offset = dayOfWeek - fridayDay;
            if (offset < 0) offset += 7;

            eventDate.setDate(eventDate.getDate() + offset);
            eventDate.setHours(10, 0, 0, 0); // Default to 10 AM

            const event: NewEvent = {
              title: activity.title,
              description: activity.description,
              startDate: eventDate,
              location: "Houston, TX",
              venue: activity.venue,
              address: activity.address,
              url: activity.url,
              source: "recurring",
              category: activity.category,
              priceMin: activity.priceMin,
              priceMax: activity.priceMax,
              isFree: activity.isFree,
              uniqueKey: generateEventHash(activity.title, eventDate, "Houston, TX"),
            };

            events.push(event);
          }
        } else {
          // Create for Saturday (default for general activities)
          const saturday = new Date(friday);
          saturday.setDate(saturday.getDate() + 1);
          saturday.setHours(10, 0, 0, 0);

          const event: NewEvent = {
            title: activity.title,
            description: activity.description,
            startDate: saturday,
            location: "Houston, TX",
            venue: activity.venue,
            address: activity.address,
            url: activity.url,
            source: "recurring",
            category: activity.category,
            priceMin: activity.priceMin,
            priceMax: activity.priceMax,
            isFree: activity.isFree,
            uniqueKey: generateEventHash(activity.title, saturday, "Houston, TX"),
          };

          events.push(event);
        }
      }
    }

    logger.info(`Generated ${events.length} recurring activities`);
    return events;
  } catch (error) {
    logger.error("Failed to generate recurring activities", { error });
    return [];
  }
}
