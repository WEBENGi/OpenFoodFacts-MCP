import axios from 'axios';
import { logger } from '../transport/transports.js';
/**
 * Search products in Open Food Facts database
 * @param query Search query
 * @param page Page number
 * @param pageSize Number of results per page
 * @returns Search results with pagination info
 */
export async function searchProducts(query, page = 1, pageSize = 20) {
    try {
        // Check if the query looks like a barcode (8-14 digits)
        const isBarcode = /^[0-9]{8,14}$/.test(query.trim());
        if (isBarcode) {
            // If it's a barcode, use the direct product lookup API first
            try {
                const product = await getProductByBarcode(query.trim());
                // Convert the single product to the expected search results format
                return {
                    products: [{
                            id: product.id,
                            name: product.name,
                            brand: product.brands || 'Unknown brand',
                            barcode: product.barcode,
                            imageUrl: product.imageUrl || '',
                            nutriScore: product.nutriScore || '',
                            ingredients: product.ingredients || '',
                            categories: product.categories || ''
                        }],
                    count: 1,
                    page: 1,
                    pageSize: 1,
                    pageCount: 1
                };
            }
            catch (barcodeError) {
                logger.info(`Barcode lookup failed for ${query}, falling back to search API: ${barcodeError}`);
                // If direct lookup fails, fall back to regular search
            }
        }
        // Make API request to Open Food Facts search API
        const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
            params: {
                search_terms: query,
                page,
                page_size: pageSize,
                json: 1
            },
            timeout: 30000 // 30 second timeout
        });
        // Check if the response is valid
        if (!response.data || !Array.isArray(response.data.products)) {
            throw new Error('Invalid response from Open Food Facts API');
        }
        // Return the products from the response with pagination info
        return {
            products: response.data.products.map((product) => ({
                id: product.id || product._id,
                name: product.product_name || 'Unknown product',
                brand: product.brands || 'Unknown brand',
                barcode: product.code || '',
                imageUrl: product.image_url || '',
                nutriScore: product.nutriscore_grade || '',
                ingredients: product.ingredients_text || '',
                categories: product.categories || ''
            })),
            count: response.data.count || 0,
            page,
            pageSize,
            pageCount: Math.ceil((response.data.count || 0) / pageSize)
        };
    }
    catch (error) {
        logger.error('Error searching products:', error);
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Search request timed out. Please try again.');
            }
            if (error.response) {
                throw new Error(`API error: ${error.response.status} - ${error.response.statusText}`);
            }
        }
        throw new Error(`Failed to search products: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Get detailed product information by barcode
 * @param barcode The product barcode
 * @returns Detailed product information
 */
export async function getProductByBarcode(barcode) {
    try {
        // Validate barcode format
        if (!barcode.match(/^[0-9]{8,14}$/)) {
            throw new Error('Invalid barcode format. Expected 8-14 digits.');
        }
        // Make API request to Open Food Facts product API
        const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
            timeout: 30000 // 30 second timeout
        });
        // Check if product was found
        if (response.data.status === 0) {
            throw new Error(`Product with barcode ${barcode} not found`);
        }
        // Return the product information with selected fields
        return {
            id: response.data.product._id,
            barcode: response.data.product.code,
            name: response.data.product.product_name || 'Unknown product',
            brands: response.data.product.brands,
            ingredients: response.data.product.ingredients_text,
            allergens: response.data.product.allergens,
            nutriScore: response.data.product.nutriscore_grade,
            novaGroup: response.data.product.nova_group,
            imageUrl: response.data.product.image_url,
            nutritionFacts: {
                energy: response.data.product.nutriments['energy-kcal_100g'],
                fat: response.data.product.nutriments.fat_100g,
                saturatedFat: response.data.product.nutriments['saturated-fat_100g'],
                carbohydrates: response.data.product.nutriments.carbohydrates_100g,
                sugars: response.data.product.nutriments.sugars_100g,
                fiber: response.data.product.nutriments.fiber_100g,
                proteins: response.data.product.nutriments.proteins_100g,
                salt: response.data.product.nutriments.salt_100g
            },
            labels: response.data.product.labels,
            categories: response.data.product.categories,
            countries: response.data.product.countries
        };
    }
    catch (error) {
        logger.error('Error fetching product:', error);
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timed out. Please try again.');
            }
            if (error.response) {
                throw new Error(`API error: ${error.response.status} - ${error.response.statusText}`);
            }
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to get product details');
    }
}
