
# 🤟 SpeakEase — Accessibility Bridge

SpeakEase is a high-fidelity mobile-first communication suite designed to empower individuals who are deaf, mute, or both. By leveraging the latest breakthroughs in **Multimodal AI (Google Gemini)**, SpeakEase bridges the gap between sign language and spoken/written words in real-time.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-8.0.0--interactive-indigo)
![AI-Powered](https://img.shields.io/badge/AI-Google_Gemini-orange)

## ✨ Core Features

### 💬 Talk & Listen (Real-time STT/TTS)
- **Voice-to-Text**: High-speed transcription of ambient speech, automatically translated into the user's preferred language.
- **Text-to-Speech**: Conversational-grade synthesis with regional accent support.
- **Phonetic Keyboard**: Predictive transliteration for complex scripts (e.g., Hindi, Bengali).

### 🤟 Sign Scan (AI Vision)
- **Multimodal Interpretation**: Powered by **Gemini 3 Pro**, interpreting gestures from live camera feeds or snapshots.
- **Continuous Learning**: Advanced reasoning models handle variations in hand positioning and lighting.

### 📍 Nearby Help (Smart Discovery)
- **Location Awareness**: Uses **Gemini 2.5 Flash with Maps Grounding** to detect essential services (Hospitals, Police, Pharmacies) around the user.
- **Contextual Safety**: Summarizes place details specifically for users with hearing/speech impairments.

### 🆘 Emergency SOS
- **One-Tap Alert**: Instantly sends GPS coordinates to emergency services and pre-configured contacts.
- **Vibration Feedback**: Haptic confirmation for all critical actions.

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS (Interactive Bento Grid System)
- **AI Backend**: 
  - **Gemini 3 Pro Preview**: High-complexity visual gesture analysis.
  - **Gemini 3 Flash Preview**: UI translation, transliteration, and text processing.
  - **Gemini 2.5 Flash**: Google Maps Grounding and location-based reasoning.
- **Persistence**: Browser LocalStorage for sessions and custom phrase vaults.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/speakease.git
   cd speakease
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   API_KEY=your_gemini_api_key_here
   ```

4. **Launch development server**
   ```bash
   npm run dev
   ```

## 📱 Mobile Deployment
SpeakEase is optimized for PWA (Progressive Web App) standards. For a native feel:
1. Open in mobile browser.
2. Select "Add to Home Screen".
3. The app will launch in full-screen mode without browser UI.

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Developed with ❤️ for a more inclusive world.*
