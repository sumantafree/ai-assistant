/**
 * Axios API client — points to FastAPI backend.
 * Auth token is automatically injected from localStorage.
 */
import axios from "axios";

// In production this is set to your Render.com backend URL
// In development it falls back to localhost:8000
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Auto-inject JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    api.post("/auth/login", { username, password }),
  register: (data: object) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
};

// ─── Leads ────────────────────────────────────────────────────────────────────
export const leadsApi = {
  list: (params?: object) => api.get("/leads", { params }),
  get: (id: number) => api.get(`/leads/${id}`),
  create: (data: object) => api.post("/leads", data),
  update: (id: number, data: object) => api.put(`/leads/${id}`, data),
  delete: (id: number) => api.delete(`/leads/${id}`),
  stats: () => api.get("/leads/stats"),
};

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list: (params?: object) => api.get("/tasks", { params }),
  create: (data: object) => api.post("/tasks", data),
  update: (id: number, data: object) => api.put(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
  stats: () => api.get("/tasks/stats"),
};

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
export const whatsappApi = {
  send: (data: object) => api.post("/whatsapp/send", data),
  sendBulk: (data: object) => api.post("/whatsapp/send-bulk", data),
  generateMessage: (data: object) => api.post("/whatsapp/generate-message", data),
  logs: (params?: object) => api.get("/whatsapp/logs", { params }),
};

// ─── Email ────────────────────────────────────────────────────────────────────
export const emailApi = {
  send: (data: object) => api.post("/email/send", data),
  generate: (data: object) => api.post("/email/generate", data),
  logs: () => api.get("/email/logs"),
};

// ─── Agents ───────────────────────────────────────────────────────────────────
export const agentApi = {
  run: (agent_type: string, input_text: string, context?: object) =>
    api.post("/agent/run", { agent_type, input_text, context }),
  list: () => api.get("/agent/agents"),
  classify: (command: string) => api.post("/agent/classify", { command }),
};

// ─── Voice ────────────────────────────────────────────────────────────────────
export const voiceApi = {
  command: (text: string, execute_action = true) =>
    api.post("/voice/command", { text, execute_action }),
  transcribe: (formData: FormData) =>
    api.post("/voice/transcribe", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  history: (limit = 20) => api.get("/voice/history", { params: { limit } }),
  status: () => api.get("/voice/status"),
  start: () => api.post("/voice/start"),
  stop: () => api.post("/voice/stop"),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get("/dashboard/stats"),
};
