import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarRange, ChevronDown, Download, Search, UserRound } from 'lucide-react';

const EMPTY_FILTERS = {
  query: '',
  status: 'all',
  startDate: '',
  endDate: '',
  operator: '',
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

function renderDateRangePopup({
  open,
  popupRef,
  style,
  draftStartDate,
  draftEndDate,
  onDraftStartDateChange,
  onDraftEndDateChange,
  onCancel,
  onApply,
}) {
  if (!open || !style || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div ref={popupRef} style={style} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[10px] tracking-[0.18em] text-gray-500">FILTER BY DATE RANGE</div>
        <button
          type="button"
          onClick={() => {
            const today = getTodayDate();
            onDraftStartDateChange(today);
            onDraftEndDateChange(today);
          }}
          className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
        >
          Jump to Today
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="w-10 text-[10px] tracking-[0.18em] text-gray-500">FROM</label>
          <input
            type="date"
            value={draftStartDate}
            onChange={(event) => onDraftStartDateChange(event.target.value)}
            className="date-input h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-10 text-[10px] tracking-[0.18em] text-gray-500">TO</label>
          <input
            type="date"
            value={draftEndDate}
            onChange={(event) => onDraftEndDateChange(event.target.value)}
            className="date-input h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onApply}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Apply change
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default function TopFilter({ onFilterChange, onExport, initial = {} }) {
  const [query, setQuery] = useState(initial.query ?? EMPTY_FILTERS.query);
  const [status, setStatus] = useState(initial.status ?? EMPTY_FILTERS.status);
  
  const [startDate, setStartDate] = useState(initial.startDate ?? getTodayDate());
  const [endDate, setEndDate] = useState(initial.endDate ?? getTodayDate());
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftEndDate, setDraftEndDate] = useState(endDate);
  const dateRangeRef = useRef(null);
  const dateRangeButtonRef = useRef(null);
  const dateRangePopupRef = useRef(null);
  const [dateRangePopupStyle, setDateRangePopupStyle] = useState(null);
  
  const [operator, setOperator] = useState(initial.operator ?? EMPTY_FILTERS.operator);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideTrigger = dateRangeRef.current && dateRangeRef.current.contains(event.target);
      const clickedInsidePopup = dateRangePopupRef.current && dateRangePopupRef.current.contains(event.target);

      if (!clickedInsideTrigger && !clickedInsidePopup) {
        setIsDateRangeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDateRangeOpen) {
      setDraftStartDate(startDate);
      setDraftEndDate(endDate);
    }
  }, [isDateRangeOpen, startDate, endDate]);

  useEffect(() => {
    if (!isDateRangeOpen || !dateRangeButtonRef.current) return;

    const updatePopupPosition = () => {
      const rect = dateRangeButtonRef.current.getBoundingClientRect();
      const popupWidth = 360;
      const left = Math.min(Math.max(rect.left, 12), window.innerWidth - popupWidth - 12);
      setDateRangePopupStyle({
        position: 'fixed',
        top: rect.bottom + 10,
        left,
        width: popupWidth,
        zIndex: 50,
      });
    };

    updatePopupPosition();
    window.addEventListener('resize', updatePopupPosition);
    window.addEventListener('scroll', updatePopupPosition, true);

    return () => {
      window.removeEventListener('resize', updatePopupPosition);
      window.removeEventListener('scroll', updatePopupPosition, true);
    };
  }, [isDateRangeOpen]);

  const clearFilters = () => {
    setQuery(EMPTY_FILTERS.query);
    setStatus(EMPTY_FILTERS.status);
    setStartDate(getTodayDate());
    setEndDate(getTodayDate());
    setOperator(EMPTY_FILTERS.operator);
    onFilterChange?.({ ...EMPTY_FILTERS, startDate: getTodayDate(), endDate: getTodayDate() });
  };

  const dateRangeLabel = useMemo(() => {
    if (startDate && endDate) return `${startDate} → ${endDate}`;
    if (startDate) return `${startDate} → Select end date`;
    if (endDate) return `Select start date → ${endDate}`;
    return 'Select date range';
  }, [startDate, endDate]);

  const applyDateRange = () => {
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setIsDateRangeOpen(false);
    onFilterChange?.({ query, status, startDate: draftStartDate, endDate: draftEndDate, operator });
  };

  const cancelDateRange = () => {
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
    setIsDateRangeOpen(false);
  };

  useEffect(() => {
    const filters = { query, status, startDate, endDate, operator };
    const t = setTimeout(() => {
      onFilterChange?.(filters);
    }, 250);
    return () => clearTimeout(t);
  }, [query, status, startDate, endDate, operator, onFilterChange]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-[25fr_15fr_30fr_20fr_10fr] gap-4 items-start">
      
      {/* Search input */}
      <div className="min-w-0 flex flex-col">
        <label className="text-[10px] text-gray-500 block mb-1 tracking-[0.18em]">SEARCH</label>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-blue-200">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              type="search"
              placeholder="Enter test ID or Test name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* STATUS input */}
      <div className="min-w-0 flex flex-col">
        <label className="text-[10px] text-gray-500 block mb-1 tracking-[0.18em]">STATUS</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-orange-500 via-sky-500 to-emerald-500" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full appearance-none rounded border border-gray-300 bg-white px-3 py-2 pl-8 pr-8 text-sm"
          >
            <option value="all">All</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="stopped">Stopped</option>
            <option value="pending">Pending</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Dates */}
      <div ref={dateRangeRef} className="relative min-w-0 flex flex-col">
        <label className="text-[10px] text-gray-500 block mb-1 tracking-[0.18em]">DATE RANGE</label>
        <button
          ref={dateRangeButtonRef}
          type="button"
          onClick={() => setIsDateRangeOpen((open) => !open)}
          className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <CalendarRange className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="min-w-0 flex-1 truncate text-left font-medium">{dateRangeLabel}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isDateRangeOpen ? 'rotate-180' : ''}`} />
        </button>

        {renderDateRangePopup({
          open: isDateRangeOpen,
          popupRef: dateRangePopupRef,
          style: dateRangePopupStyle,
          draftStartDate,
          draftEndDate,
          onDraftStartDateChange: setDraftStartDate,
          onDraftEndDateChange: setDraftEndDate,
          onCancel: cancelDateRange,
          onApply: applyDateRange,
        })}
      </div>

      {/* Operator */}
      <div className="min-w-0 flex flex-col">
        <label className="text-[10px] text-gray-500 block mb-1 tracking-[0.18em]">OPERATOR</label>
        <div className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm">
          <UserRound className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            type="text"
            placeholder="Add operator..."
            value={operator}
            onChange={e => setOperator(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
      </div>
      
      {/* Export Button */}
      <div className="min-w-0 flex flex-col">
        <label aria-hidden className="text-[10px] text-transparent block mb-1 tracking-[0.18em]">placeholder</label>
        <div className="flex items-center justify-center">
          <button onClick={() => onExport && onExport()} className="flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 whitespace-nowrap">
            <Download className="h-4 w-4 shrink-0" />
            Export CSV
          </button>
        </div>
      </div>
      </div>
      
      {/* Clear Filters */}
      {/* <div className="mt-1">
        <button type="button" onClick={clearFilters} className="text-[13px] text-blue-600 underline underline-offset-2 hover:text-blue-800">
          Clear all
        </button>
      </div> */}

    </div>
  );
}
