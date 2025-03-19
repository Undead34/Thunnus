import { InfoIcon } from "lucide-react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export default function KeyValueCard({ event }: { event: any }) {
  return (
    <HoverCard>
      <HoverCardTrigger>
        <Button variant="ghost" type="button">
          <InfoIcon className="h-4 w-4" />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="w-80">
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {Object.entries(event.data || {}).map(
              ([key, value]: [string, any]) => (
                <div key={key} className="grid grid-cols-3 gap-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {key}:
                  </p>
                  <p className="text-sm col-span-2">
                    {JSON.stringify(value, null, 2)}
                  </p>
                </div>
              )
            )}
          </div>
        </ScrollArea>
      </HoverCardContent>
    </HoverCard>
  );
}
