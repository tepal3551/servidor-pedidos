// Archivo: server.js (Versión v4.2 - Rutas Absolutas de Render)

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx'); 

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); 

// --- Lógica del Consecutivo y Carpetas ---
// *** CAMBIO AQUÍ: Usamos la ruta absoluta del disco de Render ***
const dataDir = '/data'; 
const consecutivoFilePath = path.join(dataDir, 'consecutivo.txt');

// *** CAMBIO AQUÍ: La carpeta 'uploads' estará DENTRO de '/data' ***
const uploadDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// *** CAMBIO AQUÍ: La carpeta 'pedidos_guardados' también estará DENTRO de '/data' ***
const finalPathDir = path.join(dataDir, 'pedidos_guardados');
if (!fs.existsSync(finalPathDir)) {
    fs.mkdirSync(finalPathDir);
}

app.use('/pedidos_guardados', express.static(finalPathDir));

// --- Configuración de Multer (para subir archivos) ---
// (Esta parte se elimina porque ya no usamos multer para esta ruta)

// --- Función para leer el consecutivo (sin cambios) ---
function getNextFolio() {
    let currentFolio = 0;
    try {
        if (fs.existsSync(consecutivoFilePath)) {
            currentFolio = parseInt(fs.readFileSync(consecutivoFilePath, 'utf8'), 10);
        }
    } catch (e) { console.error("Error al leer el consecutivo:", e); }
    
    const nextFolio = currentFolio + 1;
    
    try {
        fs.writeFileSync(consecutivoFilePath, nextFolio.toString());
    } catch (e) { console.error("Error al guardar el consecutivo:", e); }
    
    return nextFolio.toString();
}

// --- Ruta para crear el pedido (sin cambios) ---
app.post('/api/crear-pedido', async (req, res) => {
    try {
        const { clientName, agentId, clientId, products } = req.body;
        if (!agentId || !clientId || !products || products.length === 0) {
            return res.status(400).json({ success: false, message: 'Datos del pedido incompletos.' });
        }

        const folio = getNextFolio(); 
        const date = new Date().toLocaleDateString('es-ES');

        const dataParaExcel = products.map(p => ({
            no_ped: folio,
            f_alta_ped: date,
            cve_cte: clientId,
            cve_age: agentId,
            cve_prod: p.key,
            cant_prod: p.quantity,
            valor_prod: 0
        }));
        
        const ws = xlsx.utils.json_to_sheet(dataParaExcel, { header: ["no_ped", "f_alta_ped", "cve_cte", "cve_age", "cve_prod", "cant_prod", "valor_prod"] });
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Pedido");
        
        const newFilename = `${folio}.xlsx`;
        const finalPath = path.join(finalPathDir, newFilename); // Usará la ruta /data/pedidos_guardados
        
        xlsx.writeFile(wb, finalPath);
        
        console.log(`Pedido recibido para: ${clientName}. Folio: ${folio}.`);

        res.status(201).json({ success: true, folio: folio });

    } catch (error) {
        console.error('Error al procesar el pedido:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// --- Iniciar el servidor ---
app.listen(port, () => {
    console.log(`✅ Servidor de pedidos v4.2 (Rutas Absolutas) escuchando en http://localhost:${port}`);
});