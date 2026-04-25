"use client";
import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Users, CheckSquare, MessageCircle, Mic } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.stats()
      .then((r) => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  const taskData = [
    { name: "Pending", value: (stats?.tasks.total || 0) - (stats?.tasks.completed || 0) },
    { name: "Done", value: stats?.tasks.completed || 0 },
  ];

  const autoData = [
    { name: "WhatsApp", sent: stats?.automation.whatsapp_sent || 0 },
    { name: "Email", sent: stats?.automation.emails_sent || 0 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your overview at a glance</p>
      </div>

      {/* Stats — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users}         label="Total Leads"    value={stats?.leads.total || 0}            sub={`+${stats?.leads.new_this_week || 0} this week`} color="bg-blue-500" />
        <StatCard icon={CheckSquare}   label="Tasks"          value={stats?.tasks.total || 0}            sub={`${stats?.tasks.completion_rate || 0}% done`}    color="bg-green-500" />
        <StatCard icon={MessageCircle} label="WA Sent"        value={stats?.automation.whatsapp_sent || 0} sub="Messages"                                       color="bg-emerald-500" />
        <StatCard icon={Mic}           label="Voice Cmds"     value={stats?.voice.total_commands || 0}   sub="Total"                                           color="bg-purple-500" />
      </div>

      {/* Charts — stack on mobile, side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Task Progress</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={taskData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {taskData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Automation</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={autoData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-800 text-sm">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {!stats?.recent_activity?.length && (
            <p className="p-4 text-sm text-gray-400">No activity yet.</p>
          )}
          {stats?.recent_activity?.map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.success ? "bg-green-400" : "bg-red-400"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{item.command}</p>
                <p className="text-xs text-gray-400 truncate">{item.action}</p>
              </div>
              <span className="text-xs text-gray-300 flex-shrink-0 hidden sm:block">
                {formatDate(item.time)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
