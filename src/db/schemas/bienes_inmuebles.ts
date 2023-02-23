import { BienInmuebleSchema} from './bien_inmueble';
import { Schema } from 'mongoose';
import { ValorDeclaranteSchema } from './valor_declarante';

export const BienesInmueblesSchema = new Schema({
  ninguno: Boolean,
  bienInmueble: [BienInmuebleSchema],
  aclaracionesObservaciones: {
    type: String,
    trim: true,
  },
  valores: [ValorDeclaranteSchema],
});
