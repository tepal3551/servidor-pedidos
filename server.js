// Archivo: server.js (Versión v4.0 - Creación de Excel en Servidor)

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx'); // ¡NUEVO! Importamos la biblioteca de Excel

// Quitamos Multer, ya no lo necesitamos para esta ruta
// const multer = require('multer'); 

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // Usamos el parser de JSON de Express

// --- Lógica del Consecutivo y Carpetas ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}
const consecutivoFilePath = path.join(dataDir, 'consecutivo.txt');
const finalPathDir = path.join(dataDir, 'pedidos_guardados');
if (!fs.existsSync(finalPathDir)) {
    fs.mkdirSync(finalPathDir);
}

app.use('/pedidos_guardados', express.static(finalPathDir));

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

    return nextFolio.toString().padStart(4, '0');
}

// --- RUTA MODIFICADA: Ahora recibe JSON, no un archivo ---
app.post('/api/crear-pedido', async (req, res) => {
    try {
        // 1. Recibir los datos del pedido desde el body
        const { clientName, agentId, clientId, products } = req.body;

        if (!agentId || !clientId || !products || products.length === 0) {
            return res.status(400).json({ success: false, message: 'Datos del pedido incompletos.' });
        }

        // 2. Generar el Folio Consecutivo
        const folio = `PED-${getNextFolio()}`;
        const date = new Date().toLocaleDateString('es-ES');

        // 3. Crear el Excel con el formato ERP
        const dataParaExcel = products.map(p => ({
            no_ped: folio, // ¡AQUÍ ESTÁ LA MAGIA!
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

        // 4. Guardar el archivo Excel en el disco
        const newFilename = `${folio}.xlsx`;
        const finalPath = path.join(finalPathDir, newFilename);

        xlsx.writeFile(wb, finalPath); // Guardamos el archivo creado

        console.log(`Pedido recibido para: ${clientName}. Folio: ${folio}.`);

        // 5. Responder con el nuevo folio
        res.status(201).json({ success: true, folio: folio });

    } catch (error) {
        console.error('Error al procesar el pedido:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// --- Iniciar el servidor ---
app.listen(port, () => {
    console.log(`✅ Servidor de pedidos v4.0 (Crea Excel) escuchando en http://localhost:${port}`);
});