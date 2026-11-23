# LeadPing AI — Chrome Extension (Manifest V3)

LeadPing AI is an AI-powered sales & lead intelligence Chrome Extension built with React 18, TypeScript, Tailwind CSS, and Vite. It opens as a native Chrome Side Panel to analyze any company website, extract buying signals, calculate ICP fit scores, reveal pain points, and generate personalized sales outreach.

## Features
- **Chrome Side Panel API**: Persistent side panel alongside any webpage.
- **Smart Page Extraction**: Content script extracts page title, meta tags, clean text, links, OpenGraph, JSON-LD, contacts, and tech stack without bloating the prompt.
- **Full AI Analysis View**:
  - Company overview, industry, location, and offerings.
  - Radial ICP Score with animated progress and criteria breakdown.
  - Confidence-badged Buying Signals (Verified vs. AI Inference).
  - Categorized Pain Points & Sales Opportunities.
  - One-click copyable Recommended Value Pitch.
  - Hot / Warm / Cold Lead Qualification.
- **AI Outreach Generator**: Generates Cold Email, LinkedIn InMail, and Cold Call scripts with Tone variants (Professional, Casual, Punchy).
- **Pipeline & Saved Leads**: Save leads directly to your account with status tracking.
- **Credit & Usage Tracking**: Real-time quota and subscription monitoring.
- **Sanctum Auth**: Bearer token authentication stored safely in `chrome.storage.local`.

## Setup & Build

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build extension:
   ```bash
   npm run build
   ```

3. Load into Google Chrome:
   - Navigate to `chrome://extensions/`
   - Toggle **Developer mode** on (top-right)
   - Click **Load unpacked**
   - Select the `dist/` directory inside `extension/`
