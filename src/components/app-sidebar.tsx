import * as React from "react";
import { Settings2, ShieldAlert, FileCode } from "lucide-react";

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

export const data = {
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
      title: "Campañas",
      url: "/dashboard/campaigns",
      icon: ShieldAlert,
      isActive: false,
      items: [
        {
          title: "Campañas activas",
          url: "/dashboard/campaigns",
          badge: 3,
        },
        {
          title: "Campañas programadas",
          url: "/dashboard/campaigns/scheduled",
          disabled: true,
        },
      ],
    },
    {
      title: "Plantillas y páginas",
      url: "/dashboard/templates",
      icon: FileCode,
      items: [
        {
          title: "Plantillas de correo",
          url: "/dashboard/templates/emails",
          disabled: true,
        },
        {
          title: "Páginas de inicio",
          url: "/dashboard/templates",
        },
        {
          title: "Archivos adjuntos",
          url: "/dashboard/templates/attachments",
          disabled: true,
        },
      ],
    },
    // {
    //   title: "Reporting & Analytics",
    //   url: "/analytics",
    //   icon: LineChart,
    //   items: [
    //     {
    //       title: "Campaign Results",
    //       url: "/analytics/campaigns",
    //       disabled: true,
    //     },
    //     {
    //       title: "User Activity",
    //       url: "/analytics/users",
    //       disabled: true,
    //     },
    //     {
    //       title: "Heatmaps",
    //       url: "/analytics/heatmaps",
    //       disabled: true,
    //     },
    //     {
    //       title: "Export Data",
    //       url: "/analytics/export",
    //       disabled: true,
    //     },
    //   ],
    // },
    {
      title: "Configuración",
      url: "/dashboard/settings",
      icon: Settings2,
      isActive: true,
      items: [
        {
          title: "Configuración SMTP",
          url: "/dashboard/settings#smtp",
          disabled: false,
        },
        {
          title: "Gestión de usuarios",
          url: "/dashboard/settings/users",
          disabled: true,
        },
        {
          title: "Claves API",
          url: "/dashboard/settings/api",
          disabled: true,
        },
        {
          title: "Reglas de seguridad",
          url: "/dashboard/settings/security",
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
