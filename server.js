// Archivo: server.js (Versión Final y Limpia)

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/pedidos_guardados', express.static(path.join(__dirname, 'pedidos_guardados')));
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

app.post('/api/crear-pedido', upload.single('pedidoExcel'), async (req, res) => {
    try {
        const clientName = req.body.clientName;
        const tempFile = req.file;

        if (!tempFile) {
            return res.status(400).json({ success: false, message: 'No se recibió ningún archivo Excel.' });
        }

        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const folio = `PED-${timestamp}-${randomPart}`;
        const newFilename = `${folio}.xlsx`;

        const finalPathDir = 'pedidos_guardados';
        
        if (!fs.existsSync(finalPathDir)) {
            fs.mkdirSync(finalPathDir);
        }
        
        const finalPath = path.join(__dirname, finalPathDir, newFilename);
        
        fs.renameSync(tempFile.path, finalPath);
        
        console.log(`Pedido recibido para: ${clientName}. Folio: ${folio}. Archivo guardado en: ${finalPath}`);

        res.status(201).json({ success: true, folio: folio });

    } catch (error) {
        console.error('Error al procesar el pedido:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

app.listen(port, () => {
    console.log(`✅ Servidor de pedidos escuchando en http://localhost:${port}`);
});