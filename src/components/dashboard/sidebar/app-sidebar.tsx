import * as React from "react";
import { Settings2, ShieldAlert, FileCode, LayoutDashboard } from "lucide-react";

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
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        isActive: true,
    },
    {
      title: "Campañas",
      url: "/dashboard/campaigns",
      icon: ShieldAlert,
      isActive: true,
    },
    {
      title: "Plantillas y páginas",
      url: "/dashboard/templates",
      icon: FileCode,
      isActive: true,
      items: [
        {
          title: "Páginas de inicio",
          url: "/dashboard/templates",
        },
        {
          title: "Plantillas de correo",
          url: "/dashboard/templates/emails",
        },
      ],
    },
    {
      title: "Configuración",
      url: "/dashboard/settings",
      icon: Settings2,
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
