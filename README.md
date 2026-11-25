# Dashboard de Gestión de Parches y Vulnerabilidades 

Sistema integral para la visualización, priorización y análisis ejecutivo del estado de parches y vulnerabilidades en infraestructura tecnológica. Incluye métricas clave (KPIs), cumplimiento de SLA, detección de servidores en riesgo crítico y exportación de reportes en PDF y CSV.

---

## Arquitectura general del proyecto

El sistema está dividido en dos partes principales que trabajan en equipo:
* **Backend (FastAPI - Python):** El motor que procesa las bases de datos y archivos CSV, calcula los algoritmos de riesgo y sirve la información.
* **Frontend (React + Vite + TailwindCSS):** La interfaz visual e interactiva que ves y utilizas en tu navegador web.

---

## ¿Cómo ejecutar este proyecto en una computadora externa?

Si recibiste este proyecto en un archivo comprimido (`.zip`) y necesitas ponerlo a funcionar en otra computadora, sigue estas instrucciones paso a paso. No necesitas ser programador para lograrlo.

---

### Paso 0: Preparar los archivos (Común para todos)

1. **Descarga y descomprime el archivo `.zip`:**
   * Haz clic derecho sobre el archivo `.zip` descargado y selecciona **"Extraer todo..."** (o usa 7-Zip / WinRAR).
   * Te recomendamos extraer la carpeta en un lugar de fácil acceso, por ejemplo en tu **Escritorio** o en **Documentos**.
2. **Asegúrate de que la carpeta contenga los datos:**
   * Entra a la carpeta descomprimida y verifica que exista una carpeta llamada `tablas_limpias` con los archivos `tabla1_s_clean.csv` y `tabla2_v_clean.csv`.
3. **Cómo abrir una terminal en la carpeta del proyecto:**
   * **En Windows:** Abre la carpeta principal del proyecto en el Explorador de Archivos. Haz clic en la barra de direcciones superior (donde se ve la ruta de carpetas), escribe `cmd` o `powershell` y presiona **Enter**. Se abrirá una ventana negra o azul ubicada exactamente en esa carpeta.
   * **En Mac:** Abre la carpeta en Finder, haz clic derecho en el espacio vacío y selecciona **"Abrir terminal en esta carpeta"** (o arrastra la carpeta a la aplicación Terminal).

---

Elige **UNA** de las siguientes dos maneras para correr el sistema:

---

## Manera 1: Con Docker Desktop (La más fácil y recomendada)

Este método es el más sencillo porque **Docker se encarga de instalar y configurar todo automáticamente** en un entorno aislado sin alterar tu computadora.

### Requisitos previos:
* Tener instalado **Docker Desktop**:
  * [Descargar Docker Desktop para Windows / Mac](https://www.docker.com/products/docker-desktop/)
  * *Nota para Windows:* Durante la instalación, asegúrate de marcar la casilla para usar **WSL 2**.

### Paso a paso:

1. **Inicia Docker Desktop:**
   * Abre el programa **Docker Desktop** en tu computadora.
   * Espera 1 o 2 minutos hasta que el ícono de la ballena en la esquina inferior izquierda esté en **color verde** (estado *Running* o *Engine running*).
2. **Abre la terminal en la raíz del proyecto:**
   * Asegúrate de estar en la carpeta principal donde se encuentra el archivo `docker-compose.yml`.
3. **Ejecuta el siguiente comando:**
   ```bash
   docker compose up --build
   ```
   *(Si tu versión de Docker es más antigua y marca error, usa: `docker-compose up --build`)*.
4. **Espera a que termine de descargar y compilar:**
   * La primera vez puede tardar unos 3 a 5 minutos mientras descarga las imágenes y compila el sistema.
   * Cuando termine, verás mensajes en la terminal indicando que los servicios están listos.
5. **Abre el programa en tu navegador:**
   * Entra a: **[http://localhost](http://localhost)**
   * ¡Listo! Podrás interactuar con todo el dashboard.

> **¿Cómo apagarlo?**
> En la misma terminal donde lo iniciaste, presiona las teclas `Ctrl + C`. O bien, abre Docker Desktop y presiona el botón cuadrado de **Stop** en el grupo de contenedores.

---

## Manera 2: Ejecución manual con dos terminales (Sin Docker)

Usa este método si no tienes Docker instalado o si quieres modificar el código en modo desarrollo. En este método encendemos primero el "cerebro" (Backend) y luego la "pantalla" (Frontend).

### Requisitos previos:
1. **Python 3.11 o superior:**
   * [Descargar Python](https://www.python.org/downloads/)
   * **IMPORTANTE EN WINDOWS:** Al instalar Python, marca obligatoriamente la casilla que dice **"Add Python to PATH"** en la primera pantalla del instalador.
2. **Node.js (versión 20 LTS o superior):**
   * [Descargar Node.js LTS](https://nodejs.org/)
   * Instálalo siguiendo los pasos por defecto del instalador ("Next, Next, Finish").

---

### Terminal 1: Encender el Backend (FastAPI)

1. Abre tu primera ventana de terminal en la carpeta principal del proyecto.
2. Entra a la carpeta del backend:
   ```bash
   cd backend
   ```
3. **Crea un entorno virtual de Python** (esto crea una carpeta aislada para las librerías sin ensuciar tu sistema):
   ```bash
   python -m venv venv
   ```
4. **Activa el entorno virtual:**
   * **En Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
     *(Si usas el Símbolo del Sistema / CMD clásico, escribe: `venv\Scripts\activate.bat`)*
   * **En Mac o Linux:**
     ```bash
     source venv/bin/activate
     ```
   *(Sabrás que funcionó porque aparecerá `(venv)` al inicio de tu línea de comandos).*
5. **Instala las dependencias necesarias:**
   ```bash
   pip install -r requirements.txt
   ```
   Espera unos segundos a que termine de instalar FastAPI, Pandas, Uvicorn, etc.
6. **Levanta el servidor Backend:**
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   Verás un mensaje similar a:
   `INFO: Uvicorn running on http://127.0.0.1:8000`
   
   **¡NO CIERRES ESTA VENTANA!** Este es el servidor backend. Si cierras esta ventana, la aplicación dejará de tener acceso a los datos.

---

### Terminal 2: Encender el Frontend (React)

1. Abre una **SEGUNDA ventana de terminal** independiente.
2. Entra a la carpeta principal del proyecto y luego a la carpeta del frontend:
   ```bash
   cd frontend
   ```
3. **Instala las librerías de interfaz gráfica:**
   ```bash
   npm install
   ```
   Espera 1 o 2 minutos a que descargue los paquetes necesarios de React y diseño.
4. **Inicia el servidor de visualización:**
   ```bash
   npm run dev
   ```
5. En la terminal verás una dirección web similar a:
   `➜ Local: http://localhost:5173/`
6. **Abre el programa en tu navegador:**
   * Haz clic en el enlace o abre tu navegador y entra a: **[http://localhost:5173](http://localhost:5173)**

> **¿Cómo apagarlo?**
> Ve a cada una de las dos terminales y presiona `Ctrl + C` para detener tanto el Backend como el Frontend.

---

## Preguntas Frecuentes y Solución de Problemas

#### 1. "En Windows me sale un error rojo al activar el entorno virtual (`execution of scripts is disabled on this system`)"
* Windows bloquea la ejecución de scripts por defecto.
* **Solución:** Abre PowerShell como Administrador y escribe:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
  Presiona `S` (Sí) y vuelve a intentar activar el entorno virtual.

#### 2. "¿Cómo sé si el Backend está funcionando correctamente?"
* Abre en tu navegador la dirección: [http://localhost:8000/health](http://localhost:8000/health)
* Deberías ver en pantalla: `{"status":"ok"}`.

#### 3. "En la Manera 1 (Docker) dice que el puerto 80 ya está ocupado"
* Si tienes instalado otro programa web (como Apache, IIS, o Skype), el puerto 80 puede estar en uso.
* **Solución:** Puedes cambiar el puerto abriendo el archivo `docker-compose.yml` con el bloc de notas y cambiando `"80:80"` por `"3000:80"`. Luego accederías en `http://localhost:3000`.

#### 4. "¿No se ven datos o aparecen tablas vacías?"
* Revisa que los archivos `tabla1_s_clean.csv` y `tabla2_v_clean.csv` estén presentes dentro de la carpeta `tablas_limpias/`. El sistema los lee automáticamente al arrancar.

---

## Equipo de Desarrollo
Proyecto desarrollado para el análisis de riesgo y control de parches de infraestructura tecnológica.
