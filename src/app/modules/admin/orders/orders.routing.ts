import { Route } from '@angular/router';
import { CanDeactivateOrdersDetails } from 'app/modules/admin/orders/orders.guards';
import { OrdersComponent } from 'app/modules/admin/orders/orders.component';
import { OrdersListComponent } from 'app/modules/admin/orders/list/list.component';
import { OrdersDetailsComponent } from 'app/modules/admin/orders/details/details.component';

export const ordersRoutes: Route[] = [
    {
        path     : '',
        component: OrdersComponent,
        children : [
            {
                path     : '',
                component: OrdersListComponent,
                children : [
                    {
                        path         : ':id',
                        component    : OrdersDetailsComponent,
                        canDeactivate: [CanDeactivateOrdersDetails]
                    }
                ]
            }
        ]
    }
];
