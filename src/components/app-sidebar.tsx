import * as React from "react";
import {
  Settings2,
  ShieldAlert,
  FileCode,
  LineChart,
  Lock,
  UserX,
  KeyRound,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Gabriel Maizo",
    email: "gmaizo@netreadysolutions.com",
    avatar: "/avatars/security-engineer.png",
  },
  team: {
    name: "NetReady Solutions",
    logo: "/VCC_NR.svg",
  },
  navMain: [
    {
      title: "Campaigns",
      url: "/campaigns",
      icon: ShieldAlert,
      isActive: false,
      items: [
        {
          title: "Active Campaigns",
          url: "/campaigns",
          badge: 3,
        },
        {
          title: "Templates",
          url: "/templates",
        },
        {
          title: "Scheduled",
          url: "/campaigns/scheduled",
          disabled: true,
        },
      ],
    },
    {
      title: "Templates & Pages",
      url: "/templates",
      icon: FileCode,
      items: [
        {
          title: "Email Templates",
          url: "/templates/emails",
          disabled: true,
        },
        {
          title: "Landing Pages",
          url: "/templates/pages",
          disabled: true,
        },
        {
          title: "Attachments",
          url: "/templates/attachments",
          disabled: true,
        },
      ],
    },
    {
      title: "Reporting & Analytics",
      url: "/analytics",
      icon: LineChart,
      items: [
        {
          title: "Campaign Results",
          url: "/analytics/campaigns",
          disabled: true,
        },
        {
          title: "User Activity",
          url: "/analytics/users",
          disabled: true,
        },
        {
          title: "Heatmaps",
          url: "/analytics/heatmaps",
          disabled: true,
        },
        {
          title: "Export Data",
          url: "/analytics/export",
          disabled: true,
        },
      ],
    },
    {
      title: "Configuration",
      url: "/settings",
      icon: Settings2,
      isActive: true,
      items: [
        {
          title: "SMTP Settings",
          url: "/settings/smtp",
          disabled: true,
        },
        {
          title: "User Management",
          url: "/settings/users",
          disabled: true,
        },
        {
          title: "API Keys",
          url: "/settings/api",
          disabled: true,
        },
        {
          title: "Security Rules",
          url: "/settings/security",
          disabled: true,
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher team={data.team} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
