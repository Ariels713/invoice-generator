"use client";

import { useState } from "react";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { Invoice, InvoiceFormData } from "@/types/invoice";

export default function Home() {
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const handleFormSubmit = (data: InvoiceFormData) => {
    // Calculate totals
    const items = data.items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      amount: item.quantity * item.rate,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * data.taxRate) / 100;
    const total = subtotal + taxAmount;

    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      ...data,
      items,
      subtotal,
      taxAmount,
      total,
    };

    setInvoice(newInvoice);
  };

  return (
    <main className="min-h-screen py-8">
      <div
        className="container"
        style={{
          paddingInline: "1rem",
          paddingBlock: "1rem",
          backgroundColor: "var(--foreground)",
        }}
      >
        <InvoiceForm onSubmit={handleFormSubmit} />
      </div>
    </main>
  );
}
