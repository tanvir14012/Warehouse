import { BehaviorSubject, Observable } from 'rxjs';

export class Order {
    id: string;
    billing_address: {
        address_1: string;
        address_2: string;
        address_type: string;
        att_contact: string;
        city: string;
        company_name: string;
        country_code: string;
        created_at: string;
        email: string;
        ext_location: any;
        id: number;
        personal_customs_no:any;
        phone: string;
        state: any;
        updated_at: string;
        vat_no: any;
        voec: any;
        zip: string;
    }
    created_at: string;
    currency: string;
    delivery_address: {
        address_1: string;
        address_2: string;
        address_type: string;
        att_contact: string;
        city: string;
        company_name: string;
        country_code: string;
        created_at: string;
        email: string;
        ext_location: any;
        id: number;
        personal_customs_no:any;
        phone: string;
        state: any;
        updated_at: string;
        vat_no: any;
        voec: any;
        zip: string;
    }
    drop_point: {
        address_1: string;
        address_2: string;
        carrier_code: string;
        city: string;
        company_name: string;
        country_code: string;
        created_at: string;
        drop_point_id: string;
        email: string;
        id: number;
        latitude: string;
        longitude: string;
        name: string;
        order_id: number;
        phone: string;
        routing_code: any;
        state: string;
        updated_at: string;
        zip: string;
    }
    error_message: string;
    ext_ref: any;
    external_comment: string;
    internal_comment: string;
    order_channel_id: number;
    original_shipping: {
        created_at: string;
        id: number;
        order_id: number;
        price: number;
        shipping_code: string;
        shipping_name: string;
        updated_at: string;
        vat_percent: number;
    };
    productCount: number;
    productDetail: OrderProdItem[];
    productSKUS: string[];        
    sender_address: {
        address_1: string;
        address_2: string;
        carrier_code: string;
        city: string;
        company_name: string;
        country_code: string;
        created_at: string;
        drop_point_id: string;
        email: string;
        id: number;
        latitude: string;
        longitude: string;
        name: string;
        order_id: number;
        phone: string;
        routing_code: any;
        state: string;
        updated_at: string;
        zip: string;
    }
    sold_from_address: {
        address_1: string;
        address_2: string;
        carrier_code: string;
        city: string;
        country_code: string;
        created_at: string;
        drop_point_id: string;
        email: string;
        id: number;
        latitude: string;
        longitude: string;
        name: string;
        order_id: number;
        phone: string;
        routing_code: any;
        state: string;
        updated_at: string;
        zip: string;
    }
    status_id: string;
    uniqueId: string;
    updated_at: string;
    visible_ref: string;
    avatar?: string; //for UI 
}

export interface OrderProdItem {
    on_stock: boolean;
    quantity: number;
    sku: string;
    unit_price: number;
}

