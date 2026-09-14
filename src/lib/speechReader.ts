// ============================================================================
// KisanJod - Speech Reader & In-Place Text Highlighting Engine
// Supports English (en-IN), Hindi (hi-IN), and Telugu (te-IN)
// Highlights exact text in-place on the website with ZERO separate text boxes.
// ============================================================================

export interface SpeechReaderOptions {
  locale: "en" | "hi" | "te";
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let currentHighlightedElement: HTMLElement | null = null;

// Stop any ongoing speech and remove all in-place highlights
export function stopSpeechReader(): void {
  if (typeof window === "undefined") return;

  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }

  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  activeUtterance = null;
  clearHighlights();
}

function clearHighlights(): void {
  if (typeof document === "undefined") return;
  const highlighted = document.querySelectorAll(".speech-active-highlight");
  highlighted.forEach((el) => {
    el.classList.remove("speech-active-highlight");
  });
  currentHighlightedElement = null;
}

function highlightElement(el: HTMLElement): void {
  clearHighlights();
  el.classList.add("speech-active-highlight");
  currentHighlightedElement = el;
  try {
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  } catch {}
}

// Find all readable content blocks inside <main>
function getReadableElements(): HTMLElement[] {
  if (typeof document === "undefined") return [];
  const container = document.querySelector("main") || document.body;
  if (!container) return [];

  const candidates = container.querySelectorAll<HTMLElement>(
    "h1, h2, h3, h4, h5, p, span.speech-target, label, [data-speech-readable]"
  );

  const readable: HTMLElement[] = [];
  const seenTexts = new Set<string>();

  candidates.forEach((el) => {
    // Ignore interactive, script, or hidden elements
    if (
      el.closest("header") ||
      el.closest("nav") ||
      el.closest("button") ||
      el.closest("svg") ||
      el.closest(".icon") ||
      el.closest("[aria-hidden='true']") ||
      el.closest(".speech-ignore")
    ) {
      return;
    }

    const text = el.innerText ? el.innerText.replace(/\s+/g, " ").trim() : "";
    // Filter out short symbols, pure icons, or duplicate parent-child texts
    if (text.length >= 2 && !seenTexts.has(text)) {
      // Avoid adding parent if children already cover it or vice versa
      seenTexts.add(text);
      readable.push(el);
    }
  });

  return readable;
}

// Look for a voice matching language preference
function findBestVoice(langPrefix: string, langFullName: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  const targetPrefix = langPrefix.toLowerCase();
  const targetName = langFullName.toLowerCase();

  // 1. Exact or prefix match (e.g. te-IN or te)
  let match = voices.find(
    (v) => v.lang.toLowerCase() === targetPrefix || v.lang.toLowerCase().startsWith(targetPrefix + "-")
  );
  if (match) return match;

  // 2. By name match (e.g. "Google Telugu" or "Microsoft Mohan")
  match = voices.find((v) => v.name.toLowerCase().includes(targetName));
  if (match) return match;

  // 3. Any voice containing language code in name
  match = voices.find((v) => v.name.toLowerCase().includes(targetPrefix));
  return match || null;
}

// Main function to read page content with in-place highlighting
export function startSpeechReader(options: SpeechReaderOptions): boolean {
  if (typeof window === "undefined") return false;

  stopSpeechReader();

  const elements = getReadableElements();
  if (!elements.length) {
    options.onEnd?.();
    return false;
  }

  const { locale } = options;
  const langTag = locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN";
  const langName = locale === "hi" ? "hindi" : locale === "te" ? "telugu" : "english";

  let currentIndex = 0;

  function speakNext(): void {
    if (currentIndex >= elements.length) {
      stopSpeechReader();
      options.onEnd?.();
      return;
    }

    const currentEl = elements[currentIndex];
    const text = (currentEl.innerText || "").replace(/\s+/g, " ").trim();

    if (!text || text.length < 2) {
      currentIndex++;
      speakNext();
      return;
    }

    // Highlight this element in-place directly on the website
    highlightElement(currentEl);

    // Hybrid approach for Telugu: Check browser voice first; fallback to high-quality audio stream
    if (locale === "te") {
      const teluguVoice = findBestVoice("te", "telugu");
      if (teluguVoice && "speechSynthesis" in window) {
        speakViaWebSpeech(text, langTag, teluguVoice);
      } else {
        // High quality web audio stream for Telugu
        speakViaAudioStream(text, "te");
      }
    } else {
      const voice = findBestVoice(locale === "hi" ? "hi" : "en", langName);
      if ("speechSynthesis" in window) {
        speakViaWebSpeech(text, langTag, voice);
      } else {
        speakViaAudioStream(text, locale);
      }
    }
  }

  function speakViaWebSpeech(text: string, lang: string, voice: SpeechSynthesisVoice | null): void {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      if (voice) utterance.voice = voice;
      utterance.rate = 0.92;
      activeUtterance = utterance;

      utterance.onend = () => {
        currentIndex++;
        speakNext();
      };

      utterance.onerror = (e) => {
        // If browser voice fails (e.g. language-unavailable on Windows), fallback to audio stream
        if (locale === "te") {
          speakViaAudioStream(text, "te");
        } else {
          currentIndex++;
          speakNext();
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      speakViaAudioStream(text, locale);
    }
  }

  function speakViaAudioStream(text: string, langCode: string): void {
    try {
      // Encode snippet for audio playback (capped for streaming response)
      const encodedText = encodeURIComponent(text.slice(0, 200));
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodedText}`;

      const audio = new Audio(audioUrl);
      activeAudio = audio;
      audio.playbackRate = 0.95;

      audio.onended = () => {
        activeAudio = null;
        currentIndex++;
        speakNext();
      };

      audio.onerror = () => {
        activeAudio = null;
        currentIndex++;
        speakNext();
      };

      audio.play().catch(() => {
        // Autoplay policy or CORS fallback: advance to next item
        activeAudio = null;
        currentIndex++;
        speakNext();
      });
    } catch {
      currentIndex++;
      speakNext();
    }
  }

  options.onStart?.();
  speakNext();
  return true;
}

