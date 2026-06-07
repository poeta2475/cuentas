import os
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from dotenv import load_dotenv
import database as db

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")

login_manager = LoginManager(app)
login_manager.login_view = "login"
login_manager.login_message = "Inicia sesión para continuar."
login_manager.login_message_category = "info"

db.init_db()


class User(UserMixin):
    def __init__(self, data):
        self.id      = data["id"]
        self.nombre  = data["nombre"]
        self.email   = data["email"]


@login_manager.user_loader
def load_user(user_id):
    data = db.buscar_usuario_por_id(int(user_id))
    return User(data) if data else None


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.route("/register", methods=["GET","POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("index"))
    if request.method == "POST":
        nombre   = request.form["nombre"].strip()
        email    = request.form["email"].strip()
        password = request.form["password"]
        confirm  = request.form["confirm"]

        if not nombre or not email or not password:
            flash("Todos los campos son obligatorios.", "error")
        elif password != confirm:
            flash("Las contraseñas no coinciden.", "error")
        elif len(password) < 6:
            flash("La contraseña debe tener al menos 6 caracteres.", "error")
        elif db.buscar_usuario_por_email(email):
            flash("Ya existe una cuenta con ese correo.", "error")
        else:
            db.crear_usuario(nombre, email, password)
            usuario = db.buscar_usuario_por_email(email)
            login_user(User(usuario))
            flash(f"¡Bienvenido, {nombre}!", "success")
            return redirect(url_for("index"))
    return render_template("auth.html", modo="register")


@app.route("/login", methods=["GET","POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("index"))
    if request.method == "POST":
        email    = request.form["email"].strip()
        password = request.form["password"]
        usuario  = db.buscar_usuario_por_email(email)
        if usuario and db.verificar_password(usuario, password):
            login_user(User(usuario), remember=request.form.get("remember") == "on")
            next_page = request.args.get("next")
            return redirect(next_page or url_for("index"))
        flash("Correo o contraseña incorrectos.", "error")
    return render_template("auth.html", modo="login")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))


# ── App ───────────────────────────────────────────────────────────────────────

@app.route("/")
@login_required
def index():
    ahora = datetime.now()
    mes   = request.args.get("mes",  ahora.month, type=int)
    anio  = request.args.get("anio", ahora.year,  type=int)

    transacciones = db.listar(current_user.id, mes, anio)
    tots          = db.totales(current_user.id, mes, anio)
    categorias    = db.resumen_por_categoria(current_user.id, mes, anio)

    return render_template(
        "index.html",
        transacciones=transacciones,
        totales=tots,
        categorias=categorias,
        mes=mes, anio=anio,
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
@login_required
def agregar():
    tipo        = request.form["tipo"]
    categoria   = request.form["categoria"]
    descripcion = request.form.get("descripcion","").strip()
    monto       = float(request.form["monto"])
    fecha       = request.form["fecha"]
    db.insertar(current_user.id, tipo, categoria, descripcion, monto, fecha)
    d = datetime.strptime(fecha, "%Y-%m-%d")
    return redirect(url_for("index", mes=d.month, anio=d.year))


@app.route("/eliminar/<int:id_>", methods=["POST"])
@login_required
def eliminar(id_):
    db.eliminar(current_user.id, id_)
    return redirect(url_for("index", mes=request.form.get("mes"), anio=request.form.get("anio")))


@app.route("/api/mensual")
@login_required
def api_mensual():
    filas   = db.resumen_mensual(current_user.id)
    meses   = sorted({r["mes"] for r in filas})
    ingresos = {r["mes"]: r["total"] for r in filas if r["tipo"] == "ingreso"}
    gastos   = {r["mes"]: r["total"] for r in filas if r["tipo"] == "gasto"}
    return jsonify({
        "labels":   meses,
        "ingresos": [ingresos.get(m, 0) for m in meses],
        "gastos":   [gastos.get(m,   0) for m in meses],
    })


if __name__ == "__main__":
    app.run(debug=True)
