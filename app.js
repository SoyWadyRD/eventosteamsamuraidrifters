const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const multer = require('multer');  // Importar multer


// Importar las rutas
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const Evento = require('./models/Evento'); // Asegúrate de que el modelo Evento exista

const app = express();

// Conectar a MongoDB
mongoose.connect('mongodb+srv://andreslopez261316:andreslopez261316@eventostsd.ukyfwqb.mongodb.net/?retryWrites=true&w=majority&appName=eventostsd')
.then(() => {
    console.log('✅ Conexión a MongoDB exitosa!');
})
.catch((err) => {
    console.error('❌ Error de conexión a MongoDB:', err);
});

// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Aquí guardamos las imágenes subidas
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Nombre único para cada imagen
    }
});
const upload = multer({ storage: storage });

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'secretoSuperSeguro',
    resave: false,
    saveUninitialized: false
}));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Usar las rutas
app.use('/auth', authRoutes);   // Ruta de autenticación
app.use('/events', eventRoutes); // Ruta de eventos

















// Ruta para inscribirse en un evento
app.post('/events/inscribir/:eventoId', async (req, res) => {
    const eventoId = req.params.eventoId;
    const usuarioId = req.body.usuarioId; // El ID del usuario enviado en el cuerpo de la solicitud

    // Verifica si el usuarioId es válido
    if (!usuarioId || usuarioId === 'null') {
        return res.status(400).json({ message: 'Debes iniciar sesión para inscribirte.' });
    }

    try {
        // Verificar si el evento existe
        const evento = await Evento.findById(eventoId);
        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        // Verificar si el evento ya pasó la fecha límite de inscripción
        const ahora = new Date();
        if (evento.fechaRegistroLimite < ahora) {
            return res.status(400).json({ message: 'La fecha límite para inscribirse ha pasado' });
        }

        // Verificar si el usuario ya está inscrito
        if (evento.inscritos.includes(usuarioId)) {
            return res.status(400).json({ message: 'Ya estás inscrito en este evento' });
        }

        // Inscribir al usuario en el evento
        evento.inscritos.push(usuarioId);
        await evento.save(); // Guardamos el evento con el nuevo usuario inscrito

        return res.status(200).json({ message: 'Inscripción exitosa' });
    } catch (error) {
        console.error('Error al inscribir:', error);
        return res.status(500).json({ message: 'Hubo un problema al inscribirse. Intenta nuevamente.' });
    }
});
































// Ruta para crear evento
app.post('/events/crear', upload.single('imagen'), async (req, res) => {
    try {
        const { titulo, descripcion, fecha, fechaRegistroLimite } = req.body;

        let imagenUrl = '';
        if (req.file) {
            imagenUrl = `/uploads/${req.file.filename}`;  // URL de la imagen cargada
        }

        // Crear evento
        const nuevoEvento = new Evento({
            titulo,
            descripcion,
            fecha: new Date(fecha),
            fechaRegistroLimite: new Date(fechaRegistroLimite),
            imagen: imagenUrl
        });

        await nuevoEvento.save();
        res.status(201).json({ message: 'Evento creado exitosamente', evento: nuevoEvento });
    } catch (error) {
        console.error('Error al crear evento:', error);
        res.status(500).json({ message: 'Hubo un error al crear el evento' });
    }
});












app.get('/', (req, res) => {
    res.redirect('/public/register.html'); // O el nombre correcto de tu archivo de registro
  });
  









app.get('/events/evento/:eventoId', async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.eventoId)
            .populate('inscritos', 'nombreReal nombreJuego'); // Esto poblará los detalles de los usuarios

        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        // Solo enviamos el evento con los detalles de los inscritos
        res.json({
            evento: evento
        });
    } catch (error) {
        console.error('Error al obtener evento:', error);
        res.status(500).json({ message: 'Hubo un problema al obtener el evento' });
    }
});















app.get('/eventos', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'eventos.html'));  // Enviar el archivo eventos.html
});



// Ruta para obtener todos los eventos en formato JSON
app.get('/events/eventos', async (req, res) => {
    try {
        const eventos = await Evento.find(); // Obtener todos los eventos
        const usuarioId = req.session.usuarioId || null;
        const esAdmin = req.session.isAdmin || false;

        // Verificar que cada evento tenga el campo inscritos como un array
        eventos.forEach(evento => {
            if (!Array.isArray(evento.inscritos)) {
                evento.inscritos = []; // Si no es un array, asignar un array vacío
            }
        });

        res.json({
            eventos: eventos,
            usuarioId: usuarioId,
            esAdmin: esAdmin
        });
    } catch (error) {
        console.error('Error al obtener eventos:', error);
        res.status(500).json({ message: 'Error al obtener los eventos' });
    }
});





















// Ruta para eliminar un evento
app.delete('/events/eliminar/:eventoId', async (req, res) => {
    const eventoId = req.params.eventoId;
    
    try {
        const evento = await Evento.findById(eventoId);

        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        // Verificar si el usuario es administrador
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'No tienes permisos para eliminar este evento' });
        }

        // Eliminar el evento
        await evento.remove();  // Usa el método `remove` en lugar de `findOneAndDelete`
        res.status(200).json({ message: 'Evento eliminado con éxito' });
    } catch (error) {
        console.error('Error al eliminar el evento:', error);
        res.status(500).json({ message: 'Hubo un error al eliminar el evento' });
    }
});












// Ruta para obtener los inscritos de un evento
app.get('/events/inscritos/:eventoId', async (req, res) => {
    const eventoId = req.params.eventoId;

    try {
        const evento = await Evento.findById(eventoId).populate('inscritos', 'nombreReal nombreJuego'); // Poblar los inscritos con datos del usuario

        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        // Verificar si el usuario es administrador
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'No tienes permisos para ver la lista de inscritos' });
        }

        res.status(200).json({ inscritos: evento.inscritos });
    } catch (error) {
        console.error('Error al obtener los inscritos:', error);
        res.status(500).json({ message: 'Hubo un error al obtener los inscritos' });
    }
});



























// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('✅ Servidor prendido con éxito!');
    console.log(`📡 Escuchando en: http://localhost:${PORT}`);
    console.log('✨ Listo para recibir eventos ✨');
});
