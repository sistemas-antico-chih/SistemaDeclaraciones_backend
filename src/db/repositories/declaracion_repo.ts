import { BCrypt, SendgridClient } from '../../library';
import {
  DeclaracionDocument,
  DeclaracionSecciones,
  DeclaracionesFilterInput,
  Pagination,
  PaginationInputOptions,
  TipoDeclaracion,
} from '../../types';
import CreateError from 'http-errors';
import DeclaracionModel from '../models/declaracion_model';
import ReportsClient from '../../pdf_preview/reports_client';
import { StatusCodes } from 'http-status-codes';
import UserModel from '../models/user_model';


export class DeclaracionRepository {
  public static async delete(declaracionID: string, userID: string): Promise<boolean> {
    const declaracion = await DeclaracionModel.findById({ _id: declaracionID });
    if (!declaracion) {
      throw new CreateError.NotFound(`Declaration[${declaracionID}] does not exist.`);
    } else if (declaracion.owner._id != userID) {
      throw new CreateError.Forbidden(`User: ${userID} is not allowed to delete declaracion[${declaracionID}]`);
    } else if (declaracion.firmada) {
      throw new CreateError.NotAcceptable(`Declaracion[${declaracionID}] is signed and can not be deleted`);
    }

    declaracion.delete();
    return true;
  }

  public static async get(declaracionID: string): Promise<DeclaracionDocument> {
    const declaracion = await DeclaracionModel.findById({ _id: declaracionID });
    if (!declaracion) {
      throw new CreateError.NotFound(`Declaration[${declaracionID}] does not exist.`);
    }

    return declaracion;
  }

  public static async getAll(filter?: DeclaracionesFilterInput, pagination: PaginationInputOptions = {}): Promise<Pagination<DeclaracionDocument>> {
    filter = filter || {};
    const page: number = pagination.page || 0;
    const limit: number = pagination.size || 20;
    const declaraciones = await DeclaracionModel.paginate({
      query: { ...filter },
      sort: { createdAt: 'desc'},
      populate: 'owner',
      page: page + 1,
      limit: Math.min(limit, 100),
    });
    if (declaraciones) {
      return declaraciones;
    }

    return { docs: [], page, limit, hasMore: false, hasNextPage: false, hasPrevPage: false };
  }

  public static async getAllByUser(userID: string, filter?: DeclaracionesFilterInput, pagination: PaginationInputOptions = {}): Promise<Pagination<DeclaracionDocument>> {
    filter = filter || {};
    const user = await UserModel.findById({ _id: userID });
    if (!user) {
      throw new CreateError.NotFound(`User[${userID}] does not exist.`);
    }

    const page: number = pagination.page || 0;
    const limit: number = pagination.size || 20;
    const declaraciones = await DeclaracionModel.paginate({
      query: { owner: user, ...filter },
      sort: { createdAt: 'desc'},
      populate: 'owner',
      page: page + 1,
      limit: Math.min(limit, 100),
    });
    if (declaraciones) {
      return declaraciones;
    }

    return { docs: [], page, limit, hasMore: false, hasNextPage: false, hasPrevPage: false };
  }

  public static async getOrCreate(
    userID: string,
    tipoDeclaracion: TipoDeclaracion,
    declaracionCompleta = true,
  ): Promise<DeclaracionDocument> {
    const user = await UserModel.findById({ _id: userID });
    if (!user) {
      throw new CreateError.NotFound(`User[${userID}] does not exist.`);
    }
    const filter = {
      tipoDeclaracion: tipoDeclaracion,
      declaracionCompleta: declaracionCompleta,
      firmada: false,
      owner: user,
    };

      var anio=new Date().getFullYear();
      var aux= await DeclaracionModel.countDocuments({'owner':user._id});
      var declaracion = await DeclaracionModel.findOneAndUpdate(filter, {},{new: true, upsert: true});
      var aux2= await DeclaracionModel.countDocuments({'owner':user._id});
      if (aux === aux2){
        user.declaraciones.push(declaracion);
        user.save();
      }
      else if( aux !== aux2){
        if(user.primerApellido === "X"){
          user.primerApellido = ""; 
         }
         if(user.segundoApellido === "X"){
           user.segundoApellido = ""; 
          }
          
        declaracion = await DeclaracionModel.findOneAndUpdate(filter, {
        $set:{
          anioEjercicio: anio,
          datosGenerales:{
             nombre: user.nombre,
             primerApellido: user.primerApellido,
             segundoApellido: user.segundoApellido,
             curp: user.curp,
             rfc: {
                rfc: user.rfc.substring(0,10),
                homoClave: user.rfc.substring(10,13)
             }
            }
          }
        }, {new: true, upsert: true});
        user.declaraciones.push(declaracion);
        user.save();
     }
     return declaracion;
  }

  public static async sign(declaracionID: string, password: string, userID: string): Promise<Record<string, any> | null> {
    const declaracion = await DeclaracionModel.findById({ _id: declaracionID });
    if (!declaracion) {
      throw new CreateError.NotFound(`Declaration[${declaracionID}] does not exist.`);
    } else if (declaracion.owner._id != userID) {
      throw new CreateError.Forbidden(`User: ${userID} is not allowed to sign declaracion[${declaracionID}]`);
    }

    const user = await UserModel.findById({ _id: userID });
    if (!user) {
      throw new CreateError.NotFound(`User[${userID}] does not exist.`);
    }
    if (!BCrypt.compare(password, user.password)) {
      throw new CreateError.Forbidden('Provided password does not match.');
    }

    if(declaracion.datosGenerales){
      if(!declaracion.datosGenerales.paisNacimiento || !declaracion.datosGenerales.correoElectronico
        || !declaracion.datosGenerales.telefono){
        throw new CreateError.Forbidden('FALTA CAPTURAR DATOS GENERALES');
      }
    }
    if(!declaracion.datosGenerles){
      throw new CreateError.Forbidden('FALTA CAPTURAR DATOS GENERALES');
    }
    if(!declaracion.domicilioDeclarante){
      throw new CreateError.Forbidden('FALTA CAPTURAR DOMICILIO DECLARANTE');
    }
    if(!declaracion.datosCurricularesDeclarante){
        throw new CreateError.Forbidden('FALTA CAPTURAR DATOS CURRICULARES');
    }
    if(!declaracion.datosEmpleoCargoComision){
      throw new CreateError.Forbidden('FALTA CAPTURAR DOMICILIO DE EMPLEO');
    }
    if(!declaracion.experienciaLaboral){
      throw new CreateError.Forbidden('FALTA CAPTURAR EXPERIENCIA LABORAL');
    }
    if(!declaracion.ingresos){
      throw new CreateError.Forbidden('FALTA CAPTURAR INGRESOS');
    }
    if(declaracion.tipoDeclaracion !== 'MODIFICACION'){
      if(!declaracion.actividadAnualAnterior){
        throw new CreateError.Forbidden('FALTA CAPTURAR ACTIVIDAD ANUAL ANTERIOR');
      }
    }
    declaracion.firmada = true;
    declaracion.save();

    try {
      const responsePreview = await ReportsClient.getReport(declaracion);
      await SendgridClient.sendDeclarationFile(user.username, responsePreview.toString('base64'));
    } catch(e) {
      throw new CreateError.InternalServerError('There was a problem sending the Report');
    }

    const missingFields = ['a', 'b', 'c'];
    return missingFields;
  }

  public static async update(declaracionID: string, userID: string, props: DeclaracionSecciones): Promise<DeclaracionDocument> {
    const declaracion = await DeclaracionModel.findById({ _id: declaracionID });
    if (!declaracion) {
      throw new CreateError.NotFound(`Declaration with ID: ${declaracionID} does not exist.`);
    } else if (declaracion.owner._id != userID) {
      throw new CreateError.Forbidden(`User: ${userID} is not allowed to update declaracion[${declaracionID}]`);
    } else if (declaracion.firmada) {
      throw new CreateError.NotAcceptable(`Declaracion[${declaracionID}] is already signed, it cannot be updated.`);
    }

    const filter = {
      _id: declaracionID,
      firmada: false,
    };
    const options = {
      new: true,
      runValidators: true,
      context: 'query',
    };

    const updatedDeclaracion = await DeclaracionModel.findOneAndUpdate(filter, {$set: props}, options);
    if (!updatedDeclaracion) {
      throw CreateError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Something went wrong at Declaracion.update',
          { debug_info: { declaracionID, userID, props }},
      );
    }

    return updatedDeclaracion;
  }
}