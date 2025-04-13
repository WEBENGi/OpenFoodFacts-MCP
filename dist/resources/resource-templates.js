// filepath: /Users/jagjeevankashid/Developer/open-source/openfoodfacts-server/mcp-server/src/resources/resource-templates.ts
/**
 * Resource Templates for Open Food Facts MCP Server
 * Provides templated resources for common development tasks
 */
/**
 * Available resource templates
 */
const templates = {
    "api-endpoint": {
        id: "api-endpoint",
        name: "API Endpoint Template",
        description: "Template for creating a new API endpoint",
        template: `
# API Endpoint Template

## Endpoint Overview
- **Name**: [Endpoint Name]
- **Path**: /api/v2/[path]
- **Method**: [GET/POST/PUT/DELETE]
- **Description**: [Brief description of what this endpoint does]

## Request Parameters
\`\`\`json
{
  "param1": "string | Parameter description",
  "param2": "number | Parameter description",
  "param3": "boolean | Parameter description (optional)"
}
\`\`\`

## Response Format
\`\`\`json
{
  "status": "success",
  "data": {
    "field1": "string | Field description",
    "field2": "number | Field description",
    "field3": "array | Array of items"
  }
}
\`\`\`

## Implementation Steps
1. Create route handler in the appropriate module
2. Implement parameter validation
3. Add authentication checks if needed
4. Process request and generate response
5. Add error handling
6. Document in API documentation

## Example Code
\`\`\`perl
sub process_api_request {
  my ($request_ref) = @_;
  
  # Validate parameters
  my $param1 = $request_ref->{param1};
  if (not defined $param1) {
    return { status => 'error', error => 'Missing required parameter: param1' };
  }
  
  # Process request
  my $result = do_something_with($param1);
  
  # Return response
  return {
    status => 'success',
    data => $result
  };
}
\`\`\`

## Testing
- Test with valid parameters
- Test with missing parameters
- Test with invalid parameters
- Test with edge cases
`
    },
    "taxonomy": {
        id: "taxonomy",
        name: "Taxonomy Template",
        description: "Template for creating or updating a taxonomy",
        template: `
# Taxonomy Template

## Taxonomy Overview
- **Name**: [Taxonomy Name]
- **File**: taxonomies/[taxonomy_id].txt
- **Description**: [Brief description of what this taxonomy represents]

## Structure Guidelines
Taxonomies in Open Food Facts follow a hierarchical structure:

\`\`\`
category1:en:Main Category 1
  subcategory1:en:Subcategory 1
    subsubcategory1:en:Sub-subcategory 1
  subcategory2:en:Subcategory 2
category2:en:Main Category 2
\`\`\`

## Implementation Steps
1. Create or update the taxonomy file in the taxonomies directory
2. Add translations for all entries
3. Ensure proper indentation (2 spaces per level)
4. Add comments where necessary with #

## Properties Format
Properties can be added to taxonomy entries:

\`\`\`
category:en:Category
  # properties
  carbon_footprint:en:low
  country:en:france
  # children
  subcategory:en:Subcategory
\`\`\`

## Example Implementation
\`\`\`
# This is a comment
vegetables:en:Vegetables
  # properties
  protected_name_type:en:pgi
  # children
  carrots:en:Carrots
    baby_carrots:en:Baby carrots
  tomatoes:en:Tomatoes
    cherry_tomatoes:en:Cherry tomatoes
    plum_tomatoes:en:Plum tomatoes
fruits:en:Fruits
  apples:en:Apples
    granny_smith:en:Granny Smith apples
  bananas:en:Bananas
\`\`\`

## Testing
- Validate the taxonomy file structure
- Test with the taxonomy browser
- Ensure all translations are provided
`
    },
    "mongodb-query": {
        id: "mongodb-query",
        name: "MongoDB Query Template",
        description: "Template for creating MongoDB queries for Open Food Facts data",
        template: `
# MongoDB Query Template

## Query Overview
- **Purpose**: [Describe what this query accomplishes]
- **Collection**: [Target collection, usually 'products']
- **Operation**: [find/update/aggregate/etc.]

## Basic Query Structure
\`\`\`javascript
db.products.find({
  // Query criteria
  field1: "value1",
  field2: { $operator: "value2" }
}, {
  // Projection (fields to include/exclude)
  field1: 1,
  field2: 1,
  _id: 0
})
\`\`\`

## Common Query Patterns

### Finding Products by Barcode
\`\`\`javascript
db.products.find({ code: "3017620422003" })
\`\`\`

### Finding Products by Brand
\`\`\`javascript
db.products.find({ brands_tags: "brand-name" })
\`\`\`

### Finding Products by Category
\`\`\`javascript
db.products.find({ categories_tags: "category-name" })
\`\`\`

### Finding Products by Ingredient
\`\`\`javascript
db.products.find({ ingredients_tags: "ingredient-name" })
\`\`\`

### Advanced Aggregation
\`\`\`javascript
db.products.aggregate([
  { $match: { categories_tags: "category-name" } },
  { $group: { 
      _id: "$brands_tags", 
      count: { $sum: 1 } 
    } 
  },
  { $sort: { count: -1 } },
  { $limit: 10 }
])
\`\`\`

## Performance Considerations
- Use indexed fields in queries
- Limit the number of returned documents
- Use projections to limit returned fields
- Consider pagination for large result sets
- Use explain() to analyze query performance

## Implementation in Perl
\`\`\`perl
sub find_products_by_criteria {
  my ($criteria_ref) = @_;
  
  return get_products_collection()->query($criteria_ref)->fields({
    code => 1, 
    product_name => 1,
    brands => 1,
    _id => 0
  })->all();
}
\`\`\`

## Testing Tips
- Test with a limited dataset first
- Verify indexes exist for query fields
- Check performance with explain()
- Test edge cases and null values
`
    },
    "product-schema": {
        id: "product-schema",
        name: "Product Schema Template",
        description: "Template showing the product data schema",
        template: `
# Product Schema Template

## Core Product Fields
\`\`\`json
{
  "code": "3017620422003",           // Barcode (primary key)
  "product_name": "Nutella",         // Product name
  "brands": "Ferrero",               // Brand name(s)
  "categories": "Spreads,Chocolate", // Categories (comma separated)
  "quantity": "400g",                // Product quantity/weight
  "packaging": "Glass jar",          // Packaging description
  "ingredients_text": "Sugar, palm oil, hazelnuts...", // Ingredients list
  "image_url": "https://...",        // Main product image URL
  "images": { ... },                 // All product images
  "nutriments": { ... },             // Nutrition facts
  "nova_group": 4,                   // NOVA group (1-4)
  "nutriscore_grade": "E",           // Nutri-Score (A-E)
  "ecoscore_grade": "D",             // Eco-Score (A-E)
  "labels": "Organic,Fair Trade",    // Product labels
  "origins": "France",               // Product origin
  "manufacturing_places": "Italy",   // Manufacturing location
  "stores": "Carrefour,Walmart",     // Stores where available
  "countries": "en:france,en:belgium", // Countries where sold
  "lang": "fr"                       // Primary language
}
\`\`\`

## Nutriments Structure
\`\`\`json
"nutriments": {
  "energy": 2252,                 // Energy in kJ
  "energy_unit": "kJ",
  "energy_value": 539,
  "energy-kcal": 539,             // Energy in kcal
  "energy-kcal_unit": "kcal",
  "energy-kcal_value": 539,
  "fat": 30.9,                    // Fat in g
  "fat_unit": "g",
  "fat_value": 30.9,
  "saturated-fat": 10.6,          // Saturated fat in g
  "saturated-fat_unit": "g",
  "saturated-fat_value": 10.6,
  "carbohydrates": 57.5,          // Carbohydrates in g
  "carbohydrates_unit": "g",
  "carbohydrates_value": 57.5,
  "sugars": 56.3,                 // Sugars in g
  "sugars_unit": "g",
  "sugars_value": 56.3,
  "proteins": 6.3,                // Proteins in g
  "proteins_unit": "g",
  "proteins_value": 6.3,
  "salt": 0.107,                  // Salt in g
  "salt_unit": "g",
  "salt_value": 0.107,
  "sodium": 0.0428,               // Sodium in g
  "sodium_unit": "g",
  "sodium_value": 0.0428
}
\`\`\`

## Images Structure
\`\`\`json
"images": {
  "front": {
    "thumb": {
      "en": "https://..."
    },
    "display": {
      "en": "https://..."
    },
    "small": {
      "en": "https://..."
    }
  },
  "ingredients": {
    "thumb": {
      "en": "https://..."
    },
    "display": {
      "en": "https://..."
    },
    "small": {
      "en": "https://..."
    }
  },
  "nutrition": {
    "thumb": {
      "en": "https://..."
    },
    "display": {
      "en": "https://..."
    },
    "small": {
      "en": "https://..."
    }
  }
}
\`\`\`

## Common Field Patterns
- Original fields: "field_name"
- Normalized fields: "field_name_tags"
- Translated fields: "field_name_[lang]"
- Hierarchy fields: "field_name_hierarchy"
- Serving fields: "field_name_serving"
- 100g/ml fields: "field_name_100g"

## Example Usage
\`\`\`perl
my $product_ref = {
  code => "3017620422003",
  product_name => "Nutella",
  brands => "Ferrero",
  categories => "Spreads,Chocolate spreads,Hazelnut spreads",
  nutriments => {
    energy => 2252,
    fat => 30.9,
    # ... other nutriments
  }
};
\`\`\`
`
    },
    "data-import": {
        id: "data-import",
        name: "Data Import Template",
        description: "Template for creating data import scripts",
        template: `
# Data Import Template

## Import Overview
- **Purpose**: [Describe what this import script does]
- **Data Source**: [Describe the source of the data]
- **Target Collection**: [Usually 'products']
- **Import Frequency**: [How often this import should run]

## Data Format
Describe the expected format of the input data:

\`\`\`json
[
  {
    "field1": "value1",
    "field2": "value2",
    ...
  },
  ...
]
\`\`\`

## Field Mappings
Map source data fields to Open Food Facts fields:

| Source Field | OFF Field       | Notes                            |
|-------------|------------------|----------------------------------|
| source_id   | code             | Convert to string if needed      |
| name        | product_name     | Direct mapping                   |
| brand       | brands           | Direct mapping                   |
| category    | categories       | Might need taxonomy matching     |
| ingredients | ingredients_text | Direct mapping                   |
| ...         | ...              | ...                              |

## Implementation Steps

1. Fetch/read the source data
2. Validate and clean the data
3. Map fields to OFF schema
4. Handle special cases and transformations
5. Load data into the database
6. Log results and errors

## Example Script
\`\`\`perl
#!/usr/bin/perl

use strict;
use warnings;
use ProductOpener::Config;
use ProductOpener::Store;
use ProductOpener::Import;

# Initialize
init_product_databases();

# Read source data
my $data = read_source_data("path/to/source/file");

# Process each record
my $count = 0;
my $errors = 0;

foreach my $item (@{$data}) {
  # Map fields
  my $product_ref = {
    code => $item->{source_id},
    product_name => $item->{name},
    brands => $item->{brand},
    categories => $item->{category},
    ingredients_text => $item->{ingredients},
    # Add more field mappings
  };
  
  # Validate required fields
  if (not defined $product_ref->{code}) {
    print STDERR "Error: Missing code for item: " . encode_json($item) . "\n";
    $errors++;
    next;
  }
  
  # Store the product
  eval {
    store_product($product_ref);
    $count++;
  };
  if ($@) {
    print STDERR "Error storing product $product_ref->{code}: $@\n";
    $errors++;
  }
}

print "Import complete: $count products imported, $errors errors\n";
\`\`\`

## Error Handling
- Log all errors with product codes
- Continue processing on non-fatal errors
- Validate required fields before storage
- Consider a dry-run mode

## Testing
- Test with a small sample first
- Verify field mappings are correct
- Check for duplicates
- Validate against product schema
`
    }
};
/**
 * Handle requests for resource templates
 * @param uri Resource URI
 * @returns Response with template content
 */
export async function handleResourceTemplate(uri) {
    try {
        // Extract template ID from URI (after "openfoodfacts://template/")
        const templateId = uri.replace("openfoodfacts://template/", "").trim();
        // If no specific template requested, list all available templates
        if (!templateId) {
            return {
                contents: [{
                        uri,
                        text: getAvailableTemplatesList(),
                        metadata: {
                            contentType: "text/plain"
                        }
                    }]
            };
        }
        // Check if the requested template exists
        if (!templates[templateId]) {
            return {
                contents: [{
                        uri,
                        text: `Template '${templateId}' not found. Available templates: ${Object.keys(templates).join(", ")}`,
                        isError: true
                    }]
            };
        }
        // Return the requested template
        return {
            contents: [{
                    uri,
                    text: templates[templateId].template,
                    metadata: {
                        templateId: templateId,
                        templateName: templates[templateId].name,
                        contentType: "text/markdown"
                    }
                }]
        };
    }
    catch (error) {
        return {
            contents: [{
                    uri,
                    text: `Error retrieving template: ${error instanceof Error ? error.message : String(error)}`,
                    isError: true
                }]
        };
    }
}
/**
 * Get a formatted list of all available templates
 * @returns Formatted text with template information
 */
function getAvailableTemplatesList() {
    let result = "# Available Resource Templates\n\n";
    Object.values(templates).forEach(template => {
        result += `## ${template.name}\n`;
        result += `ID: ${template.id}\n`;
        result += `${template.description}\n`;
        result += `URI: openfoodfacts://template/${template.id}\n\n`;
    });
    result += "Use the URI to access a specific template.";
    return result;
}
