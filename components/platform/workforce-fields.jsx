"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Check, MapPin, Plus, Search, X } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  fetchCities, fetchCountries, fetchIndustries,
} from "@/services/api/platform/platform-api";
import { cn } from "@/lib/utils";

/**
 * The onboarding form's workforce section: industry, country, branch
 * locations and job levels.
 *
 * Shared by the New-tenant and Edit-tenant dialogs so the two cannot drift —
 * a tenant created with a curated list and then edited through a free-text
 * box would put exactly the unfilterable values back that `0031` removed.
 *
 * **The country list and the city list come from the API, never the bundle.**
 * `country-state-city` unpacks to ~17 MB; shipping it to the browser to fill
 * one dropdown on one admin screen would be the worst trade in the codebase.
 * Cities are fetched per country, on demand, and only when one is chosen.
 */

/* ── Industry ────────────────────────────────────────────────────────────── */

export function IndustryField({ value, onChange }) {
  const [industries, setIndustries] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchIndustries()
      .then((d) => alive && setIndustries(d.industries))
      .catch(() => alive && setIndustries([]));
    return () => { alive = false; };
  }, []);

  return (
    <Box className="space-y-1.5">
      <Label>Industry</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue>{value || "Not set"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(industries ?? []).map((i) => (
            <SelectItem key={i} value={i}>{i}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* A closed list, unlike branch locations — this is how Edstellar
          segments its own customers, so it is the same twenty options for
          everybody and comparing tenants by it actually means something. */}
      <Text as="p" className="text-[10.5px] text-text-3">
        How Edstellar segments this account. Twenty sectors, deliberately
        coarse — a list nobody can compare on is worth nothing.
      </Text>
    </Box>
  );
}

/* ── Country + branch locations ──────────────────────────────────────────── */

/**
 * `value` is the array of `{ name, country_code, country_name, state_name }`
 * that becomes the tenant's branch locations. `country` is the tenant's
 * region, stored on the organization itself.
 */
export function BranchLocationFields({
  country, onCountryChange, locations, onLocationsChange,
}) {
  const [countries, setCountries] = useState(null);
  const [cities, setCities] = useState(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    fetchCountries()
      .then((d) => alive && setCountries(d.countries))
      .catch(() => alive && setCountries([]));
    return () => { alive = false; };
  }, []);

  // Cities load only once a country is picked — 250 countries' worth of
  // cities is not something to fetch speculatively.
  useEffect(() => {
    if (!country) { setCities(null); return undefined; }
    let alive = true;
    setLoadingCities(true);
    fetchCities({ countryCode: country })
      .then((d) => alive && setCities(d.cities))
      .catch(() => alive && setCities([]))
      .finally(() => alive && setLoadingCities(false));
    return () => { alive = false; };
  }, [country]);

  const selectedCountry = (countries ?? []).find((c) => c.code === country);

  /*
   * A country can have four thousand cities, so the picker is a SEARCH, not a
   * scroll. Nothing is listed until two characters are typed — an unfiltered
   * list of 4,242 names is not a control, it is a wall.
   */
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!cities || q.length < 2) return [];
    const chosen = new Set(locations.map((l) => l.name.toLowerCase()));
    return cities
      .filter((c) => c.name.toLowerCase().includes(q) && !chosen.has(c.name.toLowerCase()))
      .slice(0, 12);
  }, [cities, search, locations]);

  function add(city) {
    onLocationsChange([
      ...locations,
      {
        name: city.name,
        country_code: country,
        country_name: selectedCountry?.name ?? null,
        state_name: city.state ?? null,
      },
    ]);
    setSearch("");
  }

  function remove(name) {
    onLocationsChange(locations.filter((l) => l.name !== name));
  }

  return (
    <>
      <Box className="space-y-1.5">
        <Label>Region (country)</Label>
        <Select value={country || ""} onValueChange={onCountryChange}>
          <SelectTrigger>
            <SelectValue>
              {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : "Not set"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {(countries ?? []).map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Box>

      <Box className="space-y-1.5 sm:col-span-2">
        <Label>
          Branch locations
          {locations.length === 0 && (
            <Text as="span" className="text-danger"> *</Text>
          )}
        </Label>

        {!country ? (
          <Box className="border border-dashed border-line-strong bg-surface-2 px-3 py-3">
            <Text as="p" className="text-[11.5px] text-text-3">
              Choose a country first — branch locations are its cities.
            </Text>
          </Box>
        ) : (
          <>
            <Box className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-3" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  loadingCities
                    ? "Loading cities…"
                    : `Search ${cities?.length ?? 0} cities in ${selectedCountry?.name ?? ""}…`
                }
                disabled={loadingCities}
                className="pl-8"
              />
            </Box>

            {search.trim().length >= 2 && (
              <Box className="max-h-44 overflow-y-auto border border-line bg-surface">
                {matches.length === 0 ? (
                  <Text as="p" className="px-3 py-2.5 text-[11.5px] text-text-3">
                    No match. Branch locations must be a real city in{" "}
                    {selectedCountry?.name} — that is what keeps the value
                    filterable in reports.
                  </Text>
                ) : (
                  matches.map((c) => (
                    <button
                      key={`${c.name}-${c.state ?? ""}`}
                      type="button"
                      onClick={() => add(c)}
                      className="flex w-full cursor-pointer items-center gap-2 border-b border-line px-3 py-2 text-left text-[12px] transition-colors last:border-b-0 hover:bg-accent-tint"
                    >
                      <Plus className="size-3 shrink-0 text-accent-blue" />
                      <Text as="span" className="font-medium text-ink">{c.name}</Text>
                      {c.state && (
                        <Text as="span" className="text-[11px] text-text-3">{c.state}</Text>
                      )}
                    </button>
                  ))
                )}
              </Box>
            )}

            {locations.length > 0 ? (
              <Box className="flex flex-wrap gap-1.5 pt-1">
                {locations.map((l) => (
                  <Text
                    key={l.name}
                    as="span"
                    className="inline-flex items-center gap-1.5 border border-line bg-surface-2 py-1 pl-2 pr-1 text-[11.5px] text-ink"
                  >
                    <MapPin className="size-3 shrink-0 text-text-3" />
                    {l.name}
                    <button
                      type="button"
                      onClick={() => remove(l.name)}
                      aria-label={`Remove ${l.name}`}
                      title={`Remove ${l.name}`}
                      className="cursor-pointer p-0.5 text-text-3 transition-colors hover:text-danger"
                    >
                      <X className="size-3" />
                    </button>
                  </Text>
                ))}
              </Box>
            ) : (
              /* Stated, not implied. Until this list has an entry, the
                 tenant's admin cannot set a location on anybody they
                 onboard — that is a consequence worth saying before Save,
                 not discovering afterwards. */
              <Text as="p" className="text-[11px] text-warning">
                Add at least one. Until you do, this tenant&apos;s admin cannot
                set a branch location on any learner they onboard.
              </Text>
            )}
          </>
        )}
      </Box>
    </>
  );
}

/* ── Job levels ──────────────────────────────────────────────────────────── */

const SUGGESTED_LEVELS = [
  "Executive", "Senior", "Manager", "Mid", "Junior", "Intern",
];

/**
 * Editable, ordered, and seeded with the six the product shipped with.
 *
 * Order is the point and is stored (`organization_job_levels.sort_order`): a
 * seniority list that sorts alphabetically reads Executive, Intern, Junior,
 * Manager, which is nonsense. The array order here IS the stored order.
 */
export function JobLevelFields({ value, onChange }) {
  const [draft, setDraft] = useState("");

  function add(name) {
    const clean = name.trim();
    if (!clean) return;
    if (value.some((v) => v.toLowerCase() === clean.toLowerCase())) return;
    onChange([...value, clean]);
    setDraft("");
  }

  return (
    <Box className="space-y-1.5 sm:col-span-2">
      <Label>Job levels</Label>

      <Box className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(draft); }
          }}
          placeholder="Add a level, e.g. Principal"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 border border-line bg-surface px-2.5 text-[12px] font-semibold text-text-2 transition-colors hover:bg-accent-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-3.5" />Add
        </button>
      </Box>

      {value.length > 0 && (
        <Box className="flex flex-wrap gap-1.5 pt-1">
          {value.map((l, i) => (
            <Text
              key={l}
              as="span"
              className="inline-flex items-center gap-1.5 border border-line bg-surface-2 py-1 pl-2 pr-1 text-[11.5px] text-ink"
            >
              <Text as="span" className="font-mono text-[9.5px] text-text-3">{i + 1}</Text>
              {l}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== l))}
                aria-label={`Remove ${l}`}
                title={`Remove ${l}`}
                className="cursor-pointer p-0.5 text-text-3 transition-colors hover:text-danger"
              >
                <X className="size-3" />
              </button>
            </Text>
          ))}
        </Box>
      )}

      <Box className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <Text as="span" className="text-[10.5px] text-text-3">Suggested:</Text>
        {SUGGESTED_LEVELS.filter(
          (l) => !value.some((v) => v.toLowerCase() === l.toLowerCase()),
        ).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => add(l)}
            className="cursor-pointer border border-dashed border-line-strong px-1.5 py-0.5 text-[10.5px] text-text-2 transition-colors hover:border-accent-blue hover:text-accent-blue"
          >
            + {l}
          </button>
        ))}
      </Box>

      <Text as="p" className="text-[10.5px] text-text-3">
        Listed most senior first — that order is what the tenant&apos;s
        dropdowns use. Removing one hides it from new forms; anybody already
        recorded against it keeps their value.
      </Text>
    </Box>
  );
}
