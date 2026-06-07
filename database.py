import sqlite3
import os
from contextlib import contextmanager
from werkzeug.security import generate_password_hash, check_password_hash

DB_FILE = os.environ.get("DATABASE_URL", "gastos.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS usuarios (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre   TEXT NOT NULL,
    email    TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    creado   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transacciones (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo        TEXT NOT NULL CHECK(tipo IN ('ingreso','gasto')),
    categoria   TEXT NOT NULL,
    descripcion TEXT,
    monto       REAL NOT NULL,
    fecha       TEXT NOT NULL
);
"""

CATEGORIAS_GASTO   = ["Comida","Transporte","Vivienda","Salud","Entretenimiento","Ropa","Educación","Otro"]
CATEGORIAS_INGRESO = ["Sueldo","Freelance","Inversión","Regalo","Otro"]


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ── Usuarios ──────────────────────────────────────────────────────────────────

def crear_usuario(nombre, email, password):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO usuarios (nombre, email, password) VALUES (?,?,?)",
            (nombre.strip(), email.strip().lower(), generate_password_hash(password)),
        )


def buscar_usuario_por_email(email):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM usuarios WHERE email = ?", (email.strip().lower(),)).fetchone()
        return dict(row) if row else None


def buscar_usuario_por_id(user_id):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM usuarios WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None


def verificar_password(usuario, password):
    return check_password_hash(usuario["password"], password)


# ── Transacciones ─────────────────────────────────────────────────────────────

def insertar(user_id, tipo, categoria, descripcion, monto, fecha):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO transacciones (user_id,tipo,categoria,descripcion,monto,fecha) VALUES (?,?,?,?,?,?)",
            (user_id, tipo, categoria, descripcion, monto, fecha),
        )


def eliminar(user_id, id_):
    with get_conn() as conn:
        conn.execute("DELETE FROM transacciones WHERE id=? AND user_id=?", (id_, user_id))


def listar(user_id, mes=None, anio=None):
    sql = "SELECT * FROM transacciones WHERE user_id=?"
    params = [user_id]
    if mes and anio:
        sql += " AND strftime('%m',fecha)=? AND strftime('%Y',fecha)=?"
        params += [f"{int(mes):02d}", str(anio)]
    sql += " ORDER BY fecha DESC, id DESC"
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(sql, params).fetchall()]


def resumen_por_categoria(user_id, mes=None, anio=None):
    sql = "SELECT tipo, categoria, SUM(monto) as total FROM transacciones WHERE user_id=?"
    params = [user_id]
    if mes and anio:
        sql += " AND strftime('%m',fecha)=? AND strftime('%Y',fecha)=?"
        params += [f"{int(mes):02d}", str(anio)]
    sql += " GROUP BY tipo, categoria ORDER BY tipo, total DESC"
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(sql, params).fetchall()]


def resumen_mensual(user_id):
    sql = """
        SELECT strftime('%Y-%m', fecha) as mes, tipo, SUM(monto) as total
        FROM transacciones WHERE user_id=?
        GROUP BY mes, tipo ORDER BY mes
    """
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(sql, [user_id]).fetchall()]


def totales(user_id, mes=None, anio=None):
    sql = "SELECT tipo, SUM(monto) as total FROM transacciones WHERE user_id=?"
    params = [user_id]
    if mes and anio:
        sql += " AND strftime('%m',fecha)=? AND strftime('%Y',fecha)=?"
        params += [f"{int(mes):02d}", str(anio)]
    sql += " GROUP BY tipo"
    with get_conn() as conn:
        rows = {r["tipo"]: r["total"] for r in conn.execute(sql, params).fetchall()}
    ing  = rows.get("ingreso", 0) or 0
    gas  = rows.get("gasto",   0) or 0
    return {"ingresos": ing, "gastos": gas, "balance": ing - gas}
