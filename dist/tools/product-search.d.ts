export interface SearchProductItem {
    id: string;
    name: string;
    brand: string;
    barcode: string;
    imageUrl: string;
    nutriScore: string;
    ingredients: string;
    categories: string;
}
export interface SearchProductsResult {
    products: SearchProductItem[];
    count: number;
    page: number;
    pageSize: number;
    pageCount: number;
}
/**
 * Search products in Open Food Facts database
 * @param query Search query
 * @param page Page number
 * @param pageSize Number of results per page
 * @returns Search results with pagination info
 */
export declare function searchProducts(query: string, page?: number, pageSize?: number): Promise<SearchProductsResult>;
/**
 * Get detailed product information by barcode
 * @param barcode The product barcode
 * @returns Detailed product information
 */
export declare function getProductByBarcode(barcode: string): Promise<{
    id: any;
    barcode: any;
    name: any;
    brands: any;
    ingredients: any;
    allergens: any;
    nutriScore: any;
    novaGroup: any;
    imageUrl: any;
    nutritionFacts: {
        energy: any;
        fat: any;
        saturatedFat: any;
        carbohydrates: any;
        sugars: any;
        fiber: any;
        proteins: any;
        salt: any;
    };
    labels: any;
    categories: any;
    countries: any;
}>;
