"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { ONTARIO_COMMUNITIES, searchCommunities } from "@/lib/ontario-communities";

import styles from "./CommunityCombobox.module.css";

interface CommunityComboboxProps {
  /** Currently selected community id, or "" when nothing is selected. */
  value: string;
  /** Called with the selected community id. */
  onChange: (communityId: string) => void;
  /** Validation error to display below the field. */
  error?: string;
  label?: string;
}

/**
 * Accessible combo box for choosing an Ontario community.
 *
 * Implements the ARIA combobox pattern: a text input with a listbox popup that
 * supports typeahead filtering, arrow-key navigation, Enter to select, and
 * Escape to dismiss. The selected value is always a canonical community id.
 */
export function CommunityCombobox({
  value,
  onChange,
  error,
  label = "Community",
}: CommunityComboboxProps) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const errorId = `${baseId}-error`;

  const selectedLabel = useMemo(
    () => ONTARIO_COMMUNITIES.find((community) => community.id === value)?.label ?? "",
    [value],
  );

  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the input text in sync when the value is changed externally.
  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  const results = useMemo(() => searchCommunities(query), [query]);

  // Close the popup when focus/click moves outside the component.
  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function selectCommunity(id: string) {
    onChange(id);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      if (open && results[activeIndex]) {
        event.preventDefault();
        selectCommunity(results[activeIndex].id);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={styles.field} ref={containerRef}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={[styles.input, error ? styles.inputError : null].filter(Boolean).join(" ")}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && results[activeIndex] ? `${baseId}-option-${results[activeIndex].id}` : undefined
        }
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        autoComplete="off"
        placeholder="Start typing your region…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(0);
          // Clear the selection when the text no longer matches the selection.
          if (event.target.value !== selectedLabel) {
            onChange("");
          }
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open ? (
        <ul id={listboxId} role="listbox" className={styles.listbox} aria-label={label}>
          {results.length === 0 ? (
            <li className={styles.empty} role="presentation">
              No matching communities
            </li>
          ) : (
            results.map((community, index) => (
              <li
                key={community.id}
                id={`${baseId}-option-${community.id}`}
                role="option"
                aria-selected={community.id === value}
                className={[
                  styles.option,
                  index === activeIndex ? styles.optionActive : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  // Prevent the input from blurring before the click registers.
                  event.preventDefault();
                  selectCommunity(community.id);
                }}
              >
                {community.label}
              </li>
            ))
          )}
        </ul>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
