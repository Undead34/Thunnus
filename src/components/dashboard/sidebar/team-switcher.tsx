import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface Props {
  team: {
    name: string;
    logo: string;
    link: string;
  };
}

export function TeamSwitcher({ team }: Props) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <a href={team.link}>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <img
              src={team.logo}
              alt="NetReady Logotype"
              className="flex size-12 items-center justify-center"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{team.name}</span>
            </div>
          </SidebarMenuButton>
        </a>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
