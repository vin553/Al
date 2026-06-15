"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatSgd } from "@/lib/utils";
import { addHoursToTime, formatTime12 } from "@/lib/dates";
import type { BookingDetail, Cleaner, Customer, Package } from "@/lib/types";
import { CheckCircle2, Loader2, Mail, X } from "lucide-react";

interface Props {
  packages: Package[];
  cleaners: Cleaner[];
  customers: Customer[];
  initial?: { date?: string; startTime?: string; cleanerId?: string };
  onClose: () => void;
  onChanged: () => void;
}

const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`);

type EmailPreview = { to: string; subject: string; text: string };

export function BookingDialog({ packages, cleaners, customers, initial, onClose, onChanged }: Props) {
  const activeCleaners = cleaners.filter((c) => c.active);
  const [step, setStep] = useState<"form" | "created">("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer
  const [customerId, setCustomerId] = useState<string>("new");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Booking
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [cleanerId, setCleanerId] = useState(initial?.cleanerId ?? activeCleaners[0]?.id ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [amount, setAmount] = useState<string>("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [notes, setNotes] = useState("");

  const [created, setCreated] = useState<BookingDetail | null>(null);
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [mailto, setMailto] = useState<string>("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const selectedPackage = useMemo(() => packages.find((p) => p.id === packageId), [packages, packageId]);

  // Auto-fill amount from package price until the staff member edits it.
  useEffect(() => {
    if (!amountTouched && selectedPackage) setAmount(String(selectedPackage.price));
  }, [selectedPackage, amountTouched]);

  // When picking an existing customer, prefill contact fields.
  useEffect(() => {
    if (customerId === "new") return;
    const c = customers.find((x) => x.id === customerId);
    if (c) {
      setName(c.name);
      setEmail(c.email);
      setPhone(c.phone);
      setAddress(c.address);
    }
  }, [customerId, customers]);

  const endTime = selectedPackage ? addHoursToTime(startTime, selectedPackage.durationHours) : startTime;

  async function submit() {
    setError(null);
    if (!name.trim() || !email.trim()) return setError("Customer name and email are required.");
    if (!date) return setError("Please choose a date.");
    if (!packageId || !cleanerId) return setError("Please choose a package and cleaner.");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) return setError("Please enter a valid amount.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { id: customerId === "new" ? undefined : customerId, name, email, phone, address },
          packageId,
          cleanerId,
          date,
          startTime,
          amount: amt,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create booking.");
        return;
      }
      setCreated(data.booking);
      onChanged();
      // Pull the email preview for this new booking.
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
                    {c.name} · {c.email}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                />
              </Field>
              <Field label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+65 ..." />
              </Field>
              <Field label="Address">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Unit, street, postal" />
              </Field>
            </div>

            <Field label="Package">
              <Select
                value={packageId}
                onChange={(e) => {
                  setPackageId(e.target.value);
                  setAmountTouched(false);
                }}
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.durationHours}h · {formatSgd(p.price)}
                  </option>
                ))}
              </Select>
            </Field>

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
              <Field label="Cleaner">
                <Select value={cleanerId} onChange={(e) => setCleanerId(e.target.value)}>
                  {activeCleaners.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (SGD)">
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
              <div className="flex flex-col justify-end pb-1 text-xs text-muted-foreground">
                {selectedPackage && (
                  <span>
                    Ends {formatTime12(endTime)} · {selectedPackage.durationHours}h ·{" "}
                    {selectedPackage.cleanersRequired} cleaner(s)
                  </span>
                )}
              </div>
            </div>

            <Field label="Notes (optional)">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, pets, special requests…" />
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
                <div className="font-medium">{created.package.name}</div>
                <div className="text-muted-foreground">
                  {created.customer.name} · {formatTime12(created.startTime)}–{formatTime12(created.endTime)} ·{" "}
                  Cleaner {created.cleaner.code}
                </div>
                <div className="mt-1 font-semibold">{formatSgd(created.amount)}</div>
              </div>
            )}

            <div className="rounded-lg border">
              <div className="flex items-center gap-2 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Confirmation email preview
              </div>
              {emailPreview ? (
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
                <div className="p-4 text-xs text-muted-foreground">Preparing preview…</div>
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
                {mailto && (
                  <a href={mailto}>
                    <Button variant="outline" size="sm">
                      Open in mail app
                    </Button>
                  </a>
                )}
                <Button onClick={sendEmail} disabled={emailSending || emailSent} size="sm">
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
