import os
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, jsonify
from dotenv import load_dotenv
import database as db

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key")

db.init_db()


@app.route("/")
def index():
    ahora = datetime.now()
    mes = request.args.get("mes", ahora.month, type=int)
    anio = request.args.get("anio", ahora.year, type=int)

    transacciones = db.listar(mes, anio)
    totales = db.totales(mes, anio)
    categorias = db.resumen_por_categoria(mes, anio)

    return render_template(
        "index.html",
        transacciones=transacciones,
        totales=totales,
        categorias=categorias,
        mes=mes,
        anio=anio,
        categorias_gasto=db.CATEGORIAS_GASTO,
        categorias_ingreso=db.CATEGORIAS_INGRESO,
        hoy=ahora.strftime("%Y-%m-%d"),
        meses=[
            (1,"Enero"),(2,"Febrero"),(3,"Marzo"),(4,"Abril"),
            (5,"Mayo"),(6,"Junio"),(7,"Julio"),(8,"Agosto"),
            (9,"Septiembre"),(10,"Octubre"),(11,"Noviembre"),(12,"Diciembre"),
        ],
    )


@app.route("/agregar", methods=["POST"])
def agregar():
    tipo = request.form["tipo"]
    categoria = request.form["categoria"]
    descripcion = request.form.get("descripcion", "").strip()
    monto = float(request.form["monto"])
    fecha = request.form["fecha"]
    db.insertar(tipo, categoria, descripcion, monto, fecha)
    return redirect(url_for("index", mes=datetime.strptime(fecha, "%Y-%m-%d").month,
                                     anio=datetime.strptime(fecha, "%Y-%m-%d").year))


@app.route("/eliminar/<int:id_>", methods=["POST"])
def eliminar(id_):
    db.eliminar(id_)
    mes = request.form.get("mes")
    anio = request.form.get("anio")
    return redirect(url_for("index", mes=mes, anio=anio))


@app.route("/api/mensual")
def api_mensual():
    filas = db.resumen_mensual()
    meses = sorted({r["mes"] for r in filas})
    ingresos = {r["mes"]: r["total"] for r in filas if r["tipo"] == "ingreso"}
    gastos = {r["mes"]: r["total"] for r in filas if r["tipo"] == "gasto"}
    return jsonify({
        "labels": meses,
        "ingresos": [ingresos.get(m, 0) for m in meses],
        "gastos": [gastos.get(m, 0) for m in meses],
    })


if __name__ == "__main__":
    app.run(debug=True)
