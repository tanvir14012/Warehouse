import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators  } from '@angular/forms';
import { TreoAnimations } from '@treo/animations';
import { AuthService } from 'app/core/auth/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector     : 'auth-sign-in',
    templateUrl  : './sign-in.component.html',
    styleUrls    : ['./sign-in.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations   : TreoAnimations
})
export class AuthSignInComponent implements OnInit
{
    signInForm: FormGroup;
    message: any;
    redirectUrl: string;

    /**
     * Constructor
     *
     * @param {ActivatedRoute} _activatedRoute
     * @param {AuthService} _authService
     * @param {FormBuilder} _formBuilder
     * @param {Router} _router
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _formBuilder: FormBuilder,
        private _router: Router
    )
    {
        // Set the defaults
        this.message = null;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {       
        // Create the form
        this.signInForm = this._formBuilder.group({
            email: [null, [Validators.required, Validators.email]],
            password: [null, [Validators.required]],
            rememberMe: ['']
        });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Sign in
     */
    signIn(): void
    {
        // Disable the form
        this.signInForm.disable();

        // Hide the message
        this.message = null;

        // Get the credentials
        const credentials = this.signInForm.value;

        // Sign in
        this._authService.signIn(credentials)
            .subscribe((response: any) => {
                // Set the redirect url.
                // The '/signed-in-redirect' is a dummy url to catch the request and redirect the user
                // to the correct page after a successful sign in. This way, that url can be set via
                // routing file and we don't have to touch here.
                this._authService._userData = response.user;
                if(response.rememberMe) {
                    localStorage.setItem("isPersistent", "true");
                }
                else {
                    localStorage.setItem("isPersistent", "false");
                    let expiry = new Date().getTime() + (1000 * 60 * 60 * 1); //msec-sec-min-hr
                    localStorage.setItem("expiryTime", expiry.toString());
                }
                
                const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL') || '/signed-in-redirect';
                // Navigate to the redirect url
                this._router.navigateByUrl(redirectURL);

            }, (response) => {

                // Re-enable the form
                this.signInForm.enable();

                // Show the error message
                this.message = {
                    appearance: 'outline',
                    content   : response.error,
                    shake     : true,
                    showIcon  : false,
                    type      : 'error'
                };
            });
    }

    externalSignIn(providerName: string): void {
        // Sign in
        this._authService.signInByExternalProvider(providerName)
            .subscribe((response) => {

                // Set the redirect url.
                // The '/signed-in-redirect' is a dummy url to catch the request and redirect the user
                // to the correct page after a successful sign in. This way, that url can be set via
                // routing file and we don't have to touch here.
                if(response.user) {
                    this._authService._userData = response.user;
                    localStorage.setItem("user", JSON.stringify(response.user));
                    localStorage.setItem("isPersistent", "true");
                }
                const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL') || '/signed-in-redirect';
                this.redirectUrl = redirectURL;
                // Navigate to the redirect url
                this._router.navigateByUrl(redirectURL);

            }, (response) => {

                // Re-enable the form
                this.signInForm.enable();

                // Show the error message
                this.message = {
                    appearance: 'outline',
                    content   : response.error || response.message,
                    shake     : true,
                    showIcon  : false,
                    type      : 'error'
                };
            });
    }
}