"use client";
import { useState } from "react";
import { agentApi } from "@/lib/api";
import { toast } from "sonner";
import { Bot, Zap, Copy, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const AGENTS = [
  {
    id: "sales", name: "Sales Agent", icon: "💼",
    color: "from-blue-500 to-blue-600",
    description: "Generate WhatsApp messages, cold emails, follow-ups, and nurture sequences",
    examples: [
      "Write a WhatsApp message for Rahul Sharma about our CRM software",
      "Write a cold email to Priya at TechCorp about our AI services",
      "Write a follow-up for a lead who didn't respond in 5 days",
    ],
  },
  {
    id: "content", name: "Content Agent", icon: "✍️",
    color: "from-purple-500 to-purple-600",
    description: "Create YouTube scripts, social media posts, and ad copy",
    examples: [
      "Write a YouTube script about AI tools for small businesses",
      "Create a LinkedIn post about productivity tips for entrepreneurs",
      "Write a Google Ads copy for a mobile app launch",
    ],
  },
  {
    id: "task", name: "Task Agent", icon: "✅",
    color: "from-green-500 to-green-600",
    description: "Create tasks, set reminders, and organize your schedule",
    examples: [
      "Create a task to follow up with all hot leads tomorrow at 10am",
      "Set a reminder to send weekly report every Friday at 5pm",
      "Help me organize my priorities for this week",
    ],
  },
];

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState("sales");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const agent = AGENTS.find((a) => a.id === selectedAgent)!;

  const run = async () => {
    if (!input.trim()) { toast.error("Enter a prompt"); return; }
    setLoading(true);
    setOutput(null);
    try {
      const r = await agentApi.run(selectedAgent, input);
      setOutput(r.data);
    } catch { toast.error("Agent execution failed"); }
    finally { setLoading(false); }
  };

  const copyOutput = () => {
    const text = output?.structured_data?.message || output?.output || "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">AI Agents</h1>
        <p className="text-sm text-gray-500">Multi-agent AI system powered by Gemini</p>
      </div>

      {/* Agent Selector — 1 col on mobile, 3 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            onClick={() => { setSelectedAgent(a.id); setOutput(null); setInput(""); }}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition flex sm:block items-center gap-3",
              selectedAgent === a.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-100 bg-white hover:border-gray-200"
            )}
          >
            <div className="text-2xl sm:mb-2 flex-shrink-0">{a.icon}</div>
            <div>
              <p className="font-semibold text-sm text-gray-800">{a.name}</p>
              <p className="text-xs text-gray-400 mt-0.5 sm:mt-1">{a.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" /> {agent.name}
          </h2>

          {/* Example prompts */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Example prompts:</p>
            <div className="space-y-1.5">
              {agent.examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="block w-full text-left text-xs px-3 py-2 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition text-gray-600"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Your prompt</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Tell the ${agent.name} what to do...`}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
          </div>

          <button
            onClick={run}
            disabled={loading}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 text-white text-sm rounded-lg font-medium transition bg-gradient-to-r disabled:opacity-60",
              agent.color
            )}
          >
            <Zap className="h-4 w-4" />
            {loading ? "Running Agent..." : `Run ${agent.name}`}
          </button>
        </div>

        {/* Output */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Agent Output</h2>
            {output && (
              <button onClick={copyOutput} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
          </div>

          {!output && !loading && (
            <div className="h-48 flex items-center justify-center text-gray-300">
              <div className="text-center">
                <Bot className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">Run the agent to see output</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-48 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="text-sm text-gray-400">Agent is working...</p>
              </div>
            </div>
          )}

          {output && !loading && (
            <div className="space-y-3">
              {/* Structured output */}
              {output.structured_data && (
                <div className="space-y-2">
                  {output.structured_data.type && (
                    <div className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                      {output.structured_data.type}
                    </div>
                  )}
                  {output.structured_data.subject && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Subject</p>
                      <p className="text-sm font-medium text-gray-800">{output.structured_data.subject}</p>
                    </div>
                  )}
                  {output.structured_data.message && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Message</p>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                        {output.structured_data.message}
                      </div>
                    </div>
                  )}
                  {output.structured_data.content && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Content</p>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {output.structured_data.content}
                      </div>
                    </div>
                  )}
                  {output.structured_data.cta && (
                    <div className="bg-green-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-green-600 font-medium">CTA: {output.structured_data.cta}</p>
                    </div>
                  )}
                  {output.structured_data.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {output.structured_data.hashtags.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Raw output fallback */}
              {!output.structured_data && output.output && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {output.output}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
