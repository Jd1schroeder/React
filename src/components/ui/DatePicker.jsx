import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./DatePicker.css";

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("en-US") : "";
}

function parseManualDate(value) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, monthText, dayText, yearText] = match;
  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function DatePicker({ ariaLabel, onChange, placeholder = "mm/dd/yyyy", value = "" }) {
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(() => formatDisplayDate(value));
  const selectedDate = parseDate(value);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [isOpen]);

  return (
    <div ref={rootRef} className="date-picker">
      <div className={`date-picker-trigger${value ? " has-value" : ""}${isOpen ? " is-open" : ""}`}>
        <button
          type="button"
          className="date-picker-icon"
          aria-label={`Open ${ariaLabel}`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => setIsOpen((open) => !open)}
        >
          <CalendarDays size={17} aria-hidden="true" />
        </button>
        <input
          value={draftValue}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={() => {
            const manualDate = parseManualDate(draftValue);
            if (manualDate) {
              setDraftValue(manualDate.toLocaleDateString("en-US"));
              onChange(formatDate(manualDate));
            } else setDraftValue(formatDisplayDate(value));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
        {value ? (
          <button
            type="button"
            className="date-picker-clear"
            aria-label={`Clear ${ariaLabel}`}
            onClick={(event) => {
              event.stopPropagation();
              setDraftValue("");
              onChange("");
            }}
          >
            <X size={17} aria-hidden="true" />
          </button>
        ) : <ChevronDown className="date-picker-chevron" size={16} aria-hidden="true" />}
      </div>
      {isOpen && (
        <div className="date-picker-popover" role="dialog" aria-label={ariaLabel}>
          <Calendar
            value={selectedDate}
            onChange={(date) => {
              onChange(formatDate(date));
              setDraftValue(date.toLocaleDateString("en-US"));
              setIsOpen(false);
            }}
            next2Label="»"
            prev2Label="«"
            nextLabel="›"
            prevLabel="‹"
            showNeighboringMonth
          />
        </div>
      )}
    </div>
  );
}
