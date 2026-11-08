import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ACCENT_HEX, NEUTRAL_HEX } from '../palette';

/** Variables del primer bloque `:root { ... }` (modo claro) de flexoki.css. */
function readLightVariables(): Record<string, string> {
  const css = readFileSync(fileURLToPath(new URL('../../styles/flexoki.css', import.meta.url)), 'utf-8');
  const block = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
  const vars: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) {
    vars[name] = value.toUpperCase();
  }
  return vars;
}

describe('paleta compartida (PNG) frente a flexoki.css', () => {
  const vars = readLightVariables();

  it.each(Object.entries(ACCENT_HEX))('el color %s coincide con las variables CSS', (key, hex) => {
    expect(vars[`fx-${key}`]).toBe(hex.text);
    expect(vars[`fx-${key}-light`]).toBe(hex.bg);
    expect(vars[`fx-${key}-border`]).toBe(hex.border);
  });

  it('los neutros coinciden con los de Flexoki', () => {
    expect(vars['fx-paper']).toBe(NEUTRAL_HEX.paper);
    expect(vars['fx-base-50']).toBe(NEUTRAL_HEX.base50);
    expect(vars['fx-base-150']).toBe(NEUTRAL_HEX.base150);
    expect(vars['fx-base-600']).toBe(NEUTRAL_HEX.base600);
    expect(vars['fx-base-700']).toBe(NEUTRAL_HEX.base700);
    expect(vars['fx-black']).toBe(NEUTRAL_HEX.black);
  });
});
