// components/seller/ProductOptionsEditor.jsx
// Seller-facing UI for defining product options (Color, Size, etc.)
// and their predefined values before generating/creating variants.
//
// Props:
//   productId  — the product ID (required; options are saved via API)
//   onSaved    — () => void  called after options are successfully saved

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../../utils/api";
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

// ── constants ─────────────────────────────────────────────────────────────────

const OPTION_TYPES = [
  { value: "color",  labelKey: "color", hintKey: "color_hint" },
  { value: "size",   labelKey: "size", hintKey: "size_hint" },
  { value: "text",   labelKey: "text", hintKey: "text_hint" },
  { value: "image",  labelKey: "image", hintKey: "image_hint" },
  { value: "input",  labelKey: "input", hintKey: "input_hint" },
];

const emptyOption = () => ({
  _id: Math.random().toString(36).slice(2),  // local key only
  name: "",
  type: "text",
  is_required: true,
  values: [],
});

const emptyValue = () => ({
  _id: Math.random().toString(36).slice(2),
  label: "",
  value: "",
  meta: {},
});

// ── helper ────────────────────────────────────────────────────────────────────

const slugify = (str) =>
  String(str || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");

const isValidSlug = (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

// ── sub-components ────────────────────────────────────────────────────────────

const ValueRow = ({ optType, val, onChange, onRemove, t }) => (
  <div className="flex flex-col gap-2 py-1.5 group sm:flex-row sm:items-center">
    <div className="min-w-0 flex-1 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {/* Label */}
      <input
        type="text"
        placeholder={t("product_form.options.value_label_placeholder")}
        value={val.label}
        onChange={(e) => {
          const label = e.target.value;
          onChange({ ...val, label, value: val.value ? val.value : slugify(label) });
        }}
        className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm
                   bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                   focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
      <input
        type="text"
        placeholder="English slug (e.g. red)"
        value={val.value ?? ""}
        onChange={(e) => onChange({ ...val, value: slugify(e.target.value) })}
        className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm
                   bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                   focus:ring-2 focus:ring-green-500"
      />
      {/* Hex colour / image URL */}
      {optType === "color" && (
        <div className="min-w-0 flex items-center gap-2">
          <input
            type="color"
            value={val.meta?.hex ?? "#000000"}
            onChange={(e) => onChange({ ...val, meta: { ...val.meta, hex: e.target.value } })}
            className="h-9 w-12 flex-shrink-0 rounded cursor-pointer border border-gray-300 dark:border-slate-600 bg-transparent"
            title={t("product_form.options.pick_colour")}
          />
          <input
            type="text"
            placeholder="#000000"
            value={val.meta?.hex ?? ""}
            onChange={(e) => onChange({ ...val, meta: { ...val.meta, hex: e.target.value } })}
            className="min-w-0 flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm
                       bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                       focus:ring-2 focus:ring-green-500"
          />
        </div>
      )}
      {optType === "image" && (
        <input
          type="url"
          placeholder={t("product_form.placeholders.image_url", "https://…/image.jpg")}
          value={val.meta?.image_url ?? ""}
          onChange={(e) => onChange({ ...val, meta: { ...val.meta, image_url: e.target.value } })}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm
                     bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                     focus:ring-2 focus:ring-green-500"
        />
      )}
    </div>
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center self-end rounded-lg text-gray-400 transition-opacity hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 sm:self-auto sm:opacity-0 sm:group-hover:opacity-100"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  </div>
);

const OptionBlock = ({ option, onChange, onRemove, t }) => {
  const [open, setOpen] = useState(true);
  const typeInfo = OPTION_TYPES.find((t) => t.value === option.type);

  const addValue = () =>
    onChange({ ...option, values: [...option.values, emptyValue()] });

  const updateValue = (idx, updated) => {
    const values = [...option.values];
    values[idx] = updated;
    onChange({ ...option, values });
  };

  const removeValue = (idx) =>
    onChange({ ...option, values: option.values.filter((_, i) => i !== idx) });

  return (
    <div className="border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-3 bg-gray-50 dark:bg-slate-800 cursor-pointer select-none sm:gap-3 sm:px-4"
           onClick={() => setOpen((v) => !v)}>
        <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />

        <input
          type="text"
          placeholder={t("product_form.options.option_name_placeholder")}
          value={option.name ?? ""}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange({ ...option, name: e.target.value })}
          className="min-w-0 flex-[1_1_150px] px-3 py-1.5 border border-gray-300 dark:border-slate-500 rounded-lg
                     text-sm font-semibold bg-white dark:bg-slate-700
                     text-gray-800 dark:text-slate-200 placeholder-gray-400
                     focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />

        <select
          value={option.type}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange({ ...option, type: e.target.value, values: [] })}
          className="min-w-0 flex-[1_1_120px] text-xs border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1
                     bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300"
        >
          {OPTION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{t(`product_form.options.types.${type.labelKey}`)}</option>
          ))}
        </select>

        <label className="flex flex-shrink-0 items-center gap-1 text-xs text-gray-500 dark:text-slate-400"
               onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={option.is_required}
            onChange={(e) => onChange({ ...option, is_required: e.target.checked })}
            className="rounded text-green-600"
          />
          {t("product_form.options.required")}
        </label>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
        >
          <TrashIcon className="h-4 w-4" />
        </button>

        {open
          ? <ChevronUpIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
          : <ChevronDownIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      </div>

      {/* Body */}
      {open && (
        <div className="px-4 py-3 bg-white dark:bg-slate-900 space-y-1">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
            {typeInfo ? t(`product_form.options.types.${typeInfo.hintKey}`) : ""}
          </p>

          {option.type !== "input" ? (
            <>
              {/* Column headers */}
              {option.values.length > 0 && (
                <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-500 dark:text-slate-400 px-0 mb-1">
                  <span>{t("product_form.options.label")}</span>
                  <span>{option.type === "color" ? t("product_form.options.hex_colour") : option.type === "image" ? t("product_form.options.image_url") : t("product_form.options.slug")}</span>
                </div>
              )}

              {option.values.map((val, idx) => (
                <ValueRow
                  key={val._id}
                  optType={option.type}
                  val={val}
                  t={t}
                  onChange={(updated) => updateValue(idx, updated)}
                  onRemove={() => removeValue(idx)}
                />
              ))}

              <button
                type="button"
                onClick={addValue}
                className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
              >
                <PlusIcon className="h-4 w-4" /> {t("product_form.options.add_value")}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-slate-400 italic">
              {t("product_form.options.no_predefined_values")}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ── main component ────────────────────────────────────────────────────────────

const ProductOptionsEditor = ({ productId, onSaved }) => {
  const { t } = useTranslation();
  const [options, setOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load existing options when editing
  useEffect(() => {
    if (!productId) return;
    api.get(`/seller/products/${productId}/options`)
      .then((res) => {
        const loaded = (res.data.data ?? []).map((opt) => ({
          ...opt,
          _id: String(opt.id),
          values: (opt.values ?? []).map((v) => ({ ...v, _id: String(v.id) })),
        }));
        // Always set (including []) so switching products does not leave stale options.
        setOptions(loaded);
      })
      .catch(() => {
        setOptions([]);
      });
  }, [productId]);

  const addOption = () =>
    setOptions((prev) => [...prev, emptyOption()]);

  const updateOption = (idx, updated) => {
    const next = [...options];
    next[idx] = updated;
    setOptions(next);
  };

  const removeOption = (idx) =>
    setOptions((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setError("");
    setSuccess("");

    // Basic validation
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (!opt.name || !String(opt.name).trim()) {
        setError(t("product_form.options.error_missing_name", { number: i + 1 }));
        return;
      }
      if (opt.type !== "input" && opt.values.length === 0) {
        setError(t("product_form.options.error_needs_value", { name: opt.name }));
        return;
      }
      for (const v of opt.values) {
        if (!v.label || !v.label.trim()) {
          setError(t("product_form.options.error_value_label", { name: opt.name }));
          return;
        }

        const valueSlug = slugify(v.value || v.label);
        if (!valueSlug || !isValidSlug(valueSlug)) {
          setError(t("product_form.options.error_value_slug", {
            name: opt.name,
            label: v.label,
            defaultValue: 'Value "{{label}}" in option "{{name}}" needs an English slug using a-z, 0-9, or hyphen.',
          }));
          return;
        }
      }
    }

    setSaving(true);
    try {
      await api.post(`/seller/products/${productId}/options`, {
        options: options.map((opt, i) => ({
          name:        opt.name,
          type:        opt.type,
          position:    i + 1,
          is_required: opt.is_required,
          values: (opt.values ?? []).map((v, vi) => ({
            label:    v.label,
            value:    slugify(v.value || v.label),
            meta:     Object.keys(v.meta ?? {}).length > 0 ? v.meta : null,
            position: vi + 1,
          })),
        })),
      });
      setSuccess(t("product_form.options.saved"));
      onSaved?.();
    } catch (err) {
      const msgs = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(", ")
        : err.response?.data?.message ?? t("product_form.options.save_failed");
      setError(msgs);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            {t("product_form.options.title")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {t("product_form.options.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={addOption}
          className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-lg bg-green-600 px-3 text-sm font-medium text-white transition-colors hover:bg-green-700 sm:self-auto"
        >
          <PlusIcon className="h-4 w-4" /> {t("product_form.options.add_option")}
        </button>
      </div>

      {options.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-slate-600
                        rounded-xl text-gray-400 dark:text-slate-500">
          <p className="text-sm">{t("product_form.options.empty_title")}</p>
          <p className="text-xs mt-1">{t("product_form.options.empty_hint")}</p>
        </div>
      )}

      <div className="space-y-3">
        {options.map((opt, idx) => (
          <OptionBlock
            key={opt._id}
            option={opt}
            t={t}
            onChange={(updated) => updateOption(idx, updated)}
            onRemove={() => removeOption(idx)}
          />
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400
                        bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700
                        rounded-lg px-3 py-2">
          <ExclamationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400
                        bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700
                        rounded-lg px-3 py-2">
          <CheckCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {success}
        </div>
      )}

      {options.length > 0 && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? t("product_form.actions.saving") : t("product_form.options.save_options")}
        </button>
      )}
    </div>
  );
};

export default ProductOptionsEditor;
