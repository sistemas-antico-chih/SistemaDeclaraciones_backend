import { CounterStat, Stats, StatsTipo, CounterStatsTipo, StatsModif, CounterStatsModif } from '../../types';
import DeclaracionModel from '../models/declaracion_model';
import mongoose from 'mongoose';

export class StatsRepository {
  public static async get(userID?: string): Promise<Stats> {
    const filters: Record<string, any> = {};

    if (userID) {
      filters['owner'] = mongoose.Types.ObjectId(userID);
    }
    console.log(userID);
    console.log(filters);

    const results = await DeclaracionModel.aggregate([
      { $match: { ...filters } },
      /*{
        $match: {
          $and: [
            { ...filters },
            { 'firmada': true }
          ]
        }
      },*/
      { $group: { _id: '$tipoDeclaracion', count: { $sum: 1 } } }
    ]);

    const counters: CounterStat[] = [];
    let total = 0;
    results.forEach(tipo => {
      total += tipo.count;
      counters.push({
        tipoDeclaracion: tipo._id,
        count: tipo.count,
      });
    });
    return { total, counters };
  }

  public static async getStatsTipo(userID?: string): Promise<StatsTipo> {
    const filters: Record<string, any> = {};
    if (userID) {
      filters['owner'] = mongoose.Types.ObjectId(userID);
    }

    const results = await DeclaracionModel.aggregate([
      //{ $match: { ...filters }},
      {
        $match: {
          $and: [
            { ...filters },
            { 'firmada': true },
            { 'tipoDeclaracion':{$ne:"MODIFICACION"} },
            { 'datosGenerales': { $exists: true } },
            { 'domicilioDeclarante': { $exists: true } },
            { 'datosCurricularesDeclarante': { $exists: true } },
            { 'datosEmpleoCargoComision': { $exists: true } },
            { 'experienciaLaboral': { $exists: true } },
            { 'ingresos': { $exists: true } },
            { 'actividadAnualAnterior': { $exists: true } },
          ]
        }
      },
      { $group: { _id: '$tipoDeclaracion', count: { $sum: 1 } } }
    ]);
    const counters: CounterStatsTipo[] = [];
    let total = 0;
    results.forEach(tipo => {
      total += tipo.count;
      counters.push({
        tipoDeclaracion: tipo._id,
        count: tipo.count,
      });
    });
    console.log('total: ' + total);
    return {  counters };
  }

  public static async getStatsModif( userID?: string): Promise<StatsModif> {
    const filters: Record<string, any> = {};
    if (userID) {
      filters['owner'] = mongoose.Types.ObjectId(userID);
    }

    const results = await DeclaracionModel.aggregate([
      //{ $match: { ...filters }},
      {
        $match: {
          $and: [
            { ...filters },
            { 'firmada': true },
            { 'tipoDeclaracion': 'MODIFICACION'},
            { 'datosGenerales': { $exists: true } },
            { 'domicilioDeclarante': { $exists: true } },
            { 'datosCurricularesDeclarante': { $exists: true } },
            { 'datosEmpleoCargoComision': { $exists: true } },
            { 'experienciaLaboral': { $exists: true } },
            { 'ingresos': { $exists: true } },
          ]
        }
      },
      { $group: { _id: {'anioEjercicio':'$anioEjercicio','declaracionCompleta':'$declaracionCompleta'}, count: { $sum: 1 } } }
    ]);
    
    const counters: CounterStatsModif[] = [];
    let total = 0;
    results.forEach(tipo => {
      console.log("group: "+tipo._id);
      total += tipo.count;
      counters.push({
        anioEjercicio: tipo._id,
        count: tipo.count,
      });
    });
    console.log('total: ' + total);
    return { total, counters };
  }
}

