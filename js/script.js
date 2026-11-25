/* =========================================================
   Agua Quieta — comportamiento de la página
   1. Navegación entre entradas (mostrar / ocultar secciones)
   2. Modo día / noche (con memoria en localStorage)
   3. Calculadora de volumen y capacidad del estanque
   4. Guía de alimentación según la temperatura
   5. Tiempo de lectura de cada entrada
   6. Visor para ampliar las imágenes
   ========================================================= */

// Esperamos a que el HTML esté cargado antes de buscar elementos en el DOM
document.addEventListener("DOMContentLoaded", () => {
  iniciarNavegacion();
  iniciarTema();
  iniciarCalculadora();
  iniciarGuiaAlimentacion();
  calcularTiemposDeLectura();
  iniciarVisor();
});


/* ---------- 1. Navegación entre entradas ---------- */

const ENTRADAS = ["inicio", "diseno", "especies", "agua"];

function iniciarNavegacion() {
  // Botones de las pestañas
  document.querySelectorAll(".pestana").forEach((boton) => {
    boton.addEventListener("click", () => irA(boton.dataset.entrada));
  });

  // Tarjetas del inicio y botones "Siguiente": cualquier elemento con data-ir
  document.querySelectorAll("[data-ir]").forEach((elemento) => {
    elemento.addEventListener("click", () => irA(elemento.dataset.ir));
    // Las tarjetas no son botones, así que también respondemos a Enter
    elemento.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") irA(elemento.dataset.ir);
    });
  });

  // Flechas izquierda / derecha para moverse entre pestañas
  document.querySelector(".pestanas").addEventListener("keydown", (evento) => {
    if (evento.key !== "ArrowRight" && evento.key !== "ArrowLeft") return;
    const actual = ENTRADAS.indexOf(entradaActual());
    const paso = evento.key === "ArrowRight" ? 1 : -1;
    const siguiente = ENTRADAS[(actual + paso + ENTRADAS.length) % ENTRADAS.length];
    irA(siguiente);
    document.querySelector(`.pestana[data-entrada="${siguiente}"]`).focus();
  });

  // Los botones Atrás / Adelante del navegador cambian el #hash de la URL
  window.addEventListener("hashchange", () => mostrarEntrada(leerHash()));

  // Al cargar: si la URL ya trae #especies (por ejemplo), abrimos esa entrada
  mostrarEntrada(leerHash());
}

function leerHash() {
  const id = window.location.hash.replace("#", "");
  return ENTRADAS.includes(id) ? id : "inicio";
}

function entradaActual() {
  return document.querySelector(".entrada.activa").id;
}

// Cambiar el hash dispara "hashchange", que llama a mostrarEntrada()
function irA(id) {
  if (id === leerHash()) {
    mostrarEntrada(id);
  } else {
    window.location.hash = id;
  }
}

function mostrarEntrada(id) {
  document.querySelectorAll(".entrada").forEach((seccion) => {
    const visible = seccion.id === id;
    seccion.hidden = !visible;
    seccion.classList.toggle("activa", visible);
  });

  document.querySelectorAll(".pestana").forEach((pestana) => {
    pestana.setAttribute("aria-selected", pestana.dataset.entrada === id);
  });

  // Volvemos arriba del contenido para empezar a leer la entrada desde el principio
  const nav = document.querySelector(".navegacion");
  const destino = document.querySelector("main").offsetTop - nav.offsetHeight;
  if (window.scrollY > destino) window.scrollTo({ top: destino });
}


/* ---------- 2. Modo día / noche ---------- */

function iniciarTema() {
  const boton = document.getElementById("cambiar-tema");

  // Prioridad: lo que eligió el usuario antes > preferencia del sistema operativo
  let guardado = null;
  try {
    guardado = localStorage.getItem("tema");
  } catch (e) {
    // Algunos navegadores bloquean localStorage (modo privado); seguimos sin él
  }
  const prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
  aplicarTema(guardado || (prefiereOscuro ? "noche" : "dia"));

  boton.addEventListener("click", () => {
    const nuevo = document.documentElement.dataset.tema === "noche" ? "dia" : "noche";
    aplicarTema(nuevo);
    try {
      localStorage.setItem("tema", nuevo);
    } catch (e) { /* sin memoria, no pasa nada */ }
  });
}

function aplicarTema(tema) {
  // El CSS cambia todas las variables de color cuando <html data-tema="noche">
  document.documentElement.dataset.tema = tema;
  const boton = document.getElementById("cambiar-tema");
  const esNoche = tema === "noche";
  boton.setAttribute("aria-pressed", esNoche);
  boton.querySelector(".interruptor-texto").textContent = esNoche ? "Día" : "Noche";
}


/* ---------- 3. Calculadora del estanque ---------- */

const FACTOR_TALUD = 0.7;        // un estanque natural tiene bordes inclinados, no es una caja
const LITROS_POR_CARPIN = 250;   // criterio prudente para un estanque sin filtro
const LITROS_POR_KOI = 1000;
const PROFUNDIDAD_MINIMA_KOI = 1.2;

function iniciarCalculadora() {
  const formulario = document.getElementById("calculadora");
  // "input" se dispara con cada tecla: el resultado se actualiza en directo
  formulario.addEventListener("input", calcularEstanque);
  formulario.addEventListener("submit", (evento) => evento.preventDefault());
  calcularEstanque();
}

function calcularEstanque() {
  const largo = parseFloat(document.getElementById("largo").value);
  const ancho = parseFloat(document.getElementById("ancho").value);
  const profundidad = parseFloat(document.getElementById("profundidad").value);
  const salida = document.getElementById("resultado-calculadora");

  if ([largo, ancho, profundidad].some((n) => isNaN(n) || n <= 0)) {
    salida.innerHTML = '<p class="error">Introduce medidas mayores que cero.</p>';
    return;
  }

  const litros = Math.round(largo * ancho * profundidad * FACTOR_TALUD * 1000);
  const carpines = Math.floor(litros / LITROS_POR_CARPIN);
  const superficie = largo * ancho;
  const decimal = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
  const plantasMin = (superficie / 3).toLocaleString("es-ES", decimal);
  const plantasMax = (superficie / 2).toLocaleString("es-ES", decimal);

  let textoKoi;
  if (profundidad < PROFUNDIDAD_MINIMA_KOI) {
    textoKoi = `Para koi haría falta una profundidad media de al menos ${PROFUNDIDAD_MINIMA_KOI.toLocaleString("es-ES")} m.`;
  } else {
    const koi = Math.floor(litros / LITROS_POR_KOI);
    textoKoi = koi > 0 ? `Si prefieres koi, como máximo ${koi}.` : "No hay volumen suficiente para koi.";
  }

  salida.innerHTML = `
    <div class="cifras">
      <div class="cifra"><strong>${litros.toLocaleString("es-ES")} L</strong><span>volumen aproximado</span></div>
      <div class="cifra"><strong>${carpines}</strong><span>carpines o tencas adultos, como máximo</span></div>
      <div class="cifra"><strong>${plantasMin}–${plantasMax} m²</strong><span>de superficie con plantas</span></div>
    </div>
    <p class="aviso-pequeno">${textoKoi}</p>`;
}


/* ---------- 4. Guía de alimentación ---------- */

// Cada tramo: temperatura máxima (incluida), título, consejo y color del borde
const TRAMOS_ALIMENTACION = [
  { hasta: 4, titulo: "No alimentar", color: "#4a7fb5",
    texto: "Los peces están aletargados en el fondo. La comida se pudriría sin ser digerida." },
  { hasta: 9, titulo: "No alimentar", color: "#5a93b0",
    texto: "Su digestión es lentísima. Aunque se acerquen a la superficie, no les des nada." },
  { hasta: 14, titulo: "Poca comida, de invierno", color: "#5fa8a0",
    texto: "Alimento con germen de trigo (bajo en proteína), dos o tres veces por semana y en muy poca cantidad." },
  { hasta: 20, titulo: "Alimentación normal", color: "#8db35f",
    texto: "Una vez al día, solo lo que coman en tres a cinco minutos. Retira lo que sobre." },
  { hasta: 25, titulo: "Máximo apetito", color: "#d1a13c",
    texto: "Hasta dos tomas al día, siempre lo que acaben en pocos minutos. Es su época de crecimiento." },
  { hasta: 32, titulo: "Reducir: poco oxígeno", color: "#c4502f",
    texto: "El agua caliente tiene poco oxígeno. Una toma ligera al día y vigila si boquean al amanecer." },
];

function iniciarGuiaAlimentacion() {
  const rango = document.getElementById("temperatura");
  rango.addEventListener("input", actualizarAlimentacion);
  actualizarAlimentacion();
}

function actualizarAlimentacion() {
  const temperatura = Number(document.getElementById("temperatura").value);
  document.getElementById("valor-temperatura").textContent = temperatura;

  // find() devuelve el primer tramo cuyo límite es mayor o igual que la temperatura
  const tramo = TRAMOS_ALIMENTACION.find((t) => temperatura <= t.hasta);

  const caja = document.getElementById("consejo-alimentacion");
  caja.innerHTML = `
    <div class="consejo" style="--color-consejo: ${tramo.color}">
      <h5>${tramo.titulo}</h5>
      <p>${tramo.texto}</p>
    </div>`;
}


/* ---------- 5. Tiempo de lectura ---------- */

function calcularTiemposDeLectura() {
  const PALABRAS_POR_MINUTO = 200;

  ENTRADAS.slice(1).forEach((id) => {
    const texto = document.querySelector(`#${id} article`).textContent;
    const palabras = texto.trim().split(/\s+/).length;
    const minutos = Math.max(1, Math.round(palabras / PALABRAS_POR_MINUTO));

    // Puede haber varios sitios que muestran el mismo dato (tarjeta del inicio y cabecera)
    document.querySelectorAll(`.lectura[data-de="${id}"]`).forEach((p) => {
      p.textContent = `${minutos} min de lectura`;
    });
  });
}


/* ---------- 6. Visor de imágenes ---------- */

function iniciarVisor() {
  const visor = document.getElementById("visor");
  const imagen = document.getElementById("visor-imagen");
  const texto = document.getElementById("visor-texto");

  document.querySelectorAll("img.ampliable").forEach((img) => {
    img.addEventListener("click", () => {
      imagen.src = img.src;
      imagen.alt = img.alt;
      texto.textContent = img.alt;
      visor.showModal();     // <dialog> ya gestiona la tecla Escape y el foco
    });
  });

  visor.querySelector(".cerrar-visor").addEventListener("click", () => visor.close());

  // Cerrar al pulsar fuera de la imagen (sobre el fondo oscuro)
  visor.addEventListener("click", (evento) => {
    if (evento.target === visor) visor.close();
  });
}
