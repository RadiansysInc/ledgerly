import { env } from "cloudflare:workers";
import type { InvoiceData } from "@/lib/invoice";
import { calculateTotals, money } from "@/lib/invoice";
import { isInvoiceData, validateInvoice } from "@/lib/invoice-validation";
import { isAuthenticated } from "@/lib/auth";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function emailHtml(invoice: InvoiceData) {
  const totals = calculateTotals(invoice);
  const rows = invoice.items
    .map(
      (item, index) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #e7e4dc;color:#17231f">${escapeHtml(item.description || "Untitled item")}</td>
          <td style="padding:14px 0;border-bottom:1px solid #e7e4dc;text-align:center;color:#53605b">${item.quantity}</td>
          <td style="padding:14px 0;border-bottom:1px solid #e7e4dc;text-align:right;color:#53605b">${money(item.unitPrice)}</td>
          <td style="padding:14px 0;border-bottom:1px solid #e7e4dc;text-align:right;font-weight:700;color:#17231f">${money(totals.lineTotals[index])}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f1efe8;font-family:Arial,sans-serif;color:#17231f">
    <div style="max-width:680px;margin:0 auto;padding:32px 16px">
      <div style="background:#183d32;color:#fff;border-radius:18px 18px 0 0;padding:28px 34px">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a9c9bd">Invoice from</div>
        <div style="font-size:28px;font-weight:700;margin-top:8px">${escapeHtml(invoice.business.name)}</div>
      </div>
      <div style="background:#fff;padding:34px;border-radius:0 0 18px 18px">
        <div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:28px">
          <div><div style="font-size:12px;color:#6d7773">Billed to</div><div style="font-size:18px;font-weight:700;margin-top:5px">${escapeHtml(invoice.customer.name)}</div></div>
          <div style="text-align:right"><div style="font-size:12px;color:#6d7773">Invoice</div><div style="font-size:18px;font-weight:700;margin-top:5px">${escapeHtml(invoice.invoiceNumber)}</div></div>
        </div>
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr><th style="padding:10px 0;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6d7773">Description</th><th style="text-align:center;font-size:11px;text-transform:uppercase;color:#6d7773">Qty</th><th style="text-align:right;font-size:11px;text-transform:uppercase;color:#6d7773">Rate</th><th style="text-align:right;font-size:11px;text-transform:uppercase;color:#6d7773">Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin:28px 0 0 auto;max-width:270px">
          <div style="display:flex;justify-content:space-between;padding:7px 0;color:#53605b"><span>Subtotal</span><span>${money(totals.subtotal)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:7px 0;color:#53605b"><span>Discount</span><span>-${money(totals.discount)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:7px 0;color:#53605b"><span>Tax (${invoice.taxRate}%)</span><span>${money(totals.tax)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-top:10px;padding:16px 0;border-top:2px solid #17231f;font-size:20px;font-weight:700"><span>Total due</span><span>${money(totals.total)}</span></div>
        </div>
        <p style="margin:30px 0 0;color:#53605b;line-height:1.6">${escapeHtml(invoice.notes).replaceAll("\n", "<br>")}</p>
      </div>
    </div>
  </body></html>`;
}

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { to?: string; invoice?: unknown };
    const to = body.to?.trim() ?? "";
    if (!/^\S+@\S+\.\S+$/.test(to)) {
      return Response.json({ error: "Enter a valid recipient email." }, { status: 400 });
    }
    if (!isInvoiceData(body.invoice)) {
      return Response.json({ error: "Invalid invoice payload." }, { status: 400 });
    }
    const errors = validateInvoice(body.invoice);
    if (errors.length) return Response.json({ error: errors[0] }, { status: 400 });

    const apiKey = env.BREVO_API_KEY;
    const fromEmail = env.BREVO_FROM_EMAIL;
    const fromName = env.BREVO_FROM_NAME || body.invoice.business.name || "Ledgerly";
    if (!apiKey || !fromEmail) {
      return Response.json(
        { error: "Email is not configured yet. Add BREVO_API_KEY and BREVO_FROM_EMAIL on the server." },
        { status: 503 },
      );
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: fromEmail,
          name: fromName,
        },
        to: [{ email: to, name: body.invoice.customer.name }],
        subject: `Invoice ${body.invoice.invoiceNumber} from ${body.invoice.business.name}`,
        htmlContent: emailHtml(body.invoice),
        replyTo: {
          email: fromEmail,
          name: fromName,
        },
        tags: ["ledgerly-invoice"],
      }),
    });
    const result = (await response.json()) as { messageId?: string; message?: string; code?: string };
    if (!response.ok) {
      return Response.json({ error: result.message || "Email provider rejected the request." }, { status: 502 });
    }
    return Response.json({ id: result.messageId });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to send email." },
      { status: 500 },
    );
  }
}
