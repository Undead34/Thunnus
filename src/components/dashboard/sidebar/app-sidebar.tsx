import * as React from "react";
import { Settings2, ShieldAlert, FileCode } from "lucide-react";

import { NavUser } from "./nav-user";
import { NavMain } from "./nav-main";
import { TeamSwitcher } from "./team-switcher";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const data = {
  team: {
    name: "NetReady Solutions",
    logo: "/VCC_NR.svg",
    link: "/dashboard",
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

interface Props extends React.ComponentProps<typeof Sidebar> {
  user: any;
}

export function AppSidebar({ ...props }: Props) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher team={data.team} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={props.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
