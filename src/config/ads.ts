/**
 * Ad slots for the FREE converter pages only (never in the Studio,
 * Account, or Get access pages — paying users never see ads).
 *
 * HOW TO TURN ADS ON:
 *   1. Paste your Adsterra banner code into `topBanner` and/or
 *      `bottomBanner` below (the full snippet they give you).
 *   2. Set `enabled: true`.
 * That's it — the free pages render the slots automatically.
 *
 * While `enabled` is false (or a slot's code is empty), the slot renders
 * nothing at all — no placeholder box, no layout shift.
 */
export const ADS = {
  enabled: false,
  /** Shown on free pages below the hero/intro, above the converter. */
  topBanner: '',
  /** Shown on free pages below the converter. */
  bottomBanner: '',
};
