import { Component, OnDestroy, OnInit, ViewEncapsulation } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { HelpCenterService } from "../../help-center.service";
import { GuideCategory } from "../../help-center.type";

@Component({
  selector: "help-center-guides-category",
  templateUrl: "./category.component.html",
  styleUrls: ["./category.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class HelpCenterGuidesCategoryComponent implements OnInit, OnDestroy {
  guideCategory: GuideCategory;

  // Private
  private _unsubscribeAll: Subject<any>;

  /**
   * Constructor
   *
   * @param {ActivatedRoute} _activatedRoute
   * @param {HelpCenterService} _helpCenterService
   * @param {Router} _router
   */
  constructor(private _activatedRoute: ActivatedRoute, private _helpCenterService: HelpCenterService, private _router: Router) {
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
    // Get the Guides
    this._helpCenterService.guides$.pipe(takeUntil(this._unsubscribeAll)).subscribe((guideCategories) => {
      this.guideCategory = guideCategories[0];
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
