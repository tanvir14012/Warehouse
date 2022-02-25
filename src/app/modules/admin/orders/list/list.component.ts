import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { MatDrawer } from '@angular/material/sidenav';
import { BehaviorSubject, fromEvent, Observable, Subject, Subscription, zip } from 'rxjs';
import { filter, switchMap, takeUntil, map, debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { TreoMediaWatcherService } from '@treo/services/media-watcher';
import { OrdersService } from '../orders.service';
import { Order } from 'app/models/order';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { OrdersDetailsComponent } from '../details/details.component';
import { Status } from 'app/models/status';


@Component({
    selector: 'orders-list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersListComponent implements OnInit, OnDestroy, AfterViewInit {
    drawerMode: 'side' | 'over';
    searchInputControl: FormControl;

    /* Order */
    orders$: Observable<Order[]>;
    dataSource: MatTableDataSource<Order>;
    ordersCount: number;
    ordersTableColumns: string[];
    selectedOrderId: string;
    statuses: Map<string, any>;
    /* Order */
    /* Pagination */
    pageSize = 10;
    pageSizeOptions: number[] = [10, 25, 50, 100];
    pageEvent: PageEvent;
    curPageFirstOrderMark: string;
    curPageLastOrderMark: string;
    isInitialLoading: boolean;
    isLoading: boolean;
    /* Pagination */

    /* Search */
    isSearching: boolean = false;
    totalHits: number = -1;
    searchedOrders$: Order[];
    /* Search */

    @ViewChild('matDrawer', { static: true })
    matDrawer: MatDrawer;

    @ViewChild(MatSort) sort: MatSort;
    @ViewChild(MatPaginator) paginator: MatPaginator;
    // Private
    private _unsubscribeAll: Subject<any>;
    private ordersSubscription: Subscription;
    private OrderCountSubscription: Subscription;
    private statusSubscription: Subscription;
    private searchInputSubscription: Subscription;

    /**
     * Constructor
     *
     * @param {ActivatedRoute} _activatedRoute
     * @param {ChangeDetectorRef} _changeDetectorRef
     * @param {OrdersService} _ordersService
     * @param {DOCUMENT} _document
     * @param {Router} _router
     * @param {TreoMediaWatcherService} _treoMediaWatcherService
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _changeDetectorRef: ChangeDetectorRef,
        @Inject(DOCUMENT) private _document: any,
        private _router: Router,
        private _treoMediaWatcherService: TreoMediaWatcherService,
        private _ordersService: OrdersService,
    ) {
        // Set the private defaults
        this._unsubscribeAll = new Subject();

        // Set the defaults
        this.searchInputControl = new FormControl();

        this.ordersCount = 0;
        this.ordersTableColumns = ['reference', 'date', 'receiver', 'shop', 'status'];
        this.statuses = new Map();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Get the orders
        this.isLoading = true;
        this.isInitialLoading = true;
        this.OrderCountSubscription = this._ordersService.getOrdersCount()
            .subscribe((count: number) => {
                this.ordersCount = count;
                this._changeDetectorRef.markForCheck();
            });

        this.orders$ = this._ordersService.getFirstNOrders(this.pageSize);
        this.onFirstOrderListLoad();


        // Subscribe to media query change
        this._treoMediaWatcherService.onMediaQueryChange$('(min-width: 1440px)')
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((state) => {

                // Calculate the drawer mode
                this.drawerMode = state.matches ? 'side' : 'over';

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        this.matDrawer.openedChange.subscribe((opened: boolean) => {
            if (!opened) {
                this._changeDetectorRef.markForCheck();
            }
        });

        this.statusSubscription = this._ordersService.getOrderStatusList()
            .subscribe((statusList: Status[]) => {
                statusList.forEach((status: Status) => {
                    this.statuses.set(status.status_id, status);
                });
                this._changeDetectorRef.markForCheck();
            });

        this.searchInputSubscription = this.searchInputControl
            .valueChanges.pipe(
                debounceTime(100),
                distinctUntilChanged())
            .subscribe((term: string) => {
                if (term.trim().length < 3) {
                    this.isSearching = false;
                    this.reloadOrders();
                }
                else {
                    this.isSearching = true;
                    this._ordersService.getSearchResults(term)
                        .then(searchResults => {
                            this.totalHits = searchResults.nbHits;
                            if (this.totalHits > 0) {
                                this.populateSearchHits(searchResults.hits);
                                this.paginator.pageIndex = 0;
                            }
                            else {
                                this._changeDetectorRef.markForCheck();
                            }

                        })
                        .catch(err => {

                        });
                }
            });

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this.ordersSubscription.unsubscribe();
        this.OrderCountSubscription?.unsubscribe();
        this.statusSubscription.unsubscribe();
        this.searchInputSubscription.unsubscribe();
    }

    ngAfterViewInit(): void {
        this.refreshOrderList();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------
    paginate(pageEvent?: PageEvent) {
        if (!this.isSearching) {
            this.isLoading = true;
            if (pageEvent.pageIndex === 0) {
                this.orders$ = this._ordersService.getFirstNOrders(pageEvent.pageSize)
                    .pipe(map((orders: Order[]) => {
                        return orders;
                    }));
            }
            else if (pageEvent.pageIndex > pageEvent.previousPageIndex) {

                this.orders$ = this._ordersService.getNextNOrders(this.curPageLastOrderMark, pageEvent.pageSize)
                    .pipe(map((orders: Order[]) => {
                        return orders;
                    }));
            }
            else if (pageEvent.pageIndex < pageEvent.previousPageIndex) {
                this.orders$ = this._ordersService.getPreviousNOrders(this.curPageFirstOrderMark, pageEvent.pageSize)
                    .pipe(map((orders: Order[]) => {
                        return orders;
                    }));
            }
            this.refreshOrderList();
        }
        else {
            this._ordersService.getSearchResults(this.searchInputControl.value, pageEvent.pageSize, pageEvent.pageIndex)
                .then(searchResults => {
                    this.totalHits = searchResults.nbHits;
                    this.populateSearchHits(searchResults.hits);
                })
                .catch(err => {

                });

        }

        return pageEvent;
    }

    sortOrders(sort: Sort) {
        let orderList = this.dataSource.data;
        if (!sort.active || sort.direction === '') {
            return;
        }
        this.dataSource = new MatTableDataSource(orderList.sort((a, b) => {
            const isAsc = sort.direction === 'asc';
            switch (sort.active) {
                case 'reference': return this.compare(a.visible_ref, b.visible_ref, isAsc);
                case 'date': return this.compare(a.created_at, b.created_at, isAsc);
                case 'receiver': return this.compare(a.delivery_address.att_contact, b.delivery_address.att_contact, isAsc);
                case 'shop': return this.compare(a.sender_address.company_name, b.sender_address.company_name, isAsc);
                case 'status': return this.compare(this.statuses.get(a.status_id), this.statuses.get(b.status_id), isAsc);
            }
        }));
        //this.dataSource.sort = this.sort;
    }
    private compare(a: number | string, b: number | string, isAsc: boolean) {
        return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
    }

    onFirstOrderListLoad() {
        this.ordersSubscription = this.orders$.subscribe((orders: Order[]) => {
            if (orders == null) {
                this.isInitialLoading = true;
            } else {
                this.isInitialLoading = false;
                this.curPageFirstOrderMark = orders[0]?.created_at;
                this.curPageLastOrderMark = orders[orders.length - 1]?.created_at;
                // Mark for check
                this.isLoading = false;
                this.dataSource = new MatTableDataSource(orders);
                this.dataSource.sort = this.sort;
            }

            this._changeDetectorRef.markForCheck();
        });
    }

    refreshOrderList() {
        this.ordersSubscription = this.orders$.subscribe((orders: Order[]) => {
            if (orders && orders.length > 0) {
                this.curPageFirstOrderMark = orders[0]?.created_at;
                this.curPageLastOrderMark = orders[orders.length - 1]?.created_at;
            }

            // Mark for check
            this.isLoading = false;
            this.dataSource = new MatTableDataSource(orders);
            this.dataSource.sort = this.sort;
            this._changeDetectorRef.markForCheck();
        });
    }

    refreshOneOrder(order: Order) {
        const data = this.dataSource.data;
        let index: number = data.findIndex(o => o.uniqueId === order.uniqueId);
        if (index > -1) {
            data[index] = order;
        }
        this.dataSource = new MatTableDataSource(data);
        this.dataSource.sort = this.sort;
        this._changeDetectorRef.markForCheck();
    }

    populateSearchHits(hits: any[]) {
        this.searchedOrders$ = [];
        this._ordersService.getOrderHits(hits)
            .subscribe((orders: Order[]) => {
                this.searchedOrders$ = orders;
                this.dataSource = new MatTableDataSource(orders);
                this.dataSource.sort = this.sort;
                this._changeDetectorRef.markForCheck();
            });
    }

    refreshSearchedOrders() {

    }

    /**
     * Go to contact
     *
     * @param id
     */
    goToOrder(uniqueId: string): void {
        this.selectedOrderId = uniqueId;
        // Get the current activated route
        let route = this._activatedRoute;
        while (route.firstChild) {
            route = route.firstChild;
        }
        let selectedOrder = this.dataSource.data.find(order => order.uniqueId === uniqueId);
        selectedOrder = Object.assign(selectedOrder);
        sessionStorage.setItem("selectedOrder", JSON.stringify(selectedOrder));
        this._router.navigateByUrl("orders/" + uniqueId);
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * On backdrop clicked
     */
    onBackdropClicked(): void {
        // Get the current activated route
        let route = this._activatedRoute;
        while (route.firstChild) {
            route = route.firstChild;
        }

        // Go to the parent route
        this._router.navigate(['../'], { relativeTo: route });

        // Mark for check
        this._changeDetectorRef.markForCheck();
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

    clearSearch() {
        this.searchInputControl.setValue("");
        this.isSearching = false;
        this.reloadOrders();
    }

    reloadOrders() {
        this.orders$ = this._ordersService.getFirstNOrders(this.pageSize)
            .pipe(map((orders: Order[]) => {
                return orders;
            }));
        this.refreshOrderList();
    }

    addOrder() {
        this._router.navigateByUrl("add-order");
    }

    getStatusColor(status_id: string): string {
        let color: string = this.statuses.get(status_id)?.color;
        if(!color) {
            color = "red";
        }
        return color;
    }
}
