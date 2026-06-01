// components/ui/VariantPicker.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { getImageUrl } from "../../utils/imageHelpers";

const findMatchingVariant = (variants, selectedValues) => {
  const selectedIds = Object.values(selectedValues).filter(Boolean);
  if (selectedIds.length === 0) return null;

  return (
    variants.find((v) => {
      const variantValueIds = v.option_values.map((ov) => ov.value_id);
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
 */
const wouldHaveMatch = (variants, currentSelected, optionId, valueId) => {
  const hypothetical = { ...currentSelected, [optionId]: valueId };
  const selectedIds = Object.values(hypothetical).filter(Boolean);

  return variants.some((v) => {
    const variantValueIds = v.option_values.map((ov) => ov.value_id);
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
      relative w-9 h-9 rounded-full border-2 transition-all
      focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500
      ${isSelected
        ? "border-green-500 scale-110 shadow-md"
        : "border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-400"}
      ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
    `}
    style={{ backgroundColor: value.meta?.hex ?? "#ccc" }}
  >
    {isSelected && (
      <span className="absolute inset-0 flex items-center justify-center">
        {/* Contrast ring so the tick is visible on any colour */}
        <span className="w-2.5 h-2.5 rounded-full bg-white/80 ring-1 ring-white/60" />
      </span>
    )}
  </button>
);

const PillButton = ({ label, isSelected, isDisabled, onClick }) => (
  <button
    type="button"
    onClick={() => !isDisabled && onClick()}
    disabled={isDisabled}
    className={`
      px-4 py-2 rounded-lg border text-sm font-medium transition-all
      focus:outline-none focus:ring-2 focus:ring-green-500
      ${isSelected
        ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
        : "border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-gray-400 dark:hover:border-slate-400 bg-white dark:bg-slate-800"}
      ${isDisabled
        ? "opacity-30 cursor-not-allowed line-through"
        : "cursor-pointer"}
    `}
  >
    {label}
  </button>
);

const ImageSwatch = ({ value, isSelected, isDisabled, onClick }) => (
  <button
    type="button"
    title={value.label}
    onClick={() => !isDisabled && onClick()}
    disabled={isDisabled}
    className={`
      w-14 h-14 rounded-lg border-2 overflow-hidden transition-all
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
    <div className="space-y-5">
      {options.map((option) => (
        <div key={option.id}>
          {/* Option label */}
          <div className="flex items-baseline gap-2 mb-2.5">
            <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
              {option.name}
            </span>
            {/* Show the currently selected value label next to the option name */}
            {option.type !== "input" && selected[option.id] && (
              <span className="text-sm text-gray-500 dark:text-slate-400">
                :{" "}
                <span className="font-medium text-gray-700 dark:text-slate-300">
                  {option.values?.find((v) => v.id === selected[option.id])?.label}
                </span>
              </span>
            )}
            {option.is_required && (
              <span className="text-xs text-red-500 ml-auto">{t("product_form.options.required", "Required")}</span>
            )}
          </div>

          {/* Widget per type */}
          {option.type === "color" && (
            <div className="flex flex-wrap gap-2.5">
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
            <div className="flex flex-wrap gap-2">
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
            <div className="flex flex-wrap gap-3">
              {option.values?.map((value) => {
                const isSelected = selected[option.id] === value.id;
                const isDisabled =
                  !isSelected &&
                  !wouldHaveMatch(variants, selected, option.id, value.id);
                return (
                  <div key={value.id} className="flex flex-col items-center gap-1">
                    <ImageSwatch
                      value={value}
                      isSelected={isSelected}
                      isDisabled={isDisabled}
                      onClick={() => handleSelect(option.id, value.id)}
                    />
                    <span className="text-xs text-gray-500 dark:text-slate-400">
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
                className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                           text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                           focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      ))}

      {/* Validation hint — shown when all non-input options are selected but no variant matches */}
      {(() => {
        const nonInputOptions = options.filter((o) => o.type !== "input");
        const allSelected = nonInputOptions.every((o) => selected[o.id]);
        const matched = findMatchingVariant(variants, selected);
        if (allSelected && !matched && nonInputOptions.length > 0) {
          return (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
              <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
              <span>{t("product_form.variants.unavailable_combination", "This combination is currently unavailable.")}</span>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
};

export default VariantPicker;
