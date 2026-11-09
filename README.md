# Creation Mode

Creador de tarjetas de cuotas en español, inspirado en el formato visual de Betano. Permite editar equipos, mercado, selección, línea, cuota y horario; muestra una vista previa y exporta un PNG de 450 × 338. El monto opcional calcula el retorno potencial, incluyendo la apuesta inicial, sin añadirlo a la imagen.

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

El fondo, el logo PNG y los SVG de básquet, fútbol, acierto y marcador se extrajeron del HTML aportado por el usuario. El icono de béisbol se dibujó como SVG local. El HTML no incluía hojas de estilo ni fuentes originales: las posiciones y tamaños se reconstruyeron a partir de las capturas y la tipografía se aproxima con Open Sans. No se ha verificado una coincidencia exacta píxel a píxel.

Todos los recursos de la tarjeta se sirven localmente, incluidas las fuentes, para que la descarga no dependa de servidores externos. Open Sans es de Google Corporation y se distribuye bajo Apache 2.0; la licencia se incluye en `assets/fonts/LICENSE.txt`.

GitHub Actions publica los archivos estáticos y la carpeta `assets/` en GitHub Pages con cada envío a `main`.

## Validación realizada

`npm test` ejecuta siete pruebas del modelo: los tres ejemplos, marcadores válidos e inválidos, hándicaps con signos y equipos renombrados, cuotas inválidas y los 18 mercados.

El formato ganador se comprobó con Chromium en los 18 mercados, incluyendo exportación PNG de 450 × 338, marcador cero, validación de campos, retorno al estado pendiente, textos largos, marcadores de tres cifras y vista móvil de 390 y 320 px.

Prueba de navegador con Chromium sobre una compilación estática bajo `/Creation-Mode/`: ambos ejemplos, fuentes e imágenes locales, selección de los 18 mercados, validación de jugador/cuota, cálculo de retorno sin modificar la imagen, descarga PNG idéntica a la vista previa de 450 × 338, textos largos y diseño móvil de 390 y 320 px sin desbordamiento. También se comprobó el mensaje de error y bloqueo de descarga cuando falla un recurso. Comprobación de sintaxis de JavaScript con Node.js.
