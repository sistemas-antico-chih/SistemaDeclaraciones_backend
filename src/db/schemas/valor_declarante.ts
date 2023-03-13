import { Schema } from 'mongoose';

export const ValorDeclaranteSchema = new Schema({
  indice: Number,
  superficieConstruccion: Number,
  superficieTerreno: Number,
  valorAdquisicion: Number,
  formaAdquisicion: String,
});
