"use client";

// app/portal/[token]/page.tsx
// Read-only client portal view. Loads all data server-side via /api/portal/verify-link.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Message {
  id: string;
  from_number: string;
  to_number: string;
  text: string;
  timestamp: number;
  type: string;
  is_sent: boolean;
}

interface Milestone {
  id: string;
  title: string;
  status: "pending" | "complete";
  completed_at: string | null;
  created_at: string;
}

interface ClientFile {
  id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

interface PortalData {
  client_phone: string;
  client_name: string;
  messages: Message[];
  milestones: Milestone[];
  files: ClientFile[];
}

function formatTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClientPortalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"status" | "messages" | "milestones" | "files">("status");

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        const res = await fetch(`/api/portal/verify-link?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          setError(json.error || "Failed to load portal");
        } else {
          setData(json);
        }
      } catch {
        setError("Network error — please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Link Unavailable</h2>
          <p className="text-gray-600 text-sm">{error || "This link is invalid or has expired."}</p>
          <p className="text-xs text-gray-400 mt-4">Contact FelloCoder to request a new link.</p>
        </div>
      </div>
    );
  }

  const completedMilestones = data.milestones.filter((m) => m.status === "complete").length;
  const totalMilestones = data.milestones.length;
  const progressPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const tabs: { key: typeof activeTab; label: string; count?: number }[] = [
    { key: "status", label: "Overview" },
    { key: "milestones", label: "Milestones", count: totalMilestones },
    { key: "files", label: "Files", count: data.files.length },
    { key: "messages", label: "Messages", count: data.messages.length },
  ];

  return (
    <div className="min-h-screen bg-[#e9edef]">
      {/* Header */}
      <div className="bg-[#00a884] px-4 py-5 shadow-md">
        <div className="max-w-3xl mx-auto">
          <p className="text-green-100 text-sm font-medium">FelloCoder Client Portal</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">
            {data.client_name || data.client_phone}
          </h1>
          <p className="text-green-100 text-sm mt-1">Read-only view · {data.client_phone}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[#00a884] text-[#00a884]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs rounded-full px-1.5 py-0.5">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Overview Tab */}
        {activeTab === "status" && (
          <>
            {/* Progress Card */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Project Progress</h2>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>{completedMilestones} of {totalMilestones} milestones complete</span>
                <span className="font-medium text-[#00a884]">{progressPct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-[#00a884] h-2.5 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Recent Milestones */}
            {data.milestones.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Recent Milestones</h2>
                <ul className="space-y-2">
                  {data.milestones.slice(0, 5).map((m) => (
                    <li key={m.id} className="flex items-center gap-3">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          m.status === "complete" ? "bg-[#00a884]" : "bg-gray-200"
                        }`}
                      >
                        {m.status === "complete" && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-sm ${m.status === "complete" ? "text-gray-500 line-through" : "text-gray-800"}`}>
                        {m.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent Files */}
            {data.files.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Recently Uploaded Files</h2>
                <ul className="space-y-2">
                  {data.files.slice(0, 3).map((f) => (
                    <li key={f.id} className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <a
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#00a884] hover:underline truncate"
                      >
                        {f.file_name}
                      </a>
                      <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{formatDate(f.uploaded_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Milestones Tab */}
        {activeTab === "milestones" && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">All Milestones</h2>
            {data.milestones.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No milestones yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.milestones.map((m) => (
                  <li key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        m.status === "complete" ? "bg-[#00a884]" : "border-2 border-gray-300"
                      }`}
                    >
                      {m.status === "complete" && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${m.status === "complete" ? "text-gray-400 line-through" : "text-gray-800"}`}>
                        {m.title}
                      </p>
                      {m.completed_at && (
                        <p className="text-xs text-gray-400 mt-0.5">Completed {formatDate(m.completed_at)}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        m.status === "complete"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {m.status === "complete" ? "Done" : "In Progress"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === "files" && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Project Files</h2>
            {data.files.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No files uploaded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-3">
                    <svg className="w-8 h-8 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <a
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-[#00a884] hover:underline truncate block"
                      >
                        {f.file_name}
                      </a>
                      <p className="text-xs text-gray-400">{formatDate(f.uploaded_at)}</p>
                    </div>
                    <a
                      href={f.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#00a884] hover:text-[#008069] flex-shrink-0"
                    >
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Message History</h2>
            {data.messages.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No messages yet.</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {data.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.is_sent ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                        msg.is_sent
                          ? "bg-[#d9fdd3] rounded-tr-none"
                          : "bg-gray-100 rounded-tl-none"
                      }`}
                    >
                      <p className="text-gray-900 whitespace-pre-wrap break-words">{msg.text}</p>
                      <p className="text-xs text-gray-400 mt-1 text-right">{formatTime(msg.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          This is a read-only view · Powered by FelloCoder
        </p>
      </div>
    </div>
  );
}
