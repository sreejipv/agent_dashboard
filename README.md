# WhatsApp Admin Panel

A modern Next.js admin panel for managing WhatsApp Business messages through the Meta Graph API.

## Features

- 📱 View and manage WhatsApp messages
- 💬 Send messages to contacts
- 🔍 Search through conversations
- ⚙️ Easy API configuration
- 💾 Persistent configuration storage
- 🎨 Beautiful, modern UI with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Meta Business Account with WhatsApp Business API access
- Access Token, Phone Number ID, and Business Account ID from Meta

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

1. Click the "Settings" button in the top right
2. Enter your Meta API credentials:
   - **Access Token**: Your Meta access token from Business Suite
   - **Phone Number ID**: Your WhatsApp phone number ID
   - **Business Account ID**: Your WhatsApp Business Account ID
3. Click "Save Configuration"

Your configuration will be saved in browser localStorage and persist across sessions.

## Setup Instructions

1. **Get your Access Token**:
   - Go to [Meta Business Suite](https://business.facebook.com/)
   - Navigate to System Users or Access Tokens
   - Generate a token with `whatsapp_business_messaging` permissions

2. **Find your Phone Number ID**:
   - In Meta Business Suite, go to WhatsApp > API Setup
   - Your Phone Number ID is displayed there

3. **Get your Business Account ID**:
   - Found in the same WhatsApp API Setup section

## API Endpoints Used

- `GET /v18.0/{phone-number-id}/messages` - Fetch messages
- `POST /v18.0/{phone-number-id}/messages` - Send messages

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Project Structure

```
├── app/
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   └── globals.css      # Global styles
├── components/
│   └── WhatsAppAdminPanel.tsx  # Main admin panel component
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Notes

- Configuration is stored in browser localStorage
- The app uses the Meta Graph API v18.0
- Make sure your access token has the necessary permissions
- CORS may need to be configured if making requests from a different domain

## License

MIT
