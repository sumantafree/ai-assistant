"use client";
import { useEffect, useState } from "react";
import { tasksApi, agentApi } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Zap, Pencil, Trash2, CheckCircle2, Circle, Clock } from "lucide-react";
import { cn, STATUS_COLORS, formatDate } from "@/lib/utils";

interface Task {
  id: number; title: string; description: string;
  priority: string; status: string; due_date: string; created_at: string;
}

const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["todo", "in_progress", "done"];
const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-500 bg-gray-100",
  medium: "text-yellow-700 bg-yellow-100",
  high: "text-red-700 bg-red-100",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_date: "" });

  const load = async () => {
    try {
      const r = await tasksApi.list();
      setTasks(r.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditTask(null); setForm({ title: "", description: "", priority: "medium", due_date: "" }); setModal(true); };
  const openEdit = (t: Task) => { setEditTask(t); setForm({ title: t.title, description: t.description || "", priority: t.priority, due_date: t.due_date?.split("T")[0] || "" }); setModal(true); };

  const saveTask = async () => {
    try {
      if (editTask) await tasksApi.update(editTask.id, form);
      else await tasksApi.create(form);
      toast.success(editTask ? "Task updated!" : "Task created!");
      setModal(false); load();
    } catch { toast.error("Failed to save"); }
  };

  const deleteTask = async (id: number) => {
    if (!confirm("Delete task?")) return;
    try { await tasksApi.delete(id); toast.success("Deleted"); load(); } catch { toast.error("Failed"); }
  };

  const updateStatus = async (task: Task, status: string) => {
    try { await tasksApi.update(task.id, { status }); load(); } catch {}
  };

  const createFromAI = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const r = await agentApi.run("task", aiInput);
      const taskData = r.data.structured_data?.task;
      if (taskData) {
        await tasksApi.create({
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority || "medium",
          due_date: taskData.due_date,
          reminder_at: taskData.reminder_at,
        });
        toast.success("Task created from AI!");
        setAiInput(""); load();
      } else {
        toast.error("AI couldn't parse task");
      }
    } catch { toast.error("AI task creation failed"); }
    finally { setAiLoading(false); }
  };

  const todo = tasks.filter((t) => t.status === "todo");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");

  const TaskCard = ({ task }: { task: Task }) => (
    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm hover:shadow-md transition group">
      <div className="flex items-start gap-2">
        <button onClick={() => updateStatus(task, task.status === "done" ? "todo" : "done")} className="mt-0.5 flex-shrink-0">
          {task.status === "done"
            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
            : <Circle className="h-4 w-4 text-gray-300 hover:text-green-400" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium text-gray-800", task.status === "done" && "line-through text-gray-400")}>{task.title}</p>
          {task.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", PRIORITY_COLORS[task.priority])}>{task.priority}</span>
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="h-3 w-3" />{formatDate(task.due_date)}</span>
            )}
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          <button onClick={() => openEdit(task)} className="p-1 text-gray-400 hover:text-blue-500"><Pencil className="h-3 w-3" /></button>
          <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl lg:text-2xl font-bold text-gray-900">Tasks</h1><p className="text-sm text-gray-500">{tasks.length} total tasks</p></div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      {/* AI Task Creator */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
        <p className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-1.5"><Zap className="h-4 w-4" /> AI Task Creator</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={aiInput} onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createFromAI()}
            placeholder="Describe your task... (e.g., 'Call Rahul tomorrow at 2pm')"
            className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button onClick={createFromAI} disabled={aiLoading} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap">
            {aiLoading ? "Creating..." : "Create with AI"}
          </button>
        </div>
      </div>

      {/* Kanban Board — 1 col on mobile, 3 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "To Do", tasks: todo, status: "todo", color: "border-gray-200" },
          { label: "In Progress", tasks: inProgress, status: "in_progress", color: "border-blue-200" },
          { label: "Done", tasks: done, status: "done", color: "border-green-200" },
        ].map((col) => (
          <div key={col.status} className={cn("bg-gray-50 rounded-xl border-2 p-4", col.color)}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
              <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{col.tasks.length}</span>
            </div>
            <div className="space-y-2">
              {col.tasks.map((t) => <TaskCard key={t.id} task={t} />)}
              {col.tasks.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No tasks</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-semibold">{editTask ? "Edit Task" : "New Task"}</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {[{ label: "Title *", key: "title" }, { label: "Description", key: "description" }].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
                  <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Due Date</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={saveTask} disabled={!form.title} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
