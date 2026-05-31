import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guards";
import {
  getTicket,
  listStages,
  listActiveUsers,
  listFieldDefinitions,
} from "@/lib/queries";
import { updateTicket, deleteTicket, updateTicketDescription } from "@/lib/tickets";
import { renderDescription } from "@/lib/markdown";
import { TicketForm } from "@/components/TicketForm";
import { DescriptionEditor } from "@/components/DescriptionEditor";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [ticket, stages, users, fields] = await Promise.all([
    getTicket(id),
    listStages(),
    listActiveUsers(),
    listFieldDefinitions(),
  ]);

  if (!ticket) notFound();

  const known = users.map((u) => u.email);
  const descriptionHtml = ticket.description
    ? renderDescription(ticket.description, known)
    : "";

  const deleteAction = deleteTicket.bind(null, id);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div>
          <Link href="/">← Back to weddings</Link>
          <h1 style={{ marginTop: "0.5rem" }}>{ticket.client}</h1>
        </div>
        <form action={deleteAction}>
          <button type="submit" className="danger">
            Delete
          </button>
        </form>
      </div>

      <DescriptionEditor
        html={descriptionHtml}
        raw={ticket.description}
        action={updateTicketDescription.bind(null, id)}
      />

      <TicketForm
        action={updateTicket.bind(null, id)}
        stages={stages}
        users={users}
        fields={fields}
        showDescription={false}
        ticket={{
          id: ticket.id,
          client: ticket.client,
          weddingDate: ticket.weddingDate,
          location: ticket.location,
          description: ticket.description,
          customValues: ticket.customValues,
          stageId: ticket.stageId,
          mcUserId: ticket.mcUserId,
          mcName: ticket.mcName,
          djUserId: ticket.djUserId,
          djName: ticket.djName,
          contractHandlerId: ticket.contractHandlerId,
          contractHandlerName: ticket.contractHandlerName,
          links: ticket.links.map((l) => ({ label: l.label, url: l.url })),
        }}
      />
    </div>
  );
}
