import { effectGradient } from '../effectColors.js';
import classes from '../SmartHome.module.scss';

/**
 * Farbvorschau zu einem Effekt.
 *
 * Rein dekorativ und deshalb `aria-hidden`: der Name daneben trägt die
 * Information, die Fläche macht sie nur schneller erfassbar. Abgeleitete
 * (nicht gedeutete) Farben werden gedämpft dargestellt – siehe effectColors.js.
 */
export default function EffectSwatch({ name, size = 'md' }) {
  const { background, known } = effectGradient(name);

  return (
    <span
      className={classes.effectSwatch}
      data-size={size}
      data-guessed={known ? undefined : true}
      style={{ background }}
      aria-hidden="true"
    />
  );
}
