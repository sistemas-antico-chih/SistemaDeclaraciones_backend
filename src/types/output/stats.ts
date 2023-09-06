import { TipoDeclaracion } from '../enums';

export interface CounterStat {
  tipoDeclaracion: TipoDeclaracion;
  count: number;
}

export interface Stats {
  total: number;
  counters: CounterStat[];
}

/*export interface CounterStatsTipo {
  anioEjercicio: number;
  tipoDeclaracion: TipoDeclaracion;
  count: number;
}
*/
export interface StatsTipo {
  tipoDeclaracion: TipoDeclaracion;
  anioEjercicio: number;
  total: number;
}