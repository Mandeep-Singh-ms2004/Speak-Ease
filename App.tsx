
import React, { useState, useEffect, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppLanguage, User, QuickPhrase, EmergencyContact } from './types';
import { QUICK_PHRASES, TOP_LANGUAGES, SUPPORTED_LANGUAGES, UI_TRANSLATIONS } from './constants';
import { interpretSignLanguage, translateText, findLanguageDetails, getNearbyPlaces } from './services/geminiService';

type Mode = 'home' | 'talk_listen' | 'sign' | 'sos' | 'nearby' | 'settings';

// --- Error Boundary ---
interface BoundaryProps { children: ReactNode; fallback: ReactNode; }
interface BoundaryState { hasError: boolean; }
class StandardErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  public state: BoundaryState = { hasError: false };
  public static getDerivedStateFromError(_: Error): BoundaryState { return { hasError: true }; }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("App error:", error, errorInfo); }
  public render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// --- Animation & UI Wrappers ---
const FadeIn: React.FC<{ children: React.ReactNode, delay?: string }> = ({ children, delay = '0ms' }) => (
  <div className="animate-fade-in" style={{ opacity: 0, animation: `fade-in 0.3s ease-in forwards`, animationDelay: delay }}>{children}</div>
);

const SlideUp: React.FC<{ children: React.ReactNode, delay?: string }> = ({ children, delay = '0ms' }) => (
  <div className="animate-slide-up" style={{ transform: 'translateY(20px)', opacity: 0, animation: `slide-up 0.5s ease-out forwards`, animationDelay: delay }}>{children}</div>
);

const Waveform: React.FC<{ color?: string, active?: boolean }> = ({ color = 'bg-indigo-500', active = true }) => (
  <div className="flex items-end justify-center gap-1 h-8 px-2">
    {[...Array(8)].map((_, i) => (
      <div 
        key={i} 
        className={`w-1 rounded-full ${color} ${active ? 'sound-bar' : ''}`} 
        style={{ 
          animationDelay: `${i * 0.1}s`, 
          height: active ? `${Math.random() * 20 + 8}px` : '4px',
          transition: 'height 0.3s ease'
        }}
      />
    ))}
  </div>
);

const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, border?: string }> = ({ isOpen, onClose, title, children, border = 'border-white/10' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className={`bg-slate-900 w-full max-w-lg rounded-[3rem] p-8 border ${border} shadow-2xl space-y-8 animate-slide-up`}>
        <div className="flex justify-between items-center">
          <h3 className="text-3xl font-black tracking-tighter">{title}</h3>
          <button onClick={onClose} className="w-12 h-12 glass rounded-full flex items-center justify-center text-xl">✕</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // --- States ---
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('speakease-user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [lang, setLang] = useState<AppLanguage>(TOP_LANGUAGES[0]);
  const [currentMode, setCurrentMode] = useState<Mode>('home');
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('speakease-onboarded'));
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // UI Interactions
  const [inputText, setInputText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSignLoading, setIsSignLoading] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [recentPhrases, setRecentPhrases] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'hospital' | 'police' | 'pharmacy'>('hospital');
  const [signHistory, setSignHistory] = useState<string[]>([]);
  
  // Nearby Results
  const [nearbyResults, setNearbyResults] = useState<Record<string, { text: string, links: any[] }>>({
    hospital: { text: '', links: [] },
    police: { text: '', links: [] },
    pharmacy: { text: '', links: [] }
  });
  const [isNearbyLoading, setIsNearbyLoading] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number, lng: number } | null>(null);
  
  // SOS States
  const [show911Confirmation, setShow911Confirmation] = useState(false);
  const [emergencyType, setEmergencyType] = useState<'call' | 'text' | null>(null);
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  
  // Settings
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(localStorage.getItem('speakease-voice-uri') || '');
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(() => {
    return user?.emergencyContacts || [{ name: 'Family Alert', phone: '911' }];
  });

  // Global Modals
  const [modalType, setModalType] = useState<'none' | 'add_lang' | 'voice_settings' | 'add_contact'>('none');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sosTimerRef = useRef<any>(null);

  // --- Derived ---
  const currentVoiceName = availableVoices.find(v => v.voiceURI === selectedVoiceURI)?.name || 'System Default';
  const availableLanguages = SUPPORTED_LANGUAGES;

  // --- Effects ---
  useEffect(() => {
    const updateVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.onvoiceschanged = updateVoices;
    updateVoices();
    
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  useEffect(() => {
    if (currentMode === 'nearby' || currentMode === 'sos') {
      fetchLocation();
    }
  }, [currentMode]);

  useEffect(() => {
    if (currentMode === 'nearby' && currentCoords && !nearbyResults[activeFilter].links.length) {
      performSearch();
    }
  }, [currentMode, activeFilter, currentCoords]);

  const fetchLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => console.error("Location access denied.")
    );
  };

  const performSearch = async () => {
    if (!currentCoords) return;
    setIsNearbyLoading(true);
    try {
      const results = await getNearbyPlaces(currentCoords.lat, currentCoords.lng, lang.name);
      setNearbyResults(prev => ({ ...prev, [activeFilter]: results }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsNearbyLoading(false);
    }
  };

  // --- Handlers ---
  const loginWithGoogle = () => {
    setIsAuthLoading(true);
    // Simulate interactive login
    setTimeout(() => {
      const mockUser: User = { 
        id: 'g-1', 
        name: 'Alex Rivera', 
        authMethod: 'google',
        emergencyContacts: [{ name: 'Emergency Family', phone: '911' }]
      };
      setUser(mockUser);
      localStorage.setItem('speakease-user', JSON.stringify(mockUser));
      setIsAuthLoading(false);
    }, 1800);
  };

  const loginAsGuest = () => {
    setIsAuthLoading(true);
    setTimeout(() => {
      const guestUser: User = { id: 'guest-' + Date.now(), name: 'Guest User', authMethod: 'guest' };
      setUser(guestUser);
      localStorage.setItem('speakease-user', JSON.stringify(guestUser));
      setIsAuthLoading(false);
    }, 800);
  };

  const speak = async (text: string, phraseId?: string) => {
    if (!text) return;
    if (phraseId) setPlayingId(phraseId);
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang.code;
    utt.rate = voiceSpeed;
    const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
    if (voice) utt.voice = voice;
    utt.onend = () => setPlayingId(null);
    window.speechSynthesis.speak(utt);
    if (!recentPhrases.includes(text)) {
      setRecentPhrases(prev => [text, ...prev].slice(0, 5));
    }
  };

  const act911 = (type: 'call' | 'text') => {
    setEmergencyType(type);
    setShow911Confirmation(true);
    if (hapticsEnabled && "vibrate" in navigator) navigator.vibrate(200);
  };

  const confirmSOS = () => {
    if (hapticsEnabled && "vibrate" in navigator) navigator.vibrate(300);
    const href = emergencyType === 'call' ? 'tel:911' : `sms:911?body=Emergency at my location: ${currentCoords?.lat}, ${currentCoords?.lng}`;
    window.location.href = href;
    setShow911Confirmation(false);
  };

  const shareLocationWithContacts = () => {
    if (!currentCoords) {
      fetchLocation();
      alert("Fetching location... please try again in a second.");
      return;
    }
    const message = `🆘 EMERGENCY ALERT from SpeakEase\nI need help at Lat: ${currentCoords.lat}, Lng: ${currentCoords.lng}\nMaps: https://maps.google.com/?q=${currentCoords.lat},${currentCoords.lng}`;
    emergencyContacts.forEach(contact => {
      window.open(`sms:${contact.phone}?body=${encodeURIComponent(message)}`);
    });
    if (hapticsEnabled && "vibrate" in navigator) navigator.vibrate([100, 50, 100]);
  };

  const startListening = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.onstart = () => setIsListening(true);
    rec.onresult = async (e: any) => {
      const result = e.results[0][0].transcript;
      const conf = e.results[0][0].confidence;
      setIsTranslating(true);
      const translated = await translateText(result, lang.name);
      setTranscript(translated);
      setConfidence(conf);
      setIsTranslating(false);
    };
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  const handleCapture = async () => {
    if (!videoRef.current || isSignLoading) return;
    setIsSignLoading(true);
    const canvas = canvasRef.current!;
    const video = videoRef.current!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (blob) {
        const result = await interpretSignLanguage(blob, lang.name);
        setTranscript(result);
        setSignHistory(prev => [result, ...prev].slice(0, 5));
      }
      setIsSignLoading(false);
    }, 'image/jpeg');
  };

  // --- View Components ---

  const renderHome = () => (
    <div className="p-6 space-y-10 pb-32 overflow-y-auto custom-scrollbar h-full">
      <header className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tighter">Hello, {user?.name.split(' ')[0]}</h2>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Accessibility Hub</p>
        </div>
        <button onClick={() => setCurrentMode('settings')} className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-xl shadow-lg hover:scale-110 transition-transform">⚙️</button>
      </header>

      {recentPhrases.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] ml-2">Recent</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {recentPhrases.map((phrase, i) => (
              <button key={i} onClick={() => speak(phrase)} className="flex-shrink-0 px-6 py-3 bg-white/5 rounded-full border border-white/5 font-bold text-sm text-indigo-300 hover:bg-indigo-500/10 transition-all">{phrase}</button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        <h3 className="text-slate-500 font-black uppercase text-[10px] tracking-widest px-2">Quick Access</h3>
        <div className="grid grid-cols-1 gap-4">
          {QUICK_PHRASES.map((phrase) => (
            <button 
              key={phrase.id}
              onClick={() => speak(phrase.translations?.[lang.code] || phrase.label, phrase.id)}
              className={`w-full glass-card p-6 rounded-[2.5rem] flex items-center justify-between shadow-xl transition-all border border-white/10 ${playingId === phrase.id ? 'bg-indigo-600/20 ring-4 ring-indigo-500/50 scale-[1.02]' : 'active:scale-95'}`}
            >
              <div className="flex items-center space-x-6">
                <span className="text-4xl w-16 h-16 flex items-center justify-center bg-white/5 rounded-3xl border border-white/5">{phrase.icon}</span>
                <div className="text-left">
                  <span className="font-black text-xl tracking-tight block">{phrase.translations?.[lang.code] || phrase.label}</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{phrase.category}</span>
                </div>
              </div>
              {playingId === phrase.id ? <Waveform color="bg-white" /> : <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-indigo-500 text-xl">🔊</div>}
            </button>
          ))}
        </div>
      </section>

      <SlideUp delay="300ms">
        <div className="grid grid-cols-2 gap-4 h-44">
           <button 
              onClick={() => setCurrentMode('sos')}
              className="bg-gradient-to-br from-red-600 to-red-700 rounded-[3rem] p-8 flex flex-col items-center justify-center gap-3 shadow-[0_20px_40px_rgba(220,38,38,0.3)] border-b-8 border-red-900 active:scale-95 transition-all"
           >
              <span className="text-5xl">🆘</span>
              <span className="font-black text-white tracking-widest uppercase text-xs">SOS Hub</span>
           </button>
           <button 
              onClick={() => setCurrentMode('nearby')}
              className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-[3rem] p-8 flex flex-col items-center justify-center gap-3 shadow-[0_20px_40px_rgba(5,150,105,0.3)] border-b-8 border-emerald-900 active:scale-95 transition-all"
           >
              <span className="text-5xl">📍</span>
              <span className="font-black text-white tracking-widest uppercase text-xs">Find Help</span>
           </button>
        </div>
      </SlideUp>
    </div>
  );

  const renderTalkListen = () => (
    <div className="flex flex-col h-full p-4 space-y-4 pb-32 overflow-hidden">
      <div className="flex-1 space-y-4 flex flex-col">
        <div className={`h-[45%] glass rounded-[3rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl relative border-2 ${isListening ? 'border-green-500/40 bg-green-500/5' : 'border-white/5'}`}>
          {isListening ? (
             <div className="flex flex-col items-center gap-6 w-full">
               <div className="flex items-center justify-center gap-1.5 h-16 w-full">
                 {[...Array(24)].map((_, i) => (
                   <div key={i} className="w-1.5 bg-green-500 rounded-full animate-waveform" style={{ height: `${Math.random() * 50 + 10}px`, animationDelay: `${i * 0.05}s` }} />
                 ))}
               </div>
               <p className="text-2xl font-black text-white tracking-tight animate-pulse">{transcript || "Listening..."}</p>
             </div>
          ) : isTranslating ? (
            <div className="flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 animate-pulse">Translating...</p>
            </div>
          ) : transcript ? (
            <div className="space-y-6 w-full">
              <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.3em]">TRANSCRIPTION</p>
              <h2 className="text-4xl font-black tracking-tighter leading-tight break-words">{transcript}</h2>
              <div className="flex items-center gap-3 justify-center">
                 <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                   <div className={`h-full transition-all duration-1000 ${confidence > 0.8 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${confidence * 100}%` }} />
                 </div>
                 <span className="text-[9px] font-black text-slate-500 uppercase">{Math.round(confidence * 100)}% Confidence</span>
              </div>
            </div>
          ) : (
             <p className="text-3xl font-black text-slate-700 tracking-tighter leading-none px-12">Tap LISTEN to translate speech into text...</p>
          )}
        </div>
        <textarea 
          value={inputText} 
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message here..." 
          className="flex-1 glass p-10 text-4xl font-black border-none rounded-[3.5rem] focus:ring-0 shadow-2xl resize-none placeholder:text-slate-800"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 h-32 shrink-0">
        <button onClick={startListening} className={`${isListening ? 'bg-red-500' : 'bg-green-600'} text-white rounded-[2.5rem] font-black text-2xl shadow-xl bento-card border-b-8 ${isListening ? 'border-red-900' : 'border-green-900'} flex items-center justify-center gap-3`}>
          {isListening ? 'STOP' : '🎙️ LISTEN'}
        </button>
        <button onClick={() => speak(inputText)} className="bg-blue-600 text-white rounded-[2.5rem] font-black text-2xl shadow-xl bento-card border-b-8 border-blue-900">🔊 SPEAK</button>
      </div>
    </div>
  );

  const renderSignScan = () => (
    <div className="flex flex-col h-full bg-slate-950 p-4 space-y-4 pb-32">
        <div className="relative flex-1 bg-black rounded-[3.5rem] overflow-hidden shadow-2xl group border-4 border-white/5">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-72 h-72 relative border-white/20 border-2 rounded-2xl">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl animate-pulse" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl animate-pulse" />
                </div>
            </div>
        </div>
        <div className="h-1/3 glass rounded-[3.5rem] p-10 space-y-6 overflow-y-auto custom-scrollbar shadow-2xl border-t border-white/10">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Interpretation</p>
            <h2 className="text-5xl font-black leading-tight tracking-tighter break-words">{transcript || "Awaiting sign..."}</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 h-28 shrink-0">
            <button onClick={handleCapture} disabled={isSignLoading} className="bg-purple-600 text-white rounded-[2.5rem] font-black text-2xl shadow-xl bento-card border-b-8 border-purple-900 disabled:opacity-30">📸 SNAP</button>
            <button onClick={() => setIsLiveScanning(!isLiveScanning)} className={`${isLiveScanning ? 'bg-red-500' : 'bg-indigo-600'} text-white rounded-[2.5rem] font-black text-2xl shadow-xl bento-card border-b-8 ${isLiveScanning ? 'border-red-900' : 'border-indigo-900'}`}>{isLiveScanning ? '⏹️ STOP' : '📡 LIVE'}</button>
        </div>
    </div>
  );

  const renderSOS = () => (
    <div className="p-8 space-y-8 pb-40 overflow-y-auto custom-scrollbar h-full">
      <FadeIn>
        <div className="space-y-2">
          <h2 className="text-6xl font-black tracking-tighter">SOS Hub</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Critical Response</p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => act911('call')} className="p-8 bg-red-600 rounded-[3rem] flex flex-col items-center justify-center gap-3 border-b-8 border-red-900 shadow-xl active:scale-95 transition-transform">
          <span className="text-5xl">📞</span>
          <span className="text-sm font-black text-white uppercase tracking-widest">Call 911</span>
        </button>
        <button onClick={() => act911('text')} className="p-8 bg-orange-600 rounded-[3rem] flex flex-col items-center justify-center gap-3 border-b-8 border-orange-900 shadow-xl active:scale-95 transition-transform">
          <span className="text-5xl">✉️</span>
          <span className="text-sm font-black text-white uppercase tracking-widest">Text 911</span>
        </button>
      </div>

      <button onClick={shareLocationWithContacts} className="w-full bg-indigo-600 p-10 rounded-[3rem] text-white font-black uppercase text-xl tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4">
        <span className="text-3xl">📍</span>
        Alert Contacts
      </button>

      <section className="space-y-4">
        <h3 className="text-slate-500 font-black text-[10px] uppercase tracking-widest ml-4">Emergency Contacts</h3>
        <div className="space-y-3">
          {emergencyContacts.map((contact, i) => (
            <div key={i} className="glass p-6 rounded-[2.5rem] flex items-center justify-between border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl">👤</div>
                <div>
                  <h4 className="font-black text-lg">{contact.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500">{contact.phone}</p>
                </div>
              </div>
              <a href={`tel:${contact.phone}`} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-indigo-600 transition-colors">📞</a>
            </div>
          ))}
          <button onClick={() => setModalType('add_contact')} className="w-full border-4 border-dashed border-white/5 p-8 rounded-[3rem] font-black text-slate-600 uppercase tracking-widest text-xs">
            + Add Contact
          </button>
        </div>
      </section>
    </div>
  );

  const renderNearby = () => (
    <div className="p-6 space-y-8 pb-40 overflow-y-auto custom-scrollbar h-full">
      <div className="space-y-2">
        <h2 className="text-5xl font-black tracking-tighter">Nearby Services</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Real-time location Discovery</p>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
        {([
          { id: 'hospital', label: 'Hospitals', icon: '🏥', color: 'bg-red-600' },
          { id: 'police', label: 'Police', icon: '🚔', color: 'bg-blue-600' },
          { id: 'pharmacy', label: 'Pharmacy', icon: '💊', color: 'bg-emerald-600' }
        ] as const).map(cat => (
          <button 
            key={cat.id} 
            onClick={() => setActiveFilter(cat.id)}
            className={`flex-shrink-0 px-8 py-5 rounded-[2.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-4 border transition-all ${activeFilter === cat.id ? `${cat.color} text-white border-transparent shadow-xl scale-105` : 'bg-slate-800/50 text-slate-500 border-white/5'}`}
          >
            <span className="text-2xl">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {isNearbyLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-20 h-20 border-8 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Scanning map grounding...</p>
        </div>
      ) : nearbyResults[activeFilter].links.length > 0 ? (
        <div className="space-y-4">
          <div className="glass p-8 rounded-[3rem] mb-4">
            <p className="text-sm font-bold text-slate-300 italic leading-relaxed">"{nearbyResults[activeFilter].text}"</p>
          </div>
          {nearbyResults[activeFilter].links.map((link: any, idx: number) => (
            <div key={idx} className="glass-card p-6 rounded-[2.5rem] flex items-center justify-between border border-white/10 group">
              <div className="flex-1 flex items-center gap-5">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl ${idx === 0 ? 'bg-indigo-600/20 text-indigo-400' : 'bg-white/5 text-slate-400'}`}>📍</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-white text-lg tracking-tight truncate max-w-[200px]">{link.title || 'Facility'}</h4>
                    {idx === 0 && <span className="bg-emerald-500/20 text-emerald-500 text-[8px] px-2 py-0.5 rounded-full font-black uppercase">Closest</span>}
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Maps Integration Available</p>
                </div>
              </div>
              <a href={link.uri} target="_blank" rel="noopener noreferrer" className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl shadow-lg hover:bg-indigo-500 active:scale-90 transition-all">↗</a>
            </div>
          ))}
          <button onClick={performSearch} className="w-full bg-slate-800/50 p-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest text-slate-500 border border-white/5 mt-4">Redo Search</button>
        </div>
      ) : (
        <div className="text-center py-20 space-y-10">
          <div className="text-9xl opacity-10 filter grayscale">🗺️</div>
          <button onClick={performSearch} className="w-full active-gradient p-10 rounded-[3rem] text-white font-black uppercase text-xl tracking-widest shadow-2xl animate-gradient-shift">Scan Location</button>
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="p-8 space-y-10 overflow-y-auto custom-scrollbar h-full pb-32">
      <header className="flex items-center gap-6">
        <button onClick={() => setCurrentMode('home')} className="w-14 h-14 glass rounded-full flex items-center justify-center text-2xl active:scale-90 transition-transform">←</button>
        <h2 className="text-5xl font-black tracking-tighter">Settings</h2>
      </header>
      <div className="space-y-12">
        <section className="space-y-6">
          <h3 className="text-slate-500 font-black text-[10px] uppercase tracking-widest ml-2">Speech Options</h3>
          <div className="space-y-4">
            <div className="glass p-8 rounded-[3rem] space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="font-black text-xs uppercase tracking-widest">Rate</span>
                <span className="text-indigo-500 font-black">{voiceSpeed.toFixed(1)}x</span>
              </div>
              <input type="range" min="0.5" max="2" step="0.1" value={voiceSpeed} onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))} className="w-full accent-indigo-500 bg-white/10 h-3 rounded-full cursor-pointer" />
            </div>
            <button onClick={() => setModalType('voice_settings')} className="w-full glass p-8 rounded-[3rem] flex items-center justify-between group">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Voice Personality</span>
                <span className="font-black text-2xl tracking-tight text-white">{currentVoiceName}</span>
              </div>
              <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all text-xl">⚙️</div>
            </button>
          </div>
        </section>
        <section className="space-y-6">
          <h3 className="text-slate-500 font-black text-[10px] uppercase tracking-widest ml-2">Device Feedback</h3>
          <button 
            onClick={() => setHapticsEnabled(!hapticsEnabled)}
            className="w-full glass p-8 rounded-[3rem] flex items-center justify-between"
          >
            <span className="font-black text-xs uppercase tracking-widest text-white">Haptic Pulse</span>
            <div className={`w-14 h-8 rounded-full flex items-center px-1 transition-colors ${hapticsEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}>
              <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform ${hapticsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </button>
        </section>
        <button onClick={() => { setUser(null); localStorage.removeItem('speakease-user'); }} className="w-full bg-red-500/10 text-red-500 p-8 rounded-[3rem] font-black uppercase text-xs tracking-widest border border-red-500/20 active:bg-red-500 active:text-white transition-all">Log Out</button>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div className="flex-1 flex flex-col bg-slate-950 p-10 space-y-12 items-center justify-center h-full">
      <SlideUp><div className="text-[140px] animate-bounce-gentle">🤟</div></SlideUp>
      <div className="text-center space-y-3">
        <h1 className="text-7xl font-black text-white tracking-tighter">SpeakEase</h1>
        <p className="text-indigo-400 font-black uppercase tracking-[0.5em] text-[11px]">Accessibility Bridge</p>
      </div>
      <div className="w-full max-w-sm space-y-4 pt-4">
        {isAuthLoading ? (
          <div className="text-indigo-500 text-center font-black animate-pulse text-2xl uppercase tracking-widest">Verifying Identity...</div>
        ) : (
          <>
            <button onClick={loginWithGoogle} className="w-full bg-white text-slate-950 p-8 rounded-[3rem] font-black text-xl shadow-[0_20px_60px_rgba(255,255,255,0.1)] flex items-center justify-center space-x-4 active:scale-95 transition-all border-b-[10px] border-slate-300">
              <img src="https://www.google.com/favicon.ico" alt="" className="w-7 h-7" />
              <span>Continue with Google</span>
            </button>
            <button onClick={loginAsGuest} className="w-full bg-slate-900 text-white p-8 rounded-[3rem] font-black text-xl shadow-2xl flex items-center justify-center space-x-4 active:scale-95 transition-all border border-slate-800 border-b-[10px] border-slate-950">
              <span>Explore as Guest</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (!user) return renderAuth();

  return (
    <div className="max-w-md mx-auto h-screen bg-slate-950 flex flex-col antialiased relative shadow-[0_0_100px_rgba(0,0,0,0.5)]">
      {!isOnline && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-slide-up">
          <div className="px-6 py-3 bg-yellow-600 rounded-full shadow-2xl flex items-center gap-3">
            <span className="text-white font-bold text-[10px] uppercase tracking-widest">Offline Mode Active</span>
          </div>
        </div>
      )}

      {currentMode !== 'settings' && (
        <div className="sticky top-0 z-50">
          <header className="bg-slate-950 px-6 py-4 flex justify-between items-center border-b border-white/5 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-indigo-500/30">🤟</div>
              <div>
                <h1 className="text-lg font-black text-white tracking-tighter leading-none">SpeakEase</h1>
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1">Accessibility Bridge</p>
              </div>
            </div>
            <button onClick={() => setCurrentMode('settings')} className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500/40 active:scale-90 transition-transform">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="profile" className="w-full h-full object-cover" />
            </button>
          </header>
          <div className="glass border-b border-white/5 flex items-center shrink-0">
            <div className="flex-1 flex overflow-x-auto py-4 px-4 space-x-3 no-scrollbar scroll-smooth">
            {availableLanguages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l)}
                className={`flex-shrink-0 px-6 py-2.5 rounded-2xl text-[11px] font-extrabold transition-all border-2 ${
                  lang.code === l.code ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white/5 text-slate-500 border-white/5'
                }`}
              >
              {l.nativeName}
              </button>
            ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden relative">
        <StandardErrorBoundary fallback={<div className="p-10 text-center">App Crashed. Please reload.</div>}>
          <div className="h-full">
            {currentMode === 'home' && renderHome()}
            {currentMode === 'talk_listen' && renderTalkListen()}
            {currentMode === 'sign' && renderSignScan()}
            {currentMode === 'sos' && renderSOS()}
            {currentMode === 'nearby' && renderNearby()}
            {currentMode === 'settings' && renderSettings()}
          </div>
        </StandardErrorBoundary>
      </main>

      <nav className="glass border-t border-white/5 pb-safe z-50">
        <div className="flex justify-around items-center h-20">
          {[
            { id: 'home', icon: '🏠', label: 'Home' },
            { id: 'talk_listen', icon: '💬', label: 'Talk' },
            { id: 'sign', icon: '🤟', label: 'Sign' },
            { id: 'sos', icon: '🆘', label: 'SOS' },
            { id: 'nearby', icon: '📍', label: 'Nearby' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentMode(tab.id as any)}
              className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all ${
                currentMode === tab.id ? 'text-indigo-400 scale-110' : 'text-slate-600 opacity-40'
              }`}
            >
              <span className="text-2xl">{tab.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* SOS Confirmation Modal */}
      <Modal 
        isOpen={show911Confirmation} 
        onClose={() => setShow911Confirmation(false)} 
        title={emergencyType === 'call' ? 'Call 911' : 'Text 911'}
        border="border-red-500/50"
      >
        <div className="space-y-8 text-center">
          <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-[0_0_50px_rgba(220,38,38,0.5)]">🆘</div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-white">Emergency Dispatch</h2>
            <p className="text-slate-400 text-sm">Location sharing will be activated for emergency responders.</p>
          </div>
          <div className="glass p-6 rounded-[2.5rem] space-y-2 text-left bg-slate-800/50">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">My Current Location</p>
            <p className="font-bold text-white text-sm font-mono">{currentCoords ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}` : "Locating..."}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setShow911Confirmation(false)} className="flex-1 glass p-6 rounded-[2rem] font-black uppercase text-sm">Cancel</button>
            <button onClick={confirmSOS} className="flex-1 bg-red-600 p-6 rounded-[2rem] font-black uppercase text-sm text-white shadow-xl">Confirm</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'voice_settings'} onClose={() => setModalType('none')} title="Voice Persona">
        <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar">
          {availableVoices.length > 0 ? availableVoices.map((voice) => (
            <button
              key={voice.voiceURI}
              onClick={() => { setSelectedVoiceURI(voice.voiceURI); localStorage.setItem('speakease-voice-uri', voice.voiceURI); setModalType('none'); }}
              className={`w-full p-6 rounded-[2rem] flex items-center justify-between border-2 transition-all ${selectedVoiceURI === voice.voiceURI ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/5 border-transparent text-slate-400'}`}
            >
              <div className="flex flex-col items-start"><span className="font-black text-sm">{voice.name}</span><span className="text-[10px] opacity-40 uppercase tracking-widest">{voice.lang}</span></div>
            </button>
          )) : <p className="text-center py-10 opacity-50">Searching system voices...</p>}
        </div>
      </Modal>

      <Modal isOpen={modalType === 'add_contact'} onClose={() => setModalType('none')} title="New Contact">
        <div className="space-y-6">
          <input type="text" placeholder="Contact Name" className="w-full glass p-6 rounded-[2rem] focus:outline-none" />
          <input type="tel" placeholder="Phone Number" className="w-full glass p-6 rounded-[2rem] focus:outline-none" />
          <button onClick={() => setModalType('none')} className="w-full bg-indigo-600 p-6 rounded-[2rem] font-black uppercase tracking-widest text-white">Save</button>
        </div>
      </Modal>
    </div>
  );
};

export default App;
