const mongoose = require('mongoose');

const EventoSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    descripcion: { type: String, required: true },
    fecha: { type: Date, required: true },
    fechaRegistroLimite: { type: Date, required: true },
    imagen: { type: String }, // URL de la imagen en Cloudinary
    inscritos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: [] }]
});

const Evento = mongoose.model('Evento', EventoSchema);

module.exports = Evento;
