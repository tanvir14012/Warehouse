import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
    selector       : 'orders',
    templateUrl    : './orders.component.html',
    styleUrls      : ['./orders.component.scss'],
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersComponent
{
    /**
     * Constructor
     */
    constructor()
    {
    }
}
