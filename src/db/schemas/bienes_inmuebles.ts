import { BienInmuebleSchema} from './bien_inmueble';
import { Schema } from 'mongoose';

export const BienesInmueblesSchema = new Schema({
  ninguno: Boolean,
  bienInmueble: [BienInmuebleSchema],
  aclaracionesObservaciones: {
    type: String,
    trim: true,
  },
  bienesDeclarante: Number,
  superficieConstruccion: [{indice: Number, valor: Number}],
  superficieTerreno: [{indice: Number, valor: Number}],
  valorAdquisicion: [{indice: Number, valor: Number}],
});
