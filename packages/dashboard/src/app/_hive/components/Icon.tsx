"use client";

import type { CSSProperties } from "react";

/**
 * Thin wrapper over the Iconify web component (`<iconify-icon>`), which the
 * landing page uses for its `solar:*` and `simple-icons:*` glyphs. The
 * custom element is registered by the CDN script loaded in the page; here we
 * just emit the tag. React 19 passes unknown props straight through to the DOM,
 * so `icon`, `width`, and `height` reach the element as attributes.
 */
type IconProps = {
  icon: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
};

export function Icon({ icon, className, width, height, style }: IconProps) {
  return (
    // @ts-expect-error — iconify-icon is a runtime-registered custom element
    <iconify-icon
      icon={icon}
      class={className}
      width={width}
      height={height}
      style={style}
    />
  );
}
