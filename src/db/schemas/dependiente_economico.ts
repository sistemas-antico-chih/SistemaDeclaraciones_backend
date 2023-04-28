import { ActividadLaboralSectorPrivadoSchema } from './actividad_laboral_sector_privado';
import { ActividadLaboralSectorPublicoSchema } from './actividad_laboral_sector_publico';
import { CatalogoSchema } from './catalogo';
import { DomicilioExtranjeroSchema } from './domicilio_extranjero';
import { DomicilioMexicoSchema } from './domicilio_mexico';
import { LugarResidencia } from '../../types/enums';
import { Schema } from 'mongoose';
import { addNullValue } from '../../library/utils';
import { TipoOperacion} from '../../types/enums';


const string_type = {
  type: String,
  trim: true,
  uppercase: true,
};

export const DependienteEconomicoSchema = new Schema({
  tipoOperacion: {
    type: String,
    enum: addNullValue(TipoOperacion),
  },
  nombre: {
    type: String,
    trim: true,
    uppercase: true,
    required: true,
  },
  primerApellido: {
    type: String,
    trim: true,
    uppercase: true,
    required: true,
  },
  segundoApellido: string_type,
  fechaNacimiento: Date,
  rfc: string_type,
  parentescoRelacion: CatalogoSchema,
  extranjero: Boolean,
  curp: string_type,
  habitaDomicilioDeclarante: Boolean,
  lugarDondeReside: {
    type: String,
    enum: addNullValue(LugarResidencia),
  },
  domicilioMexico: DomicilioMexicoSchema,
  domicilioExtranjero: DomicilioExtranjeroSchema,
  actividadLaboral: CatalogoSchema,
  actividadLaboralSectorPublico: ActividadLaboralSectorPublicoSchema,
  actividadLaboralSectorPrivadoOtro: ActividadLaboralSectorPrivadoSchema,
});
