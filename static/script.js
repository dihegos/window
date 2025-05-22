// script.js
let historialPedidos = [];
let pedidosPorCliente = {};

function mostrar(tipo) {
    const contenido = document.getElementById('contenido');
    let html = `<h2>${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</h2>`;
    const imagenes = tipo === 'puertas'
        ? ['Puerta_abatible.png', 'puerta_abatible2.png', 'puerta_corrediza.png', 'puerta_corrediza3.png']
        : ['corrediza.png', 'arco.png', 'abatible.png', 'guillotina.png', 'fija.png'];

    imagenes.forEach(img => {
        html += `<img src="/static/img/${img}" alt="${img}" class="imagen" onclick="mostrarFormulario('${tipo}', '${img}')">`;
    });

    contenido.innerHTML = html;
}

function mostrarFormulario(tipo, imagen) {
    const contenido = document.getElementById('contenido');
    contenido.innerHTML = `
        <h2>${tipo.charAt(0).toUpperCase() + tipo.slice(1)}: ${imagen}</h2>
        <img src="/static/img/${imagen}" class="imagen">
        <form class="formulario" onsubmit="guardarPedido(event, '${tipo}', '${imagen}')">
            <label for="cliente">Nombre del Cliente:</label>
            <input type="text" id="cliente" required>

            <label for="ancho">Ancho (cm):</label>
            <input type="text" id="ancho" required>

            <label for="altura">Altura (cm):</label>
            <input type="text" id="altura" required>

            <label for="color">Color:</label>
            <select id="color" required>
                <option value="">Selecciona</option>
                <option value="blanco">Blanco</option>
                <option value="azul">Azul</option>
            </select>

            <label for="cantidad">Cantidad:</label>
            <input type="number" id="cantidad" min="1" value="1" required>

            <label for="costo">Costo por unidad ($):</label>
            <input type="number" id="costo" min="0" value="0" required>

            <button type="submit">Agregar al Pedido</button>
            <button type="button" onclick="imprimirResumen()">🖨️ Imprimir</button>
        </form>
        <div id="mensaje"></div>
    `;
}

function guardarPedido(event, tipo, imagen) {
    event.preventDefault();

    const cliente = document.getElementById('cliente').value.trim();
    const ancho = document.getElementById('ancho').value.trim();
    const altura = document.getElementById('altura').value.trim();
    const color = document.getElementById('color').value;
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const costoUnitario = parseFloat(document.getElementById('costo').value);
    const costoTotal = costoUnitario * cantidad;

    const fecha = new Date();
    const fechaStr = fecha.toISOString().split('T')[0];
    const horaStr = fecha.toTimeString().split(' ')[0];
    const iniciales = cliente.split(' ').map(p => p[0].toUpperCase()).join('');
    const codigoPedido = `${fechaStr.replace(/-/g, '')}_${iniciales}`;

    const item = {
        tipo: tipo,
        modelo: imagen,
        cantidad: cantidad,
        costo_unitario: costoUnitario,
        costo_total: costoTotal,
        entregado: false,
        medidas: {
            ancho: ancho,
            altura: altura,
            color: color
        }
    };

    if (!pedidosPorCliente[codigoPedido]) {
        pedidosPorCliente[codigoPedido] = {
            nombre_cliente: cliente,
            codigo: codigoPedido,
            fecha: fechaStr,
            hora: horaStr,
            adelanto: 0,
            articulos: []
        };
    }

    pedidosPorCliente[codigoPedido].articulos.push(item);
    historialPedidos = Object.values(pedidosPorCliente);

    document.getElementById('mensaje').innerHTML = `<p style='color:green'>✅ Artículo agregado al pedido ${codigoPedido}</p>`;

    fetch('/guardar_pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedidosPorCliente[codigoPedido])
    })
    .then(res => res.json())
    .then(data => console.log(data.mensaje))
    .catch(err => console.error("Error al guardar en el servidor:", err));
}

function verPedidos() {
    const contenido = document.getElementById('contenido');
    if (historialPedidos.length === 0) {
        contenido.innerHTML = '<h2>Pedidos</h2><p>No hay pedidos registrados.</p>';
        return;
    }

    let html = '<h2>Pedidos</h2><ul>';
    historialPedidos.forEach(p => {
        html += `<li><span class="pedido-link" style="cursor:pointer; color:blue" onclick="verDetalle('${p.codigo}')">${p.codigo}</span></li>`;
    });
    html += '</ul>';
    contenido.innerHTML = html;
}

function verDetalle(codigo) {
    const p = pedidosPorCliente[codigo];
    if (!p) {
        console.warn(`No se encontró el pedido con código: ${codigo}`);
        return;
    }

    let html = `<div id="detalle-pedido">`;
    html += `
        <div style="text-align:center;">
            <img src="/static/img/logo.png" alt="Logo" style="max-width: 120px;">
            <h2 style="margin: 5px 0;">Resumen de Pedido</h2>
        </div>
    `;

    html += `<p><strong>Código:</strong> ${p.codigo}</p>`;
    html += `<p><strong>Cliente:</strong> ${p.nombre_cliente}</p>`;
    html += `<p><strong>Fecha:</strong> ${p.fecha} &nbsp;&nbsp; <strong>Hora:</strong> ${p.hora}</p>`;

    html += `
        <label for="adelanto-input"><strong>Adelanto ($):</strong></label>
        <input type="number" id="adelanto-input" value="${p.adelanto || 0}" min="0"
               onchange="actualizarAdelanto('${codigo}', this.value)" style="width: 100px; margin-left: 10px;">
    `;

    html += '<table><tr><th>Imagen</th><th>Cantidad</th><th>Producto</th><th>Color</th><th>Medidas (cm)</th><th>Costo Total ($)</th><th>Entregado</th></tr>';

    let totalPedido = 0;
    p.articulos.forEach((item, index) => {
        totalPedido += item.costo_total;
        html += `<tr id="item-${codigo}-${index}" style="${item.entregado ? 'background-color: #d5f5e3;' : ''}">
            <td><img src="/static/img/${item.modelo}" alt="${item.modelo}" style="width: 100px;"></td>
            <td>${item.cantidad}</td>
            <td>${item.tipo.toUpperCase()} - ${item.modelo}</td>
            <td>${item.medidas.color}</td>
            <td>${item.medidas.ancho} x ${item.medidas.altura}</td>
            <td>${item.costo_total.toFixed(2)}</td>
            <td>
                <button onclick="marcarEntregado('${codigo}', ${index})">
                    ${item.entregado ? '✅' : '✔️'}
                </button>
            </td>
        </tr>`;
    });

    const totalPagar = totalPedido - (p.adelanto || 0);
    html += `<tr><td colspan="5" style="text-align:right"><strong>Total del pedido:</strong></td><td colspan="2"><strong>$${totalPedido.toFixed(2)}</strong></td></tr>`;
    html += `<tr><td colspan="5" style="text-align:right"><strong>Total a pagar:</strong></td><td colspan="2" id="total-pagar"><strong>$${totalPagar.toFixed(2)}</strong></td></tr>`;

    html += '</table></div><br>';
    html += `
        <button onclick="verPedidos()">⬅️ Volver a pedidos</button>
        <button onclick="imprimirPedido('${codigo}')">🖨️ Imprimir PDF</button>
        <button onclick="guardarPedidoComoJSON('${codigo}')">💾 Guardar Pedido</button>
    `;

    document.getElementById('contenido').innerHTML = html;
}

function actualizarAdelanto(codigo, nuevoValor) {
    const adelanto = parseFloat(nuevoValor);
    if (isNaN(adelanto) || adelanto < 0) return;

    pedidosPorCliente[codigo].adelanto = adelanto;
    historialPedidos = Object.values(pedidosPorCliente);

    const totalPedido = pedidosPorCliente[codigo].articulos.reduce((sum, item) => sum + item.costo_total, 0);
    const totalPagar = totalPedido - adelanto;

    const totalPagarElement = document.getElementById("total-pagar");
    if (totalPagarElement) {
        totalPagarElement.innerHTML = `<strong>$${totalPagar.toFixed(2)}</strong>`;
    }
}

function marcarEntregado(codigo, index) {
    const item = pedidosPorCliente[codigo].articulos[index];
    item.entregado = !item.entregado;
    verDetalle(codigo);
}

function imprimirResumen() {
    window.print();
}

function guardarHistorial() {
    if (historialPedidos.length === 0) {
        alert("No hay pedidos para guardar.");
        return;
    }

    const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const blob = new Blob([JSON.stringify(historialPedidos, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_pedidos_${fecha}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function imprimirPedido(codigo) {
    const detalle = document.getElementById('detalle-pedido');
    if (!detalle) return;

    const ventana = window.open('', '_blank');
    ventana.document.write(`
        <html>
        <head>
            <title>Pedido ${codigo}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
                th { background-color: #f0f0f0; }
                img { max-width: 100px; }
                .logo { text-align: center; }
            </style>
        </head>
        <body>
            ${detalle.innerHTML}
        </body>
        </html>
    `);
    ventana.document.close();
    ventana.print();
}

function guardarPedidoComoJSON(codigo) {
    const pedido = pedidosPorCliente[codigo];
    if (!pedido) return;

    const jsonBlob = new Blob([JSON.stringify(pedido, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${codigo}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// 🔄 Cargar historial desde el servidor al iniciar
window.addEventListener('DOMContentLoaded', () => {
    fetch('/cargar_historial')
        .then(res => res.json())
        .then(data => {
            data.forEach(pedido => {
                pedidosPorCliente[pedido.codigo] = pedido;
            });
            historialPedidos = Object.values(pedidosPorCliente);
            verPedidos();
        })
        .catch(err => console.error("No se pudo cargar historial:", err));
});
