import { Component, OnDestroy, OnInit, ViewEncapsulation } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { HelpCenterService } from "./help-center.service";
import { FaqCategory } from "./help-center.type";

@Component({
  selector: "help-center",
  templateUrl: "./help-center.component.html",
  styleUrls: ["./help-center.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class HelpCenterComponent implements OnInit, OnDestroy {
  faqCategory: FaqCategory;

  // Private
  private _unsubscribeAll: Subject<any>;

  /**
   * Constructor
   *
   * @param {HelpCenterService} _helpCenterService
   */
  constructor(private _helpCenterService: HelpCenterService) {
    // Set the private defaults
    this._unsubscribeAll = new Subject();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Get the FAQs
    this._helpCenterService.faqs$.pipe(takeUntil(this._unsubscribeAll)).subscribe((faqCategories) => {
      this.faqCategory = faqCategories[0];
    });
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
   * Track by function for ngFor loops
   *
   * @param index
   * @param item
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }
}
