import sqlite3
from contextlib import contextmanager

DB_FILE = "gastos.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS transacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK(tipo IN ('ingreso', 'gasto')),
    categoria TEXT NOT NULL,
    descripcion TEXT,
    monto REAL NOT NULL,
    fecha TEXT NOT NULL
);
"""

CATEGORIAS_GASTO = ["Comida", "Transporte", "Vivienda", "Salud", "Entretenimiento", "Ropa", "Educación", "Otro"]
CATEGORIAS_INGRESO = ["Sueldo", "Freelance", "Inversión", "Regalo", "Otro"]


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def insertar(tipo, categoria, descripcion, monto, fecha):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO transacciones (tipo, categoria, descripcion, monto, fecha) VALUES (?,?,?,?,?)",
            (tipo, categoria, descripcion, monto, fecha),
        )


def eliminar(id_):
    with get_conn() as conn:
        conn.execute("DELETE FROM transacciones WHERE id = ?", (id_,))


def listar(mes=None, anio=None):
    sql = "SELECT * FROM transacciones"
    params = []
    if mes and anio:
        sql += " WHERE strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?"
        params = [f"{int(mes):02d}", str(anio)]
    sql += " ORDER BY fecha DESC, id DESC"
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(sql, params).fetchall()]


def resumen_por_categoria(mes=None, anio=None):
    sql = """
        SELECT tipo, categoria, SUM(monto) as total
        FROM transacciones
    """
    params = []
    if mes and anio:
        sql += " WHERE strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?"
        params = [f"{int(mes):02d}", str(anio)]
    sql += " GROUP BY tipo, categoria ORDER BY tipo, total DESC"
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(sql, params).fetchall()]


def resumen_mensual():
    sql = """
        SELECT strftime('%Y-%m', fecha) as mes,
               tipo,
               SUM(monto) as total
        FROM transacciones
        GROUP BY mes, tipo
        ORDER BY mes
    """
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(sql).fetchall()]


def totales(mes=None, anio=None):
    sql = "SELECT tipo, SUM(monto) as total FROM transacciones"
    params = []
    if mes and anio:
        sql += " WHERE strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?"
        params = [f"{int(mes):02d}", str(anio)]
    sql += " GROUP BY tipo"
    with get_conn() as conn:
        rows = {r["tipo"]: r["total"] for r in conn.execute(sql, params).fetchall()}
    ingresos = rows.get("ingreso", 0) or 0
    gastos = rows.get("gasto", 0) or 0
    return {"ingresos": ingresos, "gastos": gastos, "balance": ingresos - gastos}
