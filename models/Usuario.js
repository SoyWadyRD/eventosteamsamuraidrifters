const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
    nombreReal: { type: String, required: true },
    nombreJuego: { type: String, required: true, unique: true },
    contrasena: { type: String, required: true },
    rol: { type: String, enum: ['usuario', 'admin'], default: 'usuario' }  // Campo rol
});




// Encriptar la contraseña antes de guardarla en la base de datos
usuarioSchema.pre('save', async function(next) {
    if (this.isModified('contrasena')) {
        this.contrasena = await bcrypt.hash(this.contrasena, 10);
    }
    next();
});





// Verificar si la contraseña es correcta
usuarioSchema.methods.compararContrasena = async function(contrasena) {
    return await bcrypt.compare(contrasena, this.contrasena);
};


const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;
