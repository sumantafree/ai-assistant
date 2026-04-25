"use client";
import { useState } from "react";
import { emailApi } from "@/lib/api";
import { toast } from "sonner";
import { Mail, Zap, Send } from "lucide-react";

export default function EmailPage() {
  const [form, setForm] = useState({ to_email: "", subject: "", body: "" });
  const [sending, setSending] = useState(false);
  const [aiForm, setAiForm] = useState({ lead_name: "", company: "", product: "" });
  const [aiLoading, setAiLoading] = useState(false);

  const generateEmail = async () => {
    setAiLoading(true);
    try {
      const r = await emailApi.generate(aiForm);
      const data = r.data;
      setForm({
        to_email: form.to_email,
        subject: data.subject || "",
        body: data.message || data.content || "",
      });
      toast.success("Email generated!");
    } catch { toast.error("Generation failed"); }
    finally { setAiLoading(false); }
  };

  const sendEmail = async () => {
    if (!form.to_email || !form.subject || !form.body) { toast.error("Fill all fields"); return; }
    setSending(true);
    try {
      await emailApi.send(form);
      toast.success("Email queued for sending!");
      setForm({ to_email: "", subject: "", body: "" });
    } catch { toast.error("Send failed"); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Email Automation</h1>
        <p className="text-sm text-gray-500">AI-generated cold emails via Gmail SMTP</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Generator */}
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-5 space-y-4">
          <h2 className="font-semibold text-blue-800 flex items-center gap-2"><Zap className="h-4 w-4" /> AI Email Generator</h2>
          {[
            { label: "Lead Name", key: "lead_name", placeholder: "Rahul Sharma" },
            { label: "Company", key: "company", placeholder: "TechCorp" },
            { label: "Your Product/Service", key: "product", placeholder: "AI CRM Software" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-medium text-blue-700 mb-1 block">{label}</label>
              <input
                value={(aiForm as any)[key]}
                onChange={(e) => setAiForm({ ...aiForm, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          ))}
          <button onClick={generateEmail} disabled={aiLoading} className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {aiLoading ? "Generating..." : "Generate Email"}
          </button>
        </div>

        {/* Email Composer */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Mail className="h-5 w-5 text-blue-500" /> Compose Email</h2>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">To</label>
            <input value={form.to_email} onChange={(e) => setForm({ ...form, to_email: e.target.value })}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Subject</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Email subject..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Body</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={8} placeholder="Email body..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
          </div>
          <button onClick={sendEmail} disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
            <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Email"}
          </button>
          <p className="text-xs text-gray-400">Requires Gmail SMTP credentials in backend .env file</p>
        </div>
      </div>
    </div>
  );
}
