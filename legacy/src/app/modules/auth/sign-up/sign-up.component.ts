import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { TreoAnimations } from '@treo/animations';
import { AuthService } from 'app/core/auth/auth.service';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router'

@Component({
    selector     : 'auth-sign-up',
    templateUrl  : './sign-up.component.html',
    styleUrls    : ['./sign-up.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations   : TreoAnimations
})
export class AuthSignUpComponent implements OnInit, OnDestroy
{
    message: any;
    signUpForm: FormGroup;

    // Private
    private _unsubscribeAll: Subject<any>;

    /**
     * Constructor
     *
     * @param {AuthService} _authService
     * @param {FormBuilder} _formBuilder
     * @param {AngularFireAuth} _ngFireAuth
     * @param {Router} _router
     */
    constructor(
        private _authService: AuthService,
        private _formBuilder: FormBuilder,
        private _ngFireAuth: AngularFireAuth,
        private _router: Router
    )
    {
        // Set the defaults
        this.message = null;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
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
        this.signUpForm = this._formBuilder.group({
                name      : ['', Validators.required],
                email     : ['', [Validators.required, Validators.email]],
                password  : ['', Validators.required],
                company   : [''],
                agreements: ['', Validators.requiredTrue]
            }
        );
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Sign up
     */
    signUp(): void
    {
        // Do nothing if the form is invalid
        if ( this.signUpForm.invalid )
        {
            return;
        }

        // Disable the form
        this.signUpForm.disable();

        // Hide the message
        this.message = null;

        // Do your action here...
        const formData = this.signUpForm.value;

        this._ngFireAuth.createUserWithEmailAndPassword(formData.email, formData.password).then((resp) => {
            const credentials = {
                email: formData.email, 
                password: formData.password,
                 rememberMe: true
                };
            this._authService.signIn(credentials).subscribe((response: any) => {
                this._ngFireAuth.currentUser.then((user) => {
                    user.sendEmailVerification();
                    user.updateProfile({
                        displayName: formData.name,
                        photoURL: 'https://firebasestorage.googleapis.com/v0/b/sendr-23393.appspot.com/o/profiles%2Fdefault.jpg?alt=media&token=c979a688-a807-4279-807e-208750aa9869'
                    });
                    this._router.navigate(['/example']);
                });
                this._authService._userData = response.user;
                const userRole = {
                    displayName: response.user.displayName,
                    uid: response.user.uid,
                    role: "webshop",
                    warehouseIDs: [],
                    webshopIDs: []
                };
                this._authService.authUserRole.next(userRole);
                localStorage.setItem("isPersistent", "true");
            });

        }, (err) => {
            // Re-enable the form
            this.signUpForm.enable();
            this.message = {
                appearance: 'outline',
                content: `${err.message}`,
                shake: true,
                showIcon: true,
                type: 'error'
            };
        });

    }
}
