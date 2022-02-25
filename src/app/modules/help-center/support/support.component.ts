import { Component, OnDestroy, OnInit, ViewEncapsulation } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Subject } from "rxjs";
import { TreoAnimations } from "@treo/animations";
import { HelpCenterService } from "../help-center.service";

@Component({
  selector: "help-center-support",
  templateUrl: "./support.component.html",
  styleUrls: ["./support.component.scss"],
  encapsulation: ViewEncapsulation.None,
  animations: TreoAnimations,
})
export class HelpCenterSupportComponent implements OnInit, OnDestroy {
  message: any | null;
  supportForm: FormGroup;

  // Private
  private _unsubscribeAll: Subject<any>;

  /**
   * Constructor
   *
   * @param {FormBuilder} _formBuilder
   * @param {HelpCenterService} _helpCenterService
   */
  constructor(private _formBuilder: FormBuilder, private _helpCenterService: HelpCenterService) {
    // Set the private defaults
    this._unsubscribeAll = new Subject();

    // Set the defaults
    this.message = null;
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Create the support form
    this.supportForm = this._formBuilder.group({
      name: ["", Validators.required],
      email: ["", [Validators.required, Validators.email]],
      subject: ["", Validators.required],
      message: ["", Validators.required],
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
   * Clear the form
   */
  clearForm(): void {
    // Reset the form
    this.supportForm.reset();
  }

  /**
   * Send the form
   */
  sendForm(): void {
    // Send your form here using an http request
    console.log("Your message has been sent!");

    // Show a success message (it can also be an error message)
    // and remove it after 5 seconds
    this.message = {
      type: "success",
      content: "Your request has been delivered! A member of our support staff will respond as soon as possible.",
    };

    setTimeout(() => {
      this.message = null;
    }, 7000);

    // Clear the form
    this.clearForm();
  }
}
