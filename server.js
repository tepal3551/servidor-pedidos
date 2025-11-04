// Archivo: server.js (Versión v4.1 - Folio Numérico)

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

// --- Función para leer el consecutivo (MODIFICADA) ---
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
    
    // *** CAMBIO AQUÍ: Ya no devuelve "PED-XXXX", solo el número. ***
    // (Hemos quitado el .padStart() para que sea un número simple)
    return nextFolio.toString();
}

// --- Ruta MODIFICADA: Ahora usa el folio numérico ---
app.post('/api/crear-pedido', async (req, res) => {
    try {
        const { clientName, agentId, clientId, products } = req.body;
        if (!agentId || !clientId || !products || products.length === 0) {
            return res.status(400).json({ success: false, message: 'Datos del pedido incompletos.' });
        }

        // 1. Generar el Folio Consecutivo (ahora es solo numérico)
        const folio = getNextFolio(); 
        const date = new Date().toLocaleDateString('es-ES');

        // 2. Crear el Excel con el formato ERP
        const dataParaExcel = products.map(p => ({
            no_ped: folio, // Escribimos el folio numérico en el Excel
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
        
        // 3. Guardar el archivo Excel en el disco
        const newFilename = `${folio}.xlsx`; // El nombre del archivo será "5483.xlsx"
        const finalPath = path.join(finalPathDir, newFilename);
        
        xlsx.writeFile(wb, finalPath);
        
        console.log(`Pedido recibido para: ${clientName}. Folio: ${folio}.`);

        // 4. Responder con el nuevo folio
        res.status(201).json({ success: true, folio: folio });

    } catch (error) {
        console.error('Error al procesar el pedido:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// --- Iniciar el servidor ---
app.listen(port, () => {
    console.log(`✅ Servidor de pedidos v4.1 (Folio Numérico) escuchando en http://localhost:${port}`);
});