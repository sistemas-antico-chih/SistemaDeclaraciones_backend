import { TipoDeclaracion } from '../enums';

export interface CounterStat {
  tipoDeclaracion: TipoDeclaracion;
  count: number;
}

export interface Stats {
  total: number;
  counters: CounterStat[];
}

export interface CounterStatsTipo {
  tipoDeclaracion: TipoDeclaracion;
  count: number;
}

export interface StatsTipo {
  tipoDeclaracion: TipoDeclaracion;
  total: number;
}