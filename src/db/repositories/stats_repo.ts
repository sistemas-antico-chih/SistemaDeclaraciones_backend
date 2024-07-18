import { Context,CounterStat, Stats, StatsTipo, CounterStatsTipo, StatsModif, CounterStatsModif } from '../../types';
import CreateError from 'http-errors';
import DeclaracionModel from '../models/declaracion_model';
import { Role } from './../../types/enums';
import UserModel from '../models/user_model';
import mongoose from 'mongoose';

export class StatsRepository {
  public static async get(context: Context): Promise<Stats> {
    const filters: Record<string, any> = {};
    const { id, scopes } = context.user;

    if (scopes.includes('Stats:read:all')) {
      // return StatsRepository.get(context.user.id);
      const user = await UserModel.findById({ _id: id });
      if (!user?.roles.includes(Role.ROOT)) {
        const institucion = user?.institucion?.clave;
        if (institucion) {
          filters['institucion'] = institucion;
        }
      }
    } else if (scopes.includes('Stats:read:mine')) {
      // return StatsRepository.get(context.user.id);
      filters['owner'] = mongoose.Types.ObjectId(id);
    } else {
      throw new CreateError.Unauthorized(`User[${id}] is not allowed to perform this operation.`);
    }

    const results = await DeclaracionModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: { tipoDeclaracion: 1, owner: 1, institucion: '$user.institucion.clave' }
      },
      { $match: { ...filters } },
      { $group: { _id: '$tipoDeclaracion', count: { $sum: 1 } } }
    ]);

    const counters: CounterStat[] = [];
    let total = 0;
    results.forEach(tipo => {
      total += tipo.count;
      counters.push({
        tipoDeclaracion: tipo._id,
        count: tipo.count
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
        anioEjercicio: tipo._id.anioEjercicio,
        declaracionCompleta: tipo._id.declaracionCompleta,
        count: tipo.count,
      });
    });
    console.log('total: ' + total);
    return { total, counters };
  }
}

