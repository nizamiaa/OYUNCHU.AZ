import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

import azFlag from "@/images/flags/az.png";
import enFlag from "@/images/flags/en.png";
import ruFlag from "@/images/flags/ru.png";

const LANGUAGES = [
  { code: "az", label: "Azərbaycan", flag: azFlag },
  { code: "en", label: "English", flag: enFlag },
  { code: "ru", label: "Русский", flag: ruFlag },
];

export const LanguageSelector: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<string>(() => {
    try {
      return i18n.language || localStorage.getItem("lang") || "az";
    } catch {
      return "az";
    }
  });

  const ref = useRef<HTMLDivElement>(null);

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* sync when language changed elsewhere */
  useEffect(() => {
    const onChange = (lng: string) => setCurrentLang(lng);
    i18n.on("languageChanged", onChange);
    return () => i18n.off("languageChanged", onChange);
  }, [i18n]);

  const current =
    LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("lang", code);
    setCurrentLang(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative select-none">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <img
          src={current.flag}
          alt={current.label}
          className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border"
        />
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#222] rounded-xl p-4 sm:p-6 w-full max-w-[92vw] sm:max-w-sm relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl"
              aria-label="Close"
            >
              ×
            </button>

            {/* Title */}
            <h2 className="text-white text-lg font-bold mb-5 text-center">
              {t("languageSelector.selectLanguage", "Select language")}
            </h2>

            {/* Options */}
            <div className="flex flex-col gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-white font-medium transition
                    ${
                      currentLang === lang.code
                        ? "bg-gray-700"
                        : "hover:bg-gray-800"
                    }
                  `}
                >
                  <img
                    src={lang.flag}
                    alt={lang.label}
                    className="w-7 h-7 rounded-full border"
                  />
                  <span className="min-w-0 truncate">{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
