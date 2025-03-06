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
      url: "/campaigns",
      icon: ShieldAlert,
      isActive: false,
      items: [
        {
          title: "Campañas activas",
          url: "/campaigns",
          badge: 3,
        },
        {
          title: "Campañas programadas",
          url: "/campaigns/scheduled",
          disabled: true,
        },
      ],
    },
    {
      title: "Plantillas y páginas",
      url: "/templates",
      icon: FileCode,
      items: [
        {
          title: "Plantillas de correo",
          url: "/templates/emails",
          disabled: true,
        },
        {
          title: "Páginas de inicio",
          url: "/templates",
        },
        {
          title: "Archivos adjuntos",
          url: "/templates/attachments",
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
      url: "/settings",
      icon: Settings2,
      isActive: true,
      items: [
        {
          title: "Configuración SMTP",
          url: "/settings/smtp",
          disabled: true,
        },
        {
          title: "Gestión de usuarios",
          url: "/settings/users",
          disabled: true,
        },
        {
          title: "Claves API",
          url: "/settings/api",
          disabled: true,
        },
        {
          title: "Reglas de seguridad",
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
