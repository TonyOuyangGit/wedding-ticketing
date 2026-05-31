import Link from "next/link";
import { requireUser } from "@/lib/guards";
import {
  listStages,
  listActiveUsers,
  listFieldDefinitions,
  getDefaultContractHandlerId,
} from "@/lib/queries";
import { createTicket } from "@/lib/tickets";
import { TicketForm } from "@/components/TicketForm";

export default async function NewTicketPage() {
  await requireUser();
  const [stages, users, fields, defaultContractHandlerId] = await Promise.all([
    listStages(),
    listActiveUsers(),
    listFieldDefinitions(),
    getDefaultContractHandlerId(),
  ]);

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/">← Back to weddings</Link>
        <h1 style={{ marginTop: "0.5rem" }}>New Event</h1>
      </div>
      <TicketForm
        action={createTicket}
        stages={stages}
        users={users}
        fields={fields}
        defaultContractHandlerId={defaultContractHandlerId}
      />
    </div>
  );
}
