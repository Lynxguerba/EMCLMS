import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  icon?: React.ElementType;
  placeholder: string;
  className?: string;
  optionsClassName?: string;
}

/**
 * CustomSelect - A highly-styled, accessible dropdown component that replaces
 * native HTML select elements. Features rounded corners (rounded-xl),
 * smooth animations, and icon integration.
 */
const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  icon: Icon,
  placeholder,
  className = "",
  optionsClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 ${
          Icon ? "pl-9" : "pl-3"
        } pr-10 py-2 text-sm border rounded-lg outline-none transition-all cursor-pointer bg-gray-50/50 hover:bg-white text-left ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
            : "border-gray-300 hover:border-blue-400"
        }`}
      >
        {Icon && (
          <Icon
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${
              isOpen ? "text-blue-500" : "text-gray-400"
            }`}
          />
        )}
        <span className="truncate">
          {value === placeholder ? placeholder : value}
        </span>
        <ChevronDown
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-500" : "text-gray-400"
          }`}
        />
      </button>

      {/* The Drawer (Options Menu) */}
      {isOpen && (
        <div className={`absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top ${optionsClassName}`}>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-blue-50 ${
                  value === option
                    ? "bg-blue-50 text-blue-600 font-semibold"
                    : "text-gray-700"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
