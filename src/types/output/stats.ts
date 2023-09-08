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
  counters: CounterStatsTipo[];
}

export interface CounterStatsModif {
  anioEjercicio: number;
  declaracionCompleta: boolean;
  count: number;
}

export interface StatsModif {
  total: number;
  counters: CounterStatsModif[];
}