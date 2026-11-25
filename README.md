# Dashboard de Gestión de Parches y Vulnerabilidades

Sistema integral para la visualización, priorización y análisis ejecutivo del estado de parches y vulnerabilidades en infraestructura tecnológica. Incluye métricas clave (KPIs), cumplimiento de SLA, detección de servidores en riesgo crítico y exportación de reportes en PDF y CSV.

---

## Arquitectura general del proyecto

El sistema está dividido en dos partes principales que trabajan en equipo:

- **Backend (FastAPI - Python):** El motor que procesa las bases de datos y archivos CSV, calcula los algoritmos de riesgo y sirve la información.
- **Frontend (React + Vite + TailwindCSS):** La interfaz visual e interactiva que ves y utilizas en tu navegador web.

---

## ¿Cómo ejecutar este proyecto en una computadora externa?

Si recibiste este proyecto en un archivo comprimido (`.zip`) y necesitas ponerlo a funcionar en otra computadora, sigue estas instrucciones paso a paso. **No necesitas ser programador para lograrlo.**

> **Antes de empezar, ten en cuenta:**
> - Sigue los pasos **en orden**. No saltes ninguno.
> - Los comandos que aparecen en recuadros grises (como `cd backend`) se escriben **exactamente igual** en la terminal, y se ejecutan presionando **Enter**.
> - No escribas el símbolo `$` ni `>` al inicio del comando; esos solo indican "aquí va un comando".
> - Si algo falla, revisa la sección **"Errores comunes y solución de problemas"** al final del documento.

---

### Paso 0: Preparar los archivos (Común para todos)

1. **Descarga y descomprime el archivo `.zip`:**
   - Haz clic derecho sobre el archivo `.zip` descargado y selecciona **"Extraer todo..."** (o usa 7-Zip / WinRAR).
   - Te recomendamos extraer la carpeta en un lugar de fácil acceso, por ejemplo en tu **Escritorio** o en **Documentos**.
   - **Importante:** No ejecutes el proyecto desde dentro del `.zip`. Debes extraerlo primero.

2. **Asegúrate de que la carpeta contenga los datos:**
   - Entra a la carpeta descomprimida y verifica que exista una carpeta llamada `tablas_limpias` con los archivos `tabla1_s_clean.csv` y `tabla2_v_clean.csv`.
   - Si no existen, no te preocupes: el sistema intentará generarlos automáticamente al arrancar (ver sección **"Preprocesamiento y Carga de Datos Integrada"**).

3. **Identifica la carpeta raíz del proyecto:**
   - La **carpeta raíz** es la carpeta principal que contiene, entre otros, el archivo `docker-compose.yml`, la carpeta `backend/` y la carpeta `frontend/`.
   - Todos los comandos de este documento se ejecutan **desde la carpeta raíz**, salvo que se indique lo contrario (por ejemplo, `cd backend`).

4. **Cómo abrir una terminal en la carpeta del proyecto:**
   - **En Windows:** Abre la carpeta principal del proyecto en el Explorador de Archivos. Haz clic en la barra de direcciones superior (donde se ve la ruta de carpetas), escribe `cmd` o `powershell` y presiona **Enter**. Se abrirá una ventana negra o azul ubicada exactamente en esa carpeta.
   - **En Mac:** Abre la carpeta en Finder, haz clic derecho en el espacio vacío y selecciona **"Abrir terminal en esta carpeta"** (o arrastra la carpeta a la aplicación Terminal).

---

Elige **UNA** de las siguientes dos maneras para correr el sistema:

---

## Manera 1: Con Docker Desktop (La más fácil y recomendada)

Este método es el más sencillo porque **Docker se encarga de instalar y configurar todo automáticamente** en un entorno aislado sin alterar tu computadora.

### Requisitos previos:
- Tener instalado **Docker Desktop**:
  - [Descargar Docker Desktop para Windows / Mac](https://www.docker.com/products/docker-desktop/)
  - *Nota para Windows:* Durante la instalación, asegúrate de marcar la casilla para usar **WSL 2**. Si no sabes qué es, deja las opciones por defecto del instalador.
  - *Nota para Windows:* Si al instalar Docker te pide reiniciar la computadora, hazlo antes de continuar.

### Paso a paso:

1. **Inicia Docker Desktop:**
   - Abre el programa **Docker Desktop** en tu computadora.
   - Espera 1 o 2 minutos hasta que el ícono de la ballena en la esquina inferior izquierda esté en **color verde** (estado *Running* o *Engine running*).
   - **No continúes hasta que la ballena esté verde.**

2. **Abre la terminal en la raíz del proyecto:**
   - Asegúrate de estar en la carpeta principal donde se encuentra el archivo `docker-compose.yml`. Si no sabes cómo verificar esto, revisa el **Paso 0, punto 3**.

3. **Ejecuta el siguiente comando:**
   ```bash
   docker compose up --build
   ```
   *(Si tu versión de Docker es más antigua y marca error, usa: `docker-compose up --build`)*.

4. **Espera a que termine de descargar y compilar:**
   - La primera vez puede tardar unos 3 a 5 minutos mientras descarga las imágenes y compila el sistema.
   - Cuando termine, verás mensajes en la terminal indicando que los servicios están listos. **No cierres esta ventana.**

5. **Abre el programa en tu navegador:**
   - Entra a: **[http://localhost](http://localhost)**
   - ¡Listo! Podrás interactuar con todo el dashboard.

> **¿Cómo apagarlo?**
> En la misma terminal donde lo iniciaste, presiona las teclas `Ctrl + C`. O bien, abre Docker Desktop y presiona el botón cuadrado de **Stop** en el grupo de contenedores.

---

## Manera 2: Ejecución manual con dos terminales (Sin Docker)

Usa este método si no tienes Docker instalado o si quieres modificar el código en modo desarrollo. En este método encendemos primero el "cerebro" (Backend) y luego la "pantalla" (Frontend).

> **Importante:** Necesitarás **dos ventanas de terminal abiertas al mismo tiempo**. Una para el Backend y otra para el Frontend. No cierres ninguna de las dos mientras uses el dashboard.

### Requisitos previos:
1. **Python 3.11 o superior:**
   - [Descargar Python](https://www.python.org/downloads/)
   - **IMPORTANTE EN WINDOWS:** Al instalar Python, marca obligatoriamente la casilla que dice **"Add Python to PATH"** en la primera pantalla del instalador. Si no la marcas, los comandos `python` y `pip` no funcionarán.
   - Para verificar que Python quedó instalado, abre una terminal y escribe `python --version`. Debe mostrar un número como `3.11.x` o superior.

2. **Node.js (versión 20 LTS o superior):**
   - [Descargar Node.js LTS](https://nodejs.org/)
   - Instálalo siguiendo los pasos por defecto del instalador ("Next, Next, Finish").
   - Para verificar que Node.js quedó instalado, abre una terminal y escribe `node --version`. Debe mostrar un número como `v20.x.x` o superior.

---

### Terminal 1: Encender el Backend (FastAPI)

1. Abre tu primera ventana de terminal en la **carpeta principal del proyecto** (la que contiene `docker-compose.yml`).
2. Entra a la carpeta del backend:
   ```bash
   cd backend
   ```
   *Sabrás que funcionó porque la ruta de tu terminal ahora termina en `\backend` (Windows) o `/backend` (Mac).*

3. **Crea un entorno virtual de Python** (esto crea una carpeta aislada para las librerías sin ensuciar tu sistema):
   ```bash
   python -m venv venv
   ```
   *Esto puede tardar unos segundos. No verás muchos mensajes; es normal.*

4. **Activa el entorno virtual:**
   - **En Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
     *(Si usas el Símbolo del Sistema / CMD clásico, escribe: `venv\Scripts\activate.bat`)*
   - **En Mac o Linux:**
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

1. Abre una **SEGUNDA ventana de terminal** independiente (no cierres la Terminal 1).
2. Entra a la carpeta principal del proyecto y luego a la carpeta del frontend:
   ```bash
   cd frontend
   ```
   *(Si tu terminal se abrió directamente en la carpeta del proyecto, este comando funciona. Si se abrió en otra ubicación, primero navega a la carpeta raíz del proyecto; ver sección **"Cómo moverse en la terminal"** al final).*

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
   - Haz clic en el enlace o abre tu navegador y entra a: **[http://localhost:5173](http://localhost:5173)**

> **¿Cómo apagarlo?**
> Ve a cada una de las dos terminales y presiona `Ctrl + C` para detener tanto el Backend como el Frontend.

---

## Preguntas Frecuentes y Solución de Problemas

#### 1. "En Windows me sale un error rojo al activar el entorno virtual (`execution of scripts is disabled on this system`)"
- Windows bloquea la ejecución de scripts por defecto.
- **Solución:** Abre PowerShell como Administrador y escribe:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
  Presiona `S` (Sí) y vuelve a intentar activar el entorno virtual.

#### 2. "¿Cómo sé si el Backend está funcionando correctamente?"
- Abre en tu navegador la dirección: [http://localhost:8000/health](http://localhost:8000/health)
- Deberías ver en pantalla: `{"status":"ok"}`.

#### 3. "En la Manera 1 (Docker) dice que el puerto 80 ya está ocupado"
- Si tienes instalado otro programa web (como Apache, IIS, o Skype), el puerto 80 puede estar en uso.
- **Solución:** Puedes cambiar el puerto abriendo el archivo `docker-compose.yml` con el bloc de notas y cambiando `"80:80"` por `"3000:80"`. Luego accederías en `http://localhost:3000`.

#### 4. "¿No se ven datos o aparecen tablas vacías?"
- Revisa que los archivos `tabla1_s_clean.csv` y `tabla2_v_clean.csv` estén presentes dentro de la carpeta `tablas_limpias/`. El sistema los lee automáticamente al arrancar.

---

## Preprocesamiento y Carga de Datos Integrada

OJO **no es necesario ejecutar cuadernos de Jupyter (`preprocesamiento.ipynb`) por separado**:
1. **Limpieza automática al arrancar:** Si no existen los archivos en `tablas_limpias/`, el backend busca automáticamente archivos de datos en la raíz o en `data/` y genera las tablas limpias de forma transparente.
2. **Carga directa desde la web:** En la interfaz gráfica del dashboard, puedes arrastrar tu archivo Excel (`.xlsx`) o CSV directamente en la tarjeta **"Cargar datos (Excel o CSV)"**. El Backend:
   - Normaliza los encabezados a formato estándar.
   - Estandariza IDs (`SRV-0001`, `FND-000001`).
   - Limpia y pone en mayúsculas las categorías.
   - Imputa valores nulos (`NOT_IDENTIFIED`, `NONE`).
   - Elimina duplicados y hallazgos huérfanos.
   - Actualiza el dashboard y todas las gráficas en tiempo real.

---

## Cómo moverse en la terminal (guía rápida para no programadores)

La **terminal** es una ventana donde escribes comandos de texto. No da miedo: solo necesitas conocer 5 comandos básicos.

| Acción | Windows (CMD / PowerShell) | Mac / Linux |
|---|---|---|
| Ver en qué carpeta estás | `cd` | `pwd` |
| Entrar a una carpeta | `cd nombre_carpeta` | `cd nombre_carpeta` |
| Subir un nivel (volver atrás) | `cd ..` | `cd ..` |
| Ver los archivos de la carpeta actual | `dir` | `ls` |
| Limpiar la pantalla | `cls` | `clear` |

**Ejemplo práctico:** si estás en `C:\Users\TuNombre\Desktop` y el proyecto está en `C:\Users\TuNombre\Desktop\Dashboard-Parches`, escribes:
```bash
cd Dashboard-Parches
```
y presionas **Enter**. Ahora estás dentro de la carpeta raíz del proyecto.

**Cómo saber que estás en el lugar correcto:** al ejecutar `dir` (Windows) o `ls` (Mac), deberías ver el archivo `docker-compose.yml`, la carpeta `backend` y la carpeta `frontend`. Si no los ves, no estás en la carpeta raíz; navega con `cd` hasta encontrarla.

**Consejo:** puedes escribir las primeras letras de una carpeta y presionar **Tab** para autocompletar el nombre. Esto evita errores de tipeo.

---

## Errores comunes al instalar y cómo resolverlos

| Síntoma | Causa probable | Solución |
|---|---|---|
| `python no se reconoce como comando` / `command not found: python` | Python no está instalado o no se agregó al PATH. | Reinstala Python marcando **"Add Python to PATH"**. En Mac, usa `python3` en lugar de `python`. |
| `node no se reconoce como comando` | Node.js no está instalado. | Instala Node.js LTS desde [nodejs.org](https://nodejs.org/) y reinicia la terminal. |
| `npm: command not found` | Node.js no quedó bien instalado. | Reinstala Node.js y verifica con `node --version` y `npm --version`. |
| `No module named uvicorn` / `ModuleNotFoundError` | No se activó el entorno virtual o no se instalaron las dependencias. | Verifica que veas `(venv)` al inicio de la línea. Si no, reactiva el entorno y ejecuta `pip install -r requirements.txt`. |
| `EADDRINUSE: port 8000 already in use` | Otro programa está usando el puerto 8000. | Cierra el otro programa o cambia el puerto: `python -m uvicorn app.main:app --reload --port 8001` (y ajusta el frontend si es necesario). |
| `EADDRINUSE: port 5173 already in use` | Ya hay un frontend corriendo o el puerto está ocupado. | Cierra la otra terminal/instancia, o Vite te ofrecerá automáticamente el siguiente puerto libre (5174, 5175...). |
| El navegador muestra "No se puede acceder a este sitio" en `localhost:5173` | El frontend no está corriendo o falló al arrancar. | Revisa la Terminal 2: debe decir `Local: http://localhost:5173/`. Si hay error, léelo y corrígelo antes de recargar. |
| El dashboard carga pero sin datos | El backend no está corriendo o no encontró los CSV. | Verifica [http://localhost:8000/health](http://localhost:8000/health). Revisa que exista `tablas_limpias/` con los dos CSV, o carga los datos desde la tarjeta **"Cargar datos"**. |
| Docker: "Cannot connect to the Docker daemon" | Docker Desktop no está iniciado. | Abre Docker Desktop y espera a que la ballena esté verde. |
| Docker: "port 80 is already allocated" | Otro servicio usa el puerto 80. | Cambia `"80:80"` por `"3000:80"` en `docker-compose.yml` y accede en `http://localhost:3000`. |
| Al activar el venv en Windows: "execution of scripts is disabled" | Política de ejecución de PowerShell. | Ejecuta como administrador: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` y responde `S`. |
| `pip install` falla con errores de compilación | Versión de Python incompatible o falta de herramientas. | Asegúrate de tener Python 3.11+ y actualiza pip con `python -m pip install --upgrade pip`. |
| La terminal se queda "colgada" sin volver al prompt | Es normal: el servidor está corriendo en primer plano. | No cierres la ventana. Para detenerlo, presiona `Ctrl + C`. |

---

## Equipo de Desarrollo

Proyecto desarrollado para el análisis de riesgo y control de parches de infraestructura tecnológica.
