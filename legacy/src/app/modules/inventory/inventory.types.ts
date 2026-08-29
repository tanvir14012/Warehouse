export interface InventoryProduct
{
    id: string;
    category?: string;
    name: string;
    description?: string;
    tags?: string[];
    sku?: string | null;
    barcode?: string | null;
    brand?: string | null;
    vendor: string | null;
    stock: number;
    reserved: number;
    cost: number;
    basePrice: number;
    taxPercent: number;
    price: number;
    weight: number;
    thumbnail: string;
    images: string[];
    active: boolean;
}

export interface Product {
    additional_attributes: object;
    allocated: number;
    country_of_origin: string;
    created_at: string;
    description: string;
    discount_type: string;
    discount_value: number;
    discounted_unit_price: number;
    ext_ref: string;
    id: string;
    is_virtual: boolean;
    location: string;
    on_hand: number;
    order_id: number;
    package_id: null;
    sku: string;
    status: string | null;
    tarif_number: string;
    uniqueId: string;
    unit_price: number;
    updated_at: string;
    vat_percent: number;
    weight: number;
    weight_unit: string;
    tags?: string[];
}

export interface InventoryPagination
{
    length: number;
    size: number;
    page: number;
    lastPage: number;
    startIndex: number;
    endIndex: number;
}

export interface InventoryCategory
{
    id: string;
    parentId: string;
    name: string;
    slug: string;
}

export interface InventoryBrand
{
    id: string;
    name: string;
    slug: string;
}

export interface InventoryTag
{
    id?: string;
    title?: string;
}

export interface InventoryVendor
{
    id: string;
    name: string;
    slug: string;
}
