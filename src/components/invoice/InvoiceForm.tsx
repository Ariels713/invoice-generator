'use client'

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InvoiceFormData, Company, Invoice } from "@/types/invoice";
import { currencies } from "@/lib/currencies";
import { usStates } from "@/lib/states";
import { parseInvoiceText } from "@/lib/ai-service";
import styles from "./invoice-form.module.css";
import { InvoicePreview } from "./InvoicePreview";
import { useState } from "react";
import { PDFDownloadButton } from './PDFDownloadButton'
import { generateInvoiceName } from "@/lib/generate-invoice-name";
import Image from 'next/image'

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  state: z.string().min(1, "State is required"),
  phone: z.string().min(1, "Phone number is required"),
});

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  quantity: z.number().min(0, "Quantity must be positive"),
  rate: z.number().min(0, "Rate must be positive"),
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceName: z.string().min(1, "Invoice name is required"),
  date: z.string().min(1, "Date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  sender: companySchema,
  recipient: companySchema,
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  taxRate: z.number().min(0, "Tax rate must be positive"),
  currency: z.string().min(1, "Currency is required"),
  notes: z.string().optional(),
  paymentInstructions: z.string().optional(),
  logo: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true; // Optional
      return val.startsWith("data:image/");
    }, "Invalid image format"),
  shipping: z.number().min(0, "Shipping must be positive").optional(),
});

interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormData) => void;
}

const emptyCompany: Company = {
  name: "",
  email: "",
  address: "",
  address2: "",
  city: "",
  postalCode: "",
  country: "",
  state: "",
  phone: "",
};

export function InvoiceForm({ onSubmit }: InvoiceFormProps) {
  const [aiInputText, setAiInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShipping, setShowShipping] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceName: "",
      currency: "USD",
      taxRate: 0,
      items: [
        {
          description: "",
          issueDate: new Date().toISOString().split("T")[0],
          quantity: 1,
          rate: 0,
        },
      ],
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      shipping: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const formData = watch();

  const getInvoicePreviewData = (): Invoice => {
    const items = (formData.items || []).map((item, idx) => {
      const amount = Number(item.quantity) * Number(item.rate);
      return {
        id: String(idx),
        description: item.description,
        issueDate: item.issueDate,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        amount,
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * (Number(formData.taxRate) || 0)) / 100;
    const shipping = Number(formData.shipping) || 0;
    const total = subtotal + taxAmount + shipping;
    return {
      id: "preview",
      invoiceNumber: formData.invoiceNumber || "",
      invoiceName: formData.invoiceName || "",
      date: formData.date || "",
      dueDate: formData.dueDate || "",
      sender: formData.sender || emptyCompany,
      recipient: formData.recipient || emptyCompany,
      items,
      subtotal,
      taxRate: Number(formData.taxRate) || 0,
      taxAmount,
      total,
      currency: formData.currency || "USD",
      notes: formData.notes,
      paymentInstructions: formData.paymentInstructions,
      logo: formData.logo,
      shipping,
    };
  };

  const handleAIParse = async () => {
    if (!aiInputText.trim()) return;

    setIsGenerating(true);
    try {
      const parsedData = await parseInvoiceText(aiInputText);

      // Set all parsed values into the form except invoiceName
      Object.entries(parsedData).forEach(([key, value]) => {
        if (key !== "invoiceName") {
          setValue(key as keyof InvoiceFormData, value);
        }
        if (key === "shipping" && value) {
          setShowShipping(true);
        }
      });

      // Always generate invoice name from parsed values if not provided by AI
      let invoiceName = parsedData.invoiceName;
      if (!invoiceName || !invoiceName.trim()) {
        invoiceName = generateInvoiceName(parsedData);
      }
      setValue("invoiceName", invoiceName);
    } catch (error) {
      console.error("Error parsing with AI:", error);
      // TODO: Add proper error handling UI
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    return (
      <PDFDownloadButton 
        invoice={getInvoicePreviewData()} 
        invoiceNumber={formData.invoiceNumber}
      />
    )
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setValue("logo", "");
      setError("logo", {
        type: "manual",
        message: "File size must be less than 2MB",
      });
      return;
    }

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setValue("logo", "");
      setError("logo", {
        type: "manual",
        message: "Only JPG, JPEG & PNG files are allowed",
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setValue("logo", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const subtotal = (formData.items || []).reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.rate),
    0
  );

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {/* AI Input Section */}
        <div className={styles.section}>
        <div
          className={styles.row}
          style={{ gap: ".5rem", alignItems: "center", marginBlockEnd: "0" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="17"
            viewBox="0 0 16 17"
            fill="none"
          >
            <g clipPath="url(#clip0_10936_25363)">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7.40039 1.24994V4.24994C7.40039 4.58131 7.66863 4.84955 8 4.84955C8.33137 4.84955 8.59961 4.58131 8.59961 4.24994V1.24994C8.59961 0.918568 8.33137 0.65033 8 0.65033C7.66863 0.65033 7.40039 0.918568 7.40039 1.24994ZM15.1211 7.66205L15 7.65033H12C11.6686 7.65033 11.4004 7.91857 11.4004 8.24994C11.4004 8.58131 11.6686 8.84955 12 8.84955H15L15.1211 8.83783C15.3944 8.78182 15.5996 8.53984 15.5996 8.24994C15.5996 7.96004 15.3944 7.71805 15.1211 7.66205ZM4 7.65033L4.12109 7.66205C4.39443 7.71805 4.59961 7.96004 4.59961 8.24994C4.59961 8.53984 4.39443 8.78182 4.12109 8.83783L4 8.84955H1C0.668629 8.84955 0.400391 8.58131 0.400391 8.24994C0.400391 7.91857 0.668629 7.65033 1 7.65033H4ZM7.40039 12.2499V15.2499C7.40039 15.5813 7.66863 15.8495 8 15.8495C8.33137 15.8495 8.59961 15.5813 8.59961 15.2499V12.2499C8.59961 11.9186 8.33137 11.6503 8 11.6503C7.66863 11.6503 7.40039 11.9186 7.40039 12.2499ZM1.57617 1.82611C1.78121 1.62108 2.09718 1.59517 2.33008 1.74896L2.42383 1.82611L6.42383 5.82611L6.50098 5.91986C6.65477 6.15276 6.62886 6.46873 6.42383 6.67377C6.21879 6.8788 5.90282 6.90471 5.66992 6.75092L5.57617 6.67377L1.57617 2.67377L1.49902 2.58002C1.34523 2.34712 1.37114 2.03115 1.57617 1.82611ZM6.42383 9.82611C6.21879 9.62107 5.90282 9.59517 5.66992 9.74896L5.57617 9.82611L1.57617 13.8261C1.34186 14.0604 1.34186 14.4395 1.57617 14.6738C1.81049 14.9081 2.18951 14.9081 2.42383 14.6738L6.42383 10.6738L6.50098 10.58C6.65477 10.3471 6.62886 10.0311 6.42383 9.82611ZM13.6699 1.74896C13.9028 1.59517 14.2188 1.62108 14.4238 1.82611C14.6289 2.03115 14.6548 2.34712 14.501 2.58002L14.4238 2.67377L10.4238 6.67377C10.1895 6.90808 9.81049 6.90808 9.57617 6.67377C9.34186 6.43945 9.34186 6.06043 9.57617 5.82611L13.5762 1.82611L13.6699 1.74896ZM10.3301 9.74896C10.0972 9.59517 9.78121 9.62107 9.57617 9.82611C9.37114 10.0311 9.34523 10.3471 9.49902 10.58L9.57617 10.6738L13.5762 14.6738L13.6699 14.7509C13.9028 14.9047 14.2188 14.8788 14.4238 14.6738C14.6289 14.4687 14.6548 14.1528 14.501 13.9199L14.4238 13.8261L10.4238 9.82611L10.3301 9.74896Z"
                fill="#00A688"
              />
            </g>
            <defs>
              <clipPath id="clip0_10936_25363">
                <rect
                  width="16"
                  height="16"
                  fill="white"
                  transform="translate(0 0.25)"
                />
              </clipPath>
            </defs>
          </svg>
          <h2 className={styles.labelHeader} style={{ margin: 0 }}>
            Or let AI do it for you
          </h2>
        </div>
        <textarea
          className={styles.textarea}
          placeholder="Include as much detail about your invoice as possible, and we will automatically fill out fields based on the data entered, saving you time. "
          value={aiInputText}
          onChange={(e) => setAiInputText(e.target.value)}
          disabled={isGenerating}
        />
        <button
          type="button"
          className={`${styles.button} ${styles.autofillInvoiceButton} ${isGenerating ? styles.buttonLoading : ""}`}
          onClick={handleAIParse}
          disabled={isGenerating || !aiInputText.trim()}
        >
          {isGenerating ? "Autofilling..." : "Autofill Invoice"}
        </button>
      </div>

      {/* link to terms and conditions */}
      <div className={styles.row}>
        <a href="/terms" className={styles.termsLink}>
          Terms and Conditions
        </a>
      </div>

      {/* Basic Invoice Info and Logo Upload */}
      <div className={styles.basicInfoContainer}>
        <div className={styles.basicInfoCol}>
          <label className={styles.labelHeader}>Invoice Name</label>
          <input
            type="text"
            {...register("invoiceName")}
            className={styles.input}
            placeholder="Short description (3-5 words)"
            style={{ maxHeight: "48px" }}
          />
          {errors.invoiceName && (
            <p className={styles.error}>{errors.invoiceName.message}</p>
          )}
        </div>

        <div className={styles.basicInfoCol}>
          <label className={styles.labelHeader}>
            {formData.logo ? 'Uploaded File' : 'Upload File'}
          </label>
          <div className={styles.logoUpload}>
            {!formData.logo && (
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleLogoUpload}
                className={styles.input}
                style={{ paddingBlock: "11px" }}
              />
            )}
            {formData.logo && (
              <div className={styles.logoPreview}>
                <Image
                  src={formData.logo}
                  alt="Company Logo Preview"
                  className={styles.previewImage}
                  width={100}
                  height={100}
                  style={{ objectFit: 'contain' }}
                />
                <button
                  type="button"
                  onClick={() => setValue("logo", "")}
                  className={styles.removeLogoBtn}
                >
                  X
                </button>
              </div>
            )}
          </div>
          {errors.logo && <p className={styles.error}>{errors.logo.message}</p>}
        </div>
      </div>

      {/* Company Information */}
      <div className={styles.companyInfoContainer}>
        <div className={styles.companyInfoCol}>
          <h3 className={styles.labelHeader}>Your company info</h3>
          <input
            type="text"
            {...register("sender.name")}
            className={styles.input}
            placeholder="Company Name"
          />
          <input
            type="email"
            {...register("sender.email")}
            className={styles.input}
            placeholder="Email Address"
          />
          <input
            type="text"
            {...register("sender.address")}
            className={styles.input}
            placeholder="Address Line 1"
          />
          <input
            type="text"
            {...register("sender.address2")}
            className={styles.input}
            placeholder="Address Line 2 (Optional)"
          />
          <div className={styles.addressRow}>
            <input
              type="text"
              {...register("sender.city")}
              className={styles.input}
              placeholder="City"
            />
            <input
              type="text"
              {...register("sender.postalCode")}
              className={styles.input}
              placeholder="Zip Code"
            />
          </div>
          <div className={styles.addressRow}>
            <select
              {...register("sender.state")}
              className={styles.select}
              defaultValue=""
            >
              <option value="" disabled>
                Select State
              </option>
              {usStates.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="tel"
            {...register("sender.phone")}
            className={styles.input}
            placeholder="Phone Number"
          />
        </div>

        <div className={styles.companyInfoCol}>
          <h3 className={styles.labelHeader}>Receiving company info</h3>
          <input
            type="text"
            {...register("recipient.name")}
            className={styles.input}
            placeholder="Company Name"
          />
          <input
            type="email"
            {...register("recipient.email")}
            className={styles.input}
            placeholder="Email Address"
          />
          <input
            type="text"
            {...register("recipient.address")}
            className={styles.input}
            placeholder="Address Line 1"
          />
          <input
            type="text"
            {...register("recipient.address2")}
            className={styles.input}
            placeholder="Address Line 2 (Optional)"
          />
          <div className={styles.addressRow}>
            <input
              type="text"
              {...register("recipient.city")}
              className={styles.input}
              placeholder="City"
            />
            <input
              type="text"
              {...register("recipient.postalCode")}
              className={styles.input}
              placeholder="Zip Code"
            />
          </div>
          <div className={styles.addressRow}>
            <select
              {...register("recipient.state")}
              className={styles.select}
              defaultValue=""
            >
              <option value="" disabled>
                Select State
              </option>
              {usStates.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="tel"
            {...register("recipient.phone")}
            className={styles.input}
            placeholder="Phone Number"
          />
        </div>
      </div>

      {/* Invoice Details */}
      <div className={`${styles.section} ${styles.itemsSection}`}>
        <h3 className={styles.labelHeader}>Invoice Details</h3>
        <div className={styles.itemStack}>
          <div className={styles.col}>
            <label className={styles.label}>Invoice #</label>
            <input
              type="text"
              {...register("invoiceNumber")}
              className={styles.input}
              placeholder="Invoice Number"
            />
            {errors.invoiceNumber && (
              <p className={styles.error}>{errors.invoiceNumber.message}</p>
            )}
          </div>
          <div className={styles.col}>
            <label className={styles.label}>Issue Date</label>
            <input type="date" {...register("date")} className={styles.input} />
            {errors.date && (
              <p className={styles.error}>{errors.date.message}</p>
            )}
          </div>
          <div className={styles.col}>
            <label className={styles.label}>Due Date</label>
            <input
              type="date"
              {...register("dueDate")}
              className={styles.input}
            />
            {errors.dueDate && (
              <p className={styles.error}>{errors.dueDate.message}</p>
            )}
          </div>
          <div className={styles.col}>
            <label className={styles.label}>Currency</label>
            <select {...register("currency")} className={styles.select}>
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.flag} {currency.code} - {currency.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Invoice Items */}
      <div className={`${styles.section} ${styles.itemsSection}`}>
        <h3 className={styles.labelHeader}>Items</h3>
        {fields.map((field, index) => (
          <div key={field.id} className={styles.itemStack}>
            <div className={styles.col}>
              <label className={styles.label}>Item or Service</label>
              <input
                type="text"
                {...register(`items.${index}.description`)}
                placeholder="Description"
                className={styles.input}
              />
            </div>
            <div className={styles.col}>
              <label className={styles.label}>Issue Date</label>
              <input
                type="date"
                {...register(`items.${index}.issueDate`)}
                className={styles.input}
              />
            </div>
            <div className={styles.col}>
              <label className={styles.label}>Quantity</label>
              <input
                type="number"
                {...register(`items.${index}.quantity`, {
                  valueAsNumber: true,
                })}
                className={styles.input}
              />
            </div>
            <div className={styles.col} style={{ position: "relative" }}>
              <label className={styles.label}>Rate</label>
              <span className={styles.currencyPrefix}>
                {currencies.find((c) => c.code === formData.currency)?.symbol ||
                  formData.currency}
              </span>
              <input
                type="number"
                step="0.01"
                {...register(`items.${index}.rate`, { valueAsNumber: true })}
                className={styles.input}
                style={{ paddingLeft: "2rem", paddingRight: "4.5rem" }}
              />
              <span className={styles.currencyAdornment}>
                {currencies.find((c) => c.code === formData.currency)?.flag}{" "}
                {formData.currency}
              </span>
            </div>
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => remove(index)}
                className={styles.removeBtn}
              >
                X
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            append({
              description: "",
              issueDate: new Date().toISOString().split("T")[0],
              quantity: 1,
              rate: 0,
            })
          }
          className={styles.addItemBtn}
        >
          Add Item
        </button>
        <div style={{display: 'none'}} className={styles.itemsTotal}>
          <span>Total:&nbsp;</span>
          <div className={styles.itemsTotalAmount}>
            <span>
              {currencies.find((c) => c.code === formData.currency)?.symbol ||
                formData.currency}
            </span>
            <span>
              {subtotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          {/* <span className={styles.itemsTotalCurrency}>
            {currencies.find((c) => c.code === formData.currency)?.flag} {formData.currency}
          </span> */}
        </div>
      </div>
      <div className={styles.paymentDetailsContainer}>
      {/* Notes and Payment Instructions */}
      <div className={`${styles.section} ${styles.itemsSection}`}>
        <h3 className={styles.labelHeader}>Payment Details</h3>
        <div className={`${styles.itemStack} ${styles.paymentDetailsStack}`}>
          <div className={styles.col}>
            <label className={styles.label}>Payment Instructions</label>
            <input
              {...register("notes")}
              className={styles.input}
              placeholder="Add any additional notes here..."
            />
          </div>
          <div className={styles.col}>
            <label className={styles.label}>Payment Instructions</label>
            <textarea
              {...register("paymentInstructions")}
              className={styles.textarea}
              style={{ minHeight: "100px" }}
              placeholder="Add payment instructions here..."
            />
          </div>
        </div>
      </div>

      {/* Tax Rate */}
      <div className={styles.section}>
        <div className={`${styles.itemsTotal} ${styles.itemsSubtotal}`}>
          <span>Subtotal</span>
          <span>
            {currencies.find((c) => c.code === formData.currency)?.symbol ||
              formData.currency}{" "}
            {subtotal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className={`${styles.label} ${styles.taxRateLabel}`}>
            Tax Rate (optional)
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              {...register("taxRate", { valueAsNumber: true })}
              className={styles.input}
              placeholder="%"
              style={{ paddingRight: "2.5rem" }}
            />
            <span
              style={{
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#888",
                fontWeight: 500,
              }}
            >
              %
            </span>
          </div>
        </div>
        {showShipping ? (
          <div style={{ marginBottom: 12 }}>
            <label className={`${styles.label} ${styles.taxRateLabel}`}>
              Shipping
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                {...register("shipping", { valueAsNumber: true })}
                className={styles.input}
                placeholder="Shipping amount"
                min={0}
              />
              <span
                style={{
                  position: "absolute",
                  right: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#888",
                  fontWeight: 500,
                }}
              >
                {currencies.find((c) => c.code === formData.currency)?.symbol ||
                  formData.currency}
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowShipping(true)}
            className={styles.shippingButton}
          >
            + Shipping
          </button>
        )}
        <hr style={{ margin: "16px 0" }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 600,
            fontSize: "1.25rem",
          }}
        >
          <span>Total</span>
          <span>
            {currencies.find((c) => c.code === formData.currency)?.symbol ||
              formData.currency}{" "}
            {(
              subtotal +
              (subtotal * (Number(formData.taxRate) || 0)) / 100 +
              (Number(formData.shipping) || 0)
            ).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
      </div>
      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        {handleDownloadPDF()}
        <button type="button" className={styles.button} style={{ flex: 1 }}>
          Email invoice to me
        </button>
      </div>

      {/* add disclaimer section */}
      <div>
        <p className={styles.termsLink}>
          By using the &ldquo;Invoice Generator&rdquo;, you acknowledge that you have read,
          understood, and agree to be bound by Rho&apos;s Terms of Service and
          Privacy Policy, as may be updated from time to time. You hereby grant
          Rho the right to collect, store, process, and use any information you
          provide through the Invoice Generator in accordance with our Privacy
          Policy and applicable laws.
        </p>
      </div>
      </form>

      {/* Styled Invoice Preview Section */}
      <div className={styles.invoicePreview}>
        <div className={styles.pdfPreviewMobileHidden}>
          <InvoicePreview invoice={getInvoicePreviewData()} />
        </div>
      </div>
    </div>
  );
}
