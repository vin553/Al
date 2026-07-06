// Entitlements — which modules a workspace currently has unlocked.
//
// Stored as a JSON array of module keys in the settings table. Modules flagged
// includedByDefault are always considered unlocked and can't be locked. For now
// unlocking is manual (from the Grow page); later it's driven by Stripe.

import { getSetting, setSetting } from "./db";
import { MODULES, computeProgress, type GrowthProgress } from "./modules";

const KEY = "entitlements";

function storedKeys(): string[] {
  const raw = getSetting(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

const includedKeys = () => MODULES.filter((m) => m.includedByDefault).map((m) => m.key);

/** All unlocked module keys (included + manually/stripe unlocked). */
export function getUnlockedKeys(): string[] {
  return Array.from(new Set([...includedKeys(), ...storedKeys()]));
}

export function hasModule(key: string): boolean {
  return getUnlockedKeys().includes(key);
}

export function setUnlocked(key: string, on: boolean): void {
  const mod = MODULES.find((m) => m.key === key);
  if (!mod || mod.includedByDefault) return; // unknown or core — ignore
  const set = new Set(storedKeys());
  if (on) set.add(key);
  else set.delete(key);
  setSetting(KEY, JSON.stringify([...set]));
}

/** Total growth points + level from currently-unlocked modules. */
export function growthProgress(): GrowthProgress {
  const unlocked = new Set(getUnlockedKeys());
  const points = MODULES.filter((m) => unlocked.has(m.key)).reduce((s, m) => s + m.points, 0);
  return computeProgress(points);
}
