import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleStats } from "./simple-stats";
import GroupsTable from "./groups-table";
import type { PhishingUser } from "@/types";

interface Props {
  users: PhishingUser[];
}

export function CampaignStats({ users }: Props) {
  const [activeTab, setActiveTab] = useState("simple");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (view && (view === "simple" || view === "detailed")) {
      setActiveTab(view);
    }
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("view", value);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
