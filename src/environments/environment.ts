// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
    production: false,
    firebase: {
        apiKey: 'AIzaSyCMRJWdlP4V4Vd342dd1AWlVRyIdSQMV80',
        authDomain: 'sendr-23393.firebaseapp.com',
        databaseURL: 'https://sendr-23393.firebaseio.com',
        projectId: 'sendr-23393',
        storageBucket: 'sendr-23393.appspot.com',
        messagingSenderId: '803387807296',
        appId: '1:803387807296:web:fb95f43866579c121071a5',
        measurementId: 'G-E1HH7YYJP8'
    },
    algolia: {
        app_id: "2D3A8KL84X",
        search_key: "4992f90fb7b4d41e546cfdd67f8e3fb9",
        orderIndex: "search_ORDERS"
    }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
