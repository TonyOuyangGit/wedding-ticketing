type SendArgs = { to: string; subject: string; text: string };

// Sends via Resend when RESEND_API_KEY is set; otherwise logs to the console
// (dev default). Returns true if the message was accepted/logged.
export async function sendEmail({ to, subject, text }: SendArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Wedding Ticketing <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(`[email:dev] to=${to} subject="${subject}"\n${text}`);
    return true;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (!res.ok) {
    console.error(`[email] send failed: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}
