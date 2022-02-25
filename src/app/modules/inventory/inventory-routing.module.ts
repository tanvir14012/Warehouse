import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { InventoryListComponent } from './inventory-list/inventory-list.component';
import { InventoryBrandsResolver, InventoryCategoriesResolver, InventoryProductsResolver, InventoryTagsResolver, InventoryVendorsResolver } from './inventory.resolvers';

const routes: Routes = [
  {
    path: '',
    component: InventoryListComponent,
    resolve: {
      brands: InventoryBrandsResolver,
      categories: InventoryCategoriesResolver,
      products: InventoryProductsResolver,
      tags: InventoryTagsResolver,
      vendors: InventoryVendorsResolver
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InventoryRoutingModule { }
