// Mantine-Preset: sorgt u. a. für Fallbacks von light-dark().
// Achtung: die rem()/em()-Funktionen und die @mixin-Helfer des Presets werden
// hier NICHT genutzt – dafür ist in SCSS src/styles/_mantine.scss zuständig
// (Sass wertet $variablen und rem() bereits vor PostCSS aus).
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
  },
};