
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Detects the language of a given text string.
 */
export const detectLanguage = async (text: string): Promise<string> => {
  if (!text) return "en-US";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this text and identify the IANA language code (e.g., 'hi-IN', 'fr-FR', 'ja-JP'). Respond with ONLY the code: "${text}"`
    });
    return response.text?.trim() || "en-US";
  } catch (e) {
    return "en-US";
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
 * Fetches nearby essential services using Google Maps grounding.
 */
export const getNearbyPlaces = async (lat: number, lng: number, targetLang: string): Promise<{ text: string, links: any[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
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
    
    // Correctly extracting maps links as per groundingChunks structure
    const links = chunks
      .map((chunk: any) => chunk.maps)
      .filter(Boolean);

    return { text, links };
  } catch (e) {
    console.error("Maps grounding error:", e);
    return { text: "Error fetching nearby places. Please check network.", links: [] };
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
      contents: `Find the IANA language code and native name for the language: "${langName}".`,
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
 * Interprets a sign language gesture from an image using Gemini 3 Pro.
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
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
          { text: `Analyze this sign gesture. Respond with ONLY the interpreted word/phrase in ${targetLangName}. Be extremely concise.` }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 16000 },
        temperature: 0.1,
        systemInstruction: `You are an expert Sign Language interpreter. Accurately detect hands and interpret gestures into meaningful phrases.`
      }
    });

    return response.text?.trim() || "Recognition failed.";
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return "Error interpreting sign.";
  }
};
