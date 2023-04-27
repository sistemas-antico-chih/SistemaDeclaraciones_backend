import { CatalogoSchema } from './catalogo';
import { LocalizacionAdeudoSchema } from './localizacion_adeudo';
import { MontoSchema } from './monto';
import { OtorganteCreditoSchema } from './otorgante_credito';
import { Schema } from 'mongoose';
import { TerceroSchema } from './tercero';
import { addNullValue } from '../../library/utils';
import { TipoOperacion} from '../../types/enums';


export const AdeudoSchema = new Schema({
  tipoOperacion: {
    type: String,
    enum: addNullValue(TipoOperacion),
  },
  titular: [CatalogoSchema],
  tipoAdeudo: CatalogoSchema,
  numeroCuentaContrato: {
    type: String,
    trim: true,
    uppercase: true,
  },
  fechaAdquisicion: Date,
  montoOriginal: MontoSchema,
  saldoInsolutoSituacionActual: MontoSchema,
  tercero: [TerceroSchema],
  otorganteCredito: OtorganteCreditoSchema,
  localizacionAdeudo: LocalizacionAdeudoSchema,
});
