"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

const COUNTRIES = [
  { code: "+507", flag: "🇵🇦", name: "Panamá" },
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+52", flag: "🇲🇽", name: "México" },
  { code: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { code: "+503", flag: "🇸🇻", name: "El Salvador" },
  { code: "+502", flag: "🇬🇹", name: "Guatemala" },
  { code: "+504", flag: "🇭🇳", name: "Honduras" },
  { code: "+505", flag: "🇳🇮", name: "Nicaragua" },
  { code: "+501", flag: "🇧🇿", name: "Belize" },
  { code: "+53", flag: "🇨🇺", name: "Cuba" },
  { code: "+1809", flag: "🇩🇴", name: "República Dominicana" },
  { code: "+58", flag: "🇻🇪", name: "Venezuela" },
  { code: "+593", flag: "🇪🇨", name: "Ecuador" },
  { code: "+51", flag: "🇵🇪", name: "Perú" },
  { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "+55", flag: "🇧🇷", name: "Brasil" },
  { code: "+598", flag: "🇺🇾", name: "Uruguay" },
  { code: "+595", flag: "🇵🇾", name: "Paraguay" },
  { code: "+591", flag: "🇧🇴", name: "Bolivia" },
  { code: "+34", flag: "🇪🇸", name: "España" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "+91", flag: "🇮🇳", name: "India" },
];

type PhoneInputProps = {
  value: string;
  onChange: (fullNumber: string) => void;
  placeholder?: string;
  id?: string;
};

export function PhoneInput({ value, onChange, placeholder, id }: PhoneInputProps) {
  // Parse initial value
  const defaultCountry = COUNTRIES[0]; // Panama
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const [localNumber, setLocalNumber] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Parse value on mount
  useEffect(() => {
    if (value) {
      const match = COUNTRIES.find((c) => value.startsWith(c.code));
      if (match) {
        setSelectedCountry(match);
        setLocalNumber(value.slice(match.code.length).trim());
      } else {
        setLocalNumber(value);
      }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function handleCountrySelect(country: typeof COUNTRIES[number]) {
    setSelectedCountry(country);
    setOpen(false);
    setSearch("");
    onChange(`${country.code} ${localNumber}`);
  }

  function handleNumberChange(num: string) {
    // Only allow digits, spaces, hyphens
    const cleaned = num.replace(/[^\d\s-]/g, "");
    setLocalNumber(cleaned);
    onChange(`${selectedCountry.code} ${cleaned}`);
  }

  const filtered = search
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.includes(search)
      )
    : COUNTRIES;

  return (
    <div className="flex gap-1.5" ref={dropdownRef}>
      {/* Country code selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 h-9 px-2.5 border rounded-md bg-white text-sm whitespace-nowrap hover:bg-gray-50 transition-colors min-w-[90px]"
        >
          <span className="text-base">{selectedCountry.flag}</span>
          <span className="text-muted-foreground">{selectedCountry.code}</span>
          <svg className="h-3 w-3 text-muted-foreground ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-hidden">
            <div className="p-2 border-b">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-2 py-1.5 text-sm border rounded-md outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="overflow-y-auto max-h-44">
              {filtered.map((country) => (
                <button
                  key={country.code + country.name}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left ${
                    selectedCountry.code === country.code ? "bg-muted/50 font-medium" : ""
                  }`}
                >
                  <span className="text-base">{country.flag}</span>
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="text-muted-foreground text-xs">{country.code}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">No results</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Phone number input */}
      <Input
        id={id}
        type="tel"
        value={localNumber}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={placeholder ?? "6000-0000"}
        className="flex-1"
      />
    </div>
  );
}
