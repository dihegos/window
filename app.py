from flask import Flask, request, jsonify, render_template, redirect, url_for, session
import os
import json
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from functools import wraps

app = Flask(__name__)
app.secret_key = 'clave_secreta_segura'

if not os.path.exists("clientes"):
    os.makedirs("clientes")

def login_requerido(f):
    @wraps(f)
    def decorada(*args, **kwargs):
        if 'usuario' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorada

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        usuario = request.form['usuario']
        clave = request.form['clave']
        if usuario == 'window' and clave == '1234*':
            session['usuario'] = usuario
            return redirect(url_for('index'))
        return render_template('login.html', error='Credenciales incorrectas')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/')
@login_requerido
def index():
    return render_template('index.html')

@app.route('/guardar_pedido', methods=['POST'])
@login_requerido
def guardar_pedido():
    data = request.get_json()
    codigo = data.get('codigo', f'pedido_{datetime.now().isoformat()}')
    ruta_json = os.path.join("clientes", f"{codigo}.json")
    ruta_pdf = os.path.join("clientes", f"{codigo}.pdf")

    with open(ruta_json, 'w') as f:
        json.dump(data, f, indent=4)

    c = canvas.Canvas(ruta_pdf, pagesize=letter)
    width, height = letter
    y = height - 40
    margin = 50

    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, y, f"Resumen de Pedido")
    y -= 30

    c.setFont("Helvetica", 12)
    c.drawString(margin, y, f"Código: {data['codigo']}")
    y -= 20
    c.drawString(margin, y, f"Cliente: {data['nombre_cliente']}")
    y -= 20
    c.drawString(margin, y, f"Fecha: {data['fecha']}    Hora: {data['hora']}")
    y -= 20
    c.drawString(margin, y, f"Adelanto ($): {data.get('adelanto', 0):,.2f}")
    y -= 30

    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, y, "Imagen")
    c.drawString(margin + 70, y, "Cantidad")
    c.drawString(margin + 130, y, "Producto")
    c.drawString(margin + 240, y, "Color")
    c.drawString(margin + 300, y, "Medidas (cm)")
    c.drawString(margin + 400, y, "Costo Total ($)")
    c.drawString(margin + 500, y, "Entregado")
    y -= 15
    c.setLineWidth(0.5)
    c.line(margin, y, width - margin, y)
    y -= 10

    c.setFont("Helvetica", 10)
    for item in data['articulos']:
        medidas = f"{item['medidas']['ancho']} x {item['medidas']['altura']}"
        ruta_img = os.path.join(app.root_path, 'static', 'img', item['modelo'])

        if os.path.exists(ruta_img):
            c.drawImage(ruta_img, margin, y - 5, width=50, height=35, preserveAspectRatio=True, mask='auto')
        else:
            c.drawString(margin, y, item['modelo'])

        c.drawString(margin + 70, y + 10, str(item['cantidad']))
        c.drawString(margin + 130, y + 10, f"{item['tipo'].upper()} -")
        c.drawString(margin + 240, y + 10, item['medidas']['color'])
        c.drawString(margin + 300, y + 10, medidas)
        c.drawString(margin + 400, y + 10, f"${item['costo_total']:,.2f}")
        c.drawString(margin + 500, y + 10, "✅" if item.get("entregado") else "")
        y -= 45

        if y < 80:
            c.showPage()
            y = height - 40

    y -= 10
    c.setFont("Helvetica-Bold", 12)
    total = sum(a['costo_total'] for a in data['articulos'])
    adelanto = data.get('adelanto', 0)
    total_pagar = total - adelanto
    c.drawString(margin, y, f"Total del pedido: ${total:,.2f}")
    y -= 20
    c.drawString(margin, y, f"Total a pagar: ${total_pagar:,.2f}")

    c.save()

    return jsonify({"status": "ok", "mensaje": "Pedido y PDF guardados correctamente."})

@app.route('/cargar_historial', methods=['GET'])
@login_requerido
def cargar_historial():
    historial = []
    for archivo in os.listdir("clientes"):
        if archivo.endswith(".json"):
            ruta = os.path.join("clientes", archivo)
            with open(ruta, "r") as f:
                pedido = json.load(f)
                historial.append(pedido)
    return jsonify(historial)

@app.route('/eliminar_pedido/<codigo>', methods=['POST'])
@login_requerido
def eliminar_pedido(codigo):
    archivo_json = os.path.join("clientes", f"{codigo}.json")
    archivo_pdf = os.path.join("clientes", f"{codigo}.pdf")

    if os.path.exists(archivo_json):
        os.remove(archivo_json)
    if os.path.exists(archivo_pdf):
        os.remove(archivo_pdf)

    return jsonify({"status": "ok", "mensaje": f"Pedido {codigo} eliminado correctamente."})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    app.run(debug=True, host='0.0.0.0', port=port)
