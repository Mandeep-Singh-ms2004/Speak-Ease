
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppLanguage, User, QuickPhrase } from './types';
import { QUICK_PHRASES, APP_MODES, TOP_LANGUAGES, SUPPORTED_LANGUAGES, AppMode, UI_TRANSLATIONS } from './constants';
import { interpretSignLanguage, translateText, getLanguageFromLocation, fetchUITranslations, findLanguageDetails, transliterateText, getNearbyPlaces, reverseGeocode } from './services/geminiService';

type Theme = 'light' | 'dark' | 'system';
type AuthStep = 'select' | 'phone' | 'otp';

// --- Reusable Animated Layout Component ---
const FadeIn: React.FC<{ children: React.ReactNode, delay?: string }> = ({ children, delay = '0ms' }) => (
  <div className="animate-fade-in" style={{ animationDelay: delay }}>
    {children}
  </div>
);

const SlideUp: React.FC<{ children: React.ReactNode, delay?: string }> = ({ children, delay = '0ms' }) => (
  <div className="animate-slide-up" style={{ animationDelay: delay }}>
    {children}
  </div>
);

// --- Custom Modal Component ---
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-slide-up p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500">✕</button>
        </div>
        <div className="w-full h-full max-h-[60vh] overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

// --- Theme Switcher ---
const ThemeSwitcher: React.FC<{ theme: Theme, onThemeChange: (t: Theme) => void }> = ({ theme, onThemeChange }) => {
  const themes: { id: Theme, icon: string, label: string }[] = [
    { id: 'light', icon: '☀️', label: 'Light' },
    { id: 'dark', icon: '🌙', label: 'Dark' },
    { id: 'system', icon: '🌓', label: 'Auto' },
  ];

  return (
    <div className="flex bg-gray-100/50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-gray-200/50 dark:border-slate-700/50">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => onThemeChange(t.id)}
          className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 ${
            theme === t.id 
              ? 'bg-white dark:bg-slate-600 shadow-xl scale-110 ring-2 ring-indigo-500/20' 
              : 'opacity-40 hover:opacity-100'
          }`}
        >
          <span className="text-lg">{t.icon}</span>
        </button>
      ))}
    </div>
  );
};

const LanguageSelector: React.FC<{
  currentLang: AppLanguage,
  allLanguages: AppLanguage[],
  onLangChange: (l: AppLanguage) => void,
  onAddLang: () => void
}> = ({ currentLang, allLanguages, onLangChange, onAddLang }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeBtn = scrollRef.current?.querySelector(`[data-lang="${currentLang.code}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentLang, allLanguages]);

  return (
    <div className="glass border-b border-gray-100/50 dark:border-slate-800/50 flex items-center shrink-0">
      <div 
        ref={scrollRef}
        className="flex-1 flex overflow-x-auto py-4 px-4 space-x-3 no-scrollbar scroll-smooth"
      >
        {allLanguages.map((l) => (
          <button
            key={l.code}
            data-lang={l.code}
            onClick={() => onLangChange(l)}
            className={`flex-shrink-0 px-6 py-2.5 rounded-2xl text-[11px] font-extrabold transition-all border-2 ${
              currentLang.code === l.code
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl scale-105'
                : 'bg-white dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 border-gray-100 dark:border-slate-800 hover:border-indigo-200'
            }`}
          >
            {l.nativeName}
          </button>
        ))}
      </div>
      <button 
        onClick={onAddLang}
        className="px-6 py-4 text-indigo-600 dark:text-indigo-400 font-black text-2xl hover:scale-125 transition-transform"
      >
        ＋
      </button>
    </div>
  );
};

const Header: React.FC<{ 
  currentLang: AppLanguage, 
  user: User | null,
  onLogout: () => void,
  theme: Theme,
  onThemeChange: (t: Theme) => void,
  t: (k: string, f: string) => string
}> = ({ currentLang, user, onLogout, theme, onThemeChange, t }) => (
  <header className="glass px-6 py-4 flex items-center justify-between border-b border-gray-100/50 dark:border-slate-800/50 shrink-0">
    <div className="flex items-center space-x-4">
      <button onClick={onLogout} className="relative group active:scale-90 transition-transform">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-xl overflow-hidden">
          {user?.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : user?.name.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
      </button>
      <div className="flex flex-col">
        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">SpeakEase</h1>
        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-0.5">{currentLang.name}</span>
      </div>
    </div>
    <ThemeSwitcher theme={theme} onThemeChange={onThemeChange} />
  </header>
);

const App: React.FC = () => {
  // --- Core States ---
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('speakease-user');
    return saved ? JSON.parse(saved) : null;
  });

  const [lang, setLang] = useState<AppLanguage>(TOP_LANGUAGES[0]); 
  const [availableLanguages, setAvailableLanguages] = useState<AppLanguage[]>(SUPPORTED_LANGUAGES);
  const [dynamicTranslations, setDynamicTranslations] = useState<Record<string, string>>({});
  const [isTranslatingUI, setIsTranslatingUI] = useState(false);
  const [currentMode, setCurrentMode] = useState<'home' | 'talk_listen' | 'sign' | 'nearby'>('home');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSignLoading, setIsSignLoading] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('speakease-theme') as Theme) || 'system');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => localStorage.getItem('speakease-voice-uri') || '');
  const [customPhrases, setCustomPhrases] = useState<QuickPhrase[]>(() => {
    const saved = localStorage.getItem('speakease-custom-phrases');
    return saved ? JSON.parse(saved) : QUICK_PHRASES;
  });
  const [isManagingPhrases, setIsManagingPhrases] = useState(false);

  // --- Feature States ---
  const [authStep, setAuthStep] = useState<AuthStep>('select');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isPhoneticEnabled, setIsPhoneticEnabled] = useState(false);
  const [keyboardSuggestions, setKeyboardSuggestions] = useState<string[]>([]);
  const [nearbyResults, setNearbyResults] = useState<{ text: string, links: any[] } | null>(null);
  const [isNearbyLoading, setIsNearbyLoading] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [modalType, setModalType] = useState<'add_lang' | 'add_phrase' | 'voice_settings' | 'none'>('none');
  const [modalInput, setModalInput] = useState('');
  
  const transliterateDebounceRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveScanTimerRef = useRef<any>(null);

  // --- Translation Logic ---
  const t = useMemo(() => (key: string, fallback: string) => {
    if (dynamicTranslations[key]) return dynamicTranslations[key];
    const hardcoded = UI_TRANSLATIONS[lang.code]?.[key];
    if (hardcoded) return hardcoded;
    const english = UI_TRANSLATIONS['en-US']?.[key];
    return english || fallback;
  }, [lang, dynamicTranslations]);

  useEffect(() => {
    const fetchDynamic = async () => {
      if (UI_TRANSLATIONS[lang.code]) {
        setDynamicTranslations({});
        return;
      }
      setIsTranslatingUI(true);
      const baseStrings = UI_TRANSLATIONS['en-US'];
      const keys = Object.keys(baseStrings);
      const values = Object.values(baseStrings);
      try {
        const translations = await fetchUITranslations(lang.name, keys, values);
        setDynamicTranslations(translations);
      } catch (err) { console.error(err); } 
      finally { setIsTranslatingUI(false); }
    };
    fetchDynamic();
  }, [lang]);

  // Handle available voices
  useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Filter voices for current language
  const languageVoices = useMemo(() => {
    return availableVoices.filter(v => v.lang.startsWith(lang.code.split('-')[0]));
  }, [availableVoices, lang]);

  // Current voice display name
  const currentVoiceName = useMemo(() => {
    const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
    return voice ? voice.name : 'System Default';
  }, [availableVoices, selectedVoiceURI]);

  // --- Side Effects ---
  useEffect(() => {
    localStorage.setItem('speakease-custom-phrases', JSON.stringify(customPhrases));
  }, [customPhrases]);

  useEffect(() => {
    if (user) localStorage.setItem('speakease-user', JSON.stringify(user));
    else localStorage.removeItem('speakease-user');
  }, [user]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem('speakease-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (selectedVoiceURI) localStorage.setItem('speakease-voice-uri', selectedVoiceURI);
  }, [selectedVoiceURI]);

  // Reset inputs when switching modes
  useEffect(() => {
    setTranscript('');
    setInputText('');
    setKeyboardSuggestions([]);
    setIsListening(false);
    setIsLiveScanning(false);
  }, [currentMode]);

  // Handle camera for Sign Language mode
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (currentMode === 'sign' && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => console.error("Camera access denied:", err));
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentMode]);

  // Handle live scanning interval for sign mode
  useEffect(() => {
    if (isLiveScanning && currentMode === 'sign') {
      liveScanTimerRef.current = setInterval(() => {
        captureAndInterpret();
      }, 5000); 
    } else {
      if (liveScanTimerRef.current) clearInterval(liveScanTimerRef.current);
    }
    return () => {
      if (liveScanTimerRef.current) clearInterval(liveScanTimerRef.current);
    };
  }, [isLiveScanning, currentMode]);

  // --- App Actions ---
  const loginWithGoogle = () => {
    setIsAuthLoading(true);
    setTimeout(() => {
      setUser({ id: 'google-' + Date.now(), name: 'Alex Johnson', photoURL: 'https://i.pravatar.cc/150?u=alex', authMethod: 'google' });
      setIsAuthLoading(false);
    }, 1500);
  };

  const loginAsGuest = () => {
    setIsAuthLoading(true);
    setTimeout(() => {
      setUser({ id: 'guest-' + Date.now(), name: 'Guest User', authMethod: 'guest' });
      setIsAuthLoading(false);
    }, 800);
  };

  const logout = () => {
    setUser(null);
    setAuthStep('select');
    setCurrentMode('home');
  };

  const speak = async (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang.code;
    utterance.rate = 1.0;
    
    // Select preferred voice
    let voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
    if (!voice) {
      // Fallback to language default
      voice = availableVoices.find(v => v.lang.startsWith(lang.code.split('-')[0])) || availableVoices[0];
    }
    
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
    if ("vibrate" in navigator) navigator.vibrate(50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setInputText(newVal);
    if (isPhoneticEnabled) {
      if (transliterateDebounceRef.current) clearTimeout(transliterateDebounceRef.current);
      const lastWord = newVal.split(/\s+/).pop();
      if (lastWord && lastWord.length > 2) {
        transliterateDebounceRef.current = setTimeout(async () => {
          const suggested = await transliterateText(lastWord, lang.name);
          if (suggested !== lastWord) setKeyboardSuggestions([suggested]);
          else setKeyboardSuggestions([]);
        }, 600);
      } else setKeyboardSuggestions([]);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; 
    recognition.onstart = () => { setIsListening(true); setTranscript(""); };
    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setIsTranslating(true);
      const translated = await translateText(text, lang.name);
      setTranscript(translated);
      setIsTranslating(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const captureAndInterpret = async () => {
    if (!videoRef.current || !canvasRef.current || isSignLoading) return;
    setIsSignLoading(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const result = await interpretSignLanguage(blob, lang.name);
            setTranscript(result);
          }
          setIsSignLoading(false);
        }, 'image/jpeg', 0.8);
      } else {
        setIsSignLoading(false);
      }
    } catch (error) {
      console.error("Sign capture error:", error);
      setIsSignLoading(false);
    }
  };

  const fetchNearby = () => {
    setIsNearbyLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setCurrentCoords({ lat: latitude, lng: longitude });
      const results = await getNearbyPlaces(latitude, longitude, lang.name);
      setNearbyResults(results);
      setIsNearbyLoading(false);
    }, () => {
      setNearbyResults({ text: "Please enable location.", links: [] });
      setIsNearbyLoading(false);
    });
  };

  // --- Auth Views ---
  const renderAuth = () => (
    <div className="flex-1 flex flex-col bg-slate-950 p-10 space-y-12 items-center justify-center overflow-hidden">
      <SlideUp>
        <div className="flex flex-col items-center space-y-6">
          <div className="text-[100px] animate-bounce-gentle">🤟</div>
          <div className="text-center">
            <h1 className="text-6xl font-black text-white tracking-tighter">SpeakEase</h1>
            <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-[10px] mt-2">Connecting Worlds</p>
          </div>
        </div>
      </SlideUp>

      <div className="w-full max-w-sm space-y-6">
        {isAuthLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Verifying credentials...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={loginWithGoogle} className="w-full bg-white text-slate-950 p-6 rounded-[2.5rem] font-black text-lg shadow-2xl flex items-center justify-center space-x-4 active:scale-95 transition-all bento-card">
              <img src="https://www.google.com/favicon.ico" alt="" className="w-6 h-6" />
              <span>Google One-Tap</span>
            </button>
            <button onClick={() => setAuthStep('phone')} className="w-full bg-slate-900 text-white border border-slate-800 p-6 rounded-[2.5rem] font-black text-lg flex items-center justify-center space-x-4 active:scale-95 transition-all bento-card">
              <span>📱 Phone Login</span>
            </button>
            {/* Fixed the invalid 'loginAsGuest' attribute from the button element */}
            <button className="w-full text-slate-600 p-4 font-black text-xs uppercase tracking-[0.3em] hover:text-white transition-colors" onClick={loginAsGuest}>
              Continue as Guest
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // --- Main Mode Views ---
  const renderHome = () => (
    <div className="p-6 space-y-6 pb-24 min-h-full">
      <header className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tight dark:text-white">
            {t('welcome', 'Hello')}, {user?.name.split(' ')[0]}
            {isTranslatingUI && <span className="ml-2 w-2 h-2 inline-block bg-indigo-500 rounded-full animate-ping" />}
          </h2>
          <p className="text-gray-400 font-bold text-[11px] uppercase tracking-[0.2em]">{t('ready_assist', 'Ready to Assist')}</p>
        </div>
      </header>

      {/* Voice Selection Chip (Replacing Location Chip) */}
      <SlideUp delay="50ms">
        <button 
          onClick={() => setModalType('voice_settings')}
          className="w-full glass dark:bg-slate-900/60 p-4 px-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-xl flex items-center justify-between group overflow-hidden relative bento-card text-left"
        >
          <div className="flex items-center space-x-4 z-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              🔊
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">{t('voice_label', 'VOICE SETTINGS')}</span>
              <span className="text-sm font-black text-gray-800 dark:text-white tracking-tight truncate max-w-[200px]">
                {currentVoiceName}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-all z-10">
            ⚙️
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
        </button>
      </SlideUp>

      {/* Bento Grid Layout */}
      <section className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setCurrentMode('talk_listen')}
          className="col-span-2 bg-blue-600 p-8 rounded-[3rem] text-white flex items-center justify-between shadow-2xl shadow-blue-500/30 bento-card border-b-8 border-blue-800"
        >
          <div className="space-y-2 text-left">
            <span className="text-4xl">💬</span>
            <div className="flex flex-col">
              <h3 className="text-2xl font-black tracking-tighter leading-none">{t('talk_listen_label', 'Talk & Listen')}</h3>
              <p className="text-blue-100/60 text-[10px] font-bold uppercase tracking-widest">STT • TTS • REALTIME</p>
            </div>
          </div>
          <span className="text-4xl opacity-50">→</span>
        </button>

        <button 
          onClick={() => setCurrentMode('sign')}
          className="bg-purple-600 p-6 rounded-[2.5rem] text-white flex flex-col items-center justify-center space-y-3 shadow-2xl shadow-purple-500/30 bento-card border-b-8 border-purple-800"
        >
          <span className="text-5xl">🤟</span>
          <span className="text-xs font-black uppercase tracking-tighter">{t('sign_label', 'Sign Scan')}</span>
        </button>

        <button 
          onClick={() => setCurrentMode('nearby')}
          className="bg-emerald-600 p-6 rounded-[2.5rem] text-white flex flex-col items-center justify-center space-y-3 shadow-2xl shadow-emerald-500/30 bento-card border-b-8 border-emerald-800"
        >
          <span className="text-5xl">📍</span>
          <span className="text-xs font-black uppercase tracking-tighter">{t('nearby_label', 'Nearby Help')}</span>
        </button>
      </section>

      {/* Quick Phrases Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-end px-2">
          <h3 className="text-gray-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest">{t('frequent', 'Quick Messages')}</h3>
          <button onClick={() => setIsManagingPhrases(!isManagingPhrases)} className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-4 py-1.5 rounded-full uppercase tracking-widest">
            {isManagingPhrases ? t('done', 'DONE') : t('manage', 'EDIT')}
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {customPhrases.map((phrase, i) => (
            <SlideUp key={phrase.id} delay={`${i * 100}ms`}>
              <div className="relative">
                <button
                  onClick={() => !isManagingPhrases && speak(getPhraseLabel(phrase))}
                  className={`w-full glass dark:bg-slate-900/50 p-6 rounded-[2.5rem] flex items-center justify-between shadow-lg border border-gray-100 dark:border-slate-800 bento-card ${!isManagingPhrases ? 'active:bg-indigo-50 dark:active:bg-indigo-900/20' : ''}`}
                >
                  <div className="flex items-center space-x-6">
                    <span className="text-3xl w-14 h-14 flex items-center justify-center bg-gray-100 dark:bg-slate-800 rounded-3xl group-hover:scale-110 transition-transform">{phrase.icon}</span>
                    <span className="font-extrabold text-gray-800 dark:text-slate-100 text-lg tracking-tight">{getPhraseLabel(phrase)}</span>
                  </div>
                  {!isManagingPhrases && <div className="w-10 h-10 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-500">🔊</div>}
                </button>
                {isManagingPhrases && (
                  <button onClick={() => deletePhrase(phrase.id)} className="absolute -top-2 -right-2 bg-red-500 text-white w-10 h-10 rounded-full shadow-2xl font-bold flex items-center justify-center z-10">✕</button>
                )}
              </div>
            </SlideUp>
          ))}
          {isManagingPhrases && (
            <button onClick={() => { setModalType('add_phrase'); setModalInput(''); }} className="w-full border-4 border-dashed border-gray-200 dark:border-slate-800 p-8 rounded-[3rem] font-black text-gray-400 uppercase tracking-widest text-[11px] hover:border-indigo-500 transition-colors">
              + {t('add_new', 'New phrase')}
            </button>
          )}
        </div>
      </section>

      <SlideUp delay="400ms">
        <button 
          onClick={() => { if("vibrate" in navigator) navigator.vibrate([100, 100, 100]); alert('SOS Triggered!'); }}
          className="w-full bg-red-600 p-10 rounded-[3rem] text-white flex flex-col items-center shadow-[0_0_50px_rgba(220,38,38,0.4)] border-b-[10px] border-red-900 active:scale-95 transition-all bento-card"
        >
          <span className="text-7xl mb-2">🆘</span>
          <span className="text-xl font-black tracking-widest uppercase">{t('emergency_sos', 'Emergency SOS')}</span>
        </button>
      </SlideUp>
    </div>
  );

  const renderTalkListen = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 p-4 space-y-4">
      {/* Dynamic Display Area */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Listen (Received) Area */}
        <div className="h-[45%] glass dark:bg-slate-900/60 rounded-[3rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity">
            <span className="text-8xl">👂</span>
          </div>
          {isTranslating ? (
            <div className="space-y-4 flex flex-col items-center">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" />
                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce delay-150" />
                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce delay-300" />
              </div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Translating voice...</p>
            </div>
          ) : transcript ? (
            <div className="space-y-6 w-full animate-fade-in">
              <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.3em]">{t('heard', 'THEY SAID')}</p>
              <h2 className="text-5xl font-black dark:text-white leading-none tracking-tighter">{transcript}</h2>
              <button onClick={() => speak(transcript)} className="px-8 py-3 bg-indigo-500/10 text-indigo-500 rounded-full font-black uppercase text-[10px] tracking-widest">🔊 {t('speak', 'REPLAY')}</button>
            </div>
          ) : (
            <div className="space-y-3 z-10">
              <p className="text-2xl font-black text-slate-300 dark:text-slate-700 tracking-tighter px-10">{t('awaiting_voice', 'Tap LISTEN to hear them...')}</p>
            </div>
          )}
        </div>

        {/* Talk (Output) Area */}
        <div className="h-[55%] flex flex-col relative group">
          <div className="absolute top-6 right-6 z-10 flex items-center space-x-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isPhoneticEnabled ? 'Phonetic On' : 'Standard'}</span>
            <button onClick={() => setIsPhoneticEnabled(!isPhoneticEnabled)} className={`w-12 h-6 rounded-full transition-all relative ${isPhoneticEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPhoneticEnabled ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <textarea 
            autoFocus 
            value={inputText} 
            onChange={handleInputChange} 
            placeholder={t('type_placeholder', 'What do you want to say?')}
            className="flex-1 glass dark:bg-slate-900/60 p-10 text-3xl font-black border-none rounded-[3rem] dark:text-white focus:ring-8 focus:ring-indigo-500/10 shadow-2xl resize-none placeholder:text-slate-300 dark:placeholder:text-slate-800 transition-all"
          />

          {keyboardSuggestions.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 animate-slide-up">
              {keyboardSuggestions.map((s, idx) => (
                <button key={idx} onClick={() => applySuggestion(s)} className="bg-indigo-600 text-white px-8 py-4 rounded-3xl font-black text-lg shadow-2xl shadow-indigo-500/40 active:scale-95 transition-transform">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 h-32">
        <button onClick={startListening} className={`${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-600'} text-white rounded-[2.5rem] font-black text-2xl shadow-2xl bento-card border-b-8 ${isListening ? 'border-red-800' : 'border-green-800'}`}>
          {isListening ? t('stop', 'STOP') : t('listen', 'LISTEN')}
        </button>
        <button onClick={() => speak(inputText)} className="bg-blue-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl bento-card border-b-8 border-blue-800">
          {t('speak', 'SPEAK')}
        </button>
      </div>

      <button onClick={() => setCurrentMode('home')} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] py-4">{t('back', '← BACK HOME')}</button>
    </div>
  );

  const renderSign = () => (
    <div className="flex flex-col h-full bg-slate-950 p-4 space-y-4">
      <div className="relative flex-1 bg-black rounded-[3rem] overflow-hidden shadow-[0_0_80px_rgba(147,51,234,0.3)]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 border-[20px] border-white/5 pointer-events-none rounded-[3rem]" />
        
        {(isSignLoading || isLiveScanning) && (
          <div className="absolute top-10 right-10 bg-indigo-600/90 backdrop-blur-xl text-white px-6 py-2 rounded-full text-[10px] font-black tracking-widest flex items-center space-x-3 shadow-2xl">
            <span className="w-2 h-2 bg-white rounded-full animate-ping" />
            <span>{isLiveScanning ? 'LIVE SCAN ACTIVE' : 'RECOGNIZING...'}</span>
          </div>
        )}
      </div>

      <div className="h-1/3 glass dark:bg-slate-900 rounded-[3rem] p-10 shadow-2xl border border-white/5 space-y-4">
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">{t('detected', 'TRANSLATED GESTURE')}</p>
        <h2 className="text-5xl font-black dark:text-white leading-none tracking-tighter break-words">
          {transcript || <span className="text-slate-700">Waiting for signs...</span>}
        </h2>
        {transcript && <button onClick={() => speak(transcript)} className="text-indigo-500 font-black uppercase text-[11px] tracking-widest bg-indigo-500/10 px-6 py-2 rounded-full">🔊 {t('speak', 'SPEAK RESULT')}</button>}
      </div>

      <div className="grid grid-cols-2 gap-4 h-24 shrink-0">
        <button onClick={captureAndInterpret} disabled={isSignLoading} className="bg-purple-600 text-white rounded-[2rem] font-black text-xl shadow-xl bento-card border-b-4 border-purple-800 disabled:opacity-30">SNAP</button>
        <button onClick={() => setIsLiveScanning(!isLiveScanning)} className={`${isLiveScanning ? 'bg-red-500' : 'bg-indigo-600'} text-white rounded-[2rem] font-black text-xl shadow-xl bento-card border-b-4 ${isLiveScanning ? 'border-red-800' : 'border-indigo-800'}`}>
          {isLiveScanning ? 'STOP' : 'LIVE'}
        </button>
      </div>

      <button onClick={() => setCurrentMode('home')} className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] py-4">{t('back', '← BACK HOME')}</button>
    </div>
  );

  const renderNearby = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 p-6 space-y-10 overflow-y-auto pb-32 custom-scrollbar">
      <div className="space-y-2">
        <h2 className="text-5xl font-black dark:text-white tracking-tighter leading-none">{t('nearby_label', 'Places')}</h2>
        {currentCoords && (
          <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-600 px-4 py-1.5 rounded-full w-fit">
            <span className="animate-pulse">📍</span>
            <span className="text-[10px] font-black uppercase tracking-widest">{currentCoords.lat.toFixed(3)}, {currentCoords.lng.toFixed(3)}</span>
          </div>
        )}
      </div>

      {isNearbyLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="w-24 h-24 relative">
            <div className="absolute inset-0 border-8 border-emerald-500/10 rounded-full" />
            <div className="absolute inset-0 border-8 border-t-emerald-500 rounded-full animate-spin" />
          </div>
          <p className="text-slate-400 font-black text-[11px] uppercase tracking-[0.4em] animate-pulse">{t('finding_places', 'SCANNING NEARBY...')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="glass dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-white/5">
            <p className="text-xl font-extrabold dark:text-white leading-relaxed text-slate-700 italic">
              "{nearbyResults?.text}"
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {nearbyResults?.links.map((link, idx) => (
              <SlideUp key={idx} delay={`${idx * 150}ms`}>
                <a 
                  href={link.uri} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] flex items-center justify-between shadow-xl active:scale-95 transition-all bento-card border border-gray-100 dark:border-slate-700"
                >
                  <div className="flex items-center space-x-6">
                    <span className="text-4xl">🗺️</span>
                    <div className="flex flex-col">
                      <span className="font-black text-gray-900 dark:text-white text-lg tracking-tight uppercase leading-none">{link.title || 'View Place'}</span>
                      <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-1">Open Directions</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">↗</div>
                </a>
              </SlideUp>
            ))}
          </div>

          <button onClick={fetchNearby} className="w-full bg-gray-200 dark:bg-slate-800/50 p-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.4em] text-gray-500 active:scale-95 transition-all">
            Refresh Map
          </button>
        </div>
      )}

      <button onClick={() => setCurrentMode('home')} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] py-4">{t('back', '← BACK HOME')}</button>
    </div>
  );

  const getPhraseLabel = (phrase: QuickPhrase) => phrase.translations?.[lang.code] || phrase.label;
  const deletePhrase = (id: string) => setCustomPhrases(customPhrases.filter(p => p.id !== id));
  const applySuggestion = (suggestion: string) => {
    const words = inputText.split(/\s+/);
    words.pop();
    setInputText((words.join(' ') + ' ' + suggestion).trim() + ' ');
    setKeyboardSuggestions([]);
    if ("vibrate" in navigator) navigator.vibrate(30);
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-white dark:bg-slate-950 flex flex-col antialiased relative shadow-[0_0_100px_rgba(0,0,0,0.1)]">
      <div className="sticky top-0 z-50">
        {user && <Header currentLang={lang} user={user} onLogout={logout} theme={theme} onThemeChange={setTheme} t={t} />}
        <LanguageSelector currentLang={lang} allLanguages={availableLanguages} onLangChange={setLang} onAddLang={() => { setModalType('add_lang'); setModalInput(''); }} />
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {!user ? renderAuth() : (
          <FadeIn>
            {currentMode === 'home' && renderHome()}
            {currentMode === 'talk_listen' && renderTalkListen()}
            {currentMode === 'sign' && renderSign()}
            {currentMode === 'nearby' && renderNearby()}
          </FadeIn>
        )}
      </main>
      
      {/* Dynamic Status Bar */}
      <div className="glass px-8 py-4 flex justify-between border-t border-gray-100/50 dark:border-slate-800/50 shrink-0">
        <div className="flex items-center space-x-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Ready</span>
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SpeakEase V8.0 Interactive</span>
      </div>

      {/* Shared Modals */}
      <Modal isOpen={modalType === 'add_lang'} onClose={() => setModalType('none')} title="Add Language">
        <div className="space-y-6">
          <input type="text" autoFocus value={modalInput} onChange={(e) => setModalInput(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 p-8 rounded-[2rem] border-none font-black text-2xl dark:text-white shadow-inner" placeholder="Icelandic..." />
          <button onClick={async () => {
            if (!modalInput) return;
            setIsTranslatingUI(true);
            const details = await findLanguageDetails(modalInput);
            if (details) {
              setAvailableLanguages(p => [...p.filter(l => l.code !== details.code), details]);
              setLang(details);
            }
            setModalType('none');
            setIsTranslatingUI(false);
          }} className="w-full bg-indigo-600 text-white p-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl">Identify & Add</button>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'add_phrase'} onClose={() => setModalType('none')} title="Quick Message">
        <div className="space-y-6">
          <textarea autoFocus value={modalInput} onChange={(e) => setModalInput(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 p-8 rounded-[2rem] border-none font-black text-2xl dark:text-white shadow-inner h-48 resize-none" placeholder="Type message..." />
          <button onClick={() => {
            if (!modalInput) return;
            setCustomPhrases([...customPhrases, { id: Date.now().toString(), label: modalInput, icon: '💬', category: 'social' }]);
            setModalType('none');
          }} className="w-full bg-indigo-600 text-white p-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl">Save Message</button>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'voice_settings'} onClose={() => setModalType('none')} title={t('voice_settings', 'Voice Settings')}>
        <div className="space-y-4">
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">{t('select_voice', 'Select Voice Personality')}</p>
          <div className="space-y-2">
            {languageVoices.length === 0 ? (
              <p className="text-slate-400 font-bold text-sm italic py-4">No specific voices found for this language. Using system default.</p>
            ) : (
              languageVoices.map((voice) => (
                <button
                  key={voice.voiceURI}
                  onClick={() => {
                    setSelectedVoiceURI(voice.voiceURI);
                    speak("Test Voice Activated");
                  }}
                  className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${
                    selectedVoiceURI === voice.voiceURI
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                      : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-transparent hover:border-indigo-300'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-black text-sm">{voice.name}</span>
                    <span className={`text-[9px] uppercase tracking-widest ${selectedVoiceURI === voice.voiceURI ? 'text-indigo-100' : 'text-slate-400'}`}>{voice.lang}</span>
                  </div>
                  {selectedVoiceURI === voice.voiceURI && <span>✓</span>}
                </button>
              ))
            )}
            <button
              onClick={() => {
                setSelectedVoiceURI('');
                speak("Default Voice Selected");
              }}
              className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all mt-4 ${
                selectedVoiceURI === ''
                  ? 'bg-slate-600 text-white border-slate-600 shadow-lg'
                  : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-transparent hover:border-slate-300'
              }`}
            >
              <span className="font-black text-sm">System Default</span>
              {selectedVoiceURI === '' && <span>✓</span>}
            </button>
          </div>
          <button onClick={() => setModalType('none')} className="w-full bg-indigo-600 text-white p-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl mt-6">{t('done', 'Done')}</button>
        </div>
      </Modal>
    </div>
  );
};

export default App;
