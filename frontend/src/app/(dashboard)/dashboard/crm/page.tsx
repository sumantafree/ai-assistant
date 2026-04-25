"use client";
import { useEffect, useState } from "react";
import { leadsApi } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Phone, Mail, Building2 } from "lucide-react";
import { cn, STATUS_COLORS, formatDate } from "@/lib/utils";

interface Lead {
  id: number; name: string; phone: string; email: string;
  company: string; status: string; notes: string;
  last_contact: string; created_at: string;
}

const STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"];

function LeadModal({ lead, onClose, onSaved }: { lead?: Lead; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: lead?.name || "", phone: lead?.phone || "", email: lead?.email || "",
    company: lead?.company || "", notes: lead?.notes || "", status: lead?.status || "new",
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      if (lead) await leadsApi.update(lead.id, form);
      else await leadsApi.create(form);
      toast.success(lead ? "Lead updated!" : "Lead created!");
      onSaved(); onClose();
    } catch { toast.error("Failed to save"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-semibold">{lead ? "Edit Lead" : "Add Lead"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-4 space-y-3">
          {[
            { label: "Name *", key: "name", placeholder: "Rahul Sharma" },
            { label: "Phone", key: "phone", placeholder: "+919876543210" },
            { label: "Email", key: "email", placeholder: "rahul@example.com" },
            { label: "Company", key: "company", placeholder: "TechCorp" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
          </div>
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-sm rounded-lg">Cancel</button>
          <button onClick={submit} disabled={loading || !form.name}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-60">
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState<{ open: boolean; lead?: Lead }>({ open: false });

  const load = async () => {
    const params: any = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    try { const r = await leadsApi.list(params); setLeads(r.data); }
    catch { toast.error("Failed to load leads"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const deleteLead = async (id: number) => {
    if (!confirm("Delete this lead?")) return;
    try { await leadsApi.delete(id); toast.success("Deleted"); load(); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">CRM</h1>
          <p className="text-sm text-gray-500">{leads.length} leads</p>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
          <option value="">All Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Mobile: Cards view | Desktop: Table view */}
      <>
        {/* Mobile card list */}
        <div className="lg:hidden space-y-3">
          {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}
          {!loading && leads.length === 0 && <p className="text-center text-gray-400 py-8">No leads found</p>}
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{lead.name}</p>
                  {lead.company && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.company}</p>}
                </div>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[lead.status])}>
                  {lead.status}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {lead.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</p>}
                {lead.email && <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setModal({ open: true, lead })}
                  className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg flex items-center justify-center gap-1 hover:bg-gray-50">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button onClick={() => deleteLead(lead.id)}
                  className="flex-1 py-1.5 text-xs border border-red-100 text-red-500 rounded-lg flex items-center justify-center gap-1 hover:bg-red-50">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {["Name", "Contact", "Company", "Status", "Last Contact", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading...</td></tr>}
                {!loading && leads.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No leads found</td></tr>}
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{lead.name}</td>
                    <td className="px-4 py-3 space-y-1">
                      {lead.phone && <div className="flex items-center gap-1 text-gray-500 text-xs"><Phone className="h-3 w-3" />{lead.phone}</div>}
                      {lead.email && <div className="flex items-center gap-1 text-gray-500 text-xs"><Mail className="h-3 w-3" />{lead.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.company}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[lead.status])}>{lead.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(lead.last_contact)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModal({ open: true, lead })} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deleteLead(lead.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>

      {modal.open && <LeadModal lead={modal.lead} onClose={() => setModal({ open: false })} onSaved={load} />}
    </div>
  );
}
