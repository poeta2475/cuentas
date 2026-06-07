# CLAUDE.md — Notas de sesión

## Qué es este proyecto

Aplicación de escritorio en Python que genera reportes de asistencia del personal.  
Se conecta a una base de datos Microsoft Access (`FELJA.mdb`) en red, consulta registros de fichaje, los procesa y exporta un Excel.

## Archivo principal

`felja.py` — único script de la app.

### Flujo general

1. Carga credenciales desde `.env` (via `python-dotenv`)
2. Abre conexión a Access con `pyodbc` al iniciar
3. Muestra GUI con `PySimpleGUI`: dos calendarios (Desde / Hasta) + botón "Generar reporte"
4. Al pulsar el botón:
   - Consulta la tabla `horas_personal_exportar` filtrando por rango de fechas (query parametrizada)
   - Procesa el DataFrame: renombra columnas, calcula Time In / Time Out por día/empleado, traduce nombre del día al español
   - Abre diálogo "Guardar como" y exporta a `.xlsx`

### Funciones

| Función | Qué hace |
|---|---|
| `get_attendance(conn, fecha_desde, fecha_hasta)` | Query SQL a Access, devuelve DataFrame |
| `process_dataframe(df)` | Limpia y transforma el DataFrame (agrupa por ID+Fecha, calcula min/max hora) |

## Dependencias (`requirements.txt`)

```
pyodbc          # Conexión ODBC a Access
pandas          # Procesamiento de datos
PySimpleGUI     # GUI de escritorio
python-dotenv   # Variables de entorno desde .env
openpyxl        # Escritura de Excel
```

## Variables de entorno (`.env`, NO en git)

```
DB_PATH=\\servidor\comun\FELJA.mdb   # ruta de red a la BD (tiene default en código)
DB_USER=administrador
DB_PASSWORD=tu_contraseña_aqui
```

El `.env.example` está en el repo como plantilla.

## Rama de trabajo

`claude/repository-code-review-vIehi`

## Historial de cambios relevantes

- **eaaa646** — Fix de seguridad previo: credenciales a variables de entorno, query parametrizada, manejo de errores con popup.

---
*Actualizar este archivo con cada cambio importante para no repetir exploración.*
