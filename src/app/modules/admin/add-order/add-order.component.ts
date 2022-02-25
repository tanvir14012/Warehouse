import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from 'app/core/auth/auth.service';
import { SkuDescription } from 'app/models/sku-description';
import { Status } from 'app/models/status';
import { Observable, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { OrdersService } from '../orders/orders.service';
import * as isoCountries  from 'i18n-iso-countries';
import { Router } from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import { PrioritiseOrderComponent } from './prioritise-order/prioritise-order.component';
import { Order } from 'app/models/order';

@Component({
  selector: 'app-add-order',
  templateUrl: './add-order.component.html',
  styleUrls: ['./add-order.component.scss']
})
export class AddOrderComponent implements OnInit {
  countries: any;
  products: Observable<any[]>;
  productOptions: any[] = [];
  measures: string[] = ["g", "kg", "lb", "oz", "ltr"];
  shipments: Observable<any[]>;
  webshops: any[] = [];
  form: FormGroup;
  skuDescSubscr: Subscription;
  webshopSubscr: Subscription;
  descSubscrs: Subscription;
  statusSubscription: Subscription;
  filteredOptions: Map<number, Observable<any[]>>;
  statuses: Map<string, string>;
  recipients: Observable<any>;
  formSubmitAttempted: boolean = false;
  isSaving: boolean = false;
  isErrored: boolean = false;


  constructor(
    private _ordersService: OrdersService,
    private _router: Router,
    private _snackBar: MatSnackBar) {

  }

  ngOnInit(): void {
    this.isSaving = false;
    this.isErrored = false;
    this.statuses = new Map();
    this.filteredOptions = new Map();
    this.descSubscrs = new Subscription();
    isoCountries.registerLocale(require('i18n-iso-countries/langs/en.json'));
    this.countries = isoCountries.getNames("en", {select: "official"});

    this.form = new FormGroup({
      orderNumber: new FormControl(""),
      orderChannel: new FormControl("", [Validators.required]),
      status: new FormControl("", [Validators.required]),
      recipient: new FormControl(""),
      recipientCountry: new FormControl("DK"),
      recipientContact: new FormControl("", [Validators.required]),
      recipientCompany: new FormControl(),
      recipientAddress: new FormControl("", [Validators.required]),
      recipientAddress2: new FormControl(),
      recipientZip: new FormControl(),
      recipientCity: new FormControl(),
      recipientPhone: new FormControl("", [Validators.required]),
      recipientEmail: new FormControl("", [Validators.required]),
      recipientVatNo: new FormControl(),
      orderLines: new FormArray([]),
      shipment: new FormControl(),
      sendAutomatically: new FormControl(),
      externalComment: new FormControl(),
      internalComment: new FormControl(),
      prioritiseOrder: new FormControl(false),
      webshop: new FormControl()
    });
    this.addOrderLine();

    this.products = this._ordersService.getAllProducts();
    this.skuDescSubscr = this._ordersService.getAllProducts().subscribe((prods) => {
      this.productOptions = prods;
    });

    this.statusSubscription = this._ordersService.getOrderStatusList()
      .subscribe((statusList: Status[]) => {
        statusList.forEach((status: Status) => {
          this.statuses.set(status.status_id, status.name);
        });
        this.form.get("status").setValue(statusList.find(status => status.name == "Pending").status_id);
      });

    this.webshopSubscr = this._ordersService.getUserWebshops()
      .subscribe((webshops: any[]) => {
        this.webshops = webshops;
        this.form.get("orderChannel").setValue(webshops[0]?.order_channel_id);
      });

    this.form.get("recipient").valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged())
        .subscribe((term: string) => {
            if(term.trim().length > 0) {
                this.recipients = this._ordersService.searchOrderRecipients(term);
            }
        });

    this.shipments = this._ordersService.getShipmentMethods();
    this.form.get("recipientCountry").valueChanges
        .subscribe((countryCode: string) => {
            if(countryCode) {
              this.shipments = this._ordersService.getShipmentMethods(countryCode);
            }
        });
  }

  ngOnDestroy() {
    this.skuDescSubscr.unsubscribe();
    this.statusSubscription.unsubscribe();
    this.descSubscrs.unsubscribe();
    this.webshopSubscr.unsubscribe();
  }

  addOrderLine() {
    let orderLine = new FormGroup({
      sku: new FormControl("", [Validators.required, this.skuValidation.bind(this)]),
      description: new FormControl("", [Validators.required]),
      quantity: new FormControl(1, [Validators.required, Validators.pattern("^[0]*[1-9][0-9]*$")]),
      location: new FormControl(),
      hsTariff: new FormControl(),
      country: new FormControl("DK"),
      unitPrice: new FormControl(0, [Validators.required, Validators.pattern("^[0-9]*[.]?[0-9]+$")]),
      discountedUnitPrice: new FormControl(),
      vatRate: new FormControl(),
      weight: new FormControl(),
      weightUnit: new FormControl(),
      fullyVisible: new FormControl(false),
      onStock: new FormControl(false)
    });
    const filteredOps = orderLine.controls.sku.valueChanges.pipe(
      startWith(''),
      map((value: string) => {
        return this.productOptions.filter((option: any) => option.sku?.includes(value));
      })
    );
    this.filteredOptions.set(this.form.get("orderLines")["controls"].length, filteredOps);

    const descSubscr = orderLine.controls.sku.valueChanges.subscribe((sku) => {
      orderLine.get("description").setValue(this.productOptions.find(ops => ops.sku === sku)?.description);
    });
    this.descSubscrs.add(descSubscr);

    const formArr = this.form.get("orderLines") as FormArray;
    formArr.push(orderLine);
  }

  deleteOrderLine(index: number) {
    const orderLinesFormArr = this.form.get("orderLines") as FormArray;
    orderLinesFormArr.removeAt(index);
  }

  private skuValidation(control: FormControl): ValidationErrors | null {
    const selection: any = control.value;
    const existingOrderLines = this.form.get("orderLines")["controls"];
    const duplicate: boolean = existingOrderLines.filter(el => el.controls.sku.value === selection).length > 1;

    let isDuplicate: boolean = duplicate,
        isEmpty: boolean = selection.trim().length === 0,
        isUnavailable: boolean = this.productOptions.findIndex(prod => prod.sku === selection) == -1;
    if (isDuplicate || isEmpty || isUnavailable) {
      if (isEmpty) {
        return { valid: false, empty: { message: "Required" } };
      }
      if (isDuplicate) {
        return { valid: false, duplicate: { message: "Duplicate sku" } };
      }
      return { valid: false, outOfStock: { message: "Unavailable" } };
    }
    return null;
  }

  getPendingStatusId(): string {
    let statusId: string = "";
    this.statuses.forEach((value, key) => {
      if (value == "Pending") {
        statusId = key;
      }
    });
    return statusId;
  }

  checkOnHoldStatus(index: number) {
    const orderLinesFormArr = this.form.get("orderLines") as FormArray;
    const orderLine: any = orderLinesFormArr.at(index).value;
    const product = this.productOptions.find(prod => prod.sku === orderLine.sku);
    const onHold = product && (product.on_hand - product.allocated - Math.abs(orderLine.quantity) < 0);
    const sendAutomatically = this.form.value.sendAutomatically;
    return !sendAutomatically && onHold;
  }

  populateRecipientFields(recipient: any) {
    this.form.get("recipientCountry").setValue(recipient.country_code);
    this.form.get("recipientContact").setValue(recipient.att_contact);
    this.form.get("recipientCompany").setValue(recipient.company_name);
    this.form.get("recipientAddress").setValue(recipient.address_1);
    this.form.get("recipientAddress2").setValue(recipient.address_2);
    this.form.get("recipientZip").setValue(recipient.zip);
    this.form.get("recipientCity").setValue(recipient.city);
    this.form.get("recipientPhone").setValue(recipient.phone);
    this.form.get("recipientEmail").setValue(recipient.email);
    this.form.get("recipientVatNo").setValue(recipient.vat_no);
  }

  navigateToOrders() {
    this._router.navigateByUrl("/orders");
  }

  showPriorityToast(event: any) {
    if(event.checked) {
      this._snackBar.openFromComponent(PrioritiseOrderComponent, {
        duration: 4000,
      });
    }
  }

  setStockStatus() {
    let orderLines = this.form.get("orderLines") as FormArray;
    for(let i = 0; i < orderLines.length; i++) {
      let orderLine = orderLines.at(i);
      let dbProduct = this.productOptions.find(p => p.sku === orderLine.value.sku);
      let onStock: boolean = false;
      if(dbProduct && orderLine.value.quantity) {
        onStock = dbProduct.on_hand - dbProduct.allocated - orderLine.value.quantity > 0;
      }
      orderLine.get("onStock").setValue(onStock);
    }
  }

  setWebshopId() {
    const order_channel_id = this.form.get("orderChannel").value;
    const webshop = this.webshops.find(ws => ws.order_channel_id === order_channel_id);
    this.form.get("webshop").setValue(webshop);
  }

  onSubmit() {
    this.formSubmitAttempted = true;
    this.form.markAllAsTouched();
    this.isErrored = false;
    
    if(this.form.valid) {
        this.setStockStatus();
        this.setWebshopId();
        this.isSaving = true;
        this._ordersService.saveOrder(this.form).subscribe((response) => {
          this._router.navigateByUrl("/orders");
          this.isSaving = false;
        },

        (err => {
          this.isSaving = false;
          this.isErrored = true;
          this.form.enable();
          window.scroll(0, 0);
        }));
    }
    else {
      window.scroll(0, 0);
    }
  }

}
