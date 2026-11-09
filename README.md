# Creation Mode

Creador de tarjetas de cuotas en español, inspirado en el formato visual de Betano. Permite editar equipos, mercado, selección, línea, cuota y horario; muestra una vista previa y exporta un PNG de 1184 × 870. El monto opcional calcula el retorno potencial, incluyendo la apuesta inicial.

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

Los equipos y jugadores se escriben manualmente. Las cuotas son manuales: no hay conexión con Betano, resultados en vivo ni procesamiento de apuestas. Cada imagen lleva una indicación de muestra. Los datos se mantienen solo durante la sesión de la página.

## Validación realizada

Prueba de navegador con Chromium: selección de los 18 mercados, controles de jugador, cálculo de retorno, descarga PNG y diseño móvil de 390 px sin desbordamiento. Comprobación de sintaxis de JavaScript con Node.js.
