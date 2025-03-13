import { AppSidebar } from "./app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Breadcrumb from "../breadcrumb/BreadcrumbContainer";

interface Props {
  children: React.ReactNode;
  data: any;
  user: any;
}

export default function Sidebar({ children, data, user }: Props) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Breadcrumb client:load data={data} />

        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
