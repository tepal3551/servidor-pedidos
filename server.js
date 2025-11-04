// Archivo: server.js (Versión Final v3.0 con Rutas Corregidas)

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- Lógica del Consecutivo y Carpetas ---
// Esta es la carpeta del disco persistente de Render
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}
const consecutivoFilePath = path.join(dataDir, 'consecutivo.txt');

// La carpeta 'uploads' ahora estará DENTRO de 'data'
const uploadDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// La carpeta 'pedidos_guardados' también estará DENTRO de 'data'
const finalPathDir = path.join(dataDir, 'pedidos_guardados');
if (!fs.existsSync(finalPathDir)) {
    fs.mkdirSync(finalPathDir);
}

// Permitir el acceso público a la carpeta DENTRO de 'data'
app.use('/pedidos_guardados', express.static(finalPathDir));


// --- Configuración de Multer (para subir archivos) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir), // Usar la nueva ruta de uploads
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage: storage });

// --- Función para leer el consecutivo actual ---
function getNextFolio() {
    let currentFolio = 0;
    try {
        if (fs.existsSync(consecutivoFilePath)) {
            const data = fs.readFileSync(consecutivoFilePath, 'utf8');
            currentFolio = parseInt(data, 10);
        }
    } catch (e) { console.error("Error al leer el consecutivo:", e); }
    
    const nextFolio = currentFolio + 1;
    
    try {
        fs.writeFileSync(consecutivoFilePath, nextFolio.toString());
    } catch (e) { console.error("Error al guardar el consecutivo:", e); }
    
    return nextFolio.toString().padStart(4, '0');
}

// --- Ruta para crear el pedido ---
app.post('/api/crear-pedido', upload.single('pedidoExcel'), async (req, res) => {
    try {
        const clientName = req.body.clientName;
        const tempFile = req.file;

        if (!tempFile) {
            return res.status(400).json({ success: false, message: 'No se recibió ningún archivo.' });
        }

        const folio = `PED-${getNextFolio()}`;
        const newFilename = `${folio}.xlsx`;

        // Usar la nueva ruta de 'pedidos_guardados'
        const finalPath = path.join(finalPathDir, newFilename);
        
        fs.renameSync(tempFile.path, finalPath);
        
        console.log(`Pedido recibido para: ${clientName}. Folio: ${folio}.`);

        res.status(201).json({ success: true, folio: folio });

    } catch (error) {
        console.error('Error al procesar el pedido:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// --- Iniciar el servidor ---
app.listen(port, () => {
    console.log(`✅ Servidor de pedidos v3.0 (Rutas corregidas) escuchando en http://localhost:${port}`);
});