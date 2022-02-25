export class OrderProduct {

    orderUniqueId: string;
    sku: string;
    quantity: number; 
    unitPrice: number;
    onStock: boolean;

    constructor(orderUniqueId: string, sku: string, quantity: number, unitPrice: number, onStock: boolean) {
        this.orderUniqueId = orderUniqueId;
        this.sku = sku;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.onStock = onStock;
    }
}
