import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { invoices } from "@/db/schema";
import type { InvoiceData } from "@/lib/invoice";
import { isInvoiceData, validateInvoice } from "@/lib/invoice-validation";
import { isAuthenticated } from "@/lib/auth";

const parseRow = (row: typeof invoices.$inferSelect) => ({
  ...JSON.parse(row.payload),
  id: row.id,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table")) {
    return "Invoice storage is not initialized. Apply the generated D1 migration, then try again.";
  }
  return message;
}

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const id = new URL(request.url).searchParams.get("id");
    const db = getDb();
    if (id) {
      const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
      if (!row) return Response.json({ error: "Invoice not found." }, { status: 404 });
      return Response.json({ invoice: parseRow(row) });
    }

    const rows = await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.updatedAt))
      .limit(12);
    return Response.json({ invoices: rows.map(parseRow) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const invoice = (await request.json()) as unknown;
    if (!isInvoiceData(invoice)) {
      return Response.json({ error: "Invalid invoice payload." }, { status: 400 });
    }
    const errors = validateInvoice(invoice);
    if (errors.length) return Response.json({ error: errors[0] }, { status: 400 });

    const id = crypto.randomUUID();
    const db = getDb();
    const [row] = await db
      .insert(invoices)
      .values({
        id,
        invoiceNumber: invoice.invoiceNumber.trim(),
        clientName: invoice.customer.name.trim(),
        payload: JSON.stringify({ ...invoice, id: undefined }),
      })
      .returning();
    return Response.json({ invoice: parseRow(row) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const invoice = (await request.json()) as InvoiceData;
    if (!invoice.id || !isInvoiceData(invoice)) {
      return Response.json({ error: "A valid saved invoice is required." }, { status: 400 });
    }
    const errors = validateInvoice(invoice);
    if (errors.length) return Response.json({ error: errors[0] }, { status: 400 });

    const db = getDb();
    const [row] = await db
      .update(invoices)
      .set({
        invoiceNumber: invoice.invoiceNumber.trim(),
        clientName: invoice.customer.name.trim(),
        payload: JSON.stringify({ ...invoice, id: undefined }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(invoices.id, invoice.id))
      .returning();
    if (!row) return Response.json({ error: "Invoice not found." }, { status: 404 });
    return Response.json({ invoice: parseRow(row) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
