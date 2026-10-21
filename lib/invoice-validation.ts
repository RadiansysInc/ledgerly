import type { InvoiceData } from "./invoice";
import { calculateTotals } from "./invoice";

export function validateInvoice(invoice: InvoiceData) {
  const errors: string[] = [];
  if (!invoice.invoiceNumber.trim()) errors.push("Invoice number is required.");
  if (!invoice.business.name.trim()) errors.push("Business name is required.");
  if (!invoice.customer.name.trim()) errors.push("Customer name is required.");
  if (!invoice.items.length) errors.push("Add at least one line item.");
  if (invoice.items.some((item) => item.quantity < 0 || item.unitPrice < 0)) {
    errors.push("Quantity and unit price cannot be negative.");
  }
  if (invoice.discount < 0) errors.push("Discount cannot be negative.");
  if (invoice.taxRate < 0) errors.push("Tax rate cannot be negative.");
  if (invoice.discount > calculateTotals(invoice).subtotal) {
    errors.push("Discount cannot exceed the subtotal.");
  }
  return errors;
}

export function isInvoiceData(value: unknown): value is InvoiceData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<InvoiceData>;
  return (
    typeof candidate.invoiceNumber === "string" &&
    typeof candidate.business === "object" &&
    typeof candidate.customer === "object" &&
    Array.isArray(candidate.items) &&
    Array.isArray(candidate.customFields)
  );
}
