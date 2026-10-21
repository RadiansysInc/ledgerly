export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type CustomField = {
  id: string;
  label: string;
  value: string;
  visible: boolean;
};

export type Party = {
  name: string;
  email: string;
  address: string;
};

export type InvoiceData = {
  id?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  business: Party & { phone: string; website: string };
  customer: Party;
  items: LineItem[];
  discount: number;
  taxRate: number;
  notes: string;
  customFields: CustomField[];
};

const today = new Date();
const due = new Date(today);
due.setDate(today.getDate() + 14);
const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

export const EMPTY_INVOICE: InvoiceData = {
  invoiceNumber: `INV-${String(today.getFullYear()).slice(-2)}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}01`,
  issueDate: toDateInput(today),
  dueDate: toDateInput(due),
  business: {
    name: "Northstar Studio",
    email: "hello@northstar.example",
    phone: "+1 (415) 555-0142",
    website: "northstar.example",
    address: "248 Harbor Street\nSan Francisco, CA 94107",
  },
  customer: {
    name: "Evergreen & Co.",
    email: "accounts@evergreen.example",
    address: "510 Pine Avenue\nPortland, OR 97205",
  },
  items: [
    {
      id: "item-1",
      description: "Brand identity direction",
      quantity: 1,
      unitPrice: 1850,
    },
    {
      id: "item-2",
      description: "Digital design system",
      quantity: 12,
      unitPrice: 125,
    },
  ],
  discount: 150,
  taxRate: 8.25,
  notes:
    "Thank you for trusting us with your next chapter. Payment is due within 14 days.",
  customFields: [
    {
      id: "field-1",
      label: "Project",
      value: "Evergreen refresh",
      visible: true,
    },
    {
      id: "field-2",
      label: "PO number",
      value: "PO-1048",
      visible: true,
    },
  ],
};

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(value) ? value : 0);

export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateTotals(invoice: InvoiceData) {
  const lineTotals = invoice.items.map((item) =>
    roundMoney(Math.max(0, item.quantity || 0) * Math.max(0, item.unitPrice || 0)),
  );
  const subtotal = roundMoney(lineTotals.reduce((sum, value) => sum + value, 0));
  const discount = roundMoney(Math.min(Math.max(0, invoice.discount || 0), subtotal));
  const taxable = roundMoney(subtotal - discount);
  const tax = roundMoney(taxable * (Math.max(0, invoice.taxRate || 0) / 100));
  const total = roundMoney(taxable + tax);

  return { lineTotals, subtotal, discount, taxable, tax, total };
}

export const formatDate = (date: string) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
};
