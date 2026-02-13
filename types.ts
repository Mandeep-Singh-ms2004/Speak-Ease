
export interface AppLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  authMethod: 'google' | 'phone' | 'guest';
}

export interface QuickPhrase {
  id: string;
  label: string; // Default English
  translations?: Record<string, string>; // code -> translated text
  icon: string;
  category: 'urgent' | 'social' | 'needs';
}

export interface Message {
  id: string;
  sender: 'user' | 'other';
  text: string;
  timestamp: number;
  type: 'text' | 'voice' | 'sign';
}

export interface LocationData {
  latitude: number;
  longitude: number;
}
