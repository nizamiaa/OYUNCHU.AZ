import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

import azFlag from "../../images/flags/az.png";
import enFlag from "../../images/flags/en.png";
import ruFlag from "../../images/flags/ru.png";

const LANGUAGES = [
  { code: "az", label: "Azərbaycan", flag: azFlag },
  { code: "en", label: "English", flag: enFlag },
  { code: "ru", label: "Русский", flag: ruFlag },
];

export const LanguageSelector: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<string>(() => {
    // prefer i18n runtime language when available, fallback to saved lang or az
    try {
      return (i18n && (i18n as any).language) || localStorage.getItem("lang") || "az";
    } catch (e) {
      return localStorage.getItem("lang") || "az";
    }
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const handleLanguageChange = (lng: string) => setCurrentLang(lng);
    try {
      if (i18n && typeof (i18n as any).on === 'function') {
        (i18n as any).on("languageChanged", handleLanguageChange);
        return () => { if (i18n && typeof (i18n as any).off === 'function') (i18n as any).off("languageChanged", handleLanguageChange); };
      }
    } catch (e) {
      // i18n may not implement event emitter in this environment; ignore
    }
    return () => {};
  }, [i18n]);

  const current = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  const changeLanguage = (code: string) => {
    // update i18n, persist selection and update local state immediately
    try {
      i18n.changeLanguage(code);
    } catch (e) {
      console.warn('i18n.changeLanguage failed', e);
    }
    localStorage.setItem("lang", code);
    setCurrentLang(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative select-none">
      <button
        onClick={() => setOpen((o) => !o)}
        className="
          relative flex-shrink-0
          p-2 sm:p-3
          rounded-full
        "
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <img
          src={current.flag}
          alt={current.label}
          className="w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full border
          "
        />
      </button>


      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#222] rounded-xl p-6 w-full max-w-xs relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl"
              aria-label="Bağla"
            >
              ×
            </button>

            <h2 className="text-white text-lg font-bold mb-6 text-center">
              {t("languageSelector.selectLanguage")}
            </h2>

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
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
