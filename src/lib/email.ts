import nodemailer from "nodemailer";

// Plain SMTP via nodemailer — same approach as elleza's email service,
// simplified. No third-party email API/subscription needed: works with
// any SMTP account (the business's own mailbox, Gmail, Zoho, etc.) via
// the env vars below. See .env.example for what to set.
//
// Deliberately never throws — email is a side effect of a reservation
// being created, not a precondition for it. A down SMTP server must
// never stop a customer's booking from going through; it should just
// get logged so an agent can follow up by phone instead.

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string | Buffer; contentType?: string }[];
};

export type SendEmailResult = { success: true; messageId: string } | { success: false; error: string };

type Transporter = ReturnType<typeof nodemailer.createTransport>;

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!host || !user || !pass) return null;

  if (!cachedTransporter) {
    const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587;
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { minVersion: "TLSv1.2" },
    });
  }
  return cachedTransporter;
}

async function sendOnce(transporter: Transporter, input: SendEmailInput) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments,
  });
}

/** Sends one email, retrying once on failure. Never throws — check
 * `.success` on the result. Logs (but does not throw) when SMTP isn't
 * configured at all, which is the expected state until real credentials
 * are set — the caller still gets a clean failure result either way. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] EMAIL_HOST/EMAIL_USER/EMAIL_PASS not configured — skipping send:", input.subject);
    return { success: false, error: "SMTP not configured" };
  }

  try {
    const info = await sendOnce(transporter, input);
    return { success: true, messageId: info.messageId };
  } catch (firstError) {
    console.warn("[email] send failed, retrying once:", firstError instanceof Error ? firstError.message : firstError);
    try {
      const info = await sendOnce(transporter, input);
      return { success: true, messageId: info.messageId };
    } catch (secondError) {
      const message = secondError instanceof Error ? secondError.message : "Unknown error";
      console.error("[email] send failed after retry:", message);
      return { success: false, error: message };
    }
  }
}

/** Escapes text before it's interpolated into an email's HTML body —
 * every value below (customer name, remarks) is user-supplied, and this
 * is cheap insurance against HTML/script injection into a real inbox. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
