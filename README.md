# 💰 GastoApp

**Dashboard personal de gastos e ingresos con cuentas de usuario, sincronización en la nube y exportación de datos.**

🌐 **[Ver app en vivo →](https://poeta2475.github.io/cuentas/)**

---

## ¿Qué es GastoApp?

GastoApp es una aplicación web para llevar el control de tus finanzas personales. Puedes registrar gastos e ingresos, ver resúmenes por mes, analizar tus categorías con gráficas y exportar todo tu historial a Excel con un solo clic.

Tus datos se guardan en la nube (Firebase) — puedes entrar desde cualquier dispositivo y siempre tendrás tu información disponible.

---

## Características

- 🔐 **Cuentas de usuario** — registro e inicio de sesión con correo y contraseña
- ☁️ **Sincronización en la nube** — datos guardados en Firebase Firestore, accesibles desde cualquier dispositivo
- 📊 **Gráfica de gastos por categoría** — dona interactiva con montos al pasar el cursor
- 📈 **Evolución mensual** — gráfica de barras con ingresos y gastos por mes
- 🗂️ **Filtro por mes y año** — navega tu historial fácilmente
- 💾 **Exportar a CSV** — descarga todos tus registros para analizarlos en Excel o Google Sheets
- 🗑️ **Eliminar transacciones** — borra cualquier registro con confirmación
- 📱 **Diseño responsivo** — funciona en móvil, tablet y computador
- 🌙 **Modo oscuro** — interfaz dark mode completa

---

## Capturas

| Dashboard | Login |
|-----------|-------|
| Resumen del mes con tarjetas de ingresos, gastos y balance | Pantalla de inicio de sesión y registro |

---

## Categorías disponibles

**Gastos:** Comida · Transporte · Vivienda · Salud · Entretenimiento · Ropa · Educación · Otro

**Ingresos:** Sueldo · Freelance · Inversión · Regalo · Otro

---

## Tecnologías

| Tecnología | Uso |
|------------|-----|
| HTML / CSS / JavaScript | Frontend SPA sin frameworks |
| [Firebase Authentication](https://firebase.google.com/products/auth) | Login y registro de usuarios |
| [Cloud Firestore](https://firebase.google.com/products/firestore) | Base de datos en la nube |
| [Chart.js](https://www.chartjs.org/) | Gráficas interactivas |
| [GitHub Pages](https://pages.github.com/) | Hosting gratuito |
| GitHub Actions | Deploy automático al hacer push a `main` |

---

## Cómo usar

1. Abre la app: **[poeta2475.github.io/cuentas](https://poeta2475.github.io/cuentas/)**
2. Crea una cuenta con tu correo y contraseña
3. Agrega tus gastos e ingresos con categoría, descripción, monto y fecha
4. Navega por meses usando el filtro del menú superior
5. Usa **"⬇ Exportar todo"** para descargar tu historial completo en CSV

---

## Estructura del proyecto

```
📁 cuentas/
├── index.html        # Estructura base de la app
├── app.js            # Lógica completa (Firebase, UI, gráficas)
├── app.css           # Estilos dark mode
└── .github/
    └── workflows/
        └── pages.yml # Deploy automático a GitHub Pages
```

---

## Exportación CSV

Al hacer clic en **"⬇ Exportar todo"**, se descarga un archivo `gastoapp_YYYY-MM-DD.csv` con todas tus transacciones:

| Fecha | Tipo | Categoría | Descripción | Monto |
|-------|------|-----------|-------------|-------|
| 2026-06-07 | ingreso | Sueldo | Pago mensual | 1500000 |
| 2026-06-05 | gasto | Comida | Almuerzo | 25000 |

Compatible con Microsoft Excel, Google Sheets y LibreOffice Calc.

---

## Licencia

Proyecto personal de uso libre.
