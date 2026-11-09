# Creation Mode

Creador de tarjetas de cuotas en español, inspirado en el formato visual de Betano. Permite editar equipos, mercado, selección, línea, cuota y horario; muestra una vista previa y exporta un PNG de alta resolución. El monto opcional calcula el retorno potencial, incluyendo la apuesta inicial, sin añadirlo a la imagen.

## Ejecutar

Requiere Node.js 18 o superior. No necesita instalar dependencias.

```sh
cd /workspace/Creation-Mode
npm start
```

El servidor usa el puerto 3000; se puede cambiar con la variable `PORT`.

## Mercados

- Fútbol: goles totales, ambos equipos anotan, ambos equipos anotan primer tiempo, corners, tarjetas, tiros al arco, remates, corners primer tiempo y hándicap de corners.
- Básquet: ganador, puntos, hándicap, estadísticas de jugador Más/Menos, hándicap primer tiempo y puntos primer tiempo.
- Béisbol: ganador, hándicap y total.

Los equipos y jugadores se escriben manualmente. Las cuotas son manuales: no hay conexión con Betano, resultados en vivo ni procesamiento de apuestas. El aviso de muestra se muestra en el editor. Los datos se mantienen solo durante la sesión de la página.

## Diseño de referencia

Los botones «Cargar ejemplo» reproducen los datos de las capturas de fútbol y básquet. En los mercados de jugador, el nombre se muestra entre corchetes dentro del mercado: `Total de Puntos [Victor Wembanyama]`; la selección queda como `Más de 28.5`.

El estado «Ganada» añade la etiqueta verde, el icono de acierto y el marcador final editable, sustituyendo la fecha/hora. El ejemplo «Ganada» carga RB Leipzig / FC Augsburg, Menos de 33.5 remates totales, cuota 1.72 y marcador 5-2. El estado se elige manualmente; la aplicación no valida resultados deportivos.

El fondo, el logo PNG y los SVG de básquet, fútbol, acierto y marcador se extrajeron del HTML aportado por el usuario. El icono de béisbol se dibujó como SVG local. El HAR posterior permitió recuperar las reglas originales del componente y Ubuntu Sans variable, incluidos los pesos 450 y 750.

`assets/card-design.json` contiene únicamente plantillas saneadas de los dos ejemplos públicos, sus reglas visuales, variables resueltas e iconos. No contiene el HAR, cabeceras, datos de sesión ni respuestas de la cuenta. Los datos editables se insertan con `textContent`.

La exportación aplica las reglas originales dentro de un SVG aislado con la fuente embebida. El diseño mantiene su tamaño lógico de 450 × 338 y se rasteriza directamente a la calidad elegida: 1× (450 × 338), 2× (900 × 676) o 4× (1800 × 1352, predeterminada). El texto y los iconos vectoriales se renderizan a la resolución final; el logo y el fondo conservan sus recursos PNG originales. La vista previa mantiene el mismo tamaño en pantalla.

No necesita servicios externos. Un control de revisiones evita que una renderización anterior sustituya a una edición más reciente; la descarga espera a que termine la tarjeta actual.

Ubuntu Sans pertenece a Canonical Ltd. y se distribuye sin modificaciones bajo Ubuntu Font Licence 1.0; se incluyen la licencia y los créditos en `assets/fonts/`. La fuente de marca decorativa y los recursos de otras secciones del sitio no se incorporan.

GitHub Actions publica los archivos estáticos y la carpeta `assets/` en GitHub Pages con cada envío a `main`.

## Validación realizada

`npm test` ejecuta siete pruebas del modelo: los tres ejemplos, marcadores válidos e inválidos, hándicaps con signos y equipos renombrados, cuotas inválidas y los 18 mercados.

Las pruebas de navegador requieren Node.js 20 o superior y las herramientas de desarrollo:

```sh
npm ci
npx playwright install --with-deps chromium
npm run test:browser
```

Si Chromium ya está instalado, se puede usar `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/ruta/a/chromium npm run test:browser`.

El script prueba el sitio estático bajo `/Creation-Mode/`, sin conexiones externas. Compara los ejemplos de básquet y apuesta ganada con el HTML y CSS originales guardados como referencias independientes. Renderiza esas referencias en el mismo navegador y sistema operativo que la exportación y aplica una tolerancia pequeña de antialiasing. Comprueba también el checksum de la fuente original. Comprueba que el PNG descargado coincide con la vista previa, los 36 casos de mercado/estado, marcador cero, validación de campos, cálculo de retorno sin alterar la tarjeta, orden de renderización, texto escapado, vista móvil de 390 y 320 px y errores de carga de fuente. Estas pruebas también se ejecutan antes de publicar en GitHub Actions.

La prueba de calidad verifica el valor 4× predeterminado, las dimensiones codificadas en los PNG 1×/2×/4×, el tamaño constante de la vista previa y el detalle del texto de alta resolución frente a ampliar una imagen de baja resolución.

Playwright está fijado en 1.64.0 para usar Chromium 156. Las referencias se renderizan durante la prueba para controlar las diferencias de tipografía entre sistemas operativos. El tamaño raíz original de 14px se resuelve antes de insertar el CSS en el SVG para mantener las unidades `rem` consistentes.
