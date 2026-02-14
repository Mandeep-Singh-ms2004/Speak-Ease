
import { QuickPhrase, AppLanguage } from './types';

// Top 10 languages for Quick Access
export const TOP_LANGUAGES: AppLanguage[] = [
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
  { code: 'pt-PT', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
];

// Extended list for prototype
export const EXTENDED_LANGUAGES: AppLanguage[] = [
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
  { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'vi-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
];

export const SUPPORTED_LANGUAGES = [...TOP_LANGUAGES, ...EXTENDED_LANGUAGES];

export const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  'en-US': {
    welcome: 'Hello',
    ready_assist: 'Ready to Assist',
    frequent: 'Quick Messages',
    emergency_sos: 'EMERGENCY SOS',
    manage: 'Manage',
    done: 'Done',
    add_new: 'Add New Message',
    talk_listen_label: 'Talk & Listen',
    sign_label: 'Sign Scan',
    nearby_label: 'Nearby Help',
    type_placeholder: 'Type what you want to say...',
    speak: 'SPEAK',
    listen: 'LISTEN',
    clear: 'CLEAR',
    back: 'BACK HOME',
    heard: 'THEY SAID',
    awaiting_voice: 'Tap LISTEN to hear them...',
    detected: 'DETECTION',
    stop: 'STOP',
    alert_sent: 'ALERT SENT',
    finding_places: 'Locating essential services...',
    voice_settings: 'Voice Settings',
    select_voice: 'Select Voice Personality',
    current_voice: 'CURRENT VOICE',
    voice_label: 'VOICE SETTINGS',
  },
  'hi-IN': {
    welcome: 'नमस्ते',
    ready_assist: 'सहायता के लिए तैयार',
    frequent: 'त्वरित संदेश',
    emergency_sos: 'आपातकालीन SOS',
    manage: 'प्रबंधित करें',
    done: 'हो गया',
    add_new: 'नया संदेश जोड़ें',
    talk_listen_label: 'बोलें और सुनें',
    sign_label: 'संकेत स्कैन',
    nearby_label: 'आस-पास की सहायता',
    type_placeholder: 'वह लिखें जो आप कहना चाहते हैं...',
    speak: 'बोलें',
    listen: 'सुनें',
    clear: 'साफ़ करें',
    back: 'मुख्य पृष्ठ',
    heard: 'उन्होंने कहा',
    awaiting_voice: 'सुनने के लिए "सुनें" दबाएं...',
    detected: 'पहचाना गया',
    stop: 'रुकें',
    alert_sent: 'अलर्ट भेजा गया',
    finding_places: 'जरूरी सेवाओं का पता लगाया जा रहा है...',
    voice_settings: 'आवाज़ सेटिंग्स',
    select_voice: 'आवाज़ चुनें',
    current_voice: 'वर्तमान आवाज़',
    voice_label: 'आवाज़ सेटिंग्स',
  },
  'es-ES': {
    welcome: 'Hola',
    ready_assist: 'Listo para ayudar',
    frequent: 'Mensajes rápidos',
    emergency_sos: 'SOS EMERGENCIA',
    manage: 'Gestionar',
    done: 'Hecho',
    add_new: 'Añadir nuevo',
    talk_listen_label: 'Hablar y Escuchar',
    sign_label: 'Escaneo de Señas',
    nearby_label: 'Ayuda Cercana',
    type_placeholder: 'Escribe aquí...',
    speak: 'HABLAR',
    listen: 'ESCUCHAR',
    clear: 'LIMPIAR',
    back: 'VOLVER',
    heard: 'DIJERON',
    awaiting_voice: 'Toca ESCUCHAR...',
    detected: 'DETECCIÓN',
    stop: 'PARAR',
    alert_sent: 'ALERTA ENVIADA',
    finding_places: 'Localizando servicios esenciales...',
    voice_settings: 'Ajustes de Voz',
    select_voice: 'Seleccionar Voz',
    current_voice: 'VOZ ACTUAL',
    voice_label: 'AJUSTES DE VOZ',
  }
};

export interface AppMode {
  id: string;
  label: string;
  translations?: Record<string, string>;
  icon: string;
  color: string;
}

export const APP_MODES: AppMode[] = [
  { 
    id: 'talk_listen', 
    label: 'Talk & Listen', 
    translations: { 
      'hi-IN': 'बोलें और सुनें', 
      'es-ES': 'Hablar y Escuchar',
      'zh-CN': '说与听'
    },
    icon: '💬', 
    color: 'bg-blue-600' 
  },
  { 
    id: 'sign', 
    label: 'Sign Scan', 
    translations: { 
      'hi-IN': 'संकेत स्कैन', 
      'es-ES': 'Escaneo de Señas',
      'zh-CN': '手语扫描'
    },
    icon: '🤟', 
    color: 'bg-purple-600' 
  },
  { 
    id: 'nearby', 
    label: 'Nearby Help', 
    translations: { 
      'hi-IN': 'आस-पास की सहायता', 
      'es-ES': 'Ayuda Cercana',
      'zh-CN': '附近帮助'
    },
    icon: '📍', 
    color: 'bg-emerald-600' 
  },
];

export const QUICK_PHRASES: QuickPhrase[] = [
  { id: '1', label: 'I need help', translations: { 'hi-IN': 'मुझे मदद चाहिए', 'es-ES': 'Necesito ayuda', 'zh-CN': '我需要帮助' }, icon: '🆘', category: 'urgent' },
  { id: '2', label: 'Thank you', translations: { 'hi-IN': 'धन्यवाद', 'es-ES': 'Gracias', 'zh-CN': '谢谢' }, icon: '🙏', category: 'social' },
  { id: '3', label: 'Where is the washroom?', translations: { 'hi-IN': 'वॉशरूम कहाँ है?', 'es-ES': '¿Dónde está el baño?', 'zh-CN': '洗手间在哪里？' }, icon: '🚽', category: 'needs' },
  { id: '4', label: 'I cannot hear/speak', translations: { 'hi-IN': 'मैं सुन/बोल नहीं सकता', 'es-ES': 'No puedo oír/hablar', 'zh-CN': '我听不见/不会说话' }, icon: '🧏', category: 'social' },
];
