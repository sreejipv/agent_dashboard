"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  RefreshCw,
  MessageSquare,
  User,
  Phone,
  Clock,
  Search,
  Settings,
} from "lucide-react";

export default function WhatsAppAdminPanel() {
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
        try {
          const messagesUrl = config.backendUrl
            ? `${config.backendUrl}/api/messages`
            : "/api/messages";
          const msgResponse = await fetch(messagesUrl);
          if (msgResponse.ok) {
            const msgData = await msgResponse.json();
            if (msgData.success && msgData.messages?.length > 0) {
              setMessages(msgData.messages);
            }
          }
        } catch (err) {
          console.log("No stored messages yet");
        }
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

      // Add sent message to list
      const newMessage = {
        id: data.messageId || `msg_${Date.now()}`,
        from: "You",
        to: selectedConversation,
        text: messageText,
        timestamp: Date.now() / 1000,
        type: "text",
        status: "sent",
      };

      setMessages((prev) => [newMessage, ...prev]);
      setMessageText("");
      setSuccess("✅ Message sent successfully");
      setTimeout(() => setSuccess(""), 3000);
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

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const filteredMessages = messages.filter(
    (msg) =>
      msg.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.from?.includes(searchTerm) ||
      msg.to?.includes(searchTerm)
  );

  // Get unique conversations
  const conversations = Array.from(
    new Set(messages.map((m) => (m.from === "You" ? m.to : m.from)))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  WhatsApp Admin Panel
                </h1>
                <p className="text-gray-600">
                  Manage your WhatsApp Business messages
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
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
                  Go to Project Settings → Environment Variables to configure.
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Leave empty for Vercel, or http://localhost:3001 for local"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty when deployed on Vercel (uses relative paths)
                </p>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Save Configuration
              </button>
            </form>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Conversations</h2>
            <div className="space-y-2">
              {conversations.map((conv, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedConversation === conv
                      ? "bg-green-100 border-2 border-green-500"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-600" />
                    <span className="font-medium">{conv}</span>
                  </div>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No conversations yet
                </p>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={fetchMessages}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:bg-gray-400"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                  />
                  {loading ? "Checking..." : "Check API"}
                </button>
                <button
                  onClick={simulateIncomingMessage}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  Add Demo Message
                </button>
              </div>
            </div>

            {/* Send Message */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Send Message</h3>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder={
                    selectedConversation
                      ? "Type your message..."
                      : "Select a conversation first"
                  }
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={!selectedConversation}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessage}
                  disabled={
                    loading || !selectedConversation || !messageText.trim()
                  }
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:bg-gray-400"
                >
                  <Send className="w-5 h-5" />
                  Send
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Messages ({filteredMessages.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg border ${
                      msg.from === "You"
                        ? "bg-green-50 border-green-200 ml-8"
                        : "bg-gray-50 border-gray-200 mr-8"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-sm">{msg.from}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(msg.timestamp)}
                      </div>
                    </div>
                    <p className="text-gray-800">{msg.text}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          msg.type === "text"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {msg.type}
                      </span>
                      {msg.status && (
                        <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                          {msg.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {filteredMessages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No messages to display</p>
                    <p className="text-sm">
                      Click "Check API" to verify connection or "Add Demo
                      Message" to test
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 space-y-4">
          <div className="bg-purple-50 border border-purple-300 rounded-lg p-6">
            <h3 className="font-semibold text-purple-900 mb-3">
              🚀 Vercel Deployment Setup
            </h3>
            <ol className="list-decimal ml-6 space-y-3 text-purple-800 text-sm">
              <li>
                <strong>Create API folder structure in your project:</strong>
                <pre className="bg-purple-100 p-2 rounded mt-1 text-xs overflow-x-auto">
                  {`your-project/

├── api/
│   ├── config.js
│   ├── verify-phone.js
│   ├── send-message.js
│   ├── webhook.js
│   └── messages.js
└── (your React app files)`}
                </pre>
              </li>
              <li>
                <strong>Copy the API files:</strong> Copy all the code from the
                "Vercel API Functions" artifact into the corresponding files
              </li>
              <li>
                <strong>Set Environment Variables in Vercel:</strong>
                <ul className="ml-4 mt-2 list-disc text-xs space-y-1">
                  <li>
                    Go to your Vercel project → Settings → Environment Variables
                  </li>
                  <li>
                    Add:{" "}
                    <code className="bg-purple-100 px-1 rounded">
                      WHATSAPP_ACCESS_TOKEN
                    </code>{" "}
                    = Your Meta access token
                  </li>
                  <li>
                    Add:{" "}
                    <code className="bg-purple-100 px-1 rounded">
                      WHATSAPP_PHONE_ID
                    </code>{" "}
                    = Your phone number ID
                  </li>
                  <li>
                    Add:{" "}
                    <code className="bg-purple-100 px-1 rounded">
                      WEBHOOK_VERIFY_TOKEN
                    </code>{" "}
                    = Any secure string (e.g., "my_secret_123")
                  </li>
                </ul>
              </li>
              <li>
                <strong>Deploy to Vercel:</strong>
                <pre className="bg-purple-100 p-2 rounded mt-1 text-xs">
                  git push origin main
                </pre>
                <p className="text-xs mt-1">
                  Or use:{" "}
                  <code className="bg-purple-100 px-1 rounded">
                    vercel --prod
                  </code>
                </p>
              </li>
              <li>
                <strong>Configure Webhooks in Meta:</strong>
                <ul className="ml-4 mt-2 list-disc text-xs space-y-1">
                  <li>Go to Meta App Dashboard → WhatsApp → Configuration</li>
                  <li>
                    Webhook URL:{" "}
                    <code className="bg-purple-100 px-1 rounded">
                      https://your-app.vercel.app/api/webhook
                    </code>
                  </li>
                  <li>
                    Verify Token: Same as{" "}
                    <code className="bg-purple-100 px-1 rounded">
                      WEBHOOK_VERIFY_TOKEN
                    </code>{" "}
                    from step 3
                  </li>
                  <li>
                    Subscribe to fields: <strong>messages</strong>
                  </li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-300 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-3">
              ✅ How It Works on Vercel
            </h3>
            <div className="space-y-2 text-green-800 text-sm">
              <p>
                <strong>Serverless Functions:</strong> Each API file becomes a
                serverless endpoint
              </p>
              <ul className="ml-6 list-disc text-xs space-y-1 mt-2">
                <li>
                  <code className="bg-green-100 px-1 rounded">
                    /api/verify-phone
                  </code>{" "}
                  - Check connection
                </li>
                <li>
                  <code className="bg-green-100 px-1 rounded">
                    /api/send-message
                  </code>{" "}
                  - Send WhatsApp messages
                </li>
                <li>
                  <code className="bg-green-100 px-1 rounded">/api/webhook</code>{" "}
                  - Receive incoming messages
                </li>
                <li>
                  <code className="bg-green-100 px-1 rounded">/api/messages</code>{" "}
                  - Get stored messages
                </li>
              </ul>
              <p className="mt-3">
                <strong>Security:</strong> ✓ No CORS issues, ✓ API keys hidden
                in environment variables
              </p>
              <p>
                <strong>Scalability:</strong> ✓ Auto-scales with traffic, ✓ No
                server management needed
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">
              📋 Getting Your Credentials:
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
              <li className="ml-2">
                <strong>Access Token:</strong>
                <ul className="ml-6 mt-1 text-xs list-disc">
                  <li>
                    Go to{" "}
                    <a
                      href="https://developers.facebook.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Meta App Dashboard
                    </a>
                  </li>
                  <li>Select your app → WhatsApp → API Setup</li>
                  <li>
                    Click "Generate Token" (choose permanent, not 24-hour
                    temporary)
                  </li>
                  <li>
                    Required permission:{" "}
                    <code className="bg-blue-100 px-1 rounded">
                      whatsapp_business_messaging
                    </code>
                  </li>
                </ul>
              </li>
              <li className="ml-2">
                <strong>Phone Number ID:</strong>
                <ul className="ml-6 mt-1 text-xs list-disc">
                  <li>Same page (WhatsApp → API Setup)</li>
                  <li>
                    Copy the "Phone number ID" next to your WhatsApp number
                  </li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-900 mb-2">
              🔔 Receiving Messages (Webhooks)
            </h3>
            <div className="space-y-2 text-yellow-800 text-sm">
              <p>
                <strong>How it works:</strong>
              </p>
              <ol className="list-decimal ml-6 space-y-1 text-xs mt-2">
                <li>User sends WhatsApp message to your business number</li>
                <li>
                  Meta sends POST request to{" "}
                  <code className="bg-yellow-100 px-1 rounded">
                    your-app.vercel.app/api/webhook
                  </code>
                </li>
                <li>Your webhook function receives the message data</li>
                <li>Store message in database (Vercel KV, MongoDB, etc.)</li>
                <li>Display in this admin panel</li>
              </ol>
              <p className="mt-3 p-2 bg-yellow-100 rounded text-xs">
                <strong>For immediate testing:</strong> Use "Add Demo Message"
                button to simulate incoming messages
              </p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-300 rounded-lg p-6">
            <h3 className="font-semibold text-red-900 mb-2">
              ⚠️ Important Notes
            </h3>
            <ul className="ml-6 list-disc space-y-1 text-red-800 text-xs">
              <li>
                <strong>Database Required:</strong> To persist messages, add
                Vercel KV, MongoDB, or PostgreSQL
              </li>
              <li>
                <strong>24-Hour Window:</strong> You can only send template
                messages outside 24-hour customer conversation window
              </li>
              <li>
                <strong>Rate Limits:</strong> Meta has messaging limits based on
                your business verification tier
              </li>
              <li>
                <strong>Testing:</strong> Use Meta's test numbers during
                development
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
