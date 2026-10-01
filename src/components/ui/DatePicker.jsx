import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./DatePicker.css";

function displayDate(value, dateFormat = "MM/DD/YYYY") {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (dateFormat === "DD/MM/YYYY") return `${day}/${month}/${year}`;
  if (dateFormat === "YYYY-MM-DD") return `${year}-${month}-${day}`;
  return `${month}/${day}/${year}`;
}

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

function parseManualDate(value, dateFormat = "MM/DD/YYYY") {
  const pattern = dateFormat === "YYYY-MM-DD"
    ? /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = value.trim().match(pattern);
  if (!match) return null;
  const [, first, second, third] = match;
  const year = Number(dateFormat === "YYYY-MM-DD" ? first : third);
  const month = Number(dateFormat === "DD/MM/YYYY" ? second : dateFormat === "YYYY-MM-DD" ? second : first);
  const day = Number(dateFormat === "DD/MM/YYYY" ? first : dateFormat === "YYYY-MM-DD" ? third : second);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function DatePicker({ ariaLabel, dateFormat = "MM/DD/YYYY", onChange, placeholder, value = "" }) {
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(() => displayDate(value, dateFormat));
  const selectedDate = parseDate(value);
  const datePlaceholder = placeholder ?? (dateFormat === "DD/MM/YYYY" ? "dd/mm/yyyy" : dateFormat === "YYYY-MM-DD" ? "yyyy-mm-dd" : "mm/dd/yyyy");

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
          placeholder={datePlaceholder}
          aria-label={ariaLabel}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={() => {
            const manualDate = parseManualDate(draftValue, dateFormat);
            if (manualDate) {
              setDraftValue(displayDate(formatDate(manualDate), dateFormat));
              onChange(formatDate(manualDate));
            } else setDraftValue(displayDate(value, dateFormat));
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
              setDraftValue(displayDate(formatDate(date), dateFormat));
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
