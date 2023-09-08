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
  total: number;
  counters: CounterStatsTipo[];
}

export interface CounterStatsModif {
  tipoDeclaracion: TipoDeclaracion;
  count: number;
}

export interface StatsModif {
  tipoDeclaracion: TipoDeclaracion;
  total: number;
}