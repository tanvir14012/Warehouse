import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, combineLatest, forkJoin, from, Observable, of, throwError } from 'rxjs';
import { catchError, concatAll, debounceTime, filter, map, switchMap, take, tap } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore'
import { Order, OrderProdItem } from 'app/models/order';
import { Status } from 'app/models/status';
import { OrdersCounter } from 'app/models/orders-counter';
import firebase from 'firebase/app';
import { SkuQty } from 'app/models/sku-qty';
import { SkuDescription } from 'app/models/sku-description';
import algoliasearch, { SearchClient, SearchIndex } from 'algoliasearch';
import { environment } from 'environments/environment';
import { AuthService } from 'app/core/auth/auth.service';
import { toLength } from 'lodash';
import { FormArray, FormGroup } from '@angular/forms';
import { AngularFireFunctions } from '@angular/fire/functions';

@Injectable({
    providedIn: 'root'
})

export class OrdersService {
    // Private
    private _order: Observable<Order>;
    private _orders: Observable<Order[]>;

    /* Algolia Client*/
    private algoliaClient: SearchClient;
    private orderSearchIndex: SearchIndex;
    /* Algolia Client*/

    constructor(
        private _httpClient: HttpClient,
        private _ngFirestore: AngularFirestore,
        private _authService: AuthService,
        private _ngFireFuncs: AngularFireFunctions
    ) {

        this.algoliaClient = algoliasearch(environment.algolia.app_id, environment.algolia.search_key);
        this.orderSearchIndex = this.algoliaClient.initIndex(environment.algolia.orderIndex);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    getOrdersCount(): Observable<number> {
        return this._authService.authUserRole.pipe(
            map((userRole: any) => {
                if (userRole) {
                    if (userRole.role === "admin") {
                        return this._ngFirestore.collection<OrdersCounter>('ordersCounter').doc("ORDERSCOUNTER").valueChanges()
                            .pipe(
                                map((orderCount: OrdersCounter) => {
                                    return orderCount.totalOrders;
                                }
                                ));

                    }
                    else if (userRole.role === "webshop" || userRole.role === "warehouse") {
                        let webshopObservables = [];
                        for (let i = 0; i < userRole.webshopIDs.length; i++) {
                            let webshopID: string = userRole.webshopIDs[i];
                            let webshopObservable = this._ngFirestore.doc("webshop/" + webshopID)
                                .get()
                                .pipe(
                                    map((docSnap) => {
                                        if (docSnap.exists) {
                                            const webshop: any = docSnap.data();
                                            if (webshop.ordersCount) {
                                                return webshop.ordersCount;
                                            }
                                            return 0;
                                        }
                                        else {
                                            return 0;
                                        }
                                    }),
                                    catchError(err => {
                                        return of(0);
                                    })
                                );
                            webshopObservables.push(webshopObservable);

                        }
                        return combineLatest(webshopObservables).pipe(
                            map((countArr: number[]) => {
                                return countArr.reduce((a, b) => a + b, 0);
                            }),
                            catchError(err => {
                                return of(0);
                            })
                        );
                    }
                }
                return of(0);
            }),
            switchMap((count: Observable<number>) => count)
        );

    }
    getFirstNOrders(n: number, webshopID: string = null): Observable<Order[]> {
        //this._authService.check();
        return this._authService.authUserRole.pipe(
            map((userRole: any) => {
                if (userRole) {
                    if (userRole.role === "admin") {
                        return this._ngFirestore.collection<Order>('orders', ref =>
                            ref.orderBy("created_at", "desc")
                                .limit(n))
                            .valueChanges().pipe(
                                catchError(err => {
                                    return of([]);
                                })
                            );

                    }
                    else if (userRole.role === "webshop" || userRole.role === "warehouse") {
                        if (webshopID === null) {
                            return this._ngFirestore.collection<Order>('orders', ref =>
                                ref.where("ownerUserIds", "array-contains", userRole.uid)
                                    .orderBy("created_at", "desc").limit(n))
                                .valueChanges()
                                .pipe(
                                    catchError(err => {
                                        return of([]);
                                    })
                                );
                        } else {
                            return this._ngFirestore.doc("webshop/" + webshopID).get().pipe(
                                map((webshopSnap) => {
                                    if (webshopSnap.exists) {
                                        const webshop: any = webshopSnap.data();
                                        if (webshop.order_channel_id) {
                                            return this._ngFirestore.collection<Order>('orders', ref =>
                                                ref.where("order_channel_id", "==", webshop.order_channel_id)
                                                    .where("ownerUserIds", "array-contains", userRole.uid).orderBy("created_at", "desc")
                                                    .limit(n))
                                                .valueChanges()
                                                .pipe(
                                                    catchError(err => {
                                                        return of([]);
                                                    })
                                                );
                                        }
                                    }
                                    return of([]);
                                })
                            );
                        }
                    }
                }
                return of(null);
            }),
            switchMap((orders: Observable<Order[]>) => orders)

        );

    }

    getOrderStatus(status_id: string): Observable<string> {
        return this._ngFirestore.collection<Status>('status', ref => ref.where("status_id", "==", status_id)).valueChanges()
            .pipe(
                take(1),
                map((statuses: Status[]) => {
                    let statusName: string = statuses[0].name;
                    return statusName;
                }));
    }

    getOrderStatusList(): Observable<Status[]> {
        return this._authService.authUserRole.pipe(
            map((userRole: any) => {
                if (userRole) {
                    return this._ngFirestore.collection<Status>('status').valueChanges();
                }
                return [];
            }),
            switchMap((statuses) => statuses)
        );
    }

    getNextNOrders(created_at: string, n: number, webshopID: string = null): Observable<Order[]> {
        let userRole = this._authService.authUserRole.value;
        if (userRole) {
            if (userRole.role === "admin") {
                return this._ngFirestore.collection<Order>('orders', ref => ref.orderBy("created_at", "desc")
                    .startAfter(created_at)
                    .limit(n))
                    .valueChanges();

            }
            else {
                if (webshopID === null) {
                    return this._ngFirestore.collection<Order>('orders', ref =>
                        ref.where("ownerUserIds", "array-contains", userRole.uid)
                            .orderBy("created_at", "desc")
                            .startAfter(created_at)
                            .limit(n))
                        .valueChanges()
                        .pipe(
                            catchError(err => {
                                return of([]);
                            })
                        );
                } else {
                    return this._ngFirestore.doc("webshop/" + webshopID).get().pipe(
                        map((webshopSnap) => {
                            if (webshopSnap.exists) {
                                const webshop: any = webshopSnap.data();
                                if (webshop.order_channel_id) {
                                    return this._ngFirestore.collection<Order>('orders', ref =>
                                        ref.where("order_channel_id", "==", webshop.order_channel_id)
                                            .where("ownerUserIds", "array-contains", userRole.uid)
                                            .orderBy("created_at", "desc")
                                            .startAfter(created_at)
                                            .limit(n))
                                        .valueChanges()
                                        .pipe(
                                            catchError(err => {
                                                return of([]);
                                            })
                                        );
                                }
                            }
                            return of([]);
                        }),
                        switchMap((orders: Observable<Order[]>) => orders)
                    );

                }

            }

        }
        return of([]);
    }

    getPreviousNOrders(created_at: string, n: number, webshopID: string = null): Observable<Order[]> {
        let userRole = this._authService.authUserRole.value;
        if (userRole) {
            if (userRole.role === "admin") {
                return this._ngFirestore.collection<Order>('orders', ref => ref.orderBy("created_at", "desc")
                    .endBefore(created_at)
                    .limitToLast(n))
                    .valueChanges();

            }
            else {
                if (webshopID === null) {
                    return this._ngFirestore.collection<Order>('orders', ref =>
                        ref.where("ownerUserIds", "array-contains", userRole.uid)
                            .orderBy("created_at", "desc")
                            .endBefore(created_at)
                            .limitToLast(n))
                        .valueChanges()
                        .pipe(
                            catchError(err => {
                                return of([]);
                            })
                        );
                } else {
                    return this._ngFirestore.doc("webshop/" + webshopID).get().pipe(
                        map((webshopSnap) => {
                            if (webshopSnap.exists) {
                                const webshop: any = webshopSnap.data();
                                if (webshop.order_channel_id) {
                                    return this._ngFirestore.collection<Order>('orders', ref =>
                                        ref.where("order_channel_id", "==", webshop.order_channel_id)
                                            .where("ownerUserIds", "array-contains", userRole.uid)
                                            .orderBy("created_at", "desc")
                                            .endBefore(created_at)
                                            .limitToLast(n))
                                        .valueChanges()
                                        .pipe(
                                            catchError(err => {
                                                return of([]);
                                            })
                                        );
                                }
                            }
                            return of([]);
                        }),
                        switchMap((orders: Observable<Order[]>) => orders)
                    );

                }

            }
        }
        return of([]);
    }

    getProductBySku(sku: string): Observable<any> {
        return this._authService.authUserRole.pipe(
            map((userRole: any) => {
                if (userRole) {
                    if (userRole.role === "admin") {
                        return this._ngFirestore.collection('product',
                            ref => ref.where("sku", "==", sku).limit(1))
                            .valueChanges()
                            .pipe(
                                take(1),
                                map((product: any[]) => {
                                    return product.length > 0 ? product[0] : {};
                                })
                            );
                    }

                    return this._ngFirestore.collection('product',
                        ref => ref.where("sku", "==", sku)
                            .where("ownerUserIds", "array-contains", userRole.uid).limit(1))
                        .valueChanges()
                        .pipe(
                            take(1),
                            map((product: any[]) => {
                                return product.length > 0 ? product[0] : {};
                            })
                        );
                }
                return of({});
            }),
            switchMap((product) => product)
        );
    }

    getProductSkuDescList(): Observable<SkuDescription[]> {
        return this._authService.authUserRole.pipe(
            map((userRole: any) => {
                if (userRole) {
                    if (userRole.role === "admin") {
                        return this._ngFirestore.collection('product', ref => ref.where("on_hand", ">", 0))
                            .valueChanges()
                            .pipe(
                                map((prods: any[]) => {
                                    let skuDescList: SkuDescription[] = [];
                                    prods.forEach((prod: any) => {
                                        if (prod && prod.on_hand - prod.allocated > 0) { // if on stock
                                            let skuDesk: SkuDescription = {
                                                sku: prod.sku,
                                                description: prod.description
                                            };
                                            skuDescList.push(skuDesk);
                                        }
                                    })
                                    return skuDescList;
                                })
                            );
                    }
                    return this._ngFirestore.collection('product', ref => ref.where("on_hand", ">", 0)
                        .where("ownerUserIds", "array-contains", userRole.uid))
                        .valueChanges()
                        .pipe(
                            map((prods: any[]) => {
                                let skuDescList: SkuDescription[] = [];
                                prods.forEach((prod: any) => {
                                    if (prod && prod.on_hand - prod.allocated > 0) { // if on stock
                                        let skuDesk: SkuDescription = {
                                            sku: prod.sku,
                                            description: prod.description
                                        };
                                        skuDescList.push(skuDesk);
                                    }
                                })
                                return skuDescList;
                            })
                        );

                } else {
                    return [];
                }
            }),
            switchMap((skuDescList) => skuDescList)
        );
    }

    getAllProducts(): Observable<SkuDescription[]> {
        return this._authService.authUserRole.pipe(
            map((userRole: any) => {
                if (userRole) {
                    if (userRole.role === "admin") {
                        return this._ngFirestore.collection('product')
                            .valueChanges();
                    }
                    return this._ngFirestore.collection('product', ref =>
                        ref.where("ownerUserIds", "array-contains", userRole.uid))
                        .valueChanges();

                } else {
                    return [];
                }
            }),
            switchMap((skuDescList) => skuDescList)
        );
    }

    /**
     * Update order
     *
     * @param id
     * @param order
     */
    updateOrder(order: Order, skuQtyList: Map<string, number>) {
        let updateList: SkuQty[] = [],
            insertList: SkuQty[] = [],
            removeList: SkuQty[] = [];
        let userRole = this._authService.authUserRole.value;
        order.productDetail.forEach((product: OrderProdItem) => {
            if (product && product.sku && product.quantity) {
                if (skuQtyList.has(product.sku) && product.quantity !== skuQtyList.get(product.sku)) {
                    updateList.push({
                        sku: product.sku,
                        quantity: skuQtyList.get(product.sku)
                    });
                }
                if (!skuQtyList.has(product.sku)) {
                    removeList.push({
                        sku: product.sku,
                        quantity: product.quantity
                    });
                }
                skuQtyList.delete(product.sku);
            }
        });
        skuQtyList.forEach((quantity, sku) => {
            insertList.push({
                sku: sku,
                quantity: quantity
            });
        });

        if (updateList.length > 0) {
            for (let i = 0; i < updateList.length; i++) {
                let skuQty: SkuQty = updateList[i];
                let prodItem = order.productDetail.filter(p => p.sku === skuQty.sku)[0];
                if (prodItem) {
                    const qtyDifference: number = skuQty.quantity - prodItem.quantity;
                    this._ngFirestore.collection('product', ref => ref.where("sku", "==", prodItem.sku)
                            .where("ownerUserIds", "array-contains", userRole.uid)
                        .limit(1))
                        .valueChanges()
                        .pipe(
                            take(1),
                            map((productList: any[]) => {
                                return productList.length > 0 ? productList[0] : {}
                            })
                        ).subscribe((dbProduct: any) => {
                            if (dbProduct.sku) {

                                const onStock: boolean = dbProduct.on_hand > (dbProduct.allocated + qtyDifference);
                                const statusId = onStock ? "Xt2Bq00RoGWuOSNot7Ll" : "Jf91EDJOBTGFGoo07Kpj";
                                //Update allocated
                                this._ngFirestore.doc('product/' + dbProduct.uniqueId).update({
                                    allocated: Number(dbProduct.allocated + qtyDifference)
                                });

                                this._ngFirestore.doc('orders/' + order.uniqueId).update({
                                    productDetail: (<any>firebase).firestore.FieldValue.arrayRemove(prodItem)
                                });

                                //Now we have on_stock status, update order product
                                prodItem.quantity = Number(skuQty.quantity);
                                prodItem.on_stock = Boolean(onStock);
                                prodItem.unit_price = Number(prodItem.unit_price);
                                prodItem.sku = String(prodItem.sku);

                                this._ngFirestore.doc('orders/' + order.uniqueId).update({
                                    productDetail: (<any>firebase).firestore.FieldValue.arrayUnion(prodItem)
                                });

                            }
                        });
                }
            };
        }

        if (removeList.length > 0) {
            for (let i = 0; i < removeList.length; i++) {
                let skuQty: SkuQty = removeList[i];
                let prodItem = order.productDetail.filter(p => p.sku === skuQty.sku)[0];
                //Update allocated in product
                this._ngFirestore.collection('product', ref => ref.where("sku", "==", prodItem.sku)
                    .where("ownerUserIds", "array-contains", userRole.uid).limit(1))
                    .valueChanges()
                    .pipe(
                        take(1),
                        map((productList: any[]) => {
                            return productList.length > 0 ? productList[0] : {}
                        })
                    ).subscribe((dbProduct: any) => {
                        if (dbProduct.sku) {
                            const prodCount: number = (order.productCount - removeList.length) >= 0 ? (order.productCount - removeList.length) : 0;

                            this._ngFirestore.doc('orders/' + order.uniqueId).update({
                                productDetail: (<any>firebase).firestore.FieldValue.arrayRemove(prodItem),
                                productSKUS: (<any>firebase).firestore.FieldValue.arrayRemove(String(prodItem.sku)),
                                productCount: Number(prodCount)
                            });

                            //Update allocated
                            this._ngFirestore.doc('product/' + dbProduct.uniqueId).update({
                                allocated: Number(dbProduct.allocated - prodItem.quantity)
                            });
                        }
                    });
            };//
        }

        if (insertList.length > 0) {
            for (let i = 0; i < insertList.length; i++) {
                let skuQty: SkuQty = insertList[i];
                this._ngFirestore.collection('product', ref => ref.where("sku", "==", skuQty.sku)
                    .where("ownerUserIds", "array-contains", userRole.uid).limit(1))
                    .valueChanges()
                    .pipe(
                        take(1),
                        map((productList: any[]) => {
                            return productList.length > 0 ? productList[0] : {}
                        })
                    ).subscribe((dbProduct: any) => {
                        if (dbProduct.sku) {
                            const onStock: boolean = dbProduct.on_hand > (dbProduct.allocated + skuQty.quantity);
                            const statusId = onStock ? "Xt2Bq00RoGWuOSNot7Ll" : "Jf91EDJOBTGFGoo07Kpj"; //pending, on hold

                            //Update allocated in product
                            this._ngFirestore.doc('product/' + dbProduct.uniqueId).update({
                                allocated: Number(dbProduct.allocated + skuQty.quantity)
                            });

                            // Insert order product
                            let prodItem: OrderProdItem = {
                                sku: String(dbProduct.sku),
                                quantity: Number(skuQty.quantity),
                                unit_price: Number(dbProduct.unit_price),
                                on_stock: Boolean(onStock)
                            };

                            const prodCount: number = order.productCount + insertList.length;
                            this._ngFirestore.doc('orders/' + order.uniqueId).update({
                                productDetail: (<any>firebase).firestore.FieldValue.arrayUnion(prodItem),
                                productSKUS: (<any>firebase).firestore.FieldValue.arrayUnion(String(prodItem.sku)),
                                productCount: Number(prodCount)
                            });
                        }
                    });
            };//
        }
        return this._ngFirestore.doc<Order>('orders/' + order.uniqueId).valueChanges().pipe(debounceTime(300), take(1));
    }

    updateOrderProdDetailArrElStockStatus(orderDocId: string, prodItem: OrderProdItem, newStockStatus: boolean) {
        this._ngFirestore.doc('orders/' + orderDocId).update({
            productDetail: (<any>firebase).firestore.FieldValue.arrayRemove(prodItem)
        });

        let UpdatedprodItem: OrderProdItem = {
            sku: String(prodItem.sku),
            quantity: Number(prodItem.quantity),
            unit_price: Number(prodItem.unit_price),
            on_stock: Boolean(newStockStatus)
        };

        this._ngFirestore.doc('orders/' + orderDocId).update({
            productDetail: (<any>firebase).firestore.FieldValue.arrayUnion(UpdatedprodItem)
        });
    }

    updateOrderStatus(order: Order) {
        //Update order status_id
        if (order.productDetail?.length > 0) {
            let isAtleastOneIsOnHold: boolean = false;
            let count = order.productDetail.length;
            let gotError: boolean = false;
            order.productDetail.forEach((orderProd: OrderProdItem) => {
                this._ngFirestore.collection('product', ref => ref.where("sku", "==", orderProd.sku).limit(1))
                    .valueChanges()
                    .pipe(
                        take(1),
                        map((productList: any[]) => {
                            return productList.length > 0 ? productList[0] : {};
                        })
                    ).subscribe((dbProduct: any) => {
                        const onHold: boolean = dbProduct.on_hand < dbProduct.allocated;
                        if (dbProduct.sku.trim() !== '') {
                            isAtleastOneIsOnHold = isAtleastOneIsOnHold || onHold;
                        }
                        count--;
                        if (count === 0) {
                            const statusId = isAtleastOneIsOnHold ? "Jf91EDJOBTGFGoo07Kpj" : "Xt2Bq00RoGWuOSNot7Ll"; //on hold, pending
                            this._ngFirestore.doc('orders/' + order.uniqueId).update({
                                status_id: String(statusId)
                            });
                        }
                    });
            });
        }
        else {
            this._ngFirestore.doc('orders/' + order.uniqueId).update({
                status_id: String("Xt2Bq00RoGWuOSNot7Ll")
            });
        }
    }


    getOrderById(id: string): Observable<any> {
        return this._authService.authUserRole.pipe(
            map((userRole: any) => {
                if (userRole) {
                    if (userRole.role === "admin") {
                        return this._ngFirestore.doc("orders/" + id).get().pipe(
                            map(orderSnap => {
                                if (orderSnap.exists) {
                                    return orderSnap.data();
                                }
                                return null;
                            }),
                            catchError(err => {
                                return of(null);
                            }));
                    }
                    return this._ngFirestore.collection<Order>("orders", ref => ref.where("uniqueId", "==", id)
                        .where("ownerUserIds", "array-contains", userRole.uid).limit(1)).valueChanges().pipe(
                            take(1),
                            map(orders => {
                                if (orders.length > 0) {
                                    return orders[0];
                                }
                                return null;
                            }),
                            catchError(err => {
                                return of(null);
                            }));
                }
                else {
                    return of({ productDetail: [] });
                }
            }),
            switchMap((order) => order));
    }

    getSearchResults(term: string, hitsPerPage: number = 10, pageNo: number = 0) {
        let userRole = this._authService.authUserRole.value;
        if (userRole) {
            if (userRole.role === "admin") {
                return this.orderSearchIndex.search(term,
                    {
                        restrictSearchableAttributes: [
                            "visible_ref",
                            "delivery_address.att_contact"
                        ],
                        hitsPerPage: hitsPerPage,
                        page: pageNo
                    });
            } else {
                return this.orderSearchIndex.search(term,
                    {
                        restrictSearchableAttributes: [
                            "visible_ref",
                            "delivery_address.att_contact"
                        ],
                        hitsPerPage: hitsPerPage,
                        page: pageNo,
                        filters: `ownerUserIds:${userRole.uid}`
                    });
            }
        }
        return this.orderSearchIndex.search(term,
            {
                hitsPerPage: 0,
                page: 0,
                filters: "ownerUserIds:none"
            });
    }

    getOrderHits(hits: any[]) {
        let orders: Observable<Order>[] = [];
        hits.forEach(item => {
            orders.push(this._ngFirestore.doc<Order>('orders/' + item.objectID).valueChanges());
        });

        return combineLatest(orders);
    }

    getOrderHistory(orderId: string): Observable<any> {
        return this._authService.authUserRole.pipe(
            map((userRole: any) => {
                if (userRole) {
                    return this._ngFirestore.collection("orderhistory",
                    ref => ref.where("order", "==", orderId))
                    .valueChanges()
                    .pipe(
                        map((histories: any[]) => {
                            histories.forEach((history) => {
                                history.datetime = history.datetime.toDate();
                            });
                            return histories;
                        })
                    );
                }
                return of([]);
            }),
            switchMap((hs) => hs)
            );
    }

    getUserWebshops(): Observable<any[]> {
        return this._authService.authUserRole.pipe(
            map((userRole: any) => {
                if (userRole) {
                    if (userRole.role === "admin") {
                        return this._ngFirestore.collection("webshop")
                            .snapshotChanges()
                            .pipe(
                                map((webshopSnaps) => {
                                    let webshops = webshopSnaps.map((webshopSnap) => {
                                        let webshop: any = webshopSnap.payload.doc.data();
                                        webshop.docId = webshopSnap.payload.doc.id;
                                        return webshop;
                                    });
                                    return webshops;
                                })
                            );
                    }
                    let webshops = [];
                    userRole.webshopIDs.forEach((webshopId: string) => {
                        const webshop = this._ngFirestore.doc("webshop/" + webshopId)
                                            .snapshotChanges()
                                            .pipe(
                                                map((webshopSnap) => {
                                                    let webshop: any = webshopSnap.payload.data();
                                                    webshop.docId = webshopSnap.payload.id;
                                                    return webshop;
                                                })
                                            );
                        webshops.push(webshop);
                    });
                    return combineLatest(webshops);
                }
                return of([]);
            }),
            switchMap((webshops) => webshops)
        );
    }

    searchOrderRecipients(term: string): Observable<Object> {
        return this._authService.authUserRole.pipe(
            map((userRole: any) => {
                if (userRole) {
                    if (userRole.role === "admin") {
                        return from(this.orderSearchIndex.search(term, {
                            restrictSearchableAttributes: [
                                "billing_address.att_contact"
                            ],
                            hitsPerPage: 1000
                        }));
                    }
                    else {
                        return from(this.orderSearchIndex.search(term, {
                            restrictSearchableAttributes: [
                                "billing_address.att_contact"
                            ],
                            hitsPerPage: 1000,
                            filters: `ownerUserIds:${userRole.uid}`
                        }));
                    }
                }
                return of({});
            }),
            switchMap((results) => results)
        );
    }

    getShipmentMethods(countryCode: string = null): Observable<any[]> { 
        return this._authService.authUserRole.pipe(
            map((userRole: any) => {
                if (userRole) {
                    if (userRole.role === "admin") {
                        if (countryCode) {
                            return this._ngFirestore.collection("shipmentMethods",
                                ref => ref.where("country_code", "==", countryCode)).valueChanges();
                        }
                        return this._ngFirestore.collection("shipmentMethods").valueChanges();
                    }
                    else {
                        let shipmentMethods = [];
                        userRole.webshopIDs.forEach((webshopId: string) => {
                            let shipMthd: any;

                            if (countryCode) {
                                shipMthd = this._ngFirestore.collection("shipmentMethods", ref =>
                                    ref.where("webshop_id", "==", webshopId)
                                        .where("country_code", "==", countryCode)).valueChanges();
                            } else {
                                shipMthd = this._ngFirestore.collection("shipmentMethods", ref =>
                                    ref.where("webshop_id", "==", webshopId)).valueChanges();
                            }
                            shipmentMethods.push(shipMthd);
                        });
                        return combineLatest(shipmentMethods).pipe(
                            map((shipMthds: any[]) => {
                                return shipMthds.reduce((acc, val) => acc.concat(val))
                            })
                        );
                    }
                }
                return of([]);
            }),
            switchMap((shipments) => shipments)
        );
    }

    updateAllocatedInProduct(skuQty: SkuQty, userId) {
        this._ngFirestore.collection('product', ref => ref.where("sku", "==", skuQty.sku)
            .where("ownerUserIds", "array-contains", userId).limit(1))
            .valueChanges()
            .pipe(
                take(1),
                map((productList: any[]) => {
                    return productList.length > 0 ? productList[0] : {}
                })
            ).subscribe((dbProduct: any) => {
                if (dbProduct.sku) {
                    //Update allocated in product
                    this._ngFirestore.doc('product/' + dbProduct.uniqueId).update({
                        allocated: Number(dbProduct.allocated + skuQty.quantity)
                    });
                }
            });
    }

    saveOrder(form: FormGroup): Observable<string> {
        return this._authService.authUserRole.pipe(
            map((userRole: any) => {
                if (userRole) {

                    let products = form.get("orderLines") as FormArray;
                    let skus: string[] = [];
                    let productDetails: any[] = [];

                    for (let i = 0; i < products.length; i++) {

                        skus.push(products.at(i).value.sku);

                        let productDetial = {
                            on_stock: products.at(i).value.onStock,
                            sku: products.at(i).value.sku,
                            description: products.at(i).value.description,
                            quantity: products.at(i).value.quantity,
                            unit_price: products.at(i).value.unitPrice,
                            discounted_unit_price: products.at(i).value.discountedUnitPrice,
                            weight: products.at(i).value.weight,
                            weight_unit: products.at(i).value.weightUnit,
                            location: products.at(i).value.location,
                            hs_tariff_code: products.at(i).value.hsTariff,
                            vat_rate: products.at(i).value.vatRate,
                            country_code: products.at(i).value.country == "Denmark" ? "DK" : products.at(i).value.country,
                        };

                        productDetails.push(productDetial);
                        if(!form.get("sendAutomatically").value) {
                            this.updateAllocatedInProduct({
                                sku: products.at(i).value.sku,
                                quantity: products.at(i).value.quantity
                            }, userRole.uid);
                        }
                        
                    }
                    const order = {
                            visible_ref: form.get("orderNumber").value,
                            order_channel_id: form.get("orderChannel").value,
                            status_id: form.get("status").value,
                            external_comment: form.get("externalComment").value,
                            internal_comment: form.get("internalComment").value,
                            priority_order: form.get("prioritiseOrder").value,
                            billing_address: {
                                address_1: form.get("recipientAddress").value,
                                address_2: form.get("recipientAddress2").value,
                                address_type: "order_address",
                                att_contact: form.get("recipientContact").value,
                                city: form.get("recipientCity").value,
                                company_name: form.get("recipientCompany").value,
                                country_code: form.get("recipientCountry").value == "Denmark" ? "DK" : form.get("recipientCountry").value,
                                email: form.get("recipientEmail").value,
                                phone: form.get("recipientPhone").value,
                                zip: form.get("recipientZip").value,
                                vat_no: form.get("recipientVatNo").value,
                                created_at: new Date(firebase.firestore.Timestamp.now().seconds*1000).toISOString(),
                                updated_at: new Date(firebase.firestore.Timestamp.now().seconds*1000).toISOString()
                            },
                            delivery_address: {
                                att_contact: form.get("recipientContact").value,
                            },
                            sender_address: {
                                company_name: form.get("webshop").value?.name
                            },
                            productCount: products.length,
                            productDetail: productDetails,
                            productSKUS: skus,
                            original_shipping: {
                                shipping_name: form.get("shipment").value ? form.get("shipment").value.shipping_name: null,
                                shipping_code: form.get("shipment").value ? form.get("shipment").value.shipping_code: null,
                                country_code: form.get("shipment").value ? form.get("shipment").value.country_code: null
                            },
                            send_automatically: form.get("sendAutomatically").value,
                            created_at: new Date(firebase.firestore.Timestamp.now().seconds*1000).toISOString(),
                            updated_at: new Date(firebase.firestore.Timestamp.now().seconds*1000).toISOString()
                        };
                    form.disable();
                    let createOrder = this._ngFireFuncs.httpsCallable("createOrder");
                    let createRequest = createOrder({
                        order: order,
                        webshopId: form.get("webshop").value?.docId
                    });
                    return createRequest;
                }
                return of(null);
            }),
            switchMap((response) => response));
    }
}