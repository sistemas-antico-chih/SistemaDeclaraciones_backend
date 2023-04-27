import { CatalogoSchema } from './catalogo';
import { FormaPago } from '../../types/enums';
import { MontoSchema } from './monto';
import { Schema } from 'mongoose';
import { TerceroSchema } from './tercero';
import { TransmisorSchema } from './transmisor';
import { addNullValue } from '../../library/utils';
import { TipoOperacion} from '../../types/enums';

export const BienMuebleSchema = new Schema({
  tipoOperacion: {
    type: String,
    enum: addNullValue(TipoOperacion),
  },
  titular: [CatalogoSchema],
  tipoBien: CatalogoSchema,
  transmisor: [TransmisorSchema],
  tercero: [TerceroSchema],
  descripcionGeneralBien: {
    type: String,
    trim: true,
    uppercase: true,
  },
  formaAdquisicion: CatalogoSchema,
  formaPago: {
    type: String,
    enum: addNullValue(FormaPago),
  },
  valorAdquisicion: MontoSchema,
  fechaAdquisicion: Date,
  motivoBaja: CatalogoSchema,
});
