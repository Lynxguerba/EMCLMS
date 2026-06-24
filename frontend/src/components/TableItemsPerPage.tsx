import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface TableItemsPerPageProps {
  value: number;
  onChange: (size: number) => void;
  options: number[];
}

/**
 * TableItemsPerPage - A compact, styled dropdown for pagination "items per page" selection.
 * Matches the "all rounded" (rounded-xl) style of the application's drawers.
 */
const TableItemsPerPage: React.FC<TableItemsPerPageProps> = ({
  value,
  onChange,
  options,
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
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1 text-xs border rounded-lg outline-none transition-all cursor-pointer bg-gray-50/50 hover:bg-white text-left ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
            : "border-gray-300 hover:border-blue-400"
        }`}
      >
        <span className="font-medium text-gray-700">{value}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-500" : "text-gray-400"
          }`}
        />
      </button>

      {/* The Drawer (Options Menu) */}
      {isOpen && (
        <div className="absolute z-50 bottom-full mb-1.5 w-full min-w-[60px] bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 origin-bottom">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full text-center px-3 py-1.5 text-xs transition-colors hover:bg-blue-50 ${
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

export default TableItemsPerPage;
