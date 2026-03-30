/** Single source of truth for enclosure type → building ID mapping.
 *  Note: 'bld_pocilga' (no _s suffix) is intentional — changing it would break saves.
 */
export const ENCLOSURE_BUILDINGS: Record<string, string[]> = {
  gallinero:   ['bld_gallinero_s', 'bld_gallinero_m', 'bld_gallinero_l'],
  establo:     ['bld_establo_s',   'bld_establo_m',   'bld_establo_l'],
  caballeriza: ['bld_caballeriza_s','bld_caballeriza_m','bld_caballeriza_l'],
  pocilga:     ['bld_pocilga',     'bld_pocilga_m',   'bld_pocilga_l'],
  corral:      ['bld_corral',      'bld_corral_m',    'bld_corral_l'],
  colmena:     ['bld_colmena',     'bld_colmena_m',   'bld_colmena_l'],
  conejera:    ['bld_conejera',    'bld_conejera_m',  'bld_conejera_l'],
};
