"use client";

// Registers the <iconify-icon> custom element from the locally-installed npm
// package (no CDN script). Importing the module runs its side effect that
// defines the element. Icon SVG data is still fetched lazily from Iconify's API
// the first time each icon is used.
import "iconify-icon";

export function IconifyRuntime() {
  return null;
}
