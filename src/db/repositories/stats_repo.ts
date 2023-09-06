import { CounterStat, Stats, StatsTipo, TipoDeclaracion } from '../../types';
import DeclaracionModel from '../models/declaracion_model';
import mongoose from 'mongoose';

export class StatsRepository {
  public static async get(userID?: string): Promise<Stats> {
    const filters: Record<string, any> = {};
    if (userID) {
      filters['owner'] = mongoose.Types.ObjectId(userID);
    }

    const results = await DeclaracionModel.aggregate([
      { $match: { ...filters }},
      //{ $match: { 'owner':userID, 'firmada':true }},
      { $group: { _id: '$tipoDeclaracion', count: { $sum: 1 }} }
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

  public static async getStatsTipo(tipoDeclaracion:TipoDeclaracion, anioEjercicio: number, userID?: string): Promise<StatsTipo> {
    const filters: Record<string, any> = {};
    if (userID) {
      filters['owner'] = mongoose.Types.ObjectId(userID);
    }

    const results = await DeclaracionModel.aggregate([
      //{ $match: { ...filters }},
      { $match: { 
        'owner':userID, 'firmada':true, 'anioEjercicio':anioEjercicio, 'tipoDeclaracion':tipoDeclaracion
      }},
      { $group: { _id: '$tipoDeclaracion', count: { $sum: 1 }} }
    ]);

    console.log("llega getStatsTipo");
    let total = 0;
    results.forEach(tipo => {
      total += tipo.count;
    });
    const tipodec=tipoDeclaracion;
    console.log('total: '+total);
    console.log('tipoDeclaracion: '+ tipodec);

    return { tipoDeclaracion, total};
  }
}