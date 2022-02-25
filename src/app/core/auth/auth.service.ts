import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from, throwError, BehaviorSubject, Subscription } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { AngularFireAuth } from '@angular/fire/auth';
import firebase from 'firebase/app';
import { AngularFirestore } from '@angular/fire/firestore';

@Injectable()
export class AuthService
{
    // Private
    private _authenticated: boolean;
    _userData : any;
    authUserRole: BehaviorSubject<any>;
    private authUserRoleSubscr: Subscription;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     */
    constructor(
        private _httpClient: HttpClient,
        public _ngFireAuth: AngularFireAuth,
        private _ngFirestore: AngularFirestore
    )
    {
        // Set the defaults
        this.authUserRole = new BehaviorSubject(undefined);
        //Save  logged-in userRole data
        this._ngFireAuth.onAuthStateChanged(user => {
            if(user) {
                this._userData = user;                
                this.authUserRoleSubscr = this._ngFirestore.doc("userRoles/" + user.uid)
                    .get()
                    .subscribe(userRolesSnap => {
                        if(userRolesSnap.exists) {
                            const userRole: any = userRolesSnap.data();
                            this.authUserRole.next(userRole);
                        }
                    });
                localStorage.setItem("user", JSON.stringify(user));
            }
            else {
                this.authUserRole.next(null);
                this.authUserRoleSubscr?.unsubscribe();
                localStorage.removeItem('user');
                localStorage.removeItem('isPersistent');
                localStorage.removeItem('expiryTime');
            }
        });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Sign in
     *
     * @param credentials
     */
    signIn(credentials: { email: string, password: string, rememberMe: any }): Observable<any>
    {
        // Throw error, if the user is already logged in
        if ( !this.check() )
        {
            return throwError('User is already logged in.');
        }

        let persistence = firebase.auth.Auth.Persistence.LOCAL;       
        return from(this._ngFireAuth.setPersistence(persistence)).pipe(
            switchMap((success) => {
            return from(this._ngFireAuth.signInWithEmailAndPassword(credentials.email, credentials.password));
        })).pipe(
            switchMap((response: any) => {
                response.rememberMe = (credentials.rememberMe === true);
                return of(response);
            })
        );                                                   
    }
    signInByExternalProvider(providerName: string): Observable<any>{
        let provider = new firebase.auth.GoogleAuthProvider();
        switch(providerName){
            case "google":
                provider.addScope('profile');
                break;
            case "facebook":
                provider = new firebase.auth.FacebookAuthProvider();
                provider.addScope('public_profile');
                break;
        }
        provider.addScope('email');
        return from(this._ngFireAuth.signInWithPopup(provider))
                   .pipe(
                       switchMap((response: any) => {
                           return of(response);
                       })
                   );
    }

    /**
     * Sign out
     */
    signOut(): Observable<any>
    {
        // Set the authenticated flag to false
        this._ngFireAuth.signOut().then( () =>{
            this._userData = null;
            localStorage.removeItem('user');
            localStorage.removeItem('isPersistent');
            localStorage.removeItem('expiryTime');
        });
        return of(true);
    }

    /**
     * Check the authentication status
     */
    check(): Observable<boolean>
    {
        const isPersistent = localStorage.getItem("isPersistent") === "true";
            if(!isPersistent) {
                let now = new Date().getTime(),
                expiry = parseInt(localStorage.getItem("expiryTime"));
                if(expiry && expiry > now) {
                    localStorage.setItem("expiryTime", (now + 1000*60*60*1).toString());
                }
                else if(expiry && expiry < now) {
                    this.signOut();
                }
            }
        this._userData = JSON.parse(localStorage.getItem("user"));
        if(this._userData) {
            return of(true);
        }
        return of(false);
    }
}
