"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatSgd } from "@/lib/utils";
import { addHoursToTime, formatTime12 } from "@/lib/dates";
import type { BookingDetail, Cleaner, Customer, PaymentStatus } from "@/lib/types";
import { CheckCircle2, Loader2, Mail, X } from "lucide-react";

interface Props {
  cleaners: Cleaner[];
  customers: Customer[];
  hourlyRate: number;
  initial?: { date?: string; startTime?: string; cleanerId?: string };
  onClose: () => void;
  onChanged: () => void;
}

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => `${String(7 + i).padStart(2, "0")}:00`);
const HOURS_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 10];

type EmailPreview = { to: string; subject: string; text: string };

export function BookingDialog({ cleaners, customers, hourlyRate, initial, onClose, onChanged }: Props) {
  const activeCleaners = cleaners.filter((c) => c.active);
  const [step, setStep] = useState<"form" | "created">("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer
  const [customerId, setCustomerId] = useState<string>("new");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postal, setPostal] = useState("");

  // Booking
  const [cleanerId, setCleanerId] = useState(initial?.cleanerId ?? activeCleaners[0]?.id ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [hours, setHours] = useState(3);
  const [amount, setAmount] = useState<string>(String(3 * hourlyRate));
  const [amountTouched, setAmountTouched] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unbilled");
  const [remark, setRemark] = useState("");

  const [created, setCreated] = useState<BookingDetail | null>(null);
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [mailto, setMailto] = useState<string>("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Auto-fill amount = hours × rate until the staff member edits it.
  useEffect(() => {
    if (!amountTouched) setAmount(String(Math.round(hours * hourlyRate)));
  }, [hours, hourlyRate, amountTouched]);

  // When picking an existing customer, prefill their details.
  useEffect(() => {
    if (customerId === "new") return;
    const c = customers.find((x) => x.id === customerId);
    if (c) {
      setCode(c.code);
      setName(c.name);
      setEmail(c.email);
      setPhone(c.phone);
      setAddress(c.address);
      setPostal(c.postal);
    }
  }, [customerId, customers]);

  const endTime = useMemo(() => addHoursToTime(startTime, hours), [startTime, hours]);

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("Customer name is required.");
    if (!date) return setError("Please choose a date.");
    if (!cleanerId) return setError("Please assign a cleaner.");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) return setError("Please enter a valid amount.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            id: customerId === "new" ? undefined : customerId,
            code,
            name,
            email,
            phone,
            address,
            postal,
          },
          cleanerId,
          date,
          startTime,
          hours,
          amount: amt,
          paymentStatus,
          remark,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create booking.");
        return;
      }
      setCreated(data.booking);
      onChanged();
      const er = await fetch(`/api/bookings/${data.booking.id}/email`);
      if (er.ok) {
        const ed = await er.json();
        setEmailPreview(ed.email);
        setMailto(ed.mailto);
      }
      setStep("created");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendEmail() {
    if (!created) return;
    setEmailSending(true);
    try {
      const res = await fetch(`/api/bookings/${created.id}/email`, { method: "POST" });
      if (res.ok) {
        setEmailSent(true);
        onChanged();
      }
    } finally {
      setEmailSending(false);
    }
  }

  const hasEmail = !!created?.customer.email?.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-xl border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">
            {step === "form" ? "New booking" : "Booking confirmed"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "form" ? (
          <div className="space-y-4 p-5">
            <Field label="Customer">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="new">+ New customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `${c.code} · ` : ""}
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Customer code">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MCC0123" />
              </Field>
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
              </Field>
              <Field label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9xxx xxxx" />
              </Field>
              <Field label="Email (for confirmation)">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Address">
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Block, street, unit" />
                </Field>
              </div>
              <Field label="Postal">
                <Input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="Singapore 5xxxxx" />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Date">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Start">
                <Select value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>
                      {formatTime12(t)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Hours">
                <Select
                  value={String(hours)}
                  onChange={(e) => {
                    setHours(Number(e.target.value));
                    setAmountTouched(false);
                  }}
                >
                  {HOURS_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}h
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Cleaner">
                <Select value={cleanerId} onChange={(e) => setCleanerId(e.target.value)}>
                  {activeCleaners.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={`Amount (SGD) · $${hourlyRate}/h`}>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setAmountTouched(true);
                  }}
                />
              </Field>
              <Field label="Payment">
                <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}>
                  <option value="unbilled">Unbilled</option>
                  <option value="pending">Pending</option>
                  <option value="done">Paid</option>
                </Select>
              </Field>
            </div>

            <p className="text-xs text-muted-foreground">Ends {formatTime12(endTime)} · {hours} hours</p>

            <Field label="Remark (optional)">
              <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Gate code, pets, special instructions…" />
            </Field>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create booking
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Booking {created?.id.toUpperCase()} saved.
            </div>

            {created && (
              <div className="rounded-lg border p-4 text-sm">
                <div className="font-medium">{created.customer.name}</div>
                <div className="text-muted-foreground">
                  {formatTime12(created.startTime)}–{formatTime12(created.endTime)} ({created.hours}h) ·
                  Cleaner {created.cleaner.code}
                </div>
                <div className="mt-1 font-semibold">{formatSgd(created.amount)}</div>
              </div>
            )}

            <div className="rounded-lg border">
              <div className="flex items-center gap-2 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Confirmation email preview
              </div>
              {hasEmail && emailPreview ? (
                <div className="space-y-1 p-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">To:</span> {emailPreview.to}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subject:</span> {emailPreview.subject}
                  </div>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-3 font-sans text-[11px] leading-relaxed text-foreground">
                    {emailPreview.text}
                  </pre>
                </div>
              ) : (
                <div className="p-4 text-xs text-muted-foreground">
                  No email on file for this customer — add one on the booking to send a confirmation.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              {emailSent ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Email sent to customer
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Send the confirmation to the customer.</span>
              )}
              <div className="flex gap-2">
                {hasEmail && mailto && (
                  <a href={mailto}>
                    <Button variant="outline" size="sm">
                      Open in mail app
                    </Button>
                  </a>
                )}
                <Button onClick={sendEmail} disabled={!hasEmail || emailSending || emailSent} size="sm">
                  {emailSending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {emailSent ? "Sent" : "Send confirmation"}
                </Button>
              </div>
            </div>

            <div className="flex justify-end border-t pt-3">
              <Button variant="outline" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
