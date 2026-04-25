"use client";
import { useState, useRef, useEffect } from "react";
import { voiceApi } from "@/lib/api";
import { toast } from "sonner";
import { Mic, MicOff, Send, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { useVoiceStore } from "@/lib/store";

const EXAMPLE_COMMANDS = [
  "Open Chrome browser",
  "Search Google for AI tools for business",
  "Write a WhatsApp message for my top lead",
  "Create a task to follow up with leads tomorrow",
  "Open website youtube.com",
  "Write a cold email for a software company",
  "Take a screenshot",
  "Create a YouTube script about productivity",
];

export default function VoicePage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState({ running: false });
  const { history, addToHistory } = useVoiceStore();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    voiceApi.status().then((r) => setVoiceStatus(r.data)).catch(() => {});
  }, []);

  const sendCommand = async (cmd: string = text) => {
    if (!cmd.trim()) { toast.error("Enter a command"); return; }
    setLoading(true);
    try {
      const r = await voiceApi.command(cmd, true);
      const result = r.data;
      addToHistory({
        command: cmd,
        response: result.action_result || result.ai_response || "Done",
        time: new Date().toISOString(),
      });
      toast.success(result.success ? "Command executed!" : "Command failed");
      setText("");
    } catch { toast.error("Command failed"); }
    finally { setLoading(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("file", blob, "recording.wav");
        try {
          const r = await voiceApi.transcribe(formData);
          setText(r.data.text);
          toast.success("Transcribed: " + r.data.text);
        } catch { toast.error("Transcription failed (Whisper model needed)"); }
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRef.current = recorder;
      setIsRecording(true);
    } catch { toast.error("Microphone access denied"); }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Voice Control</h1>
        <p className="text-sm text-gray-500">Speak or type commands to control your desktop</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Control Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mic Button */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="relative inline-flex">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "relative w-24 h-24 rounded-full flex items-center justify-center text-white text-xl transition-all shadow-lg",
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 voice-pulse"
                    : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </button>
            </div>
            <p className="mt-4 text-sm font-medium text-gray-700">
              {isRecording ? "Recording... Click to stop" : "Click to record voice command"}
            </p>
            <p className="text-xs text-gray-400 mt-1">Powered by OpenAI Whisper</p>
          </div>

          {/* Text Input */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Type Command</h2>
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCommand()}
                placeholder="Type a command (e.g., 'Open Chrome', 'Write cold email'...)"
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                onClick={() => sendCommand()}
                disabled={loading}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-800 text-sm">Command History</h2>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {history.length === 0 && (
                <p className="p-4 text-sm text-gray-400 text-center">No commands yet</p>
              )}
              {history.map((h, i) => (
                <div key={i} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">{h.command}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{h.response}</p>
                    </div>
                    <span className="text-xs text-gray-300 flex-shrink-0">{formatTime(h.time)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Examples */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Example Commands</h2>
            <div className="space-y-2">
              {EXAMPLE_COMMANDS.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => { setText(cmd); sendCommand(cmd); }}
                  className="w-full text-left text-xs px-3 py-2 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition text-gray-600"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          {/* Background listener status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3 text-sm">Background Listener</h2>
            <div className={cn("flex items-center gap-2 text-sm", voiceStatus.running ? "text-green-600" : "text-gray-400")}>
              <div className={cn("w-2 h-2 rounded-full", voiceStatus.running ? "bg-green-500" : "bg-gray-300")} />
              {voiceStatus.running ? "Running" : "Stopped"}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => voiceApi.start().then(() => setVoiceStatus({ running: true }))}
                disabled={voiceStatus.running}
                className="flex-1 px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                Start
              </button>
              <button
                onClick={() => voiceApi.stop().then(() => setVoiceStatus({ running: false }))}
                disabled={!voiceStatus.running}
                className="flex-1 px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                Stop
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Background listener uses wake word: "assistant"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
