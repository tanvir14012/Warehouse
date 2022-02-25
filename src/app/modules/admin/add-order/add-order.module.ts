import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { addOrderRoutes } from './add-order-routing';
import { RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from 'app/shared/shared.module';
import { AddOrderComponent } from './add-order.component';
import { PrioritiseOrderComponent } from './prioritise-order/prioritise-order.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


@NgModule({
  declarations: [
    AddOrderComponent,
    PrioritiseOrderComponent
  ],
  imports: [
    RouterModule.forChild(addOrderRoutes),
    CommonModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatTooltipModule,
    SharedModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule 
  ]
})
export class AddOrderModule { }
