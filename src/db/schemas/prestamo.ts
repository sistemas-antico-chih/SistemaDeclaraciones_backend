import { DuenoTitularPrestamoSchema } from './dueno_titular_prestamo';
import { Schema } from 'mongoose';
import { TipoBienPrestamoSchema } from './tipo_bien_prestamo';
import { addNullValue } from '../../library/utils';
import { TipoOperacion} from '../../types/enums';

export const PrestamoSchema = new Schema({
  tipoOperacion: {
    type: String,
    enum: addNullValue(TipoOperacion),
  },
  tipoBien: TipoBienPrestamoSchema,
  duenoTitular: DuenoTitularPrestamoSchema,
});
