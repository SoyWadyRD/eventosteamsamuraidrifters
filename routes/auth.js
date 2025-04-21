const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario'); // Asegúrate de que el modelo de Usuario esté importado





router.post('/registro', async (req, res) => {
    try {
        const { nombreReal, nombreJuego, contrasena } = req.body;

        // Verificar si ya existe el usuario con ese nombre de juego
        const usuarioExistente = await Usuario.findOne({ nombreJuego });
        if (usuarioExistente) {
            return res.status(400).json({ message: 'El nombre de juego ya está registrado. Elige otro.' });
        }

        // Crear el nuevo usuario con la contraseña que será cifrada en el middleware
        const nuevoUsuario = new Usuario({
            nombreReal,
            nombreJuego,
            contrasena
        });

        // Guardar el nuevo usuario en la base de datos
        await nuevoUsuario.save();

        // Guardamos el ID del usuario en la sesión
        req.session.usuarioId = nuevoUsuario._id; // Guardamos el ID de usuario en la sesión

        res.status(200).json({ message: 'Usuario registrado correctamente.' });

    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ message: 'Hubo un error al registrar el usuario.' });
    }
});
















// Login en backend (auth.js)
router.post('/login', async (req, res) => {
    try {
        const { nombreJuego, contrasena } = req.body;

        const usuario = await Usuario.findOne({ nombreJuego });

        if (!usuario) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        const esValida = await usuario.compararContrasena(contrasena);
        if (!esValida) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        // Guardar ID y rol en la sesión
        req.session.usuario = { id: usuario._id, rol: usuario.rol };

        // Enviar también el rol y usuarioId al front-end
        res.status(200).json({
            message: 'Login exitoso',
            usuarioId: usuario._id,
            rol: usuario.rol
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ message: 'Hubo un error al iniciar sesión' });
    }
});

module.exports = router;







