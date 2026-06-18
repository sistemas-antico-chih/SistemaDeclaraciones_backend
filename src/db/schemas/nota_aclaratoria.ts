import { Schema } from 'mongoose';

export const NotaAclaratoriaSchema = new Schema({
  seccion: {
    type: String,
    required: true,
    trim: true
  },

  nota: {
    type: String,
    required: true,
    trim: true
  },

  fecha: {
    type: Date,
    default: Date.now
  }
}, {
  _id: true
});