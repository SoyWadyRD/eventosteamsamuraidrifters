const express = require('express');
const router = express.Router();
const multer = require('multer');
const Evento = require('../models/Evento');

// ✅ Traemos storage de Cloudinary
const { storage } = require('../cloudinary');
const upload = multer({ storage });





// Ruta para crear evento
router.post('/crear', upload.single('imagen'), async (req, res) => {
    try {
        const { titulo, descripcion, fecha, fechaRegistroLimite } = req.body;

        let imagenUrl = '';
        if (req.file) {
            imagenUrl = req.file.path; // Usamos el link de Cloudinary
        }

        // Convertir las fechas a UTC antes de guardarlas
        const fechaUTC = new Date(fecha).toISOString();  // Fecha del evento en UTC
        const fechaRegistroLimiteUTC = new Date(fechaRegistroLimite).toISOString();  // Fecha de registro límite en UTC

        const nuevoEvento = new Evento({
            titulo,
            descripcion,
            fecha: fechaUTC,  // Guardamos la fecha en formato UTC
            fechaRegistroLimite: fechaRegistroLimiteUTC,  // Guardamos la fecha de registro en UTC
            imagen: imagenUrl
        });

        await nuevoEvento.save();

        res.status(201).json({ message: 'Evento creado exitosamente', evento: nuevoEvento });
    } catch (error) {
        console.error('Error al crear el evento:', error);
        res.status(500).json({ message: 'Hubo un error al crear el evento' });
    }
});










// Ruta para obtener los eventos
router.get('/eventos', async (req, res) => {
    try {
        const eventos = await Evento.find().lean();

        const eventosConIdsComoString = eventos.map(evento => {
            let inscritos = [];
            // Verificamos que 'inscritos' sea un arreglo antes de hacer el map
            if (Array.isArray(evento.inscritos)) {
                inscritos = evento.inscritos.map(id => {
                    if (id) {
                        return id.toString();  // Convertimos el id a string si es válido
                    }
                    return null;  // En caso de id inválido
                });
            }

            return {
                ...evento,
                inscritos
            };
        });

        // Asegúrate de que 'usuarioId' y 'rol' estén presentes y definidos
        const usuarioId = req.session?.usuario?.id ? req.session.usuario.id.toString() : null;
        const rol = req.session?.usuario?.rol || null;

        res.json({
            eventos: eventosConIdsComoString,
            usuarioId,
            rol
        });
    } catch (error) {
        console.error('Error al cargar los eventos:', error);
        res.status(500).json({
            message: 'Error al cargar los eventos.',
            error: error.message
        });
    }
});






















router.post('/inscribir/:eventoId', async (req, res) => {
    try {
        const usuarioId = req.session?.usuario?.id;

        if (!usuarioId) {
            return res.status(401).json({ message: 'Debes iniciar sesión para inscribirte en un evento.' });
        }

        const evento = await Evento.findById(req.params.eventoId);

        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado.' });
        }

        if (evento.fechaRegistroLimite < new Date()) {
            return res.status(400).json({ message: 'La fecha límite para registrarse ya pasó.' });
        }

        if (evento.inscritos.includes(usuarioId)) {
            return res.status(400).json({ message: 'Ya estás inscrito en este evento.' });
        }

        evento.inscritos.push(usuarioId);
        await evento.save();

        res.status(200).json({ message: '¡Te has inscrito en el evento exitosamente!' });
    } catch (error) {
        console.error('Error al inscribir al usuario:', error);
        res.status(500).json({ message: 'Hubo un error al inscribirte en el evento.' });
    }
});













// Ruta para obtener los detalles de un evento, incluyendo los inscritos
router.get('/eventos/:eventoId', async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.eventoId)
            .populate('inscritos', 'nombreReal nombreJuego'); // Aquí se obtiene la información de los usuarios inscritos

        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        // Aquí enviamos la lista de inscritos junto con el evento
        res.status(200).json({
            evento: evento,
            inscritos: evento.inscritos
        });
    } catch (error) {
        console.error('Error al obtener evento:', error);
        res.status(500).json({ message: 'Error al obtener el evento' });
    }
});



















// Ruta para eliminar un evento
router.delete('/eliminar/:eventoId', async (req, res) => {
    try {
        const { eventoId } = req.params;

        // Verificar que el usuario tenga permisos para eliminar
        if (req.session.usuario.rol !== 'admin') {
            return res.status(403).json({ message: 'No tienes permisos para eliminar eventos.' });
        }

        const eventoEliminado = await Evento.findByIdAndDelete(eventoId);

        if (!eventoEliminado) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        res.status(200).json({ message: 'Evento eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar el evento:', error);
        res.status(500).json({ message: 'Hubo un error al intentar eliminar el evento.' });
    }
});











// Ruta para obtener la lista de inscritos de un evento
router.get('/inscritos/:eventoId', async (req, res) => {
    try {
        const { eventoId } = req.params;

        const evento = await Evento.findById(eventoId).populate('inscritos', 'nombreJuego');
        
        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        const inscritos = evento.inscritos.map(usuario => usuario.nombreJuego);

        res.status(200).json({ inscritos });
    } catch (error) {
        console.error('Error al obtener inscritos:', error);
        res.status(500).json({ message: 'Hubo un error al obtener la lista de inscritos.' });
    }
});







// Ruta para que un usuario salga de un evento
router.post('/salir/:eventoId', async (req, res) => {
    try {
        const { eventoId } = req.params;
        const usuarioId = req.session.usuario.id;  // Asegúrate de que el usuario esté en la sesión

        // Buscar el evento por su ID
        const evento = await Evento.findById(eventoId);

        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado.' });
        }

        // Verificar si el usuario está inscrito en el evento
        const index = evento.inscritos.indexOf(usuarioId);
        if (index === -1) {
            return res.status(400).json({ message: 'No estás inscrito en este evento.' });
        }

        // Eliminar al usuario de la lista de inscritos
        evento.inscritos.splice(index, 1);

        // Guardar los cambios en el evento
        await evento.save();

        // Enviar respuesta exitosa
        res.json({ message: 'Has salido del evento correctamente.' });
    } catch (error) {
        console.error('Error al salir del evento:', error);
        res.status(500).json({ message: 'Hubo un error al intentar salir del evento.' });
    }
});


module.exports = router;
