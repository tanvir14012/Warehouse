import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, Renderer2, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { MatDrawerToggleResult } from '@angular/material/sidenav';
import { Observable, Subject, of, Subscription } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { OrdersService } from '../orders.service';
import { Order, OrderProdItem } from 'app/models/order';
import { OrdersListComponent } from '../list/list.component';
import { MatTabGroup } from '@angular/material/tabs';
import { OrderProduct } from 'app/models/order-product';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmEditDialogComponent } from './confirm-edit-dialog/confirm-edit-dialog.component';
import { SkuQty } from 'app/models/sku-qty';
import { SkuDescription } from 'app/models/sku-description';

@Component({
    selector: 'contacts-details',
    templateUrl: './details.component.html',
    styleUrls: ['./details.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersDetailsComponent implements OnInit, OnDestroy {
    editMode: boolean;
    order: Order;
    products: Map<string, any>;
    formGroup: FormGroup;
    formData: FormArray;
    columnNames: string[] = ["quantity", "description"];
    tableData: MatTableDataSource<any>;
    editFields: Map<string, number>;
    options: SkuDescription[] = [];
    filteredOptions: Map<number, Observable<SkuDescription[]>>;
    orderHistories: any[] = [];


    @ViewChild("tabs") tabs: MatTabGroup;
    // Private
    private _tagsPanelOverlayRef: OverlayRef;
    private _unsubscribeAll: Subject<any>; 
    private routeSubscription: Subscription;
    private skuDescSubscription: Subscription;

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _ordersListComponent: OrdersListComponent,
        private _ordersService: OrdersService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _dialog: MatDialog,
        private _router: Router
    ) {
        // Set the private defaults
        this._unsubscribeAll = new Subject();

        // Set the defaults
        this.editMode = false;
        this.products = new Map();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.formGroup = new FormGroup({});
        this.formData = new FormArray([]);
        this.tableData = new MatTableDataSource([]);
        this.filteredOptions = new Map();
        this.products = new Map();
        // Open the drawer
        this._ordersListComponent.matDrawer.open();
        this.order = JSON.parse(sessionStorage.getItem("selectedOrder"));

        this.routeSubscription = this._activatedRoute.params.subscribe((params: any) => {
            this.order = JSON.parse(sessionStorage.getItem("selectedOrder"));
            if (params.id) {
                if (!this.order || (this.order && this.order.uniqueId !== params.id)) {
                    this._ordersService.getOrderById(params.id)
                        .subscribe((order: Order) => {
                            if (order) {
                                this.order = order;
                            }
                            else {
                                this.order = this.getEmptyOrder();
                            }
                            this.populateProductLists();
                            this.populateFormArray();
                            this.populateOrderHistories();
                        });
                } else {
                    this.populateProductLists();
                    this.populateFormArray();
                    this.populateOrderHistories();
                };
            }
        },
            (error) => {
                this.order = this.getEmptyOrder();
                this.populateProductLists();
                this.populateFormArray();
                this._ordersListComponent.ngOnInit();
            });

        this.skuDescSubscription = this._ordersService.getProductSkuDescList()
            .subscribe((skuDesList: SkuDescription[]) => {
                this.options = skuDesList;
            });
        this._changeDetectorRef.markForCheck();
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this.routeSubscription.unsubscribe();
        this.skuDescSubscription?.unsubscribe();

        // Dispose the overlays if they are still on the DOM
        if (this._tagsPanelOverlayRef) {
            this._tagsPanelOverlayRef.dispose();
        }
    }

    enableEditMode() {
        this.editMode = true;
        this.tabs.selectedIndex = 0;
        this.formData = new FormArray([]);
        let duplicateIdx: number = -1;
        this.getSortedOrderProd(this.order.productDetail).forEach(item => {
            duplicateIdx = -1;
            if(this.formData.controls.length > 0) {
                duplicateIdx = this.formData.controls.findIndex((formGrp:any) => formGrp.controls && formGrp.controls.sku.value === item.sku);
            }
            if(duplicateIdx === -1) {
                this.formData.push(this.createFormGroup(item.sku, item.quantity, true));
            }
            
        });
        this.formGroup = new FormGroup({
            data: this.formData
        });
    }

    private getSortedOrderProd(productList: OrderProdItem[]) {
        return productList.sort((a,b) => {
            let descriptionA = this.products.get(a.sku)?.description,
                descriptionB = this.products.get(b.sku)?.description;
            if(descriptionA > descriptionB) {
                return 1;
            }
            else if(descriptionB > descriptionA) {
                return -1;
            }
            return 0;
        });
    }

    populateFormArray() {
        this.formData = new FormArray([]);
        let duplicateIdx: number = -1;
        this.order.productDetail.forEach(item => {  
            duplicateIdx = -1;
            if(this.formData.controls.length > 0) {
                duplicateIdx = this.formData.controls.findIndex((formGrp:any) => formGrp.controls && formGrp.controls.sku.value === item.sku);
            }
            if(duplicateIdx === -1) {
                this.formData.push(this.createFormGroup(item.sku, item.quantity, true));
            }
            
        });
        this.formGroup = new FormGroup({
            data: this.formData
        });
        this._changeDetectorRef.markForCheck();
    }

    onTabChanged(evt: any) {
        if (evt.index) {
            this.editMode = evt.index === 0;
        }
        this._changeDetectorRef.markForCheck();
    }

    private createFormGroup(sku: string, quantity: number, disabled: boolean = false): FormGroup {
        let formGr = new FormGroup({
            sku: new FormControl({ value: sku, disabled: disabled }, (disabled) ? [Validators.required] : [Validators.required, this.requireMatch.bind(this)]),
            quantity: new FormControl({ value: quantity, disabled: false }, [Validators.required, Validators.pattern("^[0]*[1-9][0-9]*$")])
        });
        return formGr;
    }

    // -----------------------------------------------------------------------------------------------------
    // @  methods
    // -----------------------------------------------------------------------------------------------------

    private populateProductLists() {
        this.tableData = new MatTableDataSource([]);
        this.order.productDetail.forEach((prodDet: OrderProdItem) => {
            this._ordersService.getProductBySku(prodDet.sku).subscribe((prod: any) => {

                if (this.order.productSKUS.findIndex(sku => sku === prod.sku) > -1) {
                    this.products.set(prod.sku, prod);
                    const onStock: boolean = prod.on_hand - prod.allocated >= 0;
                    /* Table data insert */
                    prod.on_stock = onStock;
                    prod.quantity = prodDet.quantity;
                    let data = this.tableData.data;
                    if (data.filter(item => item.sku === prod.sku).length < 1) {
                        data.push(prod);
                        data = data.sort((a, b) => a.description > b.description ? 1: (b.description > a.description ? -1 : 0));
                        this.tableData.data = data;
                        this._changeDetectorRef.markForCheck();
                    }
                    else {
                        let idx = data.findIndex(item => item.uniqueId === prod.uniqueId);
                        data[idx] = prod;
                        data = data.sort((a, b) => a.description > b.description ? 1: (b.description > a.description ? -1 : 0));
                        this.tableData.data = data;
                        this._changeDetectorRef.markForCheck();
                    }
                    /* Table data insert */
                    this._changeDetectorRef.markForCheck();
                }
            });
            if(prodDet.sku.trim() === '') {
                let data = this.tableData.data;
                data.push({quantity: prodDet.quantity, sku:'', on_stock:true, description: ''});
                data = data.sort((a, b) => a.description > b.description ? 1: (b.description > a.description ? -1 : 0));
                this.tableData.data = data;
            }
        });
        this._changeDetectorRef.markForCheck();
    }

    private populateProductListsAfterUpdate() {
        let prodCount: number = this.order.productDetail.length;
        let tData = new MatTableDataSource([]);
        this.order.productDetail.forEach((prodDet: OrderProdItem) => {
            this._ordersService.getProductBySku(prodDet.sku).subscribe((prod: any) => {
                if (prod.sku) {
                    this.products.set(prod.sku, prod);
                    const onStock: boolean = prod.on_hand - prod.allocated >= 0;
                    /* Table data insert */
                    prod.on_stock = onStock;
                    prod.quantity = prodDet.quantity;
                    //const data = this.tableData.data;
                    const data = tData.data;
                    if (data.filter(item => item.sku === prod.sku).length < 1) {
                        data.push(prod);
                        tData.data = data;
                    }
                }
                prodCount--;
                if(prodCount == 0) {
                    this.tableData = new MatTableDataSource([]);
                    this.tableData.data = tData.data.sort((a, b) => a.description > b.description ? 1: (b.description > a.description ? -1 : 0));
                    this._changeDetectorRef.markForCheck();
                }
            });

            if(prodDet.sku.trim() === '') {
                const data = tData.data;
                data.push({quantity: prodDet.quantity, sku:'', on_stock:true, description: ''});
                tData.data = data;
            }
        });
        if(prodCount === 0) {
            this.tableData.data = tData.data;
            this._changeDetectorRef.markForCheck();
        }
        
    }

    getDescChunks(sku: string, size: number) {
        let chunks: string[] = [];
        let product = this.products.get(sku);
        if(! product) {
            product = this.options.find(skuDesc => skuDesc.sku === sku);
        }
        if (product && product.description) {
            for (let i = 0; i < product.description.length; i += size) {
                chunks.push(product.description.slice(i, i + size - 1));
            }
        }
        return chunks;
    }

    getChunks(message: string, size: number) {
        if (message) {
            let chunks: string[] = [];
            for (let i = 0; i < message.length; i += size) {
                chunks.push(message.slice(i, i + size - 1));
            }
            return chunks;
        }
    }

    deleteFormData(index: number) {
        this.formData.removeAt(index);
        if (this.filteredOptions.has(index)) {
            let i: number = index;
            while (this.filteredOptions.has(i + 1)) {
                this.filteredOptions.set(i, this.filteredOptions.get(i + 1));
                i++;
            }
        }
        this._changeDetectorRef.markForCheck();
    }

    addForm() {
        let formGr = this.createFormGroup("", 1);
        const filteredOps = formGr.controls.sku.valueChanges.pipe(
            startWith(''),
            map((value: string) => {
                return this.options.filter((option: SkuDescription) => option.sku.includes(value));
            })
        );
        this.filteredOptions.set(this.formData.controls.length, filteredOps);
        this.formData.push(formGr);
    }

    openEditConfirmDialog() {
        if (this.formGroup.invalid) {
            this.formGroup.markAllAsTouched();
            return;
        }
        const dialogRef = this._dialog.open(ConfirmEditDialogComponent);
        dialogRef.afterClosed().subscribe(result => { // true or false
            if (result) {
                this.populateEditFields();
                this._ordersService.updateOrder(this.order, this.editFields)
                    .subscribe((order: Order) => {
                        if(order) {
                            this.order = order;
                            sessionStorage.setItem("selectedOrder", JSON.stringify(order));
                            this._ordersService.updateOrderStatus(order);
                            this.populateProductListsAfterUpdate();
                            this._ordersListComponent.refreshOneOrder(order);
                            this.editMode = false;
                        }
                        
                    });
            }
        });
    }

    populateEditFields() {
        this.editFields = new Map();
        this.formData.controls.forEach(childFormGrp => {
            if ((<any>childFormGrp).controls.sku.value && (<any>childFormGrp).controls.quantity.value) {
                this.editFields.set((<any>childFormGrp).controls.sku.value, (<any>childFormGrp).controls.quantity.value);
            }
        });
    }

    haveChanges(): boolean {
        this.populateEditFields();
        if (this.editFields.size > this.order.productDetail.length || this.editFields.size < this.order.productDetail.length || this.formGroup.dirty) {
            return true;
        }
        return false;
    }
    /**
     * Close the drawer
     */
    closeDrawer(): Promise<MatDrawerToggleResult> {
        return this._ordersListComponent.matDrawer.close();
    }

    skuInOrder(sku: string): boolean {
        let result: boolean = false;
        this.order.productDetail.forEach((prod: OrderProdItem) => {
            if (prod && prod.sku === sku) {
                result = true;
            }
        });
        return result;
    }

    skuInInInsertedFields(sku: string): boolean {
        let skuCount: number = 0;
        for (let i = this.order.productDetail.length - 1; i < this.formData.controls.length; i++) {
            const childFormGrp = this.formData.controls[i];
            let fieldSku: string = (<any>childFormGrp).controls.sku.value;
            if (fieldSku === sku) {
                skuCount++;
            }
        }
        return skuCount > 1;
    }

    skuInInFields(sku: string): boolean {
        let skuCount: number = 0;
        for (let i = 0; i < this.formData.controls.length; i++) {
            const childFormGrp = this.formData.controls[i];
            let fieldSku: string = (<any>childFormGrp).controls.sku.value;
            if (fieldSku === sku) {
                skuCount++;
            }
        }
        return skuCount > 1;
    }

    private requireMatch(control: FormControl): ValidationErrors | null {
        const selection: any = control.value;
        let isDuplicate: boolean = this.skuInInFields(selection),
            isOutOfStock: boolean = (this.options && this.options.filter(skuDesc => skuDesc.sku === selection).length < 1),
            isEmpty: boolean = selection.trim().length === 0;
        if (isDuplicate || isOutOfStock || isEmpty) {
            if(isEmpty) {
                return { valid: false, empty: { message: "Sku can not be blank" } };
            }
            if (isDuplicate) {
                return { valid: false, duplicate: { message: "Another field has same sku" } };
            }
            return { valid: false, outOfStock: { message: "Out of stock" } };
        }
        return null;
    }

    lastFieldUntouched(): boolean {
        const lastFormGrp = this.formData.controls[this.formData.controls.length - 1];
        if(lastFormGrp) {
            return !lastFormGrp.untouched;
        }
        return false;
    }

    isSkuInOptions(sku: string): boolean {
        return sku && this.options.findIndex(ops => ops.sku === sku) > -1;
    }

    populateOrderHistories() {
        if(this.order?.uniqueId) {
            const user = JSON.parse(localStorage.getItem("user"));
            this._ordersService.getOrderHistory(this.order.uniqueId)
                .subscribe((orderHistories: any[]) => {
                    orderHistories.push({
                        datetime: this.order.created_at,
                        event: "Created",
                        order: this.order.uniqueId,
                        user: user.uid,
                        displayName: this.order.delivery_address?.att_contact,
                        photoUrl: null
    
                    });
                    orderHistories.sort((a, b) => {
                        return new Date(a.datetime).getTime() > new Date(b.datetime).getTime() ? -1 : new Date(a.datetime).getTime() < new Date(b.datetime).getTime() ? 1: 0;
                    });
                    this.orderHistories = orderHistories;
                    this._changeDetectorRef.markForCheck();
                });
        }
        
    }

    getEmptyOrder(): Order {

        let emptyOrder: Order = {
            id: "",
            billing_address: {
                address_1: "",
                address_2: "",
                address_type: "",
                att_contact: "",
                city: "",
                company_name: "",
                country_code: "",
                created_at: "",
                email: "",
                ext_location: "",
                id: 0,
                personal_customs_no: "",
                phone: "",
                state: "",
                updated_at: "",
                vat_no: "",
                voec: "",
                zip: "",
            },
            created_at: "",
            currency: "",
            delivery_address: {
                address_1: "",
                address_2: "",
                address_type: "",
                att_contact: "Please try again",
                city: "",
                company_name: "",
                country_code: "",
                created_at: "",
                email: "",
                ext_location: "",
                id: 0,
                personal_customs_no: "",
                phone: "",
                state: "",
                updated_at: "",
                vat_no: "",
                voec: "",
                zip: "",
            },
            drop_point: {
                address_1: "",
                address_2: "",
                carrier_code: "",
                city: "",
                company_name: "",
                country_code: "",
                created_at: "",
                drop_point_id: "",
                email: "",
                id: 0,
                latitude: "",
                longitude: "",
                name: "",
                order_id: 0,
                phone: "",
                routing_code: "",
                state: "",
                updated_at: "",
                zip: "",
            },
            error_message: "",
            ext_ref: "",
            external_comment: "",
            internal_comment: "",
            order_channel_id: 0,
            original_shipping: {
                created_at: "",
                id: 0,
                order_id: 0,
                price: 0,
                shipping_code: "",
                shipping_name: "",
                updated_at: "",
                vat_percent: 0,
            },
            productCount: 0,
            productDetail: [],
            productSKUS: [],
            sender_address: {
                address_1: "",
                address_2: "",
                carrier_code: "",
                city: "",
                company_name: "",
                country_code: "",
                created_at: "",
                drop_point_id: "",
                email: "",
                id: 0,
                latitude: "",
                longitude: "",
                name: "",
                order_id: 0,
                phone: "",
                routing_code: "",
                state: "",
                updated_at: "",
                zip: "",
            },
            sold_from_address: {
                address_1: "",
                address_2: "",
                carrier_code: "",
                city: "",
                country_code: "",
                created_at: "",
                drop_point_id: "",
                email: "",
                id: 0,
                latitude: "",
                longitude: "",
                name: "",
                order_id: 0,
                phone: "",
                routing_code: "",
                state: "",
                updated_at: "",
                zip: "",
            },
            status_id: "",
            uniqueId: "",
            updated_at: "",
            visible_ref: "Not Found !"
        };
        return emptyOrder;
    }
    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any {
        return item.id || index;
    }
}
