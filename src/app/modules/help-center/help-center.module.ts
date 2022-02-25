import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { TreoMessageModule } from "@treo/components/message/message.module";
import { SharedModule } from "../../shared/shared.module";
import { HelpCenterComponent } from "./help-center.component";
import { HelpCenterFaqsComponent } from "./faqs/faqs.component";
import { HelpCenterGuidesComponent } from "./guides/guides.component";
import { HelpCenterGuidesCategoryComponent } from "./guides/category/category.component";
import { HelpCenterGuidesGuideComponent } from "./guides/guide/guide.component";
import { HelpCenterSupportComponent } from "./support/support.component";
import { helpCenterRoutes } from "./help-center.routing";

@NgModule({
  declarations: [
    HelpCenterComponent,
    HelpCenterFaqsComponent,
    HelpCenterGuidesComponent,
    HelpCenterGuidesCategoryComponent,
    HelpCenterGuidesGuideComponent,
    HelpCenterSupportComponent,
  ],
  imports: [RouterModule.forChild(helpCenterRoutes), MatButtonModule, MatExpansionModule, MatFormFieldModule, MatIconModule, MatInputModule, TreoMessageModule, SharedModule],
})
export class HelpCenterModule {}
