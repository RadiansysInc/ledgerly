"use client";

import {
  Check,
  ChevronDown,
  Clock3,
  CopyPlus,
  Eye,
  EyeOff,
  FileText,
  History,
  LogOut,
  Mail,
  Menu,
  Plus,
  Printer,
  Save,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  calculateTotals,
  EMPTY_INVOICE,
  formatDate,
  type InvoiceData,
  money,
} from "@/lib/invoice";
import { validateInvoice } from "@/lib/invoice-validation";

type SaveState = "idle" | "saving" | "saved" | "error";
type SavedInvoice = InvoiceData & { createdAt?: string; updatedAt?: string };

const cloneStarter = (): InvoiceData => JSON.parse(JSON.stringify(EMPTY_INVOICE));
const makeId = () => crypto.randomUUID();

function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  prefix,
  suffix,
  placeholder,
  required,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-shell">
        {prefix && <span className="input-affix">{prefix}</span>}
        <input
          type={type}
          value={value}
          min={min}
          max={max}
          step={type === "number" ? "0.01" : undefined}
          required={required}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix && <span className="input-affix">{suffix}</span>}
      </span>
    </label>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="editor-section">
      <div className="section-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function InvoiceStudio({ onLogout }: { onLogout?: () => void }) {
  const [invoice, setInvoice] = useState<InvoiceData>(cloneStarter);
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [notice, setNotice] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState(EMPTY_INVOICE.customer.email);
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const totals = useMemo(() => calculateTotals(invoice), [invoice]);
  const errors = useMemo(() => validateInvoice(invoice), [invoice]);

  useEffect(() => {
    let active = true;
    fetch("/api/invoices")
      .then(async (response) => {
        const result = (await response.json()) as { invoices?: SavedInvoice[] };
        if (!response.ok) throw new Error();
        if (!active || !result.invoices?.length) return;
        setSavedInvoices(result.invoices);
        const lastId = localStorage.getItem("ledgerly:last-invoice");
        const remembered = result.invoices.find((entry) => entry.id === lastId);
        setInvoice(remembered || result.invoices[0]);
        setEmail((remembered || result.invoices[0]).customer.email);
        setSaveState("saved");
      })
      .catch(() => {
        // The editor remains fully usable before storage is configured.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 4200);
    return () => clearTimeout(timeout);
  }, [notice]);

  const mutate = (recipe: (draft: InvoiceData) => void) => {
    setInvoice((current) => {
      const draft = JSON.parse(JSON.stringify(current)) as InvoiceData;
      recipe(draft);
      return draft;
    });
    setSaveState("idle");
  };

  const saveInvoice = async () => {
    if (errors.length) {
      setNotice(errors[0]);
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    try {
      const response = await fetch("/api/invoices", {
        method: invoice.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice),
      });
      const result = (await response.json()) as { invoice?: SavedInvoice; error?: string };
      if (!response.ok || !result.invoice) throw new Error(result.error || "Unable to save invoice.");
      setInvoice(result.invoice);
      setSavedInvoices((current) => [
        result.invoice!,
        ...current.filter((entry) => entry.id !== result.invoice!.id),
      ]);
      localStorage.setItem("ledgerly:last-invoice", result.invoice.id || "");
      setSaveState("saved");
      setNotice("Invoice saved to your workspace.");
    } catch (error) {
      setSaveState("error");
      setNotice(error instanceof Error ? error.message : "Unable to save invoice.");
    }
  };

  const sendInvoice = async () => {
    if (errors.length) {
      setNotice(errors[0]);
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, invoice }),
      });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to send invoice.");
      setShowEmail(false);
      setNotice(`Invoice sent to ${email}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to send invoice.");
    } finally {
      setSending(false);
    }
  };

  const newInvoice = () => {
    const next = cloneStarter();
    next.id = undefined;
    next.invoiceNumber = `INV-${String(new Date().getFullYear()).slice(-2)}-${String(
      savedInvoices.length + 1,
    ).padStart(3, "0")}`;
    next.customer = { name: "", email: "", address: "" };
    next.items = [{ id: makeId(), description: "", quantity: 1, unitPrice: 0 }];
    next.customFields = [];
    next.discount = 0;
    next.taxRate = 0;
    setInvoice(next);
    setEmail("");
    setSaveState("idle");
    setShowHistory(false);
  };

  return (
    <main className="app-shell">
      <header className="topbar no-print">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>Ledgerly</strong>
            <span>Invoice studio</span>
          </div>
        </div>

        <div className="mobile-switch" aria-label="Choose workspace view">
          <button className={mobileView === "editor" ? "active" : ""} onClick={() => setMobileView("editor")}>Edit</button>
          <button className={mobileView === "preview" ? "active" : ""} onClick={() => setMobileView("preview")}>Preview</button>
        </div>

        <div className="top-actions">
          <div className={`save-indicator ${saveState}`} aria-live="polite">
            {saveState === "saving" ? <Clock3 size={14} /> : <Check size={14} />}
            {saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : "Draft"}
          </div>
          <button className="icon-button desktop-only" aria-label="Open saved invoices" onClick={() => setShowHistory(true)}>
            <History size={18} />
          </button>
          {onLogout && (
            <button className="icon-button desktop-only" aria-label="Sign out" onClick={onLogout}>
              <LogOut size={17} />
            </button>
          )}
          <button className="button secondary desktop-only" onClick={() => window.print()}>
            <Printer size={16} /> PDF
          </button>
          <button className="button primary" onClick={saveInvoice} disabled={saveState === "saving"}>
            <Save size={16} /> Save
          </button>
          <button className="icon-button mobile-only" aria-label="Open actions" onClick={() => setShowHistory(true)}>
            <Menu size={19} />
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className={`editor-panel no-print ${mobileView === "preview" ? "mobile-hidden" : ""}`}>
          <div className="editor-intro">
            <div>
              <span className="eyebrow"><Sparkles size={12} /> Live document</span>
              <h1>Make it yours.</h1>
              <p>Every change appears on the invoice as you type.</p>
            </div>
            <button className="quiet-button" onClick={newInvoice}><CopyPlus size={15} /> New</button>
          </div>

          <div className="editor-scroll">
            <Section eyebrow="01" title="Invoice details">
              <div className="field-grid three">
                <Field label="Invoice no." value={invoice.invoiceNumber} required onChange={(value) => mutate((draft) => { draft.invoiceNumber = value; })} />
                <Field label="Issue date" type="date" value={invoice.issueDate} onChange={(value) => mutate((draft) => { draft.issueDate = value; })} />
                <Field label="Due date" type="date" value={invoice.dueDate} onChange={(value) => mutate((draft) => { draft.dueDate = value; })} />
              </div>
            </Section>

            <Section eyebrow="02" title="Who it’s from">
              <div className="field-grid two">
                <Field label="Business name" value={invoice.business.name} required onChange={(value) => mutate((draft) => { draft.business.name = value; })} />
                <Field label="Email" type="email" value={invoice.business.email} onChange={(value) => mutate((draft) => { draft.business.email = value; })} />
                <Field label="Phone" value={invoice.business.phone} onChange={(value) => mutate((draft) => { draft.business.phone = value; })} />
                <Field label="Website" value={invoice.business.website} onChange={(value) => mutate((draft) => { draft.business.website = value; })} />
              </div>
              <label className="field full-field">
                <span className="field-label">Business address</span>
                <textarea value={invoice.business.address} rows={2} onChange={(event) => mutate((draft) => { draft.business.address = event.target.value; })} />
              </label>
            </Section>

            <Section eyebrow="03" title="Who it’s for">
              <div className="field-grid two">
                <Field label="Customer name" value={invoice.customer.name} required onChange={(value) => mutate((draft) => { draft.customer.name = value; })} />
                <Field label="Customer email" type="email" value={invoice.customer.email} onChange={(value) => { mutate((draft) => { draft.customer.email = value; }); setEmail(value); }} />
              </div>
              <label className="field full-field">
                <span className="field-label">Billing address</span>
                <textarea value={invoice.customer.address} rows={2} onChange={(event) => mutate((draft) => { draft.customer.address = event.target.value; })} />
              </label>
            </Section>

            <Section eyebrow="04" title="Line items">
              <div className="item-labels" aria-hidden="true">
                <span>Description</span><span>Qty</span><span>Rate</span><span />
              </div>
              <div className="items-list">
                {invoice.items.map((item, index) => (
                  <div className="item-row" key={item.id}>
                    <input aria-label={`Item ${index + 1} description`} value={item.description} placeholder="Service or product" onChange={(event) => mutate((draft) => { draft.items[index].description = event.target.value; })} />
                    <input aria-label={`Item ${index + 1} quantity`} type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => mutate((draft) => { draft.items[index].quantity = Math.max(0, Number(event.target.value)); })} />
                    <span className="compact-money"><span>$</span><input aria-label={`Item ${index + 1} unit price`} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => mutate((draft) => { draft.items[index].unitPrice = Math.max(0, Number(event.target.value)); })} /></span>
                    <button className="remove-button" aria-label={`Remove ${item.description || `item ${index + 1}`}`} onClick={() => mutate((draft) => { draft.items.splice(index, 1); })} disabled={invoice.items.length === 1}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="add-row" onClick={() => mutate((draft) => { draft.items.push({ id: makeId(), description: "", quantity: 1, unitPrice: 0 }); })}>
                <Plus size={15} /> Add line item
              </button>
              <div className="adjustments">
                <Field label="Fixed discount" type="number" min={0} max={totals.subtotal} prefix="$" value={invoice.discount} onChange={(value) => mutate((draft) => { draft.discount = Math.max(0, Number(value)); })} />
                <Field label="Tax rate" type="number" min={0} suffix="%" value={invoice.taxRate} onChange={(value) => mutate((draft) => { draft.taxRate = Math.max(0, Number(value)); })} />
              </div>
              {invoice.discount > totals.subtotal && (
                <p className="inline-error">Discount cannot exceed the {money(totals.subtotal)} subtotal.</p>
              )}
            </Section>

            <Section eyebrow="05" title="Custom fields">
              <p className="section-copy">Add context without changing the invoice total.</p>
              <div className="custom-list">
                {invoice.customFields.map((field, index) => (
                  <div className="custom-row" key={field.id}>
                    <input aria-label={`Custom field ${index + 1} label`} value={field.label} placeholder="Label" onChange={(event) => mutate((draft) => { draft.customFields[index].label = event.target.value; })} />
                    <input aria-label={`Custom field ${index + 1} value`} value={field.value} placeholder="Value" onChange={(event) => mutate((draft) => { draft.customFields[index].value = event.target.value; })} />
                    <button className="visibility-button" aria-label={field.visible ? "Hide custom field" : "Show custom field"} aria-pressed={field.visible} onClick={() => mutate((draft) => { draft.customFields[index].visible = !draft.customFields[index].visible; })}>
                      {field.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button className="remove-button" aria-label={`Remove ${field.label || "custom field"}`} onClick={() => mutate((draft) => { draft.customFields.splice(index, 1); })}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <button className="add-row" onClick={() => mutate((draft) => { draft.customFields.push({ id: makeId(), label: "", value: "", visible: true }); })}>
                <Plus size={15} /> Add custom field
              </button>
            </Section>

            <Section eyebrow="06" title="A final note">
              <label className="field full-field">
                <span className="field-label">Notes & payment terms</span>
                <textarea value={invoice.notes} rows={4} maxLength={500} onChange={(event) => mutate((draft) => { draft.notes = event.target.value; })} />
                <span className="character-count">{invoice.notes.length}/500</span>
              </label>
            </Section>
          </div>

          <div className="editor-footer">
            <div className="editor-total"><span>Total due</span><strong>{money(totals.total)}</strong></div>
            <button className="button secondary" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
            <button className="button accent" onClick={() => setShowEmail(true)}><Mail size={16} /> Email invoice</button>
          </div>
        </aside>

        <section className={`preview-panel ${mobileView === "editor" ? "mobile-hidden" : ""}`} aria-label="Live invoice preview">
          <div className="preview-toolbar no-print">
            <div><span className="pulse" /> Previewing <strong>{invoice.invoiceNumber || "untitled invoice"}</strong></div>
            <button onClick={() => window.print()}><Printer size={15} /> Print ready</button>
          </div>
          <InvoicePreview invoice={invoice} />
        </section>
      </div>

      {showHistory && (
        <div className="dialog-backdrop no-print" role="presentation" onMouseDown={() => setShowHistory(false)}>
          <section className="side-dialog" role="dialog" aria-modal="true" aria-labelledby="history-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-header">
              <div><span className="eyebrow">Your workspace</span><h2 id="history-title">Saved invoices</h2></div>
              <button className="icon-button" aria-label="Close saved invoices" onClick={() => setShowHistory(false)}><X size={18} /></button>
            </div>
            {onLogout && <button className="history-logout mobile-only" onClick={onLogout}><LogOut size={16} /> Sign out</button>}
            <button className="new-invoice-card" onClick={newInvoice}><span><Plus size={19} /></span><div><strong>Start a new invoice</strong><small>Begin with a clean customer and line item</small></div></button>
            <div className="history-list">
              {savedInvoices.length ? savedInvoices.map((entry) => (
                <button key={entry.id} className={`history-card ${invoice.id === entry.id ? "current" : ""}`} onClick={() => { setInvoice(entry); setEmail(entry.customer.email); setSaveState("saved"); setShowHistory(false); localStorage.setItem("ledgerly:last-invoice", entry.id || ""); }}>
                  <span className="history-icon"><FileText size={18} /></span>
                  <span><strong>{entry.invoiceNumber}</strong><small>{entry.customer.name || "No customer"}</small></span>
                  <span className="history-total">{money(calculateTotals(entry).total)}<ChevronDown size={14} /></span>
                </button>
              )) : <div className="empty-history"><FileText size={26} /><strong>No saved invoices yet</strong><p>Your first save will appear here.</p></div>}
            </div>
          </section>
        </div>
      )}

      {showEmail && (
        <div className="dialog-backdrop no-print" role="presentation" onMouseDown={() => setShowEmail(false)}>
          <section className="email-dialog" role="dialog" aria-modal="true" aria-labelledby="email-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="dialog-close" aria-label="Close email dialog" onClick={() => setShowEmail(false)}><X size={18} /></button>
            <div className="mail-illustration"><Send size={25} /></div>
            <span className="eyebrow">Ready for takeoff</span>
            <h2 id="email-title">Send {invoice.invoiceNumber}</h2>
            <p>Your customer will receive a polished HTML copy with the complete invoice summary.</p>
            <Field label="Recipient email" type="email" value={email} placeholder="client@company.com" onChange={setEmail} />
            <div className="email-summary"><span>Amount due</span><strong>{money(totals.total)}</strong></div>
            <button className="button accent wide" onClick={sendInvoice} disabled={sending || !email}>{sending ? "Sending…" : <><Mail size={16} /> Send invoice</>}</button>
            <small>Only send test emails to an address you control.</small>
          </section>
        </div>
      )}

      {notice && <div className="toast no-print" role="status"><span>{saveState === "error" ? "!" : "✓"}</span>{notice}</div>}
    </main>
  );
}

function InvoicePreview({ invoice }: { invoice: InvoiceData }) {
  const totals = calculateTotals(invoice);
  const visibleFields = invoice.customFields.filter((field) => field.visible && (field.label || field.value));

  return (
    <article className="invoice-paper invoice-print">
      <div className="invoice-accent" />
      <header className="invoice-header">
        <div className="invoice-brand">
          <div className="invoice-logo">N<span>✦</span></div>
          <div><strong>{invoice.business.name || "Your business"}</strong><span>Creative partners</span></div>
        </div>
        <div className="invoice-title"><span>Invoice</span><strong>{invoice.invoiceNumber || "Draft"}</strong></div>
      </header>

      <div className="invoice-meta">
        <div className="address-block"><span>Billed from</span><strong>{invoice.business.name || "Your business"}</strong><p>{invoice.business.address || "Business address"}</p><p>{invoice.business.email}</p></div>
        <div className="address-block"><span>Billed to</span><strong>{invoice.customer.name || "Customer name"}</strong><p>{invoice.customer.address || "Customer address"}</p><p>{invoice.customer.email}</p></div>
        <dl className="date-block"><div><dt>Issued</dt><dd>{formatDate(invoice.issueDate)}</dd></div><div><dt>Due</dt><dd>{formatDate(invoice.dueDate)}</dd></div></dl>
      </div>

      {visibleFields.length > 0 && (
        <dl className="custom-fields-preview">
          {visibleFields.map((field) => <div key={field.id}><dt>{field.label || "Detail"}</dt><dd>{field.value || "-"}</dd></div>)}
        </dl>
      )}

      <div className="invoice-table-wrap">
        <table className="invoice-table">
          <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={item.id}><td><strong>{item.description || "Untitled item"}</strong><span>Professional services</span></td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(totals.lineTotals[index])}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="invoice-bottom">
        <div className="invoice-note"><span>A note from us</span><p>{invoice.notes || "Thank you for your business."}</p></div>
        <dl className="totals-card">
          <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
          {totals.discount > 0 && <div><dt>Discount</dt><dd>-{money(totals.discount)}</dd></div>}
          <div><dt>Tax <small>{invoice.taxRate}%</small></dt><dd>{money(totals.tax)}</dd></div>
          <div className="grand-total"><dt>Total due</dt><dd>{money(totals.total)}</dd></div>
        </dl>
      </div>

      <footer className="invoice-footer">
        <div><span>Payment details</span><p>USD · Due {formatDate(invoice.dueDate)}</p></div>
        <div><p>{invoice.business.website}</p><p>{invoice.business.phone}</p></div>
      </footer>
    </article>
  );
}
