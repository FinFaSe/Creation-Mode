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

Los equipos, jugadores, cuotas, marcadores y tiempos se introducen manualmente. La aplicación no consulta datos deportivos ni procesa apuestas. El aviso de muestra se muestra en el editor. Los datos se mantienen solo durante la sesión de la página.

## Diseño de referencia

Los botones «Cargar ejemplo» reproducen los datos de las capturas de fútbol y básquet. En los mercados de jugador, el nombre se muestra entre corchetes dentro del mercado: `Total de Puntos [Victor Wembanyama]`; la selección queda como `Más de 28.5`.

Los mercados de básquet de primer tiempo usan los rótulos `Primer Tiempo - Total de Puntos` y `Primer Tiempo - Hándicap`. Los ejemplos «1T · Puntos» y «1T · Hándicap» cargan Más de 117.5 a cuota 1.87 y Phoenix Suns +3.5 a cuota 2.12. En estos dos mercados se muestran los escudos de Phoenix Suns y San Antonio Spurs, recuperados de los recursos visuales del HAR anterior, cuando ambos equipos coinciden con esos nombres. Para otros equipos se conserva la presentación de texto.

El estado «Ganada» añade la etiqueta verde, el icono de acierto y el marcador final editable, sustituyendo la fecha/hora. El ejemplo «Ganada» carga RB Leipzig / FC Augsburg, Menos de 33.5 remates totales, cuota 1.72 y marcador 5-2. El estado se elige manualmente; la aplicación no valida resultados deportivos.

El estado «En vivo» muestra el rayo, un periodo opcional, el tiempo de juego, el tiempo añadido opcional y los marcadores de los equipos en dos filas a la derecha. El ejemplo «En vivo» usa los equipos públicos de la captura anterior de básquet, 4.º cuarto, 03:24 y marcador 98-95. Todos estos datos son editables; el reloj no avanza automáticamente. Los campos de tiempo en vivo y marcador se desactivan al cambiar a «Pendiente»; los campos de tiempo en vivo se desactivan en «Ganada».

La estructura del marcador en vivo y sus reglas de estilo se reconstruyeron a partir del componente público incluido en el nuevo HAR. El rayo es un vector local. El HAR completo y las respuestas de la cuenta no se guardan en el repositorio.

El fondo, el logo PNG y los SVG de básquet, fútbol, acierto y marcador se extrajeron del HTML aportado por el usuario. El icono de béisbol se dibujó como SVG local. El HAR posterior permitió recuperar las reglas originales del componente y Ubuntu Sans variable, incluidos los pesos 450 y 750.

`assets/card-design.json` contiene únicamente plantillas saneadas de los dos ejemplos públicos, sus reglas visuales, variables resueltas e iconos. No contiene el HAR, cabeceras, datos de sesión ni respuestas de la cuenta. Los datos editables se insertan con `textContent`.

La exportación aplica las reglas originales dentro de un SVG aislado con la fuente embebida. El diseño mantiene su tamaño lógico de 450 × 338 y se rasteriza directamente a la calidad elegida: 1× (450 × 338), 2× (900 × 676) o 4× (1800 × 1352, predeterminada). El texto y los iconos vectoriales se renderizan a la resolución final; el logo y el fondo conservan sus recursos PNG originales. La vista previa mantiene el mismo tamaño en pantalla.

No necesita servicios externos. Un control de revisiones evita que una renderización anterior sustituya a una edición más reciente; la descarga espera a que termine la tarjeta actual.

Ubuntu Sans pertenece a Canonical Ltd. y se distribuye sin modificaciones bajo Ubuntu Font Licence 1.0; se incluyen la licencia y los créditos en `assets/fonts/`. La fuente de marca decorativa y los recursos de otras secciones del sitio no se incorporan.

GitHub Actions publica los archivos estáticos y la carpeta `assets/` en GitHub Pages con cada envío a `main`.

## Validación realizada

`npm test` ejecuta once pruebas del modelo: los ejemplos de primer tiempo y los demás ejemplos, los campos en vivo, marcadores válidos e inválidos, hándicaps con signos y equipos renombrados, cuotas inválidas y los 18 mercados.

Las pruebas de navegador requieren Node.js 20 o superior y las herramientas de desarrollo:

```sh
npm ci
npx playwright install --with-deps chromium
npm run test:browser
```

Si Chromium ya está instalado, se puede usar `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/ruta/a/chromium npm run test:browser`.

El script prueba el sitio estático bajo `/Creation-Mode/`, sin conexiones externas. Compara los ejemplos de básquet, ambos mercados de primer tiempo, en vivo y apuesta ganada con sus referencias independientes de HTML y CSS. Renderiza esas referencias en el mismo navegador y sistema operativo que la exportación y aplica una tolerancia pequeña de antialiasing. Comprueba también el checksum de la fuente original. Comprueba que el PNG descargado coincide con la vista previa, los 54 casos de mercado/estado, marcador cero, periodo opcional, tiempo añadido, validación y desactivación de campos, cálculo de retorno sin alterar la tarjeta, orden de renderización, texto escapado, vista móvil de 390 y 320 px y errores de carga de fuente. Estas pruebas también se ejecutan antes de publicar en GitHub Actions.

La prueba de calidad verifica el valor 4× predeterminado, las dimensiones codificadas en los PNG 1×/2×/4×, el tamaño constante de la vista previa y el detalle del texto de alta resolución frente a ampliar una imagen de baja resolución.

Playwright está fijado en 1.64.0 para usar Chromium 156. Las referencias se renderizan durante la prueba para controlar las diferencias de tipografía entre sistemas operativos. El tamaño raíz original de 14px se resuelve antes de insertar el CSS en el SVG para mantener las unidades `rem` consistentes.
