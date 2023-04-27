import { InmueblePrestamoSchema } from './inmueble_prestamo';
import { Schema } from 'mongoose';
import { VehiculoPrestamoSchema } from './vehiculo_prestamo';
import { addNullValue } from '../../library/utils';
import { TipoOperacion} from '../../types/enums';


export const TipoBienPrestamoSchema = new Schema({
  tipoOperacion: {
    type: String,
    enum: addNullValue(TipoOperacion),
  },
  inmueble: InmueblePrestamoSchema,
  vehiculo: VehiculoPrestamoSchema,
});
