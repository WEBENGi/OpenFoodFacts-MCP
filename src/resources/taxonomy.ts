import { processTaxonomy } from "../utils/taxonomy-utils.js";
import fs from "fs";
import path from "path";
import { projectRoot } from "../config/server-config.js";

/**
 * Mock taxonomy content for cases where the real file doesn't exist
 * This ensures clients always get some response even if files are missing
 */
const mockTaxonomies: Record<string, string> = {
  categories: `# Mock Categories Taxonomy (fallback content - real file not found)
# Note: This is placeholder content provided because the categories.txt file was not found

food:en:Food
  plant_based_food:en:Plant-based foods
    fruits:en:Fruits
      citrus:en:Citrus fruits
        orange:en:Oranges
        lemon:en:Lemons
        lime:en:Limes
      berries:en:Berries
        strawberry:en:Strawberries
        blueberry:en:Blueberries
        raspberry:en:Raspberries
      tropical_fruits:en:Tropical fruits
        banana:en:Bananas
        pineapple:en:Pineapples
        mango:en:Mangoes
    vegetables:en:Vegetables
      root_vegetables:en:Root vegetables
        carrot:en:Carrots
        potato:en:Potatoes
      leafy_vegetables:en:Leafy vegetables
        spinach:en:Spinach
        lettuce:en:Lettuce
    grains:en:Grains
      wheat:en:Wheat
      rice:en:Rice
      oats:en:Oats
  animal_based_food:en:Animal-based foods
    dairy:en:Dairy products
      milk:en:Milk
      cheese:en:Cheese
      yogurt:en:Yogurt
    meat:en:Meat
      beef:en:Beef
      pork:en:Pork
      chicken:en:Chicken
    seafood:en:Seafood
      fish:en:Fish
      shellfish:en:Shellfish
  processed_food:en:Processed foods
    sweets:en:Sweets
      chocolate:en:Chocolate
      candy:en:Candy
    snacks:en:Snacks
      chips:en:Chips
      crackers:en:Crackers
    beverages:en:Beverages
      water:en:Water
      juice:en:Fruit juices
      soda:en:Soft drinks`
};

/**
 * Handle requests for taxonomy information
 * @param uri Resource URI
 * @param url Parsed URL object
 * @returns Response with processed taxonomy content
 */
export async function handleTaxonomy(uri: string, url: URL) {
  try {
    const taxonomyId = url.pathname.replace(/^\/\/taxonomy\//, "");
    if (!taxonomyId) {
      throw new Error("Taxonomy ID is required");
    }
    
    // Log debug information
    console.debug(`Processing taxonomy request for: ${taxonomyId}`);
    console.debug(`Project root: ${projectRoot}`);
    
    // Check exact path to taxonomies
    const workingDirectory = process.cwd();
    console.debug(`Current working directory: ${workingDirectory}`);
    
    // Try to resolve taxonomy paths
    const possiblePaths = [
      path.resolve(projectRoot, `taxonomies/${taxonomyId}.txt`),
      path.resolve(projectRoot, `../taxonomies/${taxonomyId}.txt`),
      path.resolve(workingDirectory, `../taxonomies/${taxonomyId}.txt`),
      path.resolve(workingDirectory, `../../taxonomies/${taxonomyId}.txt`),
      path.resolve(workingDirectory, `taxonomies/${taxonomyId}.txt`)
    ];
    
    // Check which paths exist for debugging
    possiblePaths.forEach(p => {
      console.debug(`Checking taxonomy path: ${p}, exists: ${fs.existsSync(p)}`);
    });
    
    const processedTaxonomy = await processTaxonomy(taxonomyId);
    
    // Use the processed taxonomy if available, otherwise use a mock if available
    if (processedTaxonomy) {
      console.debug(`Found and processed taxonomy: ${taxonomyId}`);
      return {
        contents: [{
          uri,
          text: processedTaxonomy.formattedContent,
          metadata: {
            taxonomyId: processedTaxonomy.taxonomyId,
            filepath: processedTaxonomy.filepath
          }
        }]
      };
    } else if (mockTaxonomies[taxonomyId]) {
      console.debug(`Using mock taxonomy for: ${taxonomyId}`);
      // Use mock taxonomy as fallback
      return {
        contents: [{
          uri,
          text: `# Mock ${taxonomyId} Taxonomy (fallback content)\n\n${mockTaxonomies[taxonomyId]}`,
          metadata: {
            taxonomyId,
            filepath: `mock://${taxonomyId}`,
            isMock: true
          }
        }]
      };
    }
    
    // List available taxonomies to help the user
    const availableTaxonomies = await listAvailableTaxonomies();
    
    return {
      contents: [{
        uri,
        text: `Taxonomy '${taxonomyId}' not found despite checking multiple paths.\n\nAvailable taxonomies include: ${availableTaxonomies.join(", ")}\n\nDebug info:\nProject root: ${projectRoot}\nWorking directory: ${workingDirectory}\nPaths checked: ${possiblePaths.join(", ")}`,
        isError: true
      }]
    };
  } catch (error) {
    return {
      contents: [{
        uri,
        text: `Error accessing taxonomy: ${error instanceof Error ? error.message : String(error)}`,
        isError: true
      }]
    };
  }
}

/**
 * List available taxonomies in the project
 * @returns Array of taxonomy names
 */
async function listAvailableTaxonomies(): Promise<string[]> {
  const foundTaxonomies = new Set<string>();
  
  // Try multiple potential taxonomy directories
  const possibleDirs = [
    path.resolve(projectRoot, "taxonomies"),
    path.resolve(projectRoot, "../taxonomies"),
    path.resolve(process.cwd(), "../taxonomies"),
    path.resolve(process.cwd(), "../../taxonomies"),
    path.resolve(process.cwd(), "taxonomies")
  ];
  
  for (const dir of possibleDirs) {
    try {
      if (fs.existsSync(dir)) {
        console.debug(`Found taxonomy directory: ${dir}`);
        
        const files = fs.readdirSync(dir);
        files
          .filter(file => file.endsWith('.txt') && !file.startsWith('.'))
          .forEach(file => {
            const taxonomyName = file.replace('.txt', '').replace('.typed', '');
            foundTaxonomies.add(taxonomyName);
          });
      }
    } catch (err) {
      console.error(`Error reading taxonomy directory ${dir}: ${err}`);
    }
  }
  
  // Add mock taxonomies as fallback options
  Object.keys(mockTaxonomies).forEach(key => {
    foundTaxonomies.add(`${key} (mock available)`);
  });
  
  if (foundTaxonomies.size === 0) {
    return ["No taxonomies found. Please check the path to taxonomies folder."];
  }
  
  return Array.from(foundTaxonomies);
}