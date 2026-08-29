import { Route } from "@angular/router";
import { HelpCenterComponent } from "./help-center.component";
import { HelpCenterFaqsComponent } from "./faqs/faqs.component";
import { HelpCenterGuidesComponent } from "./guides/guides.component";
import { HelpCenterGuidesCategoryComponent } from "./guides/category/category.component";
import { HelpCenterGuidesGuideComponent } from "./guides/guide/guide.component";
import { HelpCenterSupportComponent } from "./support/support.component";
import {
  HelpCenterFaqsResolver,
  HelpCenterGuidesCategoryResolver,
  HelpCenterGuidesGuideResolver,
  HelpCenterGuidesResolver,
  HelpCenterMostAskedFaqsResolver,
} from "./help-center.resolvers";

export const helpCenterRoutes: Route[] = [
  {
    path: "",
    component: HelpCenterComponent,
    resolve: {
      faqs: HelpCenterMostAskedFaqsResolver,
    },
  },
  {
    path: "faqs",
    component: HelpCenterFaqsComponent,
    resolve: {
      faqs: HelpCenterFaqsResolver,
    },
  },
  {
    path: "guides",
    children: [
      {
        path: "",
        component: HelpCenterGuidesComponent,
        resolve: {
          guides: HelpCenterGuidesResolver,
        },
      },
      {
        path: ":categorySlug",
        children: [
          {
            path: "",
            component: HelpCenterGuidesCategoryComponent,
            resolve: {
              guides: HelpCenterGuidesCategoryResolver,
            },
          },
          {
            path: ":guideSlug",
            component: HelpCenterGuidesGuideComponent,
            resolve: {
              guide: HelpCenterGuidesGuideResolver,
            },
          },
        ],
      },
    ],
  },
  {
    path: "support",
    component: HelpCenterSupportComponent,
  },
];
