import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { merge, Observable, Subject } from 'rxjs';
import { debounceTime, map, switchMap, takeUntil } from 'rxjs/operators';
import { TreoAnimations } from '@treo/animations';
import { InventoryBrand, InventoryCategory, InventoryPagination, InventoryProduct, InventoryTag, InventoryVendor, Product } from 'app/modules/inventory/inventory.types';
import { InventoryService } from 'app/modules/inventory/inventory.service';

@Component({
    selector: 'inventory-list',
    templateUrl: './inventory-list.component.html',
    styleUrls: ['./inventory-list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: TreoAnimations
})
export class InventoryListComponent implements OnInit, AfterViewInit, OnDestroy {
    brands: InventoryBrand[];
    categories: InventoryCategory[];
    filteredTags: InventoryTag[];
    flashMessage: 'success' | 'error' | null;
    isLoading: boolean;
    pagination: InventoryPagination;
    products$: Observable<InventoryProduct[]>;
    productsCount: number;
    productsTableColumns: string[];
    searchInputControl: FormControl;
    selectedProduct: Product | null;
    selectedProductForm: FormGroup;
    tags: InventoryTag[];
    tagsEditMode: boolean;
    vendors: InventoryVendor[];

    products: Product[];
    pageSizeOptions = [10, 25, 100];
    query = ''
    fetchedDocRef = {
        firstInResponse: null,
        lastInResponse: null,
        pageIndex: 0
    }

    // Private
    private _unsubscribeAll: Subject<any>;

    @ViewChild(MatPaginator)
    private _paginator: MatPaginator;

    @ViewChild(MatSort)
    private _sort: MatSort;

    /**
     * Constructor
     *
     * @param {ChangeDetectorRef} _changeDetectorRef
     * @param {FormBuilder} _formBuilder
     * @param {InventoryService} _inventoryService
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _formBuilder: FormBuilder,
        private _inventoryService: InventoryService
    ) {
        // Set the private defaults
        this._unsubscribeAll = new Subject();

        // Set the defaults
        this.flashMessage = null;
        this.isLoading = true;
        this.productsCount = 0;
        this.productsTableColumns = ['sku', 'description', 'unit_price','on_hand','active','details'];
        this.searchInputControl = new FormControl();
        this.selectedProduct = null;
        this.tagsEditMode = false;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Create the selected product form
        this.selectedProductForm = this._formBuilder.group({
            id: [''],
            category: [''],
            name: ['', [Validators.required]],
            description: [''],
            tags: [[]],
            sku: [''],
            brand: [''],
            vendor: [''],
            on_hand: [''],
            alocated: [''],
            reserved: [''],
            cost: [''],
            basePrice: [''],
            taxPercent: [''],
            unit_price: [''],
            weight: [''],
            thumbnail: [''],
            images: [[]],
            currentImageIndex: [0], // Image index that is currently being viewed
            active: [false],
            additional_attributes: this._formBuilder.group({
                ean13: ['']
            })
        });

        this._inventoryService.getAll('created_at', 'desc').snapshotChanges()
            .pipe(takeUntil(this._unsubscribeAll)).subscribe(response => {
                // Update the counts
                this.pagination.length = response.length;
            })

        // Get the products
        this._inventoryService.getWithLimit(this.pageSizeOptions[0], 'created_at', 'desc').snapshotChanges()
            .pipe(takeUntil(this._unsubscribeAll)).subscribe(response => {
                this.productsCount = response.length;

                if (response.length) {
                    this.fetchedDocRef.firstInResponse = response[0].payload.doc;
                    this.fetchedDocRef.lastInResponse = response[response.length - 1].payload.doc;
                    this.fetchedDocRef.pageIndex = 0;
                }

                this.products = [];
                response.forEach( c => {
                    let product = JSON.parse(JSON.stringify(c.payload.doc.data()));
                    product.id = c.payload.doc.id;
                    
                    this.products.push(product);
                });

                this.isLoading = false;
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get the pagination
        this._inventoryService.pagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination: InventoryPagination) => {

                // Update the pagination
                this.pagination = pagination;

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Subscribe to search input field value changes
        this.searchInputControl.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(300),
                switchMap((query) => {
                    this.closeDetails();
                    this.isLoading = true;
                    this.query = query;
                    return this._inventoryService.getProducts(0, 10, 'name', 'asc', this.query);
                }),
                map(() => {
                    this.isLoading = false;
                })
            )
            .subscribe();
    }

    pageChanged(event) {
        if (event.pageIndex > this.fetchedDocRef.pageIndex) {
            this.isLoading = true;
            // Get the products
            this._inventoryService.getProductsByStartAt(this._paginator.pageSize, this._sort.active, this._sort.direction, this.fetchedDocRef.lastInResponse).snapshotChanges()
            .pipe(takeUntil(this._unsubscribeAll)).subscribe(response => {
                this.productsCount = response.length;
                if (response.length) {
                    this.fetchedDocRef.firstInResponse = response[0].payload.doc;
                    this.fetchedDocRef.lastInResponse = response[response.length - 1].payload.doc;
                    this.fetchedDocRef.pageIndex = event.pageIndex;
                }

                this.products = [];
                response.forEach( c => {
                    let product = JSON.parse(JSON.stringify(c.payload.doc.data()));
                    product.id = c.payload.doc.id;
                    
                    this.products.push(product);
                });

                this.isLoading = false;
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
        } else if (event.pageIndex < this.fetchedDocRef.pageIndex) {
            this.isLoading = true;
            // Get the products
            this._inventoryService.getProductsByEndBefore(this._paginator.pageSize, this._sort.active, this._sort.direction, this.fetchedDocRef.firstInResponse).snapshotChanges()
            .pipe(takeUntil(this._unsubscribeAll)).subscribe(response => {
                this.productsCount = response.length;
                if (response.length) {
                    this.fetchedDocRef.firstInResponse = response[0].payload.doc;
                    this.fetchedDocRef.lastInResponse = response[response.length - 1].payload.doc;
                    this.fetchedDocRef.pageIndex = event.pageIndex;
                }

                this.products = [];
                response.forEach( c => {
                    let product = JSON.parse(JSON.stringify(c.payload.doc.data()));
                    product.id = c.payload.doc.id;
                    
                    this.products.push(product);
                });

                this.isLoading = false;
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
        } else {
            this.isLoading = true;
            this._inventoryService.getWithLimit(this._paginator.pageSize, this._sort.active, this._sort.direction).snapshotChanges()
            .pipe(takeUntil(this._unsubscribeAll)).subscribe(response => {
                this.productsCount = response.length;

                if (response.length) {
                    this.fetchedDocRef.firstInResponse = response[0].payload.doc;
                    this.fetchedDocRef.lastInResponse = response[response.length - 1].payload.doc;
                    this.fetchedDocRef.pageIndex = 0;
                }

                this.products = [];
                response.forEach( c => {
                    let product = JSON.parse(JSON.stringify(c.payload.doc.data()));
                    product.id = c.payload.doc.id;
                    
                    this.products.push(product);
                });

                this.isLoading = false;
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
        }
    }

    /**
     * After view init
     */
    ngAfterViewInit(): void {
        // If the user changes the sort order...
        this._sort.sortChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
                // Reset back to the first page
                this._paginator.pageIndex = 0;

                this._inventoryService.getWithLimit(this._paginator.pageSize, this._sort.active, this._sort.direction).snapshotChanges()
                .pipe(takeUntil(this._unsubscribeAll)).subscribe(response => {
                    this.productsCount = response.length;

                    if (response.length) {
                        this.fetchedDocRef.firstInResponse = response[0].payload.doc;
                        this.fetchedDocRef.lastInResponse = response[response.length - 1].payload.doc;
                        this.fetchedDocRef.pageIndex = 0;
                    }

                    this.products = [];
                    response.forEach( c => {
                        let product = JSON.parse(JSON.stringify(c.payload.doc.data()));
                        product.id = c.payload.doc.id;
                        
                        this.products.push(product);
                    });

                    this.isLoading = false;
                    // Mark for check
                    this._changeDetectorRef.markForCheck();
                });
                
                // Close the details
                this.closeDetails();
            });

        // Get products if sort or page changes
        // merge(this._sort.sortChange, this._paginator.page).pipe(
        //     switchMap(() => {
        //         this.closeDetails();
        //         this.isLoading = true;
        //         return this._inventoryService.getWithLimit(this._paginator.pageSize, this._sort.active, this._sort.direction);
        //         // return this._inventoryService.getProducts(this._paginator.pageIndex, this._paginator.pageSize, this._sort.active, this._sort.direction);
        //     }),
        //     map((response) => {
        //         this.isLoading = false;
        //         console.log(response);
        //     })
        // ).subscribe();
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Toggle product details
     *
     * @param productId
     */
    toggleDetails(product): void {

        if ( this.selectedProduct && this.selectedProduct.id === product['id'] )
        {
            // Close the details
            this.closeDetails();
            return;
        }
        
        this.selectedProduct = product;

        // Fill the form
        this.selectedProductForm.patchValue(product);

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Close the details
     */
    closeDetails(): void {
        this.selectedProduct = null;
    }

    /**
     * Cycle through images of selected product
     */
    cycleImages(forward: boolean = true): void {
        // Get the image count and current image index
        const count = this.selectedProductForm.get('images').value.length;
        const currentIndex = this.selectedProductForm.get('currentImageIndex').value;

        // Calculate the next and previous index
        const nextIndex = currentIndex + 1 === count ? 0 : currentIndex + 1;
        const prevIndex = currentIndex - 1 < 0 ? count - 1 : currentIndex - 1;

        // If cycling forward...
        if (forward) {
            this.selectedProductForm.get('currentImageIndex').setValue(nextIndex);
        }
        // If cycling backwards...
        else {
            this.selectedProductForm.get('currentImageIndex').setValue(prevIndex);
        }
    }

    /**
     * Toggle the tags edit mode
     */
    toggleTagsEditMode(): void {
        this.tagsEditMode = !this.tagsEditMode;
    }

    /**
     * Filter tags
     *
     * @param event
     */
    filterTags(event): void {
        // Get the value
        const value = event.target.value.toLowerCase();

        // Filter the tags
        this.filteredTags = this.tags.filter(tag => tag.title.toLowerCase().includes(value));
    }

    /**
     * Filter tags input key down event
     *
     * @param event
     */
    filterTagsInputKeyDown(event): void {
        // Return, if the pressed key is not 'Enter'
        if (event.key !== 'Enter') {
            return;
        }

        // If there is no tag available...
        if (this.filteredTags.length === 0) {
            // Create the tag
            this.createTag(event.target.value);

            // Clear the input
            event.target.value = '';

            // Return
            return;
        }

        // If there is a tag...
        const tag = this.filteredTags[0];
        const isTagApplied = this.selectedProduct.tags.find((id) => id === tag.id);

        // If the found tag is already applied to the contact...
        if (isTagApplied) {
            // Remove the tag from the contact
            this.removeTagFromProduct(tag);
        }
        else {
            // Otherwise add the tag to the contact
            this.addTagToProduct(tag);
        }
    }

    /**
     * Create a new tag
     *
     * @param title
     */
    createTag(title: string): void {
        const tag = {
            title
        };

        // Create tag on the server
        this._inventoryService.createTag(tag)
            .subscribe((response) => {

                // Add the tag to the product
                this.addTagToProduct(response);
            });
    }

    /**
     * Update the tag title
     *
     * @param tag
     * @param event
     */
    updateTagTitle(tag: InventoryTag, event): void {
        // Update the title on the tag
        tag.title = event.target.value;

        // Update the tag on the server
        this._inventoryService.updateTag(tag.id, tag)
            .pipe(debounceTime(300))
            .subscribe();

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Delete the tag
     *
     * @param tag
     */
    deleteTag(tag: InventoryTag): void {
        // Delete the tag from the server
        this._inventoryService.deleteTag(tag.id).subscribe();

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Add tag to the product
     *
     * @param tag
     */
    addTagToProduct(tag: InventoryTag): void {
        // Add the tag
        this.selectedProduct.tags.unshift(tag.id);

        // Update the selected product form
        this.selectedProductForm.get('tags').patchValue(this.selectedProduct.tags);

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Remove tag from the product
     *
     * @param tag
     */
    removeTagFromProduct(tag: InventoryTag): void {
        // Remove the tag
        this.selectedProduct.tags.splice(this.selectedProduct.tags.findIndex(item => item === tag.id), 1);

        // Update the selected product form
        this.selectedProductForm.get('tags').patchValue(this.selectedProduct.tags);

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Toggle product tag
     *
     * @param tag
     * @param change
     */
    toggleProductTag(tag: InventoryTag, change: MatCheckboxChange): void {
        if (change.checked) {
            this.addTagToProduct(tag);
        }
        else {
            this.removeTagFromProduct(tag);
        }
    }

    /**
     * Should the create tag button be visible
     *
     * @param inputValue
     */
    shouldShowCreateTagButton(inputValue: string): boolean {
        return !!!(inputValue === '' || this.tags.findIndex(tag => tag.title.toLowerCase() === inputValue.toLowerCase()) > -1);
    }

    /**
     * Create product
     */
    createProduct(): void {
        this.selectedProductForm.reset();
        this.selectedProductForm.value['created_at'] = new Date().toJSON();
        this._inventoryService.createProduct(this.selectedProductForm.value).snapshotChanges()
        .pipe(takeUntil(this._unsubscribeAll)).subscribe(response => {

            this.productsCount = response.length;

                if (response.length) {
                    this.fetchedDocRef.firstInResponse = response[0].payload.doc;
                    this.fetchedDocRef.lastInResponse = response[response.length - 1].payload.doc;
                    this.fetchedDocRef.pageIndex = 0;
                }

                this.products = [];
                response.forEach( c => {
                    let product = JSON.parse(JSON.stringify(c.payload.doc.data()));
                    product.id = c.payload.doc.id;
                    
                    this.products.push(product);
                });

            this.isLoading = false;
            // Mark for check
            this._changeDetectorRef.markForCheck();


            // Go to new product
            this.selectedProduct = this.products[0];

            // Fill the form
            this.selectedProductForm.reset();
            this.selectedProductForm.patchValue(this.products[0]);

            // Mark for check
            this._changeDetectorRef.markForCheck();
            this.isLoading = false;
        });
    }

    /**
     * Update the selected product using the form data
     */
    updateSelectedProduct(): void {
        // Get the product object
        const product = this.selectedProductForm.getRawValue();

        // Remove the currentImageIndex field
        delete product.currentImageIndex;

        // Update the product on the server
        this._inventoryService.updateProduct(product.id, product).then(() => {

            // Show a success message
            this.showFlashMessage('success');
        },
        error=>{
            console.log(error);
        });
    }

    /**
     * Delete the selected product using the form data
     */
    deleteSelectedProduct(): void {
        // Get the product object
        const product = this.selectedProductForm.getRawValue();

        // Delete the product on the server
        this._inventoryService.deleteProduct(product.id).then(() => {

            // Close the details
            this.closeDetails();
        },
        error=>{
            console.log(error);
        });
    }

    /**
     * Show flash message
     */
    showFlashMessage(type: 'success' | 'error'): void {
        // Show the message
        this.flashMessage = type;

        // Mark for check
        this._changeDetectorRef.markForCheck();

        // Hide it after 3 seconds
        setTimeout(() => {

            this.flashMessage = null;

            // Mark for check
            this._changeDetectorRef.markForCheck();
        }, 3000);
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
