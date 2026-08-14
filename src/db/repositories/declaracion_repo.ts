import { BCrypt, SendgridClient } from '../../library';
import {
  Context,
  DeclaracionDocument,
  DeclaracionSecciones,
  DeclaracionesFilterInput,
  Pagination,
  PaginationInputOptions,
  TipoDeclaracion,
} from '../../types';
import CreateError from 'http-errors';
import DeclaracionModel from '../models/declaracion_model';
import InstitucionesAPI from '../../routers/instituciones_api';
import ReportsClient from '../../pdf_preview/reports_client';
import { Role } from './../../types/enums';
import { StatusCodes } from 'http-status-codes';
import UserModel from '../models/user_model';
import { StatsRepository } from '../repositories/stats_repo';


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

  public static async getAll(filter?: DeclaracionesFilterInput, pagination: PaginationInputOptions = {}, context?: Context): Promise<Pagination<DeclaracionDocument>> {
    const filters: Record<string, any> = { ...filter };
    const page: number = pagination.page || 0;
    const limit: number = pagination.size || 20;

    let data: Pagination<DeclaracionDocument> = { docs: [], page, limit, hasMore: false, hasNextPage: false, hasPrevPage: false };

    const id = context?.user.id;
    const user = await UserModel.findById({ _id: id });
    if (!user?.roles.includes(Role.ROOT)) {
      const institucion = user?.institucion?.clave;
      if (institucion) {
        filters['institucion'] = institucion;
      }
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
      { $unwind: '$user' },
      {
        $project: { tipoDeclaracion: 1, firmada: 1, declaracionCompleta: 1, createdAt: 1, updatedAt: 1, user: 1, institucion: '$user.institucion.clave' }
      },
      {
        $match: { ...filters }
      },
      {
        $project: { tipoDeclaracion: 1, firmada: 1, declaracionCompleta: 1, createdAt: 1, updatedAt: 1, user: 1 }
      },
      {
        $skip: limit * page
      },
      {
        $limit: limit
      }
    ]);

    if (results.length > 0) {
      const docs = results.map(e => ({ ...e, owner: e.user }));
      data = { docs };
      return data;
    }

    return data;
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
      sort: { createdAt: 'desc' },
      populate: 'owner',
      page: page + 1,
      limit: Math.min(limit, 100)
    });
    if (declaraciones) {
      return declaraciones;
    }

    return { docs: [], page, limit, hasMore: false, hasNextPage: false, hasPrevPage: false };
  }

  public static async getOrCreate(userID: string, tipoDeclaracion: TipoDeclaracion, declaracionCompleta = true): Promise<DeclaracionDocument> {
    const user = await UserModel.findById({ _id: userID });
    if (!user) {
      throw new CreateError.NotFound(`User[${userID}] does not exist.`);
    }

    const filter = {
      tipoDeclaracion: tipoDeclaracion,
      declaracionCompleta: declaracionCompleta,
      firmada: false,
      owner: user,
    }

    if (filter.tipoDeclaracion === 'AVISO') {
      filter.declaracionCompleta = !declaracionCompleta;
    }

    const declaracion = await DeclaracionModel.findOneAndUpdate(filter, {}, { new: true, upsert: true });
    user.declaraciones.push(declaracion);
    user.save();

    return declaracion;
  }

  public static async lastDeclaracion(userID: string): Promise<DeclaracionDocument> {
    const user = await UserModel.findById({ _id: userID });
    if (!user) {
      throw new CreateError.NotFound(`User[${userID}] does not exist.`);
    }

    const filter = {
      owner: user,
      firmada: true
    };

    const declaracion = await DeclaracionModel.findOne(filter, {}, { sort: { updatedAt: -1 } });
    return declaracion as any;
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


    // VALIDACIÓN DE FIRMA PARA MODIFICACIÓN

    if (declaracion.tipoDeclaracion === 'MODIFICACION') {

      const fechaChihuahua = new Date(
        new Date().toLocaleString(
          'en-US',
          { timeZone: 'America/Chihuahua' }
        )
      );

      const anioActual = fechaChihuahua.getFullYear();

      const inicioMayo = new Date(anioActual, 4, 1, 0, 0, 0);

      // MODIFICACIÓN DEL AÑO ACTUAL
      if (declaracion.anioEjercicio === anioActual) {

        if (fechaChihuahua < inicioMayo) {

          throw new CreateError.Forbidden(
            'LAS DECLARACIONES DE MODIFICACIÓN DEL EJERCICIO ACTUAL SOLO PUEDEN FIRMARSE A PARTIR DEL 01 DE MAYO'
          );

        }

      }

    }

    if (declaracion.tipoDeclaracion !== 'AVISO') {
      if (declaracion.datosGenerales) {
        if (!declaracion.datosGenerales.paisNacimiento || !declaracion.datosGenerales.correoElectronico
          || !declaracion.datosGenerales.telefono) {
          throw new CreateError.Forbidden('FALTA CAPTURAR DATOS GENERALES');
        }
      }
      if (!declaracion.datosGenerales) {
        throw new CreateError.Forbidden('FALTA CAPTURAR DATOS GENERALES');
      }
      if (!declaracion.domicilioDeclarante) {
        throw new CreateError.Forbidden('FALTA CAPTURAR DOMICILIO DECLARANTE');
      }
      if (!declaracion.datosCurricularesDeclarante) {
        throw new CreateError.Forbidden('FALTA CAPTURAR DATOS CURRICULARES');
      }
      if (!declaracion.datosEmpleoCargoComision) {
        throw new CreateError.Forbidden('FALTA CAPTURAR DOMICILIO DE EMPLEO');
      }
      if (!declaracion.experienciaLaboral) {
        throw new CreateError.Forbidden('FALTA CAPTURAR EXPERIENCIA LABORAL');
      }
      if (!declaracion.ingresos) {
        throw new CreateError.Forbidden('FALTA CAPTURAR INGRESOS');
      }
      if (declaracion.tipoDeclaracion !== 'MODIFICACION') {
        if (!declaracion.actividadAnualAnterior) {
          throw new CreateError.Forbidden('FALTA CAPTURAR ACTIVIDAD ANUAL ANTERIOR');
        }
      }
      if (declaracion.declaracionCompleta === true) {
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR DATOS PAREJA');
        }
        if (!declaracion.datosDependientesEconomicos) {
          throw new CreateError.Forbidden('FALTA CAPTURAR DATOS DEPENDIENTES');
        }
        if (!declaracion.bienesInmuebles) {
          throw new CreateError.Forbidden('FALTA CAPTURAR BIENES INMUEBLES');
        }
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR VEHICULOS');
        }
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR BIENES MUEBLES');
        }
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR INVERSIONES CUENTAS VALORES');
        }
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR ADEUDOS PASIVOS');
        }
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR PRESTAMO COMODATO');
        }
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR PARTICIPACION');
        }
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR TOMA DECISIONES');
        }
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR APOYOS');
        }
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR REPRESENTACIONES');
        }
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR CLIENTES PRINCIPALES');
        }
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR BENEFICIOS PRIVADOS');
        }
        if (!declaracion.datosPareja) {
          throw new CreateError.Forbidden('FALTA CAPTURAR FIDEICOMISOS');
        }
      }
    }

    if (declaracion.tipoDeclaracion === 'AVISO') {
      if (declaracion.datosGenerales) {
        if (!declaracion.datosGenerales.paisNacimiento
          || !declaracion.datosGenerales.correoElectronico
          || !declaracion.datosGenerales.telefono) {
          throw new CreateError.Forbidden('FALTA CAPTURAR DATOS GENERALES');
        }
      }

      if (!declaracion.datosGenerales) {
        throw new CreateError.Forbidden('FALTA CAPTURAR DATOS GENERALES');
      }

      if (!declaracion.domicilioDeclarante) {
        throw new CreateError.Forbidden('FALTA CAPTURAR DOMICILIO DECLARANTE');
      }

      if (!declaracion.datosEmpleoCargoComision) {
        throw new CreateError.Forbidden('FALTA CAPTURAR DOMICILIO DE EMPLEO');
      }

      // VALIDACIONES DE AVISO

      const MENSAJE_AVISO =
        'HAN PASADO 60 DÍAS NATURALES, DEBERÁ REALIZAR REGISTRO DE CONCLUSIÓN';

      const fechaConclusion =
        declaracion.datosEmpleoCargoComision.fechaConclusionEncargo;

      const fechaTomaPosesion =
        declaracion.datosEmpleoCargoComision.fechaTomaPosesion;

      if (fechaConclusion) {

        const fechaConclusionDate = new Date(fechaConclusion);
        fechaConclusionDate.setHours(0, 0, 0, 0);

        const hoy = new Date(
          new Date().toLocaleString(
            'en-US',
            { timeZone: 'America/Chihuahua' }
          )
        );
        hoy.setHours(0, 0, 0, 0);

        // VALIDACIÓN 1:
        // Hoy vs Fecha Conclusión

        const diasDesdeConclusion = Math.floor(
          (
            hoy.getTime() -
            fechaConclusionDate.getTime()
          ) / (1000 * 60 * 60 * 24)
        );

        if (diasDesdeConclusion > 60) {
          throw new CreateError.Forbidden(MENSAJE_AVISO);
        }

        // VALIDACIÓN 2:
        // Fecha Toma Posesión vs Fecha Conclusión

        if (fechaTomaPosesion) {

          const fechaTomaPosesionDate = new Date(fechaTomaPosesion);
          fechaTomaPosesionDate.setHours(0, 0, 0, 0);

          const diferenciaEntreFechas = Math.floor(
            (
              fechaTomaPosesionDate.getTime() -
              fechaConclusionDate.getTime()
            ) / (1000 * 60 * 60 * 24)
          );

          if (diferenciaEntreFechas >= 61) {
            throw new CreateError.Forbidden(MENSAJE_AVISO);
          }

        }

      }

    }

    // Recalcular extemporaneidad definitiva al firmar

    if (declaracion.tipoDeclaracion === 'MODIFICACION') {

      const declaracionesMismoEjercicio =
        await DeclaracionModel.find({
          owner: declaracion.owner,
          tipoDeclaracion: 'MODIFICACION',
          anioEjercicio: declaracion.anioEjercicio,
          firmada: true,
          _id: { $ne: declaracion._id }
        });

      const existeCompleta =
        declaracionesMismoEjercicio.some(
          d => d.declaracionCompleta === true
        );

      const existeSimple =
        declaracionesMismoEjercicio.some(
          d => d.declaracionCompleta === false
        );

      if (declaracion.declaracionCompleta === true) {

        if (existeCompleta) {
          throw new CreateError.Forbidden(
            `YA EXISTE UNA DECLARACIÓN DE MODIFICACIÓN COMPLETA FIRMADA PARA EL EJERCICIO ${declaracion.anioEjercicio}`
          );
        }

      }

      if (declaracion.declaracionCompleta === false) {

        if (existeCompleta || existeSimple) {
          throw new CreateError.Forbidden(
            `YA EXISTE UNA DECLARACIÓN DE MODIFICACIÓN FIRMADA PARA EL EJERCICIO ${declaracion.anioEjercicio}`
          );
        }

      }

      // TU VALIDACIÓN ACTUAL DE MAYO

      const fechaChihuahua = new Date(
        new Date().toLocaleString(
          'en-US',
          { timeZone: 'America/Chihuahua' }
        )
      );

      const anioActual = fechaChihuahua.getFullYear();

      const inicioMayo = new Date(
        anioActual,
        4,
        1,
        0,
        0,
        0
      );

      if (declaracion.anioEjercicio === anioActual) {

        if (fechaChihuahua < inicioMayo) {

          throw new CreateError.Forbidden(
            'LAS DECLARACIONES DE MODIFICACIÓN DEL EJERCICIO ACTUAL SOLO PUEDEN FIRMARSE A PARTIR DEL 01 DE MAYO'
          );

        }

      }

    }

    const statsTipo =
      await StatsRepository.getStatsTipo(userID);

    const iniciales =
      statsTipo.counters.find(
        x => x.tipoDeclaracion === 'INICIAL'
      )?.count || 0;

    const conclusiones =
      statsTipo.counters.find(
        x => x.tipoDeclaracion === 'CONCLUSION'
      )?.count || 0;

    const saldo =
      iniciales - conclusiones;

    if (
      declaracion.tipoDeclaracion === 'INICIAL'
    ) {

      if (saldo > 0) {

        throw new CreateError.Forbidden(
          'YA EXISTE UNA DECLARACIÓN INICIAL ACTIVA'
        );

      }

    }

    if (
      declaracion.tipoDeclaracion === 'CONCLUSION'
    ) {

      if (saldo <= 0) {

        throw new CreateError.Forbidden(
          'NO EXISTE UNA DECLARACIÓN INICIAL ACTIVA PARA GENERAR UNA CONCLUSIÓN'
        );

      }

    }

    declaracion.firmada = true;
    declaracion.save();

    const insData = InstitucionesAPI.getInstitucionDataByClave(user.institucion?.clave || '', declaracion.tipoDeclaracion);
    await InstitucionesAPI.recordUserDec(declaracion._id, user._id, insData);

    try {
      const responsePreview = await ReportsClient.getReport(declaracion);
      await SendgridClient.sendDeclarationFile(user.username, responsePreview.toString('base64'));
    } catch (e) {
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

    const cleanEmptyObjects = (obj: any): any => {

      // eliminar null y undefined
      if (obj === null || obj === undefined) {
        return undefined;
      }

      // eliminar strings vacíos
      if (typeof obj === 'string' && obj.trim() === '') {
        return undefined;
      }

      // procesar arrays
      if (Array.isArray(obj)) {
        const cleanedArray = obj
          .map(cleanEmptyObjects)
          .filter(item => item !== undefined);

        return cleanedArray.length > 0 ? cleanedArray : undefined;
      }

      // procesar objetos
      if (typeof obj === 'object') {
        const cleanedObj: any = {};

        Object.keys(obj).forEach(key => {
          const cleanedValue = cleanEmptyObjects(obj[key]);

          if (cleanedValue !== undefined) {
            cleanedObj[key] = cleanedValue;
          }
        });

        return Object.keys(cleanedObj).length > 0
          ? cleanedObj
          : undefined;
      }

      return obj;
    };

    props = cleanEmptyObjects(props);

    // Calcular extemporaneidad
    const hoy = new Date();

    if (
      declaracion.tipoDeclaracion === 'INICIAL' ||
      declaracion.tipoDeclaracion === 'CONCLUSION'
    ) {

      if (props?.datosEmpleoCargoComision?.fechaTomaPosesion) {

        const fechaTomaPosesion = new Date(
          props.datosEmpleoCargoComision.fechaTomaPosesion
        );

        const diferenciaMs =
          hoy.getTime() - fechaTomaPosesion.getTime();

        const diferenciaDias =
          Math.floor(
            diferenciaMs / (1000 * 60 * 60 * 24)
          );

        props.esExtemporanea =
          diferenciaDias > 60;

        console.log(
          'Tipo:',
          declaracion.tipoDeclaracion,
          'Dias:',
          diferenciaDias,
          'Extemporanea:',
          props.esExtemporanea
        );
      }
    }

    if (declaracion.tipoDeclaracion === 'MODIFICACION') {

      const anioActual = hoy.getFullYear();

      const fechaChihuahua = new Date(
        hoy.toLocaleString('en-US', {
          timeZone: 'America/Chihuahua'
        })
      );

      const inicioJunio = new Date(
        fechaChihuahua.getFullYear(),
        5,
        1,
        0,
        0,
        0
      );

      if (
        declaracion.anioEjercicio &&
        declaracion.anioEjercicio < anioActual
      ) {

        props.esExtemporanea = true;

      } else if (
        declaracion.anioEjercicio === anioActual &&
        fechaChihuahua >= inicioJunio
      ) {

        props.esExtemporanea = true;

      } else {

        props.esExtemporanea = false;

      }

      console.log(
        'MODIFICACION',
        'anioEjercicio:',
        declaracion.anioEjercicio,
        'Extemporanea:',
        props.esExtemporanea
      );
    }

    const filter = {
      _id: declaracionID,
      firmada: false
    };
    const options = {
      new: true,
      runValidators: true,
      context: 'query'
    };

    const updatedDeclaracion = await DeclaracionModel.findOneAndUpdate(filter, { $set: props }, options);
    if (!updatedDeclaracion) {
      throw CreateError(StatusCodes.INTERNAL_SERVER_ERROR, 'Something went wrong at Declaracion.update', { debug_info: { declaracionID, userID, props } });
    }

    return updatedDeclaracion;
  }

  public static async agregarNotaAclaratoria(
    declaracionID: string,
    userID: string,
    password: string,
    seccion: string,
    nota: string
  ): Promise<DeclaracionDocument> {

    const declaracion = await DeclaracionModel.findById({
      _id: declaracionID
    });

    if (!declaracion) {
      throw new CreateError.NotFound(
        `Declaration[${declaracionID}] does not exist.`
      );
    }

    if (declaracion.owner._id != userID) {
      throw new CreateError.Forbidden(
        `User: ${userID} is not allowed`
      );
    }

    // ============================================
    // VALIDAR CONTRASEÑA
    // ============================================

    const user = await UserModel.findById({
      _id: userID
    });

    if (!user) {
      throw new CreateError.NotFound(
        `User[${userID}] does not exist.`
      );
    }

    if (!BCrypt.compare(password, user.password)) {
      throw new CreateError.Forbidden(
        'LA CONTRASEÑA ES INCORRECTA. VERIFIQUE LA CONTRASEÑA E INTENTE NUEVAMENTE.'
      );
    }

    // ============================================
    // CREAR ESTRUCTURA DE NOTAS ACLARATORIAS
    // ============================================

    if (!declaracion.notasAclaratorias) {
      declaracion.notasAclaratorias = {
        totalCambios: 0
      };
    }

    if (!declaracion.notasAclaratorias[seccion]) {
      declaracion.notasAclaratorias[seccion] = {
        totalCambios: 0,
        historial: []
      };
    }

    // ============================================
    // AGREGAR NOTA
    // ============================================

    declaracion.notasAclaratorias[seccion].historial.push({
      nota,
      fecha: new Date()
    });

    if (
      declaracion.notasAclaratorias.totalCambios === undefined
    ) {
      declaracion.notasAclaratorias.totalCambios = 0;
    }

    declaracion.notasAclaratorias[seccion].totalCambios += 1;
    declaracion.notasAclaratorias.totalCambios += 1;

    declaracion.markModified('notasAclaratorias');

    // ============================================
    // GUARDAR DECLARACIÓN
    // ============================================

    await declaracion.save();

    // ============================================
    // GENERAR Y ENVIAR PDF DE NOTA ACLARATORIA
    // ============================================

    try {

      const fechaActual = new Date();

      const responseNota =
        await ReportsClient.getNotaAclaratoria(
          user,
          declaracion._id.toString(),
          seccion,
          nota,
          fechaActual
        );

      await SendgridClient.sendNotaAclaratoriaFile(
        user.username,
        responseNota.toString('base64')
      );

    } catch (error) {

      console.error(
        'Error al generar/enviar PDF de nota aclaratoria:',
        error
      );

      throw new CreateError.InternalServerError(
        'La nota aclaratoria fue guardada, pero no fue posible generar o enviar el PDF.'
      );
    }

    return declaracion;

    return declaracion;
  }
}
