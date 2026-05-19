import os
import pyodbc
import pandas as pd
import PySimpleGUI as sg
import calendar
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.environ.get('DB_PATH', r'\\servidor\comun\FELJA.mdb')
DB_USER = os.environ['DB_USER']
DB_PASSWORD = os.environ['DB_PASSWORD']

conn_str = (
    f'DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};'
    f'DBQ={DB_PATH};UID={DB_USER};PWD={DB_PASSWORD}'
)


def get_attendance(conn, fecha_desde, fecha_hasta):
    query = """
        SELECT horaspersonal_id, terceros_autonum,
               FORMAT(horaspersonal_hora, 'Short Date') as Fecha,
               FORMAT(horaspersonal_hora, 'Short Time') as [Date and Time],
               TIPO, SENSOR, horaspersonal_check, RAZON
        FROM horas_personal_exportar
        WHERE horaspersonal_hora BETWEEN ? AND ?
    """
    return pd.read_sql_query(query, conn, params=[fecha_desde, fecha_hasta])


def process_dataframe(df):
    df = df.rename(columns={"terceros_autonum": "ID Card"})
    df["Fecha"] = pd.to_datetime(df["Fecha"], dayfirst=True).dt.strftime("%d/%m/%Y")
    df['Date and Time'] = pd.to_datetime(df['Date and Time'], format='%H:%M')
    df["Day"] = pd.to_datetime(df["Fecha"], format="%d/%m/%Y").dt.day_name()
    df['Fecha'] = pd.to_datetime(df['Fecha'], format='%d/%m/%Y')

    df_grouped = df.groupby(['ID Card', 'Fecha'])['Date and Time'].agg(['min', 'max'])
    df_grouped.columns = ['Time In', 'Time Out']
    df_grouped = df_grouped.reset_index()
    df = pd.merge(df, df_grouped, on=['ID Card', 'Fecha'])

    df = df.drop(columns=["Date and Time"])
    df = df.rename(columns={"Fecha": "Date"})
    df["Time In"] = df["Time In"].dt.strftime("%H:%M:%S")
    df["Time Out"] = df["Time Out"].dt.strftime("%H:%M:%S")

    days_dict = {
        calendar.day_name[i]: dia
        for i, dia in enumerate(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"])
    }
    df["Day"] = df["Day"].map(days_dict)
    return df


layout = [
    [sg.Text('Selecciona el rango de fechas')],
    [
        sg.CalendarButton('Desde', target='dateDesde', key='desde'),
        sg.Input(key='dateDesde', size=(10, 1)),
        sg.CalendarButton('Hasta', target='dateHasta', key='hasta'),
        sg.Input(key='dateHasta', size=(10, 1)),
    ],
    [sg.Button('Generar reporte')],
]

window = sg.Window('Reporte de asistencia', layout)

try:
    conn = pyodbc.connect(conn_str)
except pyodbc.Error as e:
    sg.popup_error(f"Error al conectar a la base de datos:\n{e}")
    raise SystemExit(1)

while True:
    event, values = window.read()
    if event == sg.WIN_CLOSED:
        break
    if event == 'Generar reporte':
        try:
            fecha_desde = pd.to_datetime(values['dateDesde']).to_pydatetime()
            fecha_hasta = pd.to_datetime(values['dateHasta']).to_pydatetime()
            df = get_attendance(conn, fecha_desde, fecha_hasta)
            df = process_dataframe(df)
            filename = sg.popup_get_file(
                "Guardar como...", save_as=True,
                file_types=(("Archivos de Excel", "*.xlsx"),)
            )
            if filename:
                column_names = ["ID Card", "Day", "Date", "Time In", "Time Out"]
                with pd.ExcelWriter(filename) as writer:
                    df[column_names].to_excel(writer, index=False)
                sg.popup(f"Archivo guardado en {filename}")
        except Exception as e:
            sg.popup_error(f"Error al generar el reporte:\n{e}")

conn.close()
window.close()
