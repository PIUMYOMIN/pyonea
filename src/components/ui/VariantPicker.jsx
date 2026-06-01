// components/ui/VariantPicker.jsx
// Buyer-facing option selector shown on the product detail page.
// Renders the correct UI widget per option type:
//   color  → coloured circle swatches
//   size   → pill buttons (S / M / L / XL)
//   text   → pill buttons (plain text)
//   image  → thumbnail image swatches
//   input  → free-text field typed by the buyer
//
// Props:
//   options         — array from ProductResource.options
//   variants        — array from ProductResource.variants (active only)
//   onVariantChange — (variant | null, selectedValues) => void
//                     called whenever the selection changes

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { getImageUrl } from "../../utils/imageHelpers";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true when at least one variant has option_values rows populated.
 * When every variant has an empty option_values array it means the product
 * uses the "default variant" pattern (single stock row, no real combinations),
 * so disable-logic based on combinations is meaningless.
 */
const hasRealVariantCombinations = (variants) =>
  Array.isArray(variants) && variants.some((v) => v.option_values?.length > 0);

/**
 * Given the current map of { optionId → valueId } selections and
 * the full variant list, find the exactly matching variant (if any).
 *
 * Special case — "default variant" pattern:
 *   A product whose variants all have option_values = [] is a simple product
 *   stored with one placeholder variant for uniform stock management.
 *   Once the buyer makes any selection we return that first variant so the
 *   add-to-cart flow can proceed with the correct SKU / price.
 */
const findMatchingVariant = (variants, selectedValues) => {
  const selectedIds = Object.values(selectedValues).filter(Boolean);
  if (selectedIds.length === 0) return null;

  // Default-variant pattern: no real combinations → use the first variant.
  if (!hasRealVariantCombinations(variants)) {
    return variants?.[0] ?? null;
  }

  return (
    variants.find((v) => {
      const variantValueIds = (v.option_values ?? []).map((ov) => ov.value_id);
      return (
        selectedIds.length === variantValueIds.length &&
        selectedIds.every((id) => variantValueIds.includes(id))
      );
    }) ?? null
  );
};

/**
 * Given the current partial selection and a candidate value,
 * check if adding it would lead to at least one valid variant.
 *
 * Returns true (never disables) when:
 *   • variants is empty — seller hasn't generated combinations yet
 *   • no variant has option_values — default-variant pattern
 */
const wouldHaveMatch = (variants, currentSelected, optionId, valueId) => {
  // No real combinations to validate against → treat all values as available.
  if (!hasRealVariantCombinations(variants)) return true;

  const hypothetical = { ...currentSelected, [optionId]: valueId };
  const selectedIds = Object.values(hypothetical).filter(Boolean);

  return variants.some((v) => {
    const variantValueIds = (v.option_values ?? []).map((ov) => ov.value_id);
    return selectedIds.every((id) => variantValueIds.includes(id));
  });
};

// ── sub-components ────────────────────────────────────────────────────────────

const ColorSwatch = ({ value, isSelected, isDisabled, onClick }) => (
  <button
    type="button"
    title={value.label}
    onClick={() => !isDisabled && onClick()}
    disabled={isDisabled}
    className={`
      relative h-11 w-11 flex-shrink-0 rounded-full p-1 transition-all
      focus:outline-none
      ${isSelected ? "bg-transparent" : "bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800"}
      ${isDisabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer"}
    `}
  >
    <span
      className={`
        block h-full w-full rounded-full border shadow-inner
        ${isSelected ? "border-gray-300 dark:border-slate-500" : "border-gray-300 dark:border-slate-500"}
      `}
      style={{ backgroundColor: value.meta?.hex ?? "#ccc" }}
      aria-hidden="true"
    >
      {isSelected && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-3 w-3 rounded-full bg-white shadow" />
        </span>
      )}
    </span>
    <span className="sr-only">
      {value.label}
    </span>
  </button>
);

const PillButton = ({ label, isSelected, isDisabled, onClick }) => (
  <button
    type="button"
    onClick={() => !isDisabled && onClick()}
    disabled={isDisabled}
    className={`
      min-h-10 min-w-0 max-w-full px-3 py-2 sm:px-4 rounded-lg border text-sm font-medium leading-snug transition-all
      focus:outline-none focus:ring-2 focus:ring-green-500
      ${isSelected
        ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
        : "border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-gray-400 dark:hover:border-slate-400 bg-white dark:bg-slate-800"}
      ${isDisabled
        ? "opacity-30 cursor-not-allowed line-through"
        : "cursor-pointer"}
    `}
  >
    <span className="block max-w-full truncate">{label}</span>
  </button>
);

const ImageSwatch = ({ value, isSelected, isDisabled, onClick }) => (
  <button
    type="button"
    title={value.label}
    onClick={() => !isDisabled && onClick()}
    disabled={isDisabled}
    className={`
      h-14 w-14 flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all
      focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500
      ${isSelected
        ? "border-green-500 ring-1 ring-green-300 scale-105 shadow-md"
        : "border-gray-300 dark:border-slate-600 hover:border-gray-400"}
      ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
    `}
  >
    <img
      src={getImageUrl(value.meta?.image_url)}
      alt={value.label}
      className="w-full h-full object-cover"
      onError={(e) => { e.target.style.display = "none"; }}
    />
  </button>
);

// ── main component ────────────────────────────────────────────────────────────

const VariantPicker = ({ options = [], variants = [], onVariantChange }) => {
  const { t } = useTranslation();
  // { [optionId]: valueId }  for predefined-choice options
  const [selected, setSelected] = useState({});
  // { [optionId]: string }   for free-text "input" options
  const [textInputs, setTextInputs] = useState({});

  // Initialise selection maps when options arrive
  useEffect(() => {
    const initSelected = {};
    const initText = {};
    options.forEach((opt) => {
      if (opt.type === "input") {
        initText[opt.id] = "";
      } else {
        initSelected[opt.id] = null;
      }
    });
    setSelected(initSelected);
    setTextInputs(initText);
  }, [options]);

  // Notify parent whenever selection changes
  useEffect(() => {
    const matchedVariant = findMatchingVariant(variants, selected);

    // Build selected_options snapshot: { "Color": "Red", "Size": "M", "Engraving": "John" }
    const selectedOptions = {};
    options.forEach((opt) => {
      if (opt.type === "input") {
        if (textInputs[opt.id]) selectedOptions[opt.name] = textInputs[opt.id];
      } else {
        const chosenId = selected[opt.id];
        const chosenValue = opt.values?.find((v) => v.id === chosenId);
        if (chosenValue) selectedOptions[opt.name] = chosenValue.label;
      }
    });

    onVariantChange?.(matchedVariant, selectedOptions);
  }, [selected, textInputs]);

  const handleSelect = useCallback((optionId, valueId) => {
    setSelected((prev) => ({
      ...prev,
      // Toggle off if already selected, otherwise select
      [optionId]: prev[optionId] === valueId ? null : valueId,
    }));
  }, []);

  const handleTextInput = useCallback((optionId, value) => {
    setTextInputs((prev) => ({ ...prev, [optionId]: value }));
  }, []);

  if (!options || options.length === 0) return null;

  return (
    <div className="min-w-0 space-y-5">
      {options.map((option) => (
        <div key={option.id} className="min-w-0">
          {/* Option label */}
          <div className="mb-2.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 max-w-full break-words text-sm font-semibold text-gray-800 dark:text-slate-200">
              {option.name}
            </span>
            {option.type !== "input" && selected[option.id] && (
              <span className="min-w-0 max-w-full text-sm text-gray-500 dark:text-slate-400">
                <span className="text-gray-400 dark:text-slate-500">:</span>{" "}
                <span className="font-medium text-gray-700 dark:text-slate-300">
                  {option.values?.find((v) => v.id === selected[option.id])?.label}
                </span>
              </span>
            )}
            {option.is_required && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-300">
                {t("product_form.options.required", "Required")}
              </span>
            )}
          </div>

          {/* Widget per type */}
          {option.type === "color" && (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {option.values?.map((value) => {
                const isSelected = selected[option.id] === value.id;
                const isDisabled =
                  !isSelected &&
                  !wouldHaveMatch(variants, selected, option.id, value.id);
                return (
                  <ColorSwatch
                    key={value.id}
                    value={value}
                    isSelected={isSelected}
                    isDisabled={isDisabled}
                    onClick={() => handleSelect(option.id, value.id)}
                  />
                );
              })}
            </div>
          )}

          {(option.type === "size" || option.type === "text") && (
            <div className="grid min-w-0 grid-cols-2 gap-2 min-[420px]:flex min-[420px]:flex-wrap min-[420px]:items-center">
              {option.values?.map((value) => {
                const isSelected = selected[option.id] === value.id;
                const isDisabled =
                  !isSelected &&
                  !wouldHaveMatch(variants, selected, option.id, value.id);
                return (
                  <PillButton
                    key={value.id}
                    label={value.label}
                    isSelected={isSelected}
                    isDisabled={isDisabled}
                    onClick={() => handleSelect(option.id, value.id)}
                  />
                );
              })}
            </div>
          )}

          {option.type === "image" && (
            <div className="grid min-w-0 grid-cols-3 gap-3 min-[420px]:flex min-[420px]:flex-wrap min-[420px]:items-start">
              {option.values?.map((value) => {
                const isSelected = selected[option.id] === value.id;
                const isDisabled =
                  !isSelected &&
                  !wouldHaveMatch(variants, selected, option.id, value.id);
                return (
                  <div key={value.id} className="flex min-w-0 flex-col items-center gap-1">
                    <ImageSwatch
                      value={value}
                      isSelected={isSelected}
                      isDisabled={isDisabled}
                      onClick={() => handleSelect(option.id, value.id)}
                    />
                    <span className="w-16 truncate text-center text-xs text-gray-500 dark:text-slate-400">
                      {value.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {option.type === "input" && (
            <div>
              <input
                type="text"
                value={textInputs[option.id] ?? ""}
                onChange={(e) => handleTextInput(option.id, e.target.value)}
                placeholder={`Enter ${option.name.toLowerCase()}…`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                           text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                           focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      ))}

      {/* Validation hint — shown when all non-input options are selected but no variant matches.
           Only meaningful when the product has real variant combinations. */}
      {(() => {
        if (!hasRealVariantCombinations(variants)) return null;
        const nonInputOptions = options.filter((o) => o.type !== "input");
        const allSelected = nonInputOptions.every((o) => selected[o.id]);
        const matched = findMatchingVariant(variants, selected);
        if (allSelected && !matched && nonInputOptions.length > 0) {
          return (
            <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
              <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
              <span className="min-w-0">{t("product_form.variants.unavailable_combination", "This combination is currently unavailable.")}</span>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
};

export default VariantPicker;
