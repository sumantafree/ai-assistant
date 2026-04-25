"use client";
import { useEffect, useState } from "react";
import { whatsappApi, leadsApi } from "@/lib/api";
import { toast } from "sonner";
import { Send, Zap, MessageCircle, Clock } from "lucide-react";
import { cn, STATUS_COLORS, formatDate, formatTime } from "@/lib/utils";

export default function WhatsAppPage() {
  const [tab, setTab] = useState<"single" | "bulk" | "logs">("single");
  const [leads, setLeads] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Single send
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Bulk send
  const [bulkLeads, setBulkLeads] = useState<number[]>([]);
  const [bulkTemplate, setBulkTemplate] = useState(
    "Hi {name},\n\nI wanted to reach out about our services. Would you be available for a quick call?\n\nBest regards"
  );
  const [bulkSending, setBulkSending] = useState(false);

  useEffect(() => {
    leadsApi.list().then((r) => setLeads(r.data)).catch(() => {});
    whatsappApi.logs().then((r) => setLogs(r.data)).catch(() => {});
  }, []);

  const generateMessage = async () => {
    const lead = leads.find((l) => l.phone === phone);
    if (!lead) { toast.error("Enter a phone number or select a lead"); return; }
    setAiLoading(true);
    try {
      const r = await whatsappApi.generateMessage({
        lead_name: lead.name, product: "our services", context: lead.notes || "",
      });
      setMessage(r.data.message);
    } catch { toast.error("AI generation failed"); }
    finally { setAiLoading(false); }
  };

  const sendSingle = async () => {
    if (!phone || !message) { toast.error("Phone and message required"); return; }
    setSending(true);
    try {
      await whatsappApi.send({ phone, message });
      toast.success("WhatsApp message queued!");
      setPhone(""); setMessage("");
      whatsappApi.logs().then((r) => setLogs(r.data));
    } catch { toast.error("Failed to send"); }
    finally { setSending(false); }
  };

  const sendBulk = async () => {
    const contacts = leads.filter((l) => bulkLeads.includes(l.id)).map((l) => ({
      phone: l.phone, name: l.name,
    }));
    if (contacts.length === 0) { toast.error("Select at least one contact"); return; }
    setBulkSending(true);
    try {
      await whatsappApi.sendBulk({ contacts, message_template: bulkTemplate });
      toast.success(`Bulk send queued for ${contacts.length} contacts!`);
      setBulkLeads([]);
    } catch { toast.error("Bulk send failed"); }
    finally { setBulkSending(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">WhatsApp Automation</h1>
        <p className="text-sm text-gray-500">Send messages, AI-generate content, bulk campaigns</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-full sm:w-fit">
        {(["single", "bulk", "logs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 text-sm rounded-lg capitalize transition",
              tab === t ? "bg-white shadow-sm font-medium text-gray-800" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t === "single" ? "Single Send" : t === "bulk" ? "Bulk Campaign" : "Logs"}
          </button>
        ))}
      </div>

      {/* Single Send */}
      {tab === "single" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4 max-w-2xl">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" /> Send Message
          </h2>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Phone Number</label>
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Message</label>
              <button
                onClick={generateMessage} disabled={aiLoading}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <Zap className="h-3 w-3" /> {aiLoading ? "Generating..." : "AI Generate"}
              </button>
            </div>
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Type your message or click AI Generate..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
            />
          </div>
          <button
            onClick={sendSingle} disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send via WhatsApp Web"}
          </button>
          <p className="text-xs text-gray-400">
            This will open WhatsApp Web via Selenium. Keep browser open.
          </p>
        </div>
      )}

      {/* Bulk Campaign */}
      {tab === "bulk" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-3xl">
          <h2 className="font-semibold text-gray-800">Bulk WhatsApp Campaign</h2>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">
              Select Contacts ({bulkLeads.length} selected)
            </label>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y">
              {leads.filter((l) => l.phone).map((lead) => (
                <label key={lead.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={bulkLeads.includes(lead.id)}
                    onChange={(e) =>
                      setBulkLeads(e.target.checked
                        ? [...bulkLeads, lead.id]
                        : bulkLeads.filter((id) => id !== lead.id)
                      )
                    }
                  />
                  <span className="text-sm font-medium">{lead.name}</span>
                  <span className="text-xs text-gray-400">{lead.phone}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Message Template <span className="text-gray-400">(use {"{name}"} for personalization)</span>
            </label>
            <textarea
              value={bulkTemplate} onChange={(e) => setBulkTemplate(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
            />
          </div>
          <button
            onClick={sendBulk} disabled={bulkSending}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {bulkSending ? "Sending..." : `Send to ${bulkLeads.length} Contacts`}
          </button>
        </div>
      )}

      {/* Logs */}
      {tab === "logs" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Mobile: cards */}
          <div className="lg:hidden divide-y divide-gray-50">
            {logs.length === 0 && <p className="py-8 text-center text-gray-400 text-sm">No logs yet</p>}
            {logs.map((log) => (
              <div key={log.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-800">{log.phone}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[log.status])}>
                    {log.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{log.message}</p>
                <p className="text-xs text-gray-300">
                  {log.sent_at ? `${formatDate(log.sent_at)} ${formatTime(log.sent_at)}` : "—"}
                </p>
              </div>
            ))}
          </div>
          {/* Desktop: table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {["Phone", "Message", "Status", "Sent At"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400">No logs yet</td></tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{log.phone}</td>
                    <td className="px-4 py-3 max-w-xs"><p className="truncate text-gray-600">{log.message}</p></td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[log.status])}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {log.sent_at ? `${formatDate(log.sent_at)} ${formatTime(log.sent_at)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
