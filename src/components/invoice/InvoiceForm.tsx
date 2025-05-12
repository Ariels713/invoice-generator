import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InvoiceFormData, Company, Invoice } from "@/types/invoice";
import { currencies } from "@/lib/currencies";
import { usStates } from "@/lib/states";
import { parseInvoiceText } from "@/lib/ai-service";
import styles from "./invoice-form.module.css";
import { InvoicePreview } from "./InvoicePreview";
import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  quantity: z.number().min(0, "Quantity must be positive"),
  rate: z.number().min(0, "Rate must be positive"),
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
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
      currency: "USD",
      taxRate: 0,
      items: [{ description: "", quantity: 1, rate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const formData = watch();
  const hiddenPreviewRef = useRef<HTMLDivElement>(null);

  const getInvoicePreviewData = (): Invoice => {
    const items = (formData.items || []).map((item, idx) => {
      const amount = Number(item.quantity) * Number(item.rate);
      return {
        id: String(idx),
        description: item.description,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        amount,
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * (Number(formData.taxRate) || 0)) / 100;
    const total = subtotal + taxAmount;
    return {
      id: "preview",
      invoiceNumber: formData.invoiceNumber || "",
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
    };
  };

  const handleAIParse = async (text: string) => {
    try {
      const parsedData = await parseInvoiceText(text);
      console.log("AI parsed data:", parsedData);
      Object.entries(parsedData).forEach(([key, value]) => {
        setValue(key as keyof InvoiceFormData, value);
      });
    } catch (error) {
      console.error("Error parsing with AI:", error);
      // TODO: Add proper error handling UI
    }
  };

  const handleDownloadPDF = async () => {
    if (!hiddenPreviewRef.current) return;
    const node = hiddenPreviewRef.current.querySelector("div");
    if (!node) return;
    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${formData.invoiceNumber || "preview"}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      {/* AI Input Section */}
      <div className={styles.section}>
        <div className={styles.row} style={{gap: '.5rem', alignItems: 'center', marginBlockEnd: '0'}}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="17"
            viewBox="0 0 16 17"
            fill="none"
          >
            <g clip-path="url(#clip0_10936_25363)">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
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
          <h2 className={styles.labelHeader} style={{margin: 0}}>Or let AI do it for you</h2>
        </div>
        <textarea
          className={styles.textarea}
          placeholder="Enter invoice details in plain text..."
          onChange={(e) => handleAIParse(e.target.value)}
        />
        <button
          type="submit"
          className={styles.button}
          style={{ marginTop: "1rem" }}
        >
          Generate Invoice
        </button>
      </div>
	  
	  <div className={styles.row}>
		{/* link to terms and conditions */}
		<a href="/terms" className={styles.termsLink}>Terms and Conditions</a>
	  </div>

      {/* Basic Invoice Info */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Invoice Number</label>
          <input
            type="text"
            {...register("invoiceNumber")}
            className={styles.input}
          />
          {errors.invoiceNumber && (
            <p className={styles.error}>{errors.invoiceNumber.message}</p>
          )}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Company Logo</label>
          <div className={styles.logoUpload}>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleLogoUpload}
              className={styles.input}
            />
            {formData.logo && (
              <div className={styles.logoPreview}>
                <img
                  src={formData.logo}
                  alt="Company Logo Preview"
                  className={styles.previewImage}
                />
                <button
                  type="button"
                  onClick={() => setValue("logo", "")}
                  className={styles.removeLogoBtn}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          {errors.logo && <p className={styles.error}>{errors.logo.message}</p>}
        </div>
      </div>

      {/* Company Information */}
      <div className={styles.row}>
        <div className={styles.col}>
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
          <div className={styles.row}>
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
          <div className={styles.row}>
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
      </div>

      {/* Receiving Company Information */}
      <div className={styles.row}>
        <div className={styles.col}>
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

          <div className={styles.row}>
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
          <div className={styles.row}>
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

      {/* Invoice Items */}
      <div className={styles.section}>
        <h3 className={styles.label}>Invoice Details</h3>
        {fields.map((field, index) => (
          <div key={field.id} className={styles.row}>
            <div className={styles.col}>
              <label className={styles.label}>Description</label>
              <input
                type="text"
                {...register(`items.${index}.description`)}
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
            <div className={styles.col}>
              <label className={styles.label}>Rate</label>
              <input
                type="number"
                {...register(`items.${index}.rate`, { valueAsNumber: true })}
                className={styles.input}
              />
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className={styles.removeBtn}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ description: "", quantity: 1, rate: 0 })}
          className={styles.addItemBtn}
        >
          Add Item
        </button>
      </div>

      {/* Tax Rate */}
      <div className={styles.section}>
        <label className={styles.label}>Tax Rate (%)</label>
        <input
          type="number"
          {...register("taxRate", { valueAsNumber: true })}
          className={styles.input}
        />
      </div>

      {/* Notes and Payment Instructions */}
      <div className={styles.section}>
        <div>
          <label className={styles.label}>Notes</label>
          <textarea {...register("notes")} className={styles.textarea} />
        </div>
        <div>
          <label className={styles.label}>Payment Instructions</label>
          <textarea
            {...register("paymentInstructions")}
            className={styles.textarea}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "flex-end",
          marginTop: "2rem",
        }}
      >
        <button
          type="button"
          className={styles.button}
          onClick={handleDownloadPDF}
        >
          Download as PDF
        </button>
        <button type="button" className={styles.button}>
          Email Invoice
        </button>
      </div>

      {/* Styled Invoice Preview Section */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "2rem",
          marginTop: "3rem",
          alignItems: "flex-start",
        }}
      >
        {/* Visible, scaled-down preview */}
        <div
          style={{
            flex: 1,
            transform: "scale(0.7)",
            transformOrigin: "top left",
            minWidth: 0,
          }}
        >
          <InvoicePreview invoice={getInvoicePreviewData()} />
        </div>
        {/* Visible, full-size preview for PDF generation (for testing) */}
        <div ref={hiddenPreviewRef} aria-hidden="false">
          <InvoicePreview invoice={getInvoicePreviewData()} />
        </div>
      </div>
    </form>
  );
}
