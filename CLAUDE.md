# CLAUDE.md — Notas de sesión

## Qué es este proyecto

Dashboard web de gastos personales en Python (Flask + SQLite + Chart.js).  
Permite registrar ingresos y gastos, ver resúmenes y gráficas por mes y categoría.

## Archivos

| Archivo | Rol |
|---|---|
| `app.py` | Servidor Flask — rutas y lógica de vista |
| `database.py` | Capa de datos — SQLite, queries, inicialización |
| `templates/index.html` | Única vista: dashboard completo |
| `static/style.css` | Estilos dark mode |
| `requirements.txt` | `flask`, `python-dotenv` |
| `.env.example` | Plantilla de variables de entorno |

## Cómo correr

```bash
pip install -r requirements.txt
cp .env.example .env   # editar SECRET_KEY si se quiere
python app.py
# → http://localhost:5000
```

## Base de datos

SQLite (`gastos.db`, se crea automáticamente).  
Tabla única: `transacciones (id, tipo, categoria, descripcion, monto, fecha)`.

## Rutas Flask

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/` | Dashboard, acepta `?mes=&anio=` |
| POST | `/agregar` | Inserta transacción |
| POST | `/eliminar/<id>` | Borra transacción |
| GET | `/api/mensual` | JSON para gráfica de barras mensual |

## Categorías

- **Gasto:** Comida, Transporte, Vivienda, Salud, Entretenimiento, Ropa, Educación, Otro  
- **Ingreso:** Sueldo, Freelance, Inversión, Regalo, Otro

## Rama de trabajo

`claude/repository-code-review-vIehi`

---
*Actualizar con cada cambio importante.*
