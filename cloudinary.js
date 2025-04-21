const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: 'dkhz4w232',
    api_key: '685395719483791',
    api_secret: '99wlU4YCMW6Tyst2tTCZRkiajm0'
});

// Configuración de Multer Storage para subir imágenes a Cloudinary
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'eventos', // La carpeta dentro de Cloudinary donde se guardarán las imágenes
        allowed_formats: ['jpg', 'png', 'jpeg'], // Formatos de imágenes permitidos
    },
});

module.exports = { cloudinary, storage };
