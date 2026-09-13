/*
 * Pre-calentado del dashboard al arrancar el servidor.
 *
 * La primera carga en frío tarda por el ritmo anti rate-limit que
 * exige Airtable (~2 min en modo frío). Para que nadie la pague,
 * disparamos una carga en segundo plano apenas el servidor queda
 * arriba. En Next.js este `register()` corre una sola vez por
 * proceso del servidor (no durante el build).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (
    process.env.NEXT_PHASE ===
    "phase-production-build"
  ) {
    return;
  }

  const port = process.env.PORT || "3000";

  setTimeout(() => {
    fetch(
      `http://127.0.0.1:${port}/api/dashboard`
    ).catch(() => {});
  }, 5000);
}
