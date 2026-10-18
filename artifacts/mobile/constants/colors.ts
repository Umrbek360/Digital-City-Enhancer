/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#212b3b',
    tint: '#328f6d',

    // Core surfaces
    background: '#f5f7fa',
    foreground: '#212b3b',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#212b3b',

    // Primary action color (buttons, links, active states)
    primary: '#328f6d',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#eaf0f5',
    secondaryForeground: '#2c394e',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#ecf0f4',
    mutedForeground: '#6a788a',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#e9f6f1',
    accentForeground: '#256a51',

    // Destructive actions (delete, error states)
    destructive: '#d23a32',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#d9dfe7',
    input: '#d3dae4',

    success: '#328f6d',
    warning: '#F59E0B',
    error: '#d23a32',
    mapBase: '#E4F0E7',
    mapRoad: '#FFFFFF',
    mapWater: '#D8EBF6',
    softBlue: '#eaf0f5',
    softGreen: '#e9f6f1',
    softOrange: '#FFF7ED',
    softRose: '#FFF1F2',
    white: '#FFFFFF',
  },

  dark: {
    text: '#e5ebf0',
    tint: '#40b58a',
    background: '#171c26',
    foreground: '#e5ebf0',
    card: '#1d232f',
    cardForeground: '#e5ebf0',
    primary: '#40b58a',
    primaryForeground: '#131720',
    secondary: '#2c3544',
    secondaryForeground: '#e5ebf0',
    muted: '#28303e',
    mutedForeground: '#a0a9b6',
    accent: '#204638',
    accentForeground: '#a2e2ca',
    destructive: '#d15852',
    destructiveForeground: '#ffffff',
    border: '#3b4454',
    input: '#414b5d',
    success: '#40b58a',
    warning: '#F59E0B',
    error: '#d15852',
    mapBase: '#253c35',
    mapRoad: '#33404a',
    mapWater: '#243a4a',
    softBlue: '#2c3544',
    softGreen: '#204638',
    softOrange: '#453824',
    softRose: '#462a31',
    white: '#1d232f',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
