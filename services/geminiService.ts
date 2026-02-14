
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Detects the language of a given text string.
 */
export const detectLanguage = async (text: string): Promise<string> => {
  if (!text) return "en-US";
  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this text and identify the IANA language code (e.g., 'hi-IN', 'fr-FR', 'ja-JP'). Respond with ONLY the code: "${text}"`
    });
    // The response.text property directly returns the string output
    return response.text?.trim() || "en-US";
  } catch (e) {
    return "en-US";
  }
};

/**
 * Infers the primary language code based on geographic coordinates.
 */
export const getLanguageFromLocation = async (lat: number, lng: number): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user is at coordinates ${lat}, ${lng}. What is the most likely primary spoken language IANA code for this specific region? Respond with ONLY the IANA code (e.g., 'mr-IN' for Maharashtra, 'es-ES' for Spain).`
    });
    return response.text?.trim() || "en-US";
  } catch (e) {
    return "en-US";
  }
};

/**
 * Reverse geocodes coordinates into a user-friendly address string using Gemini.
 */
export const reverseGeocode = async (lat: number, lng: number, targetLang: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user is at coordinates ${lat}, ${lng}. Using your knowledge, describe this approximate location (Neighborhood, City, State) in ${targetLang}. 
      Be concise (max 8 words). Respond ONLY with the location description.`
    });
    return response.text?.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (e) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

/**
 * Translates text from any language into the target language.
 */
export const translateText = async (text: string, targetLang: string): Promise<string> => {
  if (!text) return "";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate this text into ${targetLang}. Detect the source language automatically. Respond ONLY with the translated text: "${text}"`
    });
    return response.text?.trim() || text;
  } catch (e) {
    return text;
  }
};

/**
 * Transliterates phonetic/romanized text into the target script.
 */
export const transliterateText = async (text: string, targetLang: string): Promise<string> => {
  if (!text || !targetLang) return text;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Transliterate the following romanized/phonetic text into ${targetLang} script. 
      Example: "namaste" in Hindi -> "नमस्ते".
      Text: "${text}"
      Respond ONLY with the transliterated text.`
    });
    return response.text?.trim() || text;
  } catch (e) {
    return text;
  }
};

/**
 * Fetches nearby essential services using Google Maps grounding.
 */
export const getNearbyPlaces = async (lat: number, lng: number, targetLang: string): Promise<{ text: string, links: any[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      // Maps grounding is supported in Gemini 2.5 series models
      model: "gemini-2.5-flash",
      contents: `Identify the nearest Hospital, Police Station, and Pharmacy near coordinates ${lat}, ${lng}. 
      Explain their names and distance in ${targetLang}. Provide a short helpful summary for someone who cannot hear or speak.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      },
    });

    const text = response.text || "No essential services found nearby.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    // Extract website/maps URLs from grounding chunks as required for grounding tools
    const links = chunks.map((chunk: any) => chunk.maps).filter(Boolean);

    return { text, links };
  } catch (e) {
    console.error("Maps grounding error:", e);
    return { text: "Error fetching nearby places.", links: [] };
  }
};

/**
 * Fetches structured UI translations for a given language.
 */
export const fetchUITranslations = async (targetLang: string, keys: string[], values: string[]): Promise<Record<string, string>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate these UI labels into ${targetLang}. 
      Labels: ${values.join(', ')}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: keys.reduce((acc, key) => ({ ...acc, [key]: { type: Type.STRING } }), {}),
          required: keys
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Translation Error:", e);
    return {};
  }
};

/**
 * Finds IANA code and Native Name for a language by its common name.
 */
export const findLanguageDetails = async (langName: string): Promise<{ code: string, name: string, nativeName: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find the IANA language code and native name for the language: "${langName}". 
      Example for "French": {"code": "fr-FR", "name": "French", "nativeName": "Français"}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            code: { type: Type.STRING },
            name: { type: Type.STRING },
            nativeName: { type: Type.STRING }
          },
          required: ["code", "name", "nativeName"]
        }
      }
    });
    return JSON.parse(response.text || "null");
  } catch (e) {
    return null;
  }
};

/**
 * Interprets a sign language gesture from an image.
 */
export const interpretSignLanguage = async (imageBlob: Blob, targetLangName: string = "English"): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
    });
    reader.readAsDataURL(imageBlob);
    const base64Data = await base64Promise;

    const response = await ai.models.generateContent({
      // Use Gemini 3 Pro for complex visual interpretation tasks
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
          { text: `Analyze this sign gesture. Respond with ONLY the interpreted word/phrase in ${targetLangName}.` }
        ]
      },
      config: {
        // High thinking budget for complex multimodal reasoning
        thinkingConfig: { thinkingBudget: 16000 },
        temperature: 0.1,
        systemInstruction: `You are an expert Sign Language interpreter. Be concise and accurate.`
      }
    });

    return response.text?.trim() || "Recognition failed.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error interpreting sign.";
  }
};
