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
    const saved = localStorage.getItem("whatsapp-config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
      } catch (e) {
        // If parsing fails, use defaults
        setConfig({
          accessToken: "",
          phoneNumberId: "",
          whatsappBusinessAccountId: "",
        });
      }
    }
  }, []);

  // Save config to localStorage
  useEffect(() => {
    if (
      config.accessToken ||
      config.phoneNumberId ||
      config.whatsappBusinessAccountId
    ) {
      localStorage.setItem("whatsapp-config", JSON.stringify(config));
    }
  }, [config]);

  const fetchMessages = async () => {
    if (!config.accessToken || !config.phoneNumberId) {
      setError(
        "Please configure your Access Token and Phone Number ID in Settings"
      );
      setShowConfig(true);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Verify the phone number configuration
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.phoneNumberId}?fields=verified_name,code_verification_status,quality_rating,messaging_limit_tier`,
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `API Error: ${response.status}`
        );
      }

      const data = await response.json();

      setSuccess(
        `✓ Connected to WhatsApp Business API! Phone: ${
          data.verified_name || "Verified"
        }. Note: Messages are received via webhooks only.`
      );

      // Show info about webhook requirement
      if (messages.length === 0) {
        setTimeout(() => {
          setError(
            '⚠️ To receive incoming messages, you must configure webhooks. This panel can send messages. Click "Add Demo Message" to see the UI in action.'
          );
        }, 3000);
      }
    } catch (err: any) {
      setError(
        `Connection Failed: ${err.message}. Check your credentials and permissions.`
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
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: selectedConversation,
            type: "text",
            text: { body: messageText },
          }),
        }
      );

      const errorData = await response.json();

      if (!response.ok) {
        const errorMessage =
          errorData.error?.message ||
          errorData.error?.error_user_msg ||
          "Failed to send message";
        const errorType = errorData.error?.type || "Unknown Error";
        throw new Error(`${errorType}: ${errorMessage}`);
      }

      const data = await response.json();

      // Add sent message to list
      const newMessage = {
        id: data.messages[0].id,
        from: config.phoneNumberId,
        to: selectedConversation,
        text: messageText,
        timestamp: Date.now() / 1000,
        type: "text",
        status: "sent",
      };

      setMessages((prev) => [newMessage, ...prev]);
      setMessageText("");
      setSuccess("Message sent successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(`Failed to send message: ${err.message}`);
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
    new Set(
      messages.map((m) => (m.from === config.phoneNumberId ? m.to : m.from))
    )
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
              API Configuration
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveConfig();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token
                </label>
                <input
                  type="password"
                  value={config.accessToken}
                  onChange={(e) =>
                    setConfig({ ...config, accessToken: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your Meta access token"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={config.phoneNumberId}
                  onChange={(e) =>
                    setConfig({ ...config, phoneNumberId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your phone number ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Account ID
                </label>
                <input
                  type="text"
                  value={config.whatsappBusinessAccountId}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      whatsappBusinessAccountId: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your business account ID"
                />
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
                      msg.from === config.phoneNumberId
                        ? "bg-green-50 border-green-200 ml-8"
                        : "bg-gray-50 border-gray-200 mr-8"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-sm">
                          {msg.from === config.phoneNumberId ? "You" : msg.from}
                        </span>
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">
              📋 Setup Instructions:
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
              <li className="ml-2">
                <strong>Get Access Token:</strong> Go to Meta Business Suite →
                App Dashboard → WhatsApp → API Setup
                <ul className="ml-6 mt-1 text-xs list-disc">
                  <li>
                    Generate a permanent token (temporary tokens expire in 24
                    hours)
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
                <strong>Get Phone Number ID:</strong> In the same API Setup
                page, copy your Phone Number ID
              </li>
              <li className="ml-2">
                <strong>Configure in Settings:</strong> Click Settings button
                above and paste your credentials
              </li>
              <li className="ml-2">
                <strong>Test Connection:</strong> Click "Check API" to verify
                your setup
              </li>
              <li className="ml-2">
                <strong>Send Messages:</strong> Enter a recipient's WhatsApp
                number and send messages
              </li>
            </ol>
          </div>

          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-900 mb-2">
              ⚠️ Important: How WhatsApp Business API Works
            </h3>
            <div className="space-y-2 text-yellow-800 text-sm">
              <p>
                <strong>Sending Messages:</strong> ✅ Works directly through
                this panel using the API
              </p>
              <p>
                <strong>Receiving Messages:</strong> ⚠️ Requires webhook
                configuration:
              </p>
              <ul className="ml-6 mt-2 space-y-1 list-disc">
                <li>
                  WhatsApp sends incoming messages to YOUR server endpoint via
                  POST requests
                </li>
                <li>You need a public HTTPS endpoint to receive webhooks</li>
                <li>
                  Configure webhook URL in Meta App Dashboard → WhatsApp →
                  Configuration
                </li>
                <li>
                  Your server must respond with status 200 and verify the
                  webhook token
                </li>
                <li>
                  Store received messages in your database, then display them
                  here
                </li>
              </ul>
              <p className="mt-3 p-2 bg-yellow-100 rounded">
                <strong>For testing:</strong> Use the "Add Demo Message" button
                to simulate incoming messages and see how the UI works.
              </p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-2">
              💡 Webhook Setup Guide
            </h3>
            <div className="text-green-800 text-sm space-y-2">
              <p>To receive messages, create a webhook endpoint that:</p>
              <ol className="list-decimal ml-6 space-y-1">
                <li>
                  Accepts POST requests at{" "}
                  <code className="bg-green-100 px-1 rounded">/webhook</code>
                </li>
                <li>
                  Verifies GET requests with hub.mode, hub.verify_token,
                  hub.challenge
                </li>
                <li>Processes incoming message data and stores it</li>
                <li>Returns 200 status immediately</li>
              </ol>
              <p className="mt-2 text-xs">
                Example tools: ngrok for local testing, Heroku/Vercel/AWS Lambda
                for production
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
