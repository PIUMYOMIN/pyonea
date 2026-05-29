// components/seller/DeliveryZones.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import getMyanmarStates from '../../data/myanmar-locations';
import { toLocationTree, myanmarLocationsEng } from '../../utils/myanmarLocationTree';

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Build a flat lookup key from area fields (always uses English names from DB)
const zoneKey = (z) => [z.area_type, z.country, z.state, z.city, z.township]
  .filter(Boolean).join('|');

// ─── FeeInput ────────────────────────────────────────────────────────────────
const FeeInput = ({ value, onChange, placeholder, currencyLabel }) => (
  <div className="flex items-center gap-1">
    <input
      type="number"
      min="0"
      step="100"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onClick={(e) => e.stopPropagation()}
      placeholder={placeholder}
      className="w-24 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-1 focus:ring-green-500 dark:focus:ring-green-400 focus:outline-none"
    />
    <span className="text-xs text-gray-400 dark:text-slate-500">{currencyLabel}</span>
  </div>
);

// ─── DaysInput ───────────────────────────────────────────────────────────────
const DaysInput = ({ min, max, onChange, daysLabel = 'days' }) => (
  <div className="flex items-center gap-1">
    <input
      type="number"
      min="1"
      max="30"
      value={min}
      onChange={(e) => onChange(Number(e.target.value), max)}
      onClick={(e) => e.stopPropagation()}
      className="w-10 border border-gray-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-center bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-1 focus:ring-green-500 dark:focus:ring-green-400 focus:outline-none"
    />
    <span className="text-xs text-gray-400 dark:text-slate-500">–</span>
    <input
      type="number"
      min="1"
      max="30"
      value={max}
      onChange={(e) => onChange(min, Number(e.target.value))}
      onClick={(e) => e.stopPropagation()}
      className="w-10 border border-gray-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-center bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-1 focus:ring-green-500 dark:focus:ring-green-400 focus:outline-none"
    />
    <span className="text-xs text-gray-400 dark:text-slate-500">{daysLabel}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const DeliveryZones = ({
  onSaveSuccess,
  showHeader = true,
  showFooter = true,
  saveButtonLabel,
}) => {
  const { t, i18n } = useTranslation();

  // BUG FIX: pass myanmarLocationsEng as second arg so each node knows its
  // canonical English name regardless of the active display language.
  const MYANMAR_LOCATIONS = useMemo(() => {
    const db = getMyanmarStates(i18n.language);
    return toLocationTree(db, myanmarLocationsEng);
  }, [i18n.language]);

  // selected: Set of zone keys (always English canonical names)
  const [selected, setSelected]     = useState(new Set());
  // fees: Map<key, { fee, freeThreshold, daysMin, daysMax }>
  const [fees, setFees]             = useState({});
  // expanded: Set of engState / engCity strings that have their list open
  const [expanded, setExpanded]     = useState(new Set());
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(false);
  const [wholeMyanmar, setWholeMyanmar] = useState(false);

  // ── Load existing zones from backend ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/seller/delivery-areas');
        if (res.data.success) {
          const zones      = res.data.data || [];
          const newSelected = new Set();
          const newFees    = {};

          zones.forEach((z) => {
            // zoneKey uses the English field values stored in the DB — always consistent
            const k = zoneKey(z);
            newSelected.add(k);
            newFees[k] = {
              fee:           Number(z.shipping_fee) || 0,
              freeThreshold: Number(z.free_shipping_threshold) || 0,
              daysMin:       z.estimated_delivery_days_min || 3,
              daysMax:       z.estimated_delivery_days_max || 5,
            };
          });

          const wmKey = 'country|Myanmar';
          if (newSelected.has(wmKey)) setWholeMyanmar(true);

          setSelected(newSelected);
          setFees(newFees);
        }
      } catch (e) {
        console.error('Failed to load delivery zones:', e);
        setError(t('seller.delivery_zones.error_load'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  // ── Default fee object ─────────────────────────────────────────────────
  const defaultFee = () => ({ fee: 3000, freeThreshold: 0, daysMin: 3, daysMax: 5 });

  // ── Get or create fee entry for a key ──────────────────────────────────
  const getFee = useCallback((key) => fees[key] || defaultFee(), [fees]);

  // ── Update fee field ───────────────────────────────────────────────────
  const setFeeField = useCallback((key, field, value) => {
    setFees((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || defaultFee()), [field]: value },
    }));
  }, []);

  // ── Build keys for a state and all its children (all English) ──────────
  const stateKeys = useCallback((engState) => {
    const keys = [];
    const loc  = MYANMAR_LOCATIONS.find((l) => l.engState === engState);
    if (!loc) return keys;
    keys.push(`state|Myanmar|${engState}`);
    loc.cities.forEach((c) => {
      keys.push(`city|Myanmar|${engState}|${c.engCity}`);
      c.engTownships.forEach((t) => keys.push(`township|Myanmar|${engState}|${c.engCity}|${t}`));
    });
    return keys;
  }, [MYANMAR_LOCATIONS]);

  const cityKeys = useCallback((engState, engCity) => {
    const loc  = MYANMAR_LOCATIONS.find((l) => l.engState === engState);
    const city = loc?.cities.find((c) => c.engCity === engCity);
    if (!city) return [];
    return [
      `city|Myanmar|${engState}|${engCity}`,
      ...city.engTownships.map((t) => `township|Myanmar|${engState}|${engCity}|${t}`),
    ];
  }, [MYANMAR_LOCATIONS]);

  // ── Checkbox logic ─────────────────────────────────────────────────────
  const toggleWhole = () => {
    setWholeMyanmar((prev) => {
      const next = !prev;
      if (next) {
        setSelected(new Set(['country|Myanmar']));
        if (!fees['country|Myanmar']) setFees((f) => ({ ...f, 'country|Myanmar': defaultFee() }));
      } else {
        setSelected(new Set());
      }
      return next;
    });
  };

  // All toggle functions now receive canonical English names
  const toggleState = (engState) => {
    const keys     = stateKeys(engState);
    const stateKey = `state|Myanmar|${engState}`;
    const isOn     = selected.has(stateKey);
    if (!isOn) {
      const toInit = keys.filter((k) => !fees[k]);
      if (toInit.length) setFees((f) => Object.assign({}, f, Object.fromEntries(toInit.map((k) => [k, defaultFee()]))));
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (isOn) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return next;
    });
    setWholeMyanmar(false);
  };

  const toggleCity = (engState, engCity) => {
    const keys    = cityKeys(engState, engCity);
    const cityKey = `city|Myanmar|${engState}|${engCity}`;
    const isOn    = selected.has(cityKey);
    if (!isOn) {
      const toInit = keys.filter((k) => !fees[k]);
      if (toInit.length) setFees((f) => Object.assign({}, f, Object.fromEntries(toInit.map((k) => [k, defaultFee()]))));
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (isOn) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
        const loc = MYANMAR_LOCATIONS.find((l) => l.engState === engState);
        const allCitiesSelected = loc?.cities.every((c) =>
          next.has(`city|Myanmar|${engState}|${c.engCity}`)
        );
        if (allCitiesSelected) next.add(`state|Myanmar|${engState}`);
      }
      return next;
    });
    setWholeMyanmar(false);
  };

  const toggleTownship = (engState, engCity, engTownship) => {
    const tKey = `township|Myanmar|${engState}|${engCity}|${engTownship}`;
    if (!selected.has(tKey) && !fees[tKey]) {
      setFees((f) => ({ ...f, [tKey]: defaultFee() }));
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tKey)) {
        next.delete(tKey);
        next.delete(`city|Myanmar|${engState}|${engCity}`);
        next.delete(`state|Myanmar|${engState}`);
      } else {
        next.add(tKey);
        const loc  = MYANMAR_LOCATIONS.find((l) => l.engState === engState);
        const city = loc?.cities.find((c) => c.engCity === engCity);
        const allT = city?.engTownships.every((t) =>
          next.has(`township|Myanmar|${engState}|${engCity}|${t}`)
        );
        if (allT) {
          next.add(`city|Myanmar|${engState}|${engCity}`);
          const allC = loc?.cities.every((c) =>
            next.has(`city|Myanmar|${engState}|${c.engCity}`)
          );
          if (allC) next.add(`state|Myanmar|${engState}`);
        }
      }
      return next;
    });
    setWholeMyanmar(false);
  };

  // Indeterminate helpers — use engState / engCity
  const stateIndeterminate = (engState) => {
    const allKeys = stateKeys(engState).slice(1); // exclude state key itself
    const someOn  = allKeys.some((k) => selected.has(k));
    const allOn   = allKeys.every((k) => selected.has(k));
    return someOn && !allOn;
  };

  const cityIndeterminate = (engState, engCity) => {
    const loc   = MYANMAR_LOCATIONS.find((l) => l.engState === engState);
    const city  = loc?.cities.find((c) => c.engCity === engCity);
    const tKeys = city?.engTownships.map((t) => `township|Myanmar|${engState}|${engCity}|${t}`) || [];
    const someOn = tKeys.some((k) => selected.has(k));
    const allOn  = tKeys.every((k) => selected.has(k));
    return someOn && !allOn;
  };

  // ── Save ───────────────────────────────────────────────────────────────
  // Keys already contain canonical English names → DB receives English values
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    let zones;
    if (wholeMyanmar) {
      const f = fees['country|Myanmar'] || defaultFee();
      zones = [{
        area_type:                   'country',
        country:                     'Myanmar',
        state:                       null,
        city:                        null,
        township:                    null,
        shipping_fee:                f.fee,
        free_shipping_threshold:     f.freeThreshold || null,
        estimated_delivery_days_min: f.daysMin,
        estimated_delivery_days_max: f.daysMax,
        is_active:                   true,
      }];
    } else {
      zones = Array.from(selected).map((key) => {
        const parts    = key.split('|');
        const areaType = parts[0];
        const f        = fees[key] || defaultFee();
        return {
          area_type:                   areaType,
          country:                     'Myanmar',
          state:                       parts[2] || null,  // always English
          city:                        parts[3] || null,  // always English
          township:                    parts[4] || null,  // always English
          shipping_fee:                f.fee,
          free_shipping_threshold:     f.freeThreshold || null,
          estimated_delivery_days_min: f.daysMin,
          estimated_delivery_days_max: f.daysMax,
          is_active:                   true,
        };
      });
    }

    try {
      const res = await api.post('/seller/delivery-areas/sync', { zones });
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
        if (onSaveSuccess) await onSaveSuccess();
        return true;
      } else {
        setError(res.data.message || t('seller.delivery_zones.error_save'));
      }
    } catch (e) {
      setError(e.response?.data?.message || t('seller.delivery_zones.error_save'));
    } finally {
      setSaving(false);
    }

    return false;
  };

  // ── Summary counts ─────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const states    = [...selected].filter((k) => k.startsWith('state|')).length;
    const cities    = [...selected].filter((k) => k.startsWith('city|')).length;
    const townships = [...selected].filter((k) => k.startsWith('township|')).length;
    return { states, cities, townships };
  }, [selected]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TruckIcon className="h-5 w-5 text-green-600" />
              {t('seller.delivery_zones.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {t('seller.delivery_zones.subtitle')}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || selected.size === 0}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />{t('seller.delivery_zones.saving')}</>
            ) : (
              <>{saveButtonLabel || t('seller.delivery_zones.save_zones')}</>
            )}
          </button>
        </div>
      )}

      {/* Feedback banners */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300">
          <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
          {t('seller.delivery_zones.saved')}
        </div>
      )}

      {/* Summary badge */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full font-medium">
            {summary.states} {summary.states === 1 ? t('seller.delivery_zones.state') : t('seller.delivery_zones.states')}
          </span>
          <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full font-medium">
            {summary.cities} {summary.cities === 1 ? t('seller.delivery_zones.city') : t('seller.delivery_zones.cities')}
          </span>
          <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 rounded-full font-medium">
            {summary.townships} {summary.townships === 1 ? t('seller.delivery_zones.township') : t('seller.delivery_zones.townships')}
          </span>
        </div>
      )}

      {/* Column headers */}
      <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
        <span className="flex-1">{t('seller.delivery_zones.location')}</span>
        <span className="w-32 text-right">{t('seller.delivery_zones.shipping_fee')}</span>
        <span className="w-28 text-right">{t('seller.delivery_zones.est_days')}</span>
      </div>

      {/* ── Whole Myanmar shortcut ── */}
      <div className={`border-2 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
        wholeMyanmar ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
      }`}>
        <label className="flex items-center gap-3 flex-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={wholeMyanmar}
            onChange={toggleWhole}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <GlobeAltIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('seller.delivery_zones.whole_myanmar')}</span>
            <p className="text-xs text-gray-500 dark:text-slate-400">{t('seller.delivery_zones.whole_myanmar_sub')}</p>
          </div>
        </label>

        {wholeMyanmar && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pl-7 sm:pl-0">
            <FeeInput
              currencyLabel={t('seller.delivery_zones.mmk')}
              value={getFee('country|Myanmar').fee}
              onChange={(v) => setFeeField('country|Myanmar', 'fee', v)}
            />
            <DaysInput
              daysLabel={t('seller.delivery_zones.days_label')}
              min={getFee('country|Myanmar').daysMin}
              max={getFee('country|Myanmar').daysMax}
              onChange={(min, max) => {
                setFeeField('country|Myanmar', 'daysMin', min);
                setFeeField('country|Myanmar', 'daysMax', max);
              }}
            />
          </div>
        )}
      </div>

      {/* ── State / City / Township tree ── */}
      {!wholeMyanmar && (
        <div className="space-y-3">
          {MYANMAR_LOCATIONS.map((loc) => {
            // Keys always use engState — display shows loc.state (localised)
            const stKey      = `state|Myanmar|${loc.engState}`;
            const isStateOn  = selected.has(stKey);
            const isStateInd = stateIndeterminate(loc.engState);
            const isExpanded = expanded.has(loc.engState);

            return (
              <div key={loc.engState} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">

                {/* State row */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    isStateOn || isStateInd ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                  onClick={() => setExpanded((prev) => {
                    const n = new Set(prev);
                    n.has(loc.engState) ? n.delete(loc.engState) : n.add(loc.engState);
                    return n;
                  })}
                >
                  <input
                    type="checkbox"
                    checked={isStateOn}
                    ref={(el) => { if (el) el.indeterminate = isStateInd; }}
                    onChange={() => toggleState(loc.engState)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0"
                  />
                  {/* Display localised name; key is engState */}
                  <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">{loc.state}</span>

                  {(isStateOn || isStateInd) && (
                    <div
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FeeInput
                        currencyLabel={t('seller.delivery_zones.mmk')}
                        value={getFee(stKey).fee}
                        onChange={(v) => setFeeField(stKey, 'fee', v)}
                      />
                      <DaysInput
              daysLabel={t('seller.delivery_zones.days_label')}
                        min={getFee(stKey).daysMin}
                        max={getFee(stKey).daysMax}
                        onChange={(min, max) => {
                          setFeeField(stKey, 'daysMin', min);
                          setFeeField(stKey, 'daysMax', max);
                        }}
                      />
                    </div>
                  )}

                  <span className="text-gray-400 dark:text-slate-500 ml-1 flex-shrink-0">
                    {isExpanded
                      ? <ChevronDownIcon className="h-4 w-4" />
                      : <ChevronRightIcon className="h-4 w-4" />
                    }
                  </span>
                </div>

                {/* Cities */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                    {loc.cities.map((cityObj) => {
                      const cKey      = `city|Myanmar|${loc.engState}|${cityObj.engCity}`;
                      const isCityOn  = selected.has(cKey);
                      const isCityInd = cityIndeterminate(loc.engState, cityObj.engCity);
                      const isCityExp = expanded.has(cKey);

                      return (
                        <div key={cityObj.engCity} className="border-b border-gray-100 dark:border-slate-700 last:border-0">

                          {/* City row */}
                          <div
                            className={`flex items-center gap-3 px-6 py-2.5 cursor-pointer transition-colors ${
                              isCityOn || isCityInd ? 'bg-blue-50/60 dark:bg-blue-900/20' : 'hover:bg-gray-100/60 dark:hover:bg-slate-700/40'
                            }`}
                            onClick={() => setExpanded((prev) => {
                              const n = new Set(prev);
                              n.has(cKey) ? n.delete(cKey) : n.add(cKey);
                              return n;
                            })}
                          >
                            <input
                              type="checkbox"
                              checked={isCityOn}
                              ref={(el) => { if (el) el.indeterminate = isCityInd; }}
                              onChange={() => toggleCity(loc.engState, cityObj.engCity)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                            />
                            {/* Display localised city name */}
                            <span className="flex-1 text-sm font-medium text-gray-800 dark:text-slate-200">{cityObj.city}</span>

                            {(isCityOn || isCityInd) && (
                              <div
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FeeInput
                                  currencyLabel={t('seller.delivery_zones.mmk')}
                                  value={getFee(cKey).fee}
                                  onChange={(v) => setFeeField(cKey, 'fee', v)}
                                />
                                <DaysInput
              daysLabel={t('seller.delivery_zones.days_label')}
                                  min={getFee(cKey).daysMin}
                                  max={getFee(cKey).daysMax}
                                  onChange={(min, max) => {
                                    setFeeField(cKey, 'daysMin', min);
                                    setFeeField(cKey, 'daysMax', max);
                                  }}
                                />
                              </div>
                            )}

                            <span className="text-gray-400 dark:text-slate-500 ml-1 flex-shrink-0">
                              {isCityExp
                                ? <ChevronDownIcon className="h-3.5 w-3.5" />
                                : <ChevronRightIcon className="h-3.5 w-3.5" />
                              }
                            </span>
                          </div>

                          {/* Townships */}
                          {isCityExp && (
                            <div className="bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 px-8 py-2">
                                {cityObj.townships.map((township, tIdx) => {
                                  // Display localised township name; key uses canonical English engTownship
                                  const engTownship = cityObj.engTownships[tIdx] ?? township;
                                  const tKey = `township|Myanmar|${loc.engState}|${cityObj.engCity}|${engTownship}`;
                                  const isTOn = selected.has(tKey);
                                  return (
                                    <div key={engTownship} className={`flex flex-col gap-1 p-2 rounded-lg transition-colors ${
                                      isTOn ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                                    }`}>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isTOn}
                                          onChange={() => toggleTownship(loc.engState, cityObj.engCity, engTownship)}
                                          className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        {/* Display localised township name */}
                                        <span className="text-xs text-gray-700 dark:text-slate-300">{township}</span>
                                      </label>
                                      {isTOn && (
                                        <div className="pl-5 flex flex-col gap-1">
                                          <FeeInput
                                            currencyLabel={t('seller.delivery_zones.mmk')}
                                            value={getFee(tKey).fee}
                                            onChange={(v) => setFeeField(tKey, 'fee', v)}
                                          />
                                          <DaysInput
              daysLabel={t('seller.delivery_zones.days_label')}
                                            min={getFee(tKey).daysMin}
                                            max={getFee(tKey).daysMax}
                                            onChange={(min, max) => {
                                              setFeeField(tKey, 'daysMin', min);
                                              setFeeField(tKey, 'daysMax', max);
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {selected.size === 0 && !wholeMyanmar && (
        <div className="text-center py-10 text-gray-400 dark:text-slate-500">
          <TruckIcon className="h-10 w-10 mx-auto mb-2" />
          <p className="text-sm">{t('seller.delivery_zones.no_zones')}</p>
          <p className="text-xs mt-1">{t('seller.delivery_zones.no_zones_hint')}</p>
        </div>
      )}

      {/* Save footer */}
      {showFooter && selected.size > 0 && (
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {saving
              ? t('seller.delivery_zones.saving')
              : (saveButtonLabel || t('seller.delivery_zones.save_n_zones', { count: selected.size }))}
          </button>
        </div>
      )}
    </div>
  );
};

export default DeliveryZones;
