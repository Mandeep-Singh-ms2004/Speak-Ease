# SpeakEase - Accessibility Communication Suite
*Empowering People who are Deaf, Mute, or Both*

## 1. Concept Overview
SpeakEase is a mobile-first communication bridge designed to eliminate the isolation faced by individuals with speech and hearing impairments. By combining high-speed AI vision for sign language and real-time audio transcription, it allows for seamless interaction with the hearing world.

## 2. Feature Breakdown
### Core Features (Phase 1)
- **Real-time Text-to-Speech (TTS):** Converts typed text into natural-sounding speech in regional accents.
- **Dynamic Speech-to-Text (STT):** Transcribes ambient audio into large-format text, automatically translated into the user's primary language.
- **Sign Language Recognition (ISL):** Uses Gemini Vision to interpret Indian Sign Language (ISL) gestures into spoken/written word.
- **Emergency SOS:** One-tap alert system that sends GPS location and a distress message to emergency contacts.
- **Quick Actions:** Tile-based dashboard for common phrases (e.g., "Where is the station?", "I am allergic to peanuts").

### Advanced Features (Phase 2)
- **AI Duo (Conversation Mode):** An AI-mediated back-and-forth chat screen that helps structure sentences and keep context.
- **Phrase Vault:** Ability to save and categorize custom phrases for instant playback.
- **Regional Support:** Deep integration with Hindi, Bengali, Tamil, and other Indian regional languages.
- **High-Contrast Dark Mode:** Specialized UI for low-light environments and users with visual sensitivities.

## 3. Technical Architecture
- **Frontend Framework:** React Native (Production) / React (Prototype).
- **Styling:** Tailwind CSS (NativeWind for mobile) for rapid, accessible UI development.
- **AI Core:** 
    - **Google Gemini 3 Flash:** Multimodal analysis for Sign Language and text contextualization.
    - **Web Speech API / Google Cloud TTS:** For high-fidelity voice synthesis.
- **Real-time Data:** Firebase Firestore for low-latency synchronization of saved phrases and profile settings.
- **Location:** Native Geolocation API with Google Maps Grounding for place discovery.

## 4. Database Design (Firebase/NoSQL)
### `users` (Collection)
```json
{
  "uid": "string",
  "displayName": "string",
  "primaryLanguage": "hi-IN",
  "emergencyContacts": [
    { "name": "Mom", "phone": "+91 987..." }
  ],
  "themePreference": "dark",
  "createdAt": "timestamp"
}
```

### `saved_phrases` (Collection)
```json
{
  "id": "string",
  "userId": "string",
  "label": "Help me cross the road",
  "category": "urgent",
  "usageCount": 12
}
```

## 5. Folder Structure
```text
/root
├── App.tsx             # Main entry point & Navigation
├── components/         # Atomic UI components
│   ├── Button.tsx      # Large-format accessible buttons
│   ├── ModeCard.tsx    # Home screen navigation tiles
│   └── ChatBubble.tsx  # Optimized text displays
├── services/           # Business logic & API integrations
│   ├── gemini.ts       # AI Vision & Chat logic
│   ├── speech.ts       # TTS/STT wrappers
│   └── location.ts     # GPS & Maps integration
├── constants/          # i18n strings and app config
├── types/              # TypeScript definitions
└── assets/             # Icons and local model files
```

## 6. 12-Week Development Plan
1.  **Week 1-2:** UI/UX wireframing and base navigation setup.
2.  **Week 3-4:** Core TTS/STT integration with i18n support.
3.  **Week 5-6:** SOS system, Geolocation, and Firebase authentication.
4.  **Week 7-8:** Sign Language Vision module development (Gemini API integration).
5.  **Week 9-10:** Advanced AI Chat mode and "Phrase Vault" features.
6.  **Week 11:** Accessibility auditing (WCAG 2.1) and beta testing with the target community.
7.  **Week 12:** Optimization for Android (App Store deployment).

## 7. Scalability & Future Growth
- **Haptic Feedback Integration:** Wearable watch app for vibration alerts when someone speaks behind the user.
- **AR Glasses Extension:** Projecting real-time captions directly into the user's field of view.
- **Offline ML Models:** Moving from API-based recognition to edge computing (Mediapipe) for 100% offline sign detection.
- **B2B Integration:** White-labeled versions for hospitals and transport hubs.
