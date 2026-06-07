# CLAUDE.md — Notas de sesión

## Qué es este proyecto

Dashboard web de gastos personales con cuentas de usuario.  
Stack: Flask + SQLite + Chart.js. Dark mode. Deployable en Railway/Render.

## Archivos

| Archivo | Rol |
|---|---|
| `app.py` | Flask — rutas, login_required, auth |
| `database.py` | SQLite — usuarios + transacciones |
| `templates/auth.html` | Página login/registro (mismo template, `modo` cambia el contenido) |
| `templates/index.html` | Dashboard principal |
| `static/style.css` | Estilos dark mode completos |
| `requirements.txt` | flask, flask-login, python-dotenv, gunicorn |
| `Procfile` | Para Railway/Render: `gunicorn app:app` |

## Cómo correr en local

```bash
pip install -r requirements.txt
cp .env.example .env   # editar SECRET_KEY
python app.py
# → http://localhost:5000
```

## Base de datos SQLite (`gastos.db`)

Tablas:
- `usuarios (id, nombre, email, password [hash], creado)`
- `transacciones (id, user_id FK, tipo, categoria, descripcion, monto, fecha)`

Datos aislados por usuario (cada uno ve solo los suyos).

## Rutas

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET/POST | `/login` | No | Iniciar sesión |
| GET/POST | `/register` | No | Crear cuenta |
| GET | `/logout` | Sí | Cerrar sesión |
| GET | `/` | Sí | Dashboard (`?mes=&anio=`) |
| POST | `/agregar` | Sí | Nueva transacción |
| POST | `/eliminar/<id>` | Sí | Borrar transacción |
| GET | `/api/mensual` | Sí | JSON para gráfica barras |

## Deploy en Railway (gratis)

1. Push a GitHub
2. Entrar a railway.app → New Project → Deploy from GitHub
3. Agregar variable de entorno `SECRET_KEY` en Railway
4. Listo — URL pública automática

## Rama de trabajo

`main`
