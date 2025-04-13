/**
 * Handle requests for static text resources
 * @param uri Resource URI
 * @returns Response with appropriate static content
 */
export function handleStaticResource(uri) {
    // Database schema resource
    if (uri === "openfoodfacts://schema") {
        return {
            contents: [{
                    uri,
                    text: getDatabaseSchemaText()
                }]
        };
    }
    // API documentation resource
    if (uri === "openfoodfacts://api-docs") {
        return {
            contents: [{
                    uri,
                    text: getApiDocumentationText()
                }]
        };
    }
    // Code patterns resource
    if (uri === "openfoodfacts://code-patterns") {
        return {
            contents: [{
                    uri,
                    text: getCodePatternsText()
                }]
        };
    }
    // File organization resource
    if (uri === "openfoodfacts://file-organization") {
        return {
            contents: [{
                    uri,
                    text: getFileOrganizationText()
                }]
        };
    }
    // Categories taxonomy resource - static implementation
    if (uri === "openfoodfacts://taxonomy/categories") {
        return {
            contents: [{
                    uri,
                    text: getCategoriesTaxonomyText(),
                    metadata: {
                        taxonomyId: "categories",
                        contentType: "text/plain"
                    }
                }]
        };
    }
    throw new Error(`Static resource not found: ${uri}`);
}
/**
 * Get the database schema text
 */
function getDatabaseSchemaText() {
    return `
Open Food Facts Database Schema Overview:

1. Products Collection:
   - Primary collection with food product data
   - Contains fields like:
     * code (barcode, primary key)
     * product_name
     * brands
     * categories
     * ingredients_text
     * nutrition_facts (nested object)
     * images (references to image files)
     * packaging
     * origins

2. Taxonomies:
   - Hierarchical classifications for various product attributes:
     * categories taxonomy
     * ingredients taxonomy
     * additives taxonomy
     * labels taxonomy
     * countries taxonomy

3. User Collection:
   - User account information
   - Contribution statistics

4. Products History:
   - Change history and audit logs for products

5. Image storage:
   - Product images in various formats and sizes

The system uses MongoDB for the main database, and files are stored in the filesystem.
  `;
}
/**
 * Get the API documentation text
 */
function getApiDocumentationText() {
    return `
# Open Food Facts API Documentation

## Core API Endpoints

1. Product Data:
   - GET /api/v2/product/{barcode} - Get product by barcode
   - GET /api/v2/search - Search products with parameters

2. Taxonomies:
   - GET /api/v2/taxonomies - List available taxonomies
   - GET /api/v2/taxonomy/{taxonomy_id} - Get taxonomy details

3. Product Images:
   - GET /images/products/{barcode}/{image_id}.{ext} - Get product image

4. Authentication:
   - POST /cgi/session.pl - Create a new session

## Data Formats

Products are returned in JSON format with various fields depending on the product completeness.

## Search Parameters

- brands: Filter by brand
- categories: Filter by category
- labels: Filter by label
- packaging: Filter by packaging
- origins: Filter by origin
- ingredients: Filter by ingredient
- nutrition_grades: Filter by Nutri-Score

## Additional Features

- Folksonomy API for user-defined tags and properties
- Export API for bulk data access
- Image upload API for contributing photos
  `;
}
/**
 * Get the code patterns text
 */
function getCodePatternsText() {
    return `
# Open Food Facts Code Patterns

## Backend Perl Modules

1. ProductOpener::* - Core modules for the product database
   - ProductOpener::Product - Product data handling
   - ProductOpener::Import - Import functionality
   - ProductOpener::Display - HTML display functions
   - ProductOpener::Tags - Taxonomy related functions

2. CGI Scripts
   - Most functionality is exposed through CGI scripts in the /cgi directory
   - Scripts like product.pl, search.pl handle different web endpoints

3. Frontend Structure
   - JavaScript files in /html/js
   - SCSS stylesheets compiled to CSS
   - Foundation framework for UI components
   - Templates in /templates directory

4. Docker Architecture
   - Multi-container setup with docker-compose
   - Separate containers for frontend, backend, MongoDB, etc.

5. Common Code Patterns
   - Perl modules use object-oriented style with hashes
   - JavaScript follows component-based patterns
   - Internationalization through .po files
   - Taxonomies are central to data organization
  `;
}
/**
 * Get the file organization text
 */
function getFileOrganizationText() {
    return `
# Open Food Facts File Organization

## Core Application Code
- /lib/ProductOpener/*.pm: Perl modules for core business logic
- /cgi/*.pl: CGI script endpoints for web requests
- /html/js/*.js: Frontend JavaScript
- /scss/*.scss: Source SCSS stylesheets

## Templates and UI
- /templates/*.tt: HTML template files
- /html/css/: Compiled CSS stylesheets
- /icons/: Icon files for the UI

## Data Definitions
- /taxonomies/: Hierarchical data classifications
- /ingredients/: Ingredients database
- /emb_codes/: Packaging codes database
- /packager-codes/: Packager identification codes

## Internationalization
- /po/: Translation files
- /lang/: Language-specific resources

## Configuration
- /conf/: Configuration files
- /docker/: Docker configuration files

## Deployment
- Dockerfile: Container definition
- docker-compose.yml: Multi-container configuration
- /scripts/: Utility scripts for deployment and maintenance

## Documentation
- /docs/: Project documentation
- README.md: Project overview

## Tests
- /t/: Test files
- /tests/: Additional test files
  `;
}
/**
 * Get the categories taxonomy text
 */
function getCategoriesTaxonomyText() {
    return `
# Taxonomy: categories

## Food Categories

food:en:Food
  plant_based_food:en:Plant-based foods
    fruits:en:Fruits
      citrus:en:Citrus fruits
        - orange:en:Oranges
        - lemon:en:Lemons
        - lime:en:Limes
      berries:en:Berries
        - strawberry:en:Strawberries
        - blueberry:en:Blueberries
        - raspberry:en:Raspberries
      tropical_fruits:en:Tropical fruits
        - banana:en:Bananas
        - pineapple:en:Pineapples
        - mango:en:Mangoes
    vegetables:en:Vegetables
      root_vegetables:en:Root vegetables
        - carrot:en:Carrots
        - potato:en:Potatoes
      leafy_vegetables:en:Leafy vegetables
        - spinach:en:Spinach
        - lettuce:en:Lettuce
    grains:en:Grains
      - wheat:en:Wheat
      - rice:en:Rice
      - oats:en:Oats
  animal_based_food:en:Animal-based foods
    dairy:en:Dairy products
      - milk:en:Milk
      - cheese:en:Cheese
      - yogurt:en:Yogurt
    meat:en:Meat
      - beef:en:Beef
      - pork:en:Pork
      - chicken:en:Chicken
    seafood:en:Seafood
      - fish:en:Fish
      - shellfish:en:Shellfish
  processed_food:en:Processed foods
    sweets:en:Sweets
      - chocolate:en:Chocolate
      - candy:en:Candy
    snacks:en:Snacks
      - chips:en:Chips
      - crackers:en:Crackers
    beverages:en:Beverages
      - water:en:Water
      - juice:en:Fruit juices
      - soda:en:Soft drinks

## Navigation
- Use openfoodfacts://taxonomy/{taxonomy_id} to view other taxonomies
- For raw taxonomy data, contact the Open Food Facts maintainers
  `;
}
