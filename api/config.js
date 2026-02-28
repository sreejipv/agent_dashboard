// api/config.js
// Shared configuration for WhatsApp API

export function getConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_ID,
    apiVersion: "v18.0",
    baseUrl: "https://graph.facebook.com",
};
}

export function validateConfig() {
  const config = getConfig();
  if (!config.accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN environment variable is not set");
  }
  if (!config.phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_ID environment variable is not set");
  }
  return config;
}
