import { createTheme } from '@mantine/core';

/**
 * Zentrales Mantine-Theme. Farbwerte und Abstände hier anpassen –
 * sie landen automatisch als CSS-Variablen (--mantine-*) im DOM und
 * sind damit auch in unseren .module.scss-Dateien nutzbar.
 */
export const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontWeight: '650',
  },
});