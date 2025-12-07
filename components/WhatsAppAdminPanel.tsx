"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Send,
  RefreshCw,
  MessageSquare,
  User,
  Phone,
  Clock,
  Search,
  Settings,
  LogOut,
} from "lucide-react";

interface WhatsAppAdminPanelProps {
  onLogout?: () => void;
}

export default function WhatsAppAdminPanel({
  onLogout,
}: WhatsAppAdminPanelProps = {}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    backendUrl: "", // Auto-detect Vercel URL or use relative paths
    accessToken: "",
    phoneNumberId: "",
    whatsappBusinessAccountId: "",
  });
  const [showConfig, setShowConfig] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  // Load config from localStorage
  useEffect(() => {
    // Auto-detect if we're on Vercel or localhost
    const isProduction = window.location.hostname !== "localhost";
    const baseUrl = isProduction ? "" : "http://localhost:3001";

    const saved = localStorage.getItem("whatsapp-config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with auto-detected backendUrl if not set
        setConfig({
          backendUrl: parsed.backendUrl || baseUrl,
          accessToken: parsed.accessToken || "",
          phoneNumberId: parsed.phoneNumberId || "",
          whatsappBusinessAccountId: parsed.whatsappBusinessAccountId || "",
        });
      } catch (e) {
        // If parsing fails, use defaults
        setConfig({
          backendUrl: baseUrl,
          accessToken: "",
          phoneNumberId: "",
          whatsappBusinessAccountId: "",
        });
      }
    } else {
      // No saved config, use defaults with auto-detected URL
      setConfig({
        backendUrl: baseUrl,
        accessToken: "",
        phoneNumberId: "",
        whatsappBusinessAccountId: "",
      });
    }
  }, []);

  // Save config to localStorage
  useEffect(() => {
    if (
      config.backendUrl ||
      config.accessToken ||
      config.phoneNumberId ||
      config.whatsappBusinessAccountId
    ) {
      localStorage.setItem("whatsapp-config", JSON.stringify(config));
    }
  }, [config]);

  // Define refreshMessages before it's used in useEffect
  const refreshMessages = useCallback(
    async (silent: boolean = false) => {
      try {
        const messagesUrl = config.backendUrl
          ? `${config.backendUrl}/api/messages`
          : "/api/messages";
        const msgResponse = await fetch(messagesUrl);
        if (msgResponse.ok) {
          const msgData = await msgResponse.json();
          if (msgData.success) {
            const newMessages = msgData.messages || [];

            setMessages((prevMessages) => {
              const previousCount = prevMessages.length;

              // Only show success/error messages if not in silent mode
              if (!silent) {
                if (newMessages.length > 0) {
                  setSuccess(
                    `✓ Loaded ${newMessages.length} message(s) from database`
                  );
                  setTimeout(() => setSuccess(""), 3000);
                } else {
                  setError(
                    "No messages found in database. Make sure Supabase is configured and messages are being stored."
                  );
                  setTimeout(() => setError(""), 5000);
                }
              } else {
                // Silent mode: only show notification if new messages arrived
                if (newMessages.length > previousCount) {
                  const newCount = newMessages.length - previousCount;
                  setSuccess(`✓ ${newCount} new message(s) received`);
                  setTimeout(() => setSuccess(""), 3000);
                }
              }

              return newMessages;
            });
          }
        } else {
          const errorData = await msgResponse.json();
          if (!silent) {
            throw new Error(errorData.error || "Failed to fetch messages");
          }
        }
      } catch (err: any) {
        console.error("Error fetching messages:", err);
        if (!silent) {
          setError(`Failed to load messages: ${err.message}`);
          setTimeout(() => setError(""), 5000);
        }
      }
    },
    [config.backendUrl]
  );

  // Page Visibility API - detect when tab is visible/hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    setIsPageVisible(!document.hidden);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Auto-poll messages when page is visible
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    if (isPageVisible) {
      // Initial fetch when page becomes visible
      refreshMessages(true); // true = silent mode (no error messages)

      // Set up polling every 5 seconds
      pollInterval = setInterval(() => {
        refreshMessages(true); // Silent mode for auto-polling
      }, 5000); // Poll every 5 seconds

      setIsPolling(true);
    } else {
      setIsPolling(false);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      setIsPolling(false);
    };
  }, [isPageVisible, refreshMessages]);

  const fetchMessages = async () => {
    setLoading(true);
    setError("");

    try {
      // Use relative path for Vercel, or configured backend URL for local
      const apiUrl = config.backendUrl
        ? `${config.backendUrl}/api/verify-phone`
        : "/api/verify-phone";
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(
          `✓ Connected to WhatsApp Business API! Phone: ${
            data.data?.verified_name || "Verified"
          }. Webhooks ready to receive messages.`
        );

        // Also try to fetch existing messages
        await refreshMessages();
      } else {
        throw new Error(data.error || "Unknown error");
      }

      if (messages.length === 0) {
        setTimeout(() => {
          setError(
            '⚠️ Configure webhooks in Meta to receive messages. Use "Add Demo Message" to test UI.'
          );
        }, 3000);
      }
    } catch (err: any) {
      setError(
        `Connection Failed: ${err.message}. Check your Vercel environment variables or API setup.`
      );
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) {
      setError("Please enter a message and select a recipient");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const apiUrl = config.backendUrl
        ? `${config.backendUrl}/api/send-message`
        : "/api/send-message";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: selectedConversation,
          message: messageText,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to send message");
      }

      setMessageText("");
      setSuccess("✅ Message sent successfully");
      setTimeout(() => setSuccess(""), 3000);

      // Refresh messages after a short delay to ensure DB save is complete
      setTimeout(() => {
        refreshMessages(true);
      }, 1000);
    } catch (err: any) {
      setError(`Failed to send: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Simulate webhook message reception (for demo purposes)
  const simulateIncomingMessage = () => {
    const demoMessage = {
      id: `msg_${Date.now()}`,
      from: "1234567890",
      to: config.phoneNumberId,
      text: "This is a demo incoming message. In production, messages arrive via webhooks.",
      timestamp: Date.now() / 1000,
      type: "text",
      status: "received",
    };
    setMessages((prev) => [demoMessage, ...prev]);
    setSuccess("Demo message added. Real messages come via webhooks.");
    setTimeout(() => setSuccess(""), 3000);
  };

  const saveConfig = () => {
    localStorage.setItem("whatsapp-config", JSON.stringify(config));
    setShowConfig(false);
    setSuccess("Configuration saved");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      // Redirect to login
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect even if API call fails
      window.location.href = "/";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (messageDate.getTime() === today.getTime() - 86400000) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredMessages = messages.filter(
    (msg) =>
      msg.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.from?.includes(searchTerm) ||
      msg.to?.includes(searchTerm)
  );

  // Get unique conversations with last message info
  const conversationMap = new Map();
  messages.forEach((msg) => {
    const contact = msg.isSent ? msg.to : msg.from;
    if (
      !conversationMap.has(contact) ||
      msg.timestamp > conversationMap.get(contact).lastMessageTime
    ) {
      conversationMap.set(contact, {
        phone: contact,
        lastMessage: msg.text,
        lastMessageTime: msg.timestamp,
        unreadCount: msg.isSent
          ? 0
          : (conversationMap.get(contact)?.unreadCount || 0) + 1,
      });
    }
  });
  const conversations = Array.from(conversationMap.values()).sort(
    (a, b) => b.lastMessageTime - a.lastMessageTime
  );

  // Get messages for selected conversation
  const conversationMessages = selectedConversation
    ? messages
        .filter((msg) => {
          const contact = msg.isSent ? msg.to : msg.from;
          return contact === selectedConversation;
        })
        .sort((a, b) => a.timestamp - b.timestamp) // Oldest first for chat view
    : [];

  return (
    <div className="h-screen flex flex-col bg-[#e9edef]">
      {/* Top Bar */}
      <div className="bg-[#00a884] h-16 flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-white" />
          <h1 className="text-xl font-semibold text-white">
            WhatsApp Business
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isPolling && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-sm text-white">Live</span>
            </div>
          )}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="absolute top-16 left-0 right-0 bg-white shadow-lg z-50 p-6 border-b">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuration
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveConfig();
              }}
              className="space-y-4"
            >
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>✓ Auto-configured for Vercel</strong>
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Your credentials are stored in Vercel Environment Variables.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backend URL (Optional - for local dev)
                </label>
                <input
                  type="text"
                  value={config.backendUrl}
                  onChange={(e) =>
                    setConfig({ ...config, backendUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00a884] focus:border-transparent"
                  placeholder="Leave empty for Vercel"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#008069] transition-colors font-medium"
              >
                Save Configuration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Alerts */}
      {(error || success) && (
        <div
          className={`px-4 py-2 ${
            error ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}
        >
          {error || success}
        </div>
      )}

      {/* Main Content - WhatsApp Style */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Conversations */}
        <div className="w-1/3 bg-white border-r border-gray-300 flex flex-col">
          {/* Search Bar */}
          <div className="p-3 bg-[#f0f2f5]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border-0 focus:ring-0"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <button
                key={conv.phone}
                onClick={() => setSelectedConversation(conv.phone)}
                className={`w-full text-left p-3 hover:bg-[#f5f6f6] border-b border-gray-100 ${
                  selectedConversation === conv.phone ? "bg-[#e9edef]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate">
                        {conv.phone}
                      </p>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatTime(conv.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            {conversations.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Chat */}
        <div className="flex-1 flex flex-col bg-[#efeae2] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiPjxwYXRoIGQ9Ik0wIDBoMTAwdjEwMEgweiIgZmlsbD0iI2VmZWFlMiIvPjxwYXRoIGQ9Ik0yMCAyMGg2MHY2MEgyMHoiIGZpbGw9IiNkNWQ1ZDUiIG9wYWNpdHk9Ii4wNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')]">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-[#f0f2f5] px-4 py-3 flex items-center justify-between border-b border-gray-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedConversation}
                    </p>
                    <p className="text-xs text-gray-600">WhatsApp</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refreshMessages(false)}
                    className="p-2 hover:bg-gray-200 rounded-lg"
                    title="Refresh"
                  >
                    <RefreshCw className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {conversationMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.isSent ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[65%] rounded-lg px-3 py-2 shadow-sm ${
                        msg.isSent
                          ? "bg-[#d9fdd3] rounded-tr-none"
                          : "bg-white rounded-tl-none"
                      }`}
                    >
                      {msg.text ? (
                        <p className="text-gray-900 text-sm whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      ) : (
                        <p className="text-gray-400 text-sm italic">
                          (Empty message - check database fields)
                        </p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatTime(msg.timestamp)}
                        </span>
                        {msg.isSent && (
                          <span className="text-xs">
                            {msg.status === "sent" ? "✓" : "✓✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {conversationMessages.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p>No messages in this conversation</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="bg-[#f0f2f5] px-4 py-3 border-t border-gray-300">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a message"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && !e.shiftKey && sendMessage()
                    }
                    className="flex-1 px-4 py-2 bg-white rounded-lg border-0 focus:ring-0"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !messageText.trim()}
                    className="p-2 bg-[#00a884] text-white rounded-lg hover:bg-[#008069] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageSquare className="w-20 h-20 mx-auto mb-4 opacity-30" />
                <p className="text-lg">
                  Select a conversation to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
