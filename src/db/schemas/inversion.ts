import { CatalogoSchema } from './catalogo';
import { LocalizacionInversionSchema } from './localizacion_inversion';
import { MontoSchema } from './monto';
import { Schema } from 'mongoose';
import { TerceroSchema } from './tercero';
import { addNullValue } from '../../library/utils';
import { TipoOperacion} from '../../types/enums';


export const InversionSchema = new Schema({
  tipoOperacion: {
    type: String,
    enum: addNullValue(TipoOperacion),
  },
  tipoInversion: CatalogoSchema,
  subTipoInversion: CatalogoSchema,
  titular: [CatalogoSchema],
  tercero: [TerceroSchema],
  numeroCuentaContrato: {
    type: String,
    trim: true,
    uppercase: true,
  },
  localizacionInversion: LocalizacionInversionSchema,
  saldoSituacionActual: MontoSchema,
});
