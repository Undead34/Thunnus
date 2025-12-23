import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleStats } from "./simple-stats";
import GroupsTable from "./groups-table";
import type { PhishingUser } from "@/types";

interface Props {
  users: PhishingUser[];
}

export function CampaignStats({ users }: Props) {
  return (
    <Tabs defaultValue="simple" className="w-full">
      <TabsList>
        <TabsTrigger value="simple">Vista Simplificada</TabsTrigger>
        <TabsTrigger value="detailed">Vista Detallada</TabsTrigger>
      </TabsList>
      <TabsContent value="simple" className="mt-4">
        <SimpleStats users={users} />
      </TabsContent>
      <TabsContent value="detailed" className="mt-4">
        <GroupsTable data={users} />
      </TabsContent>
    </Tabs>
  );
}
