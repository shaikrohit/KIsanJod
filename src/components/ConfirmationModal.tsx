"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, HelpCircle, Volume2, X } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  message?: string;
  consequence?: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  voiceText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  description,
  message,
  consequence,
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  variant = "warning",
  voiceText,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const resolvedDescription = message || description || "";
  const resolvedConfirm = confirmLabel || confirmText || "Yes, Proceed";
  const resolvedCancel = cancelLabel || cancelText || "No, Go Back";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleSpeak = () => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const textToSpeak = voiceText || `${title}. ${resolvedDescription}. ${consequence || ""}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const confirmBtnColor =
    variant === "danger"
      ? "bg-red-700 hover:bg-red-800 text-white shadow-red-900/20"
      : variant === "warning"
      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20"
      : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/20";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border-2 border-gray-100 animate-in zoom-in-95 duration-200"
      >
        {/* Header Ribbon */}
        <div
          className={`px-6 py-4 flex items-center justify-between ${
            variant === "danger"
              ? "bg-red-50 border-b border-red-200"
              : variant === "warning"
              ? "bg-amber-50 border-b border-amber-200"
              : "bg-emerald-50 border-b border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {variant === "danger" ? (
              <div className="p-2 rounded-xl bg-red-100 text-red-700">
                <AlertTriangle size={20} />
              </div>
            ) : variant === "warning" ? (
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle size={20} />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <HelpCircle size={20} />
              </div>
            )}
            <h3
              id="confirm-modal-title"
              className="text-lg font-black text-gray-900 font-heading tracking-tight"
            >
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            {/* Audio Speech Assistance Button */}
            <button
              type="button"
              onClick={handleSpeak}
              title="Listen to this message"
              className={`p-2 rounded-xl border transition-all ${
                isSpeaking
                  ? "bg-amber-500 text-white border-amber-600 animate-pulse"
                  : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
              }`}
            >
              <Volume2 size={18} />
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm sm:text-base font-semibold text-gray-700 leading-relaxed">
            {resolvedDescription}
          </p>

          {/* Consequence Warning Banner */}
          {consequence && (
            <div
              className={`p-3.5 rounded-2xl flex items-start gap-3 border ${
                variant === "danger"
                  ? "bg-red-50/80 border-red-200 text-red-900"
                  : "bg-amber-50/80 border-amber-200 text-amber-900"
              }`}
            >
              <AlertTriangle
                size={18}
                className={variant === "danger" ? "text-red-600 shrink-0 mt-0.5" : "text-amber-600 shrink-0 mt-0.5"}
              />
              <p className="text-xs sm:text-sm font-extrabold leading-snug">
                {consequence}
              </p>
            </div>
          )}
        </div>

        {/* High-Contrast Action Buttons */}
        <div className="p-6 pt-2 bg-gray-50/50 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-100 font-bold text-gray-700 text-sm transition-all active:scale-[0.98]"
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isSpeaking && window.speechSynthesis) {
                window.speechSynthesis.cancel();
              }
              onConfirm();
            }}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-sm transition-all shadow-md active:scale-[0.98] ${confirmBtnColor}`}
          >
            {resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}

