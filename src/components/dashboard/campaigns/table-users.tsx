import { DataTable } from "./data-table";
import { columnsUser } from "./columns";
import type { PhishingUser } from "@/types";

export default function TableUsers({ data }: { data: PhishingUser[] }) {
  return <DataTable data={data} columns={columnsUser} />;
}
