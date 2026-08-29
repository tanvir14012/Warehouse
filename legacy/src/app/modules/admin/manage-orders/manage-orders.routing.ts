import { Route } from '@angular/router';
import { DetailComponent } from './detail/detail.component';
import { ListComponent } from './list/list.component';

export const manageOrdersRoutes: Route[] = [

    { path : '', component: ListComponent,}

];
