/**
 * PARAMETROS_ETAPAS
 * 
 * Este objeto contiene los parámetros de referencia para las diferentes etapas
 * de crecimiento de las plantas. Cada etapa tiene valores mínimos y máximos recomendados
 * para los siguientes parámetros ambientales:
 * 
 * - humedad_suelo: Contenido de agua en el sustrato (porcentaje)
 * - humedad: Humedad relativa del aire (porcentaje)
 * - temperatura: Temperatura ambiente (grados Celsius)
 * 
 * Estos parámetros son utilizados por el sistema de monitoreo para determinar
 * si las condiciones actuales están dentro de los rangos óptimos para cada etapa
 * de crecimiento.
 */
export const PARAMETROS_ETAPAS = {
  'Germinación': {
    humedad_suelo: { min: 70, max: 90 },  // Porcentaje de humedad en sustrato
    humedad: { min: 70, max: 80 },        // Porcentaje de humedad relativa en aire
    temperatura: { min: 20, max: 28 }     // Temperatura en grados Celsius
  },
  'Vegetativa': {
    humedad_suelo: { min: 30, max: 60 },  // Porcentaje de humedad en sustrato
    humedad: { min: 40, max: 70 },        // Porcentaje de humedad relativa en aire
    temperatura: { min: 22, max: 28 }     // Temperatura en grados Celsius
  },
  'Floración': {
    humedad_suelo: { min: 40, max: 50 },  // Porcentaje de humedad en sustrato
    humedad: { min: 40, max: 50 },        // Porcentaje de humedad relativa en aire
    temperatura: { min: 18, max: 26 }     // Temperatura en grados Celsius
  }
};