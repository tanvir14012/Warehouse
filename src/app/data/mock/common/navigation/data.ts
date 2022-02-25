/* tslint:disable:max-line-length */
import { TreoNavigationItem } from "@treo/components/navigation";

export const defaultNavigation: TreoNavigationItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    subtitle: "Reports & Performance",
    type: "group",
    icon: "apps",
    children: [
      {
        id: "dashboard.performance",
        title: "Performance Dashboard",
        type: "basic",
        icon: "heroicons_outline:cash",
        link: "/example",
      },
      {
        id: "dashboard.reporting",
        title: "Reporting Dashboard",
        type: "basic",
        icon: "heroicons_outline:chart-pie",
        link: "/reporting",
      },
    ],
  },
  {
    id: "orders",
    title: "Orders",
    subtitle: "Orders details",
    type: "group",
    icon: "apps",
    children: [
      {
        id: "orders.myorders",
        title: "My Orders",
        type: "basic",
        icon: "heroicons_outline:currency-dollar",
        link: "/orders",
      },
      {
        id: "orders.manage-orders",
        title: "Manage Orders",
        type: "basic",
        icon: "heroicons_outline:calculator",
        link: "/manage-orders",
      },
      {
        id: "orders.myinventory",
        title: "My Inventory",
        type: "basic",
        icon: "heroicons_outline:shopping-cart",
        link: "/inventory",
      },
    ],
  },
  {
    id: "setting",
    title: "Setting",
    subtitle: "Your setting",
    type: "group",
    icon: "apps",
    children: [
      {
        id: "setting.helpdesk",
        title: "Help Desk",
        type: "collapsable",
        icon: "heroicons_outline:question-mark-circle",
        link: "/help-center",
        children: [
          {
            id: "setting.help-center.home",
            title: "Home",
            type: "basic",
            link: "/help-center",
            exactMatch: true,
          },
          {
            id: "settings.help-center.faqs",
            title: "FAQs",
            type: "basic",
            link: "/help-center/faqs",
          },
          {
            id: "settings.help-center.guides",
            title: "Guides",
            type: "basic",
            link: "/help-center/guides",
          },
          {
            id: "settings.help-center.support",
            title: "Support",
            type: "basic",
            link: "/help-center/support",
          },
        ],
      },
      {
        id: "setting.mysetting",
        title: "Settings",
        type: "basic",
        icon: "heroicons_outline:check-circle",
        link: "/settings",
      },
      {
        id: "setting.profile",
        title: "Profile",
        type: "basic",
        icon: "heroicons_outline:user-circle",
        link: "/profile",
      },
    ],
  },
];
export const compactNavigation: TreoNavigationItem[] = [
  {
    id: "starter",
    title: "Starter",
    type: "aside",
    icon: "apps",
    children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
  },
];
export const futuristicNavigation: TreoNavigationItem[] = [
  {
    id: "starter.example",
    title: "Example component",
    type: "basic",
    icon: "heroicons:chart-pie",
    link: "/example",
  },
  {
    id: "starter.dummy.1",
    title: "Dummy menu item #1",
    icon: "heroicons:calendar",
    type: "basic",
  },
  {
    id: "starter.dummy.2",
    title: "Dummy menu item #1",
    icon: "heroicons:user-group",
    type: "basic",
  },
];
export const horizontalNavigation: TreoNavigationItem[] = [
  {
    id: "starter",
    title: "Starter",
    type: "group",
    icon: "apps",
    children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
  },
];
