import assert from "node:assert/strict";
import test from "node:test";
import { calculateTotals, type InvoiceData } from "../lib/invoice.ts";

const base = {
  invoiceNumber: "TEST-001",
  issueDate: "2026-01-01",
  dueDate: "2026-01-15",
  business: { name: "Test", email: "", phone: "", website: "", address: "" },
  customer: { name: "Client", email: "", address: "" },
  notes: "",
  customFields: [],
} satisfies Omit<InvoiceData, "items" | "discount" | "taxRate">;

test("matches the exercise acceptance example", () => {
  const result = calculateTotals({
    ...base,
    items: [{ id: "1", description: "Service", quantity: 2, unitPrice: 50 }],
    discount: 10,
    taxRate: 10,
  });

  assert.deepEqual(result.lineTotals, [100]);
  assert.equal(result.subtotal, 100);
  assert.equal(result.discount, 10);
  assert.equal(result.tax, 9);
  assert.equal(result.total, 99);
});

test("rounds each line to cents before summing", () => {
  const result = calculateTotals({
    ...base,
    items: [
      { id: "1", description: "A", quantity: 3, unitPrice: 0.335 },
      { id: "2", description: "B", quantity: 1, unitPrice: 0.335 },
    ],
    discount: 0,
    taxRate: 0,
  });

  assert.deepEqual(result.lineTotals, [1.01, 0.34]);
  assert.equal(result.subtotal, 1.35);
});

test("caps a discount at the subtotal", () => {
  const result = calculateTotals({
    ...base,
    items: [{ id: "1", description: "A", quantity: 1, unitPrice: 40 }],
    discount: 60,
    taxRate: 20,
  });

  assert.equal(result.discount, 40);
  assert.equal(result.tax, 0);
  assert.equal(result.total, 0);
});
