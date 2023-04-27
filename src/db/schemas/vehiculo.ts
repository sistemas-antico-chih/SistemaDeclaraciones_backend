import { CatalogoSchema } from './catalogo';
import { FormaPago } from '../../types/enums';
import { MontoSchema } from './monto';
import { Schema } from 'mongoose';
import { TerceroSchema } from './tercero';
import { TransmisorSchema } from './transmisor';
import { UbicacionSchema } from './ubicacion';
import { addNullValue } from '../../library/utils';
import { TipoOperacion} from '../../types/enums';

const string_type = {
  type: String,
  trim: true,
  uppercase: true,
};

export const VehiculoSchema = new Schema({
  tipoOperacion: {
    type: String,
    enum: addNullValue(TipoOperacion),
  },
  tipoVehiculo: CatalogoSchema,
  titular: [CatalogoSchema],
  transmisor: [TransmisorSchema],
  marca: string_type,
  modelo: string_type,
  anio: Number,
  numeroSerieRegistro: string_type,
  tercero: [TerceroSchema],
  lugarRegistro: UbicacionSchema,
  formaAdquisicion: CatalogoSchema,
  formaPago: {
    type: String,
    enum: addNullValue(FormaPago),
  },
  valorAdquisicion: MontoSchema,
  fechaAdquisicion: Date,
  motivoBaja: CatalogoSchema,
});
