/* --- motor.js v12.0: MODO BLISS OS / ANDROID GENÉRICO --- */

// --- 1. VARIABLES GLOBALES ---
let jugando = false;
let aciertos = 0;
const META_ACIERTOS = 20;
let errores = 0;          
const MAX_ERRORES = 3;    
let listaActual = [];
let palabraObjetivo = null;
let audioCtx = null;
let idLeccionActual = '';
let vocesDisponibles = [];
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let vozSistemaOperativo = false; // Nueva variable para detectar entorno difícil

// --- 2. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Detectar si estamos en móvil/android para ajustar comportamiento
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        vozSistemaOperativo = true;
    }

    crearPantallaInicio(); 
    crearModalHTML();
    
    // Intentar cargar voces repetidamente (Android a veces tarda)
    cargarVoces();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = cargarVoces;
    }
    // Re-intentar a los 2 segundos por si Bliss es lento
    setTimeout(cargarVoces, 2000);
});

function cargarVoces() {
    vocesDisponibles = window.speechSynthesis.getVoices();
    console.log("Voces detectadas:", vocesDisponibles.length);
}

// --- 3. PANTALLA DE INICIO ---
function crearPantallaInicio() {
    if (document.getElementById('pantalla-inicio')) return;

    const divInicio = document.createElement('div');
    divInicio.id = 'pantalla-inicio';
    divInicio.innerHTML = `
        <div style="font-size: 80px; margin-bottom: 20px;">🚀</div>
        <h1>¿Lista para aprender?</h1>
        <p style="font-size: 1.2rem; max-width: 80%; margin: 0 auto;">
            Haz clic para activar el audio.
        </p>
        <button id="btn-arranque" class="btn-inicio-gigante">¡ENTRAR!</button>
    `;
    document.body.appendChild(divInicio);

    document.getElementById('btn-arranque').onclick = () => {
        // Desbloquear Audio
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        // FORZAR HABLA INICIAL (Vital para Android Webview)
        // Usamos una frase corta y simple para "despertar" el motor
        const despertar = new SpeechSynthesisUtterance('Hola');
        window.speechSynthesis.speak(despertar);

        playSound('pop'); 

        divInicio.style.opacity = '0';
        setTimeout(() => divInicio.remove(), 500);
        inyectarBotonesExtra();
    };
}

// --- 4. MODALES ---
function crearModalHTML() {
    if (document.getElementById('miModal')) return;
    const modalHTML = `
    <div id="miModal" class="modal-fondo">
        <div class="modal-caja">
            <div id="modal-icono" class="modal-icono">🎮</div>
            <h2 id="modal-titulo" class="modal-titulo">¡Vamos a Jugar!</h2>
            <div id="contenido-voz" style="display:none;">
                <div id="icono-voz-grande" style="font-size: 100px;">🦁</div>
                <div id="indicador-mic" class="microfono-activo" style="display:none;">🎤</div>
                <p id="texto-escuchado" class="texto-escuchado">...</p>
            </div>
            <p id="modal-mensaje" style="font-size: 1.2rem; color: #666; margin-bottom: 20px;">
                Escucha la palabra y toca la tarjeta correcta.
            </p>
            <button id="btn-accion-modal" class="btn-modal">¡Empezar!</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function inyectarBotonesExtra() {
    const panel = document.querySelector('.panel-control');
    if (panel && !document.getElementById('btn-voz')) {
        // En Bliss/Android Webview el micro suele fallar, lo ocultamos si no es Chrome genuino
        // o si el usuario quiere probar suerte.
        if (SpeechRecognition) {
            const btnVoz = document.createElement('button');
            btnVoz.id = 'btn-voz';
            btnVoz.className = 'btn-voz';
            btnVoz.innerHTML = '🎤 Pronunciación';
            btnVoz.onclick = iniciarRetoVoz;
            panel.appendChild(btnVoz);
        }
    }
}

function mostrarModal(tipo, callback) {
    const modal = document.getElementById('miModal');
    const titulo = document.getElementById('modal-titulo');
    const mensaje = document.getElementById('modal-mensaje');
    const icono = document.getElementById('modal-icono');
    const boton = document.getElementById('btn-accion-modal');
    const contenidoVoz = document.getElementById('contenido-voz');

    contenidoVoz.style.display = 'none';
    icono.style.display = 'block';
    mensaje.style.display = 'block';
    boton.style.display = 'inline-block';

    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    if (tipo === 'inicio') {
        icono.innerHTML = '🎧';
        titulo.innerText = '¿Estás lista?';
        mensaje.innerText = `Meta: ${META_ACIERTOS} aciertos. Tienes 3 vidas.`;
        boton.innerText = '¡Sí, jugar!';
        boton.style.backgroundColor = '#4caf50';
        
        // Si no hay voces cargadas, intentamos cargar de nuevo
        if(vocesDisponibles.length === 0) cargarVoces();

        // Hablamos simple para asegurar compatibilidad
        hablar("Ready?");

        boton.onclick = () => {
            modal.style.display = 'none';
            if (callback) callback();
        };

    } else if (tipo === 'victoria') {
        icono.innerHTML = '🏆';
        titulo.innerText = '¡GANASTE!';
        mensaje.innerText = '¡Has completado el desafío!';
        boton.innerText = 'Premios';
        boton.style.backgroundColor = '#ff4081'; 
        boton.onclick = () => window.location.href = '../album.html';

    } else if (tipo === 'derrota') {
        icono.innerHTML = '😢';
        titulo.innerText = '¡Oh no!';
        mensaje.innerText = 'Has perdido tus vidas.';
        boton.innerText = 'Reiniciar';
        boton.style.backgroundColor = '#f44336';
        boton.onclick = () => location.reload();
        
    } else if (tipo === 'voz') {
        icono.style.display = 'none';
        mensaje.style.display = 'none';
        boton.style.display = 'none';
        contenidoVoz.style.display = 'block';
        titulo.innerText = 'Dí esta palabra:';
    }

    modal.style.display = 'flex';
    if(tipo !== 'derrota' && tipo !== 'voz') playSound('pop');
}

// --- 5. SISTEMA DE VOZ ROBUSTO (FIX BLISS OS) ---

function hablar(texto) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(texto);
    
    // Intento 1: Buscar voz en inglés
    let vozEn = vocesDisponibles.find(voz => voz.lang.startsWith('en'));
    
    // FIX BLISS: Si encontramos voz, la asignamos. Si no, NO asignamos nada
    // y dejamos que el sistema use la default (aunque suene robótica)
    if (vozEn) {
        msg.voice = vozEn;
        msg.lang = 'en-US';
    }
    
    // FIX BLISS: Algunos motores viejos se rompen si cambias el 'rate'
    // Solo cambiamos velocidad si detectamos voces buenas
    if (vocesDisponibles.length > 0) {
        msg.rate = 0.8; 
    }

    window.speechSynthesis.speak(msg);
}

function hablarBilingue(textoES, textoEN) {
    window.speechSynthesis.cancel(); 
    
    // --- ESPAÑOL ---
    const msgES = new SpeechSynthesisUtterance(textoES);
    let vozEs = vocesDisponibles.find(voz => voz.lang.startsWith('es'));
    if (vozEs) {
        msgES.voice = vozEs;
        msgES.lang = 'es-ES';
    }
    // Si no hay voz español, Bliss usará la default (que puede ser inglés leyendo español)
    // Es mejor que el silencio.

    // --- INGLÉS ---
    const msgEN = new SpeechSynthesisUtterance(textoEN);
    let vozEn = vocesDisponibles.find(voz => voz.lang.startsWith('en'));
    if (vozEn) {
        msgEN.voice = vozEn;
        msgEN.lang = 'en-US';
    }
    if (vocesDisponibles.length > 0) msgEN.rate = 0.8;

    // Encadenar
    msgES.onend = function() { window.speechSynthesis.speak(msgEN); };
    
    // Manejo de errores: Si falla el español, intenta el inglés
    msgES.onerror = function() { window.speechSynthesis.speak(msgEN); };

    window.speechSynthesis.speak(msgES);
}

// --- 6. SONIDOS (Web Audio API) ---
function playSound(tipo) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (tipo === 'win') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(523, now); osc.frequency.linearRampToValueAtTime(880, now + 0.1); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.5); osc.start(now); osc.stop(now + 0.5);
    } else if (tipo === 'lose') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(100, now + 0.2); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.3); osc.start(now); osc.stop(now + 0.3);
    } else if (tipo === 'pop') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1); osc.start(now); osc.stop(now + 0.1);
    } else if (tipo === 'fanfarria') {
        const notas = [523.25, 659.25, 783.99, 1046.50]; notas.forEach((nota, i) => { const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.type = 'square'; o.frequency.value = nota; g.gain.setValueAtTime(0.1, now + i*0.15); g.gain.exponentialRampToValueAtTime(0.001, now + i*0.15 + 0.3); o.start(now + i*0.15); o.stop(now + i*0.15 + 0.3); });
    } else if (tipo === 'gameover') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(100, now + 1); gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 1); osc.start(now); osc.stop(now + 1);
    }
}

// --- 7. LÓGICA GENERAL ---
function gestionarBotonRepetir(mostrar) {
    let btnRepetir = document.getElementById('btn-repetir');
    if (!btnRepetir) {
        const panel = document.querySelector('.panel-control');
        if (panel) {
            btnRepetir = document.createElement('button');
            btnRepetir.id = 'btn-repetir';
            btnRepetir.className = 'btn-repetir';
            btnRepetir.innerHTML = '🔊 Repetir';
            btnRepetir.onclick = repetirInstruccion;
            panel.appendChild(btnRepetir);
        }
    }
    if (btnRepetir) btnRepetir.style.display = mostrar ? 'inline-flex' : 'none';
}

function repetirInstruccion() {
    if (palabraObjetivo && jugando) {
        const btn = document.getElementById('btn-repetir');
        btn.style.transform = "scale(0.95)";
        setTimeout(() => btn.style.transform = "scale(1)", 100);
        hablar("Find... " + palabraObjetivo.en);
    }
}

function cargarCurso(datosRecibidos, idPremio) {
    listaActual = datosRecibidos;
    idLeccionActual = idPremio || '';
    const tablero = document.getElementById('tablero');
    if (!tablero) return;
    tablero.innerHTML = '';
    listaActual.forEach((item, index) => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta';
        tarjeta.id = `card-${index}`;
        tarjeta.onclick = () => manejarClic(item, index);
        if(item.hex) {
            tarjeta.style.backgroundColor = item.hex;
            if(item.en === 'Black') tarjeta.style.borderColor = '#555';
        }
        tarjeta.innerHTML = `<div class="icono">${item.icon}</div><div class="palabra-en">${item.en}</div><div class="palabra-es">${item.es}</div>`;
        tablero.appendChild(tarjeta);
    });
}

function manejarClic(item, index) {
    const tarjeta = document.getElementById(`card-${index}`);
    if (jugando) {
        if (item.en === palabraObjetivo.en) {
            tarjeta.classList.add('correcto');
            playSound('win');
            hablar("Very Good!"); 
            aciertos++; 
            actualizarMarcador();
            if (aciertos >= META_ACIERTOS) {
                finDelJuego();
            } else {
                setTimeout(() => { tarjeta.classList.remove('correcto'); nuevoTurno(); }, 1500);
            }
        } else {
            tarjeta.classList.add('incorrecto');
            errores++; 
            if (errores >= MAX_ERRORES) {
                jugando = false;
                gestionarBotonRepetir(false);
                playSound('gameover');
                setTimeout(() => mostrarModal('derrota'), 1000);
            } else {
                playSound('lose');
                hablar("Oh no. Try again."); 
                actualizarMarcador(); 
                setTimeout(() => tarjeta.classList.remove('incorrecto'), 1000);
            }
        }
    } else {
        hablarBilingue(item.es, item.en);
    }
}

function iniciarJuego() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    mostrarModal('inicio', () => {
        jugando = true;
        aciertos = 0; 
        errores = 0;
        document.getElementById('btn-jugar').style.display = 'none';
        const btnVoz = document.getElementById('btn-voz');
        if(btnVoz) btnVoz.style.display = 'none';
        gestionarBotonRepetir(true); 
        document.getElementById('marcador').style.display = 'block';
        actualizarMarcador();
        nuevoTurno();
    });
}

function nuevoTurno() {
    palabraObjetivo = listaActual[Math.floor(Math.random() * listaActual.length)];
    setTimeout(() => { hablar("Find... " + palabraObjetivo.en); }, 1000);
}

function actualizarMarcador() {
    let vidasRestantes = MAX_ERRORES - errores;
    let corazones = "❤️".repeat(vidasRestantes);
    document.getElementById('marcador').innerText = `Vidas: ${corazones} | Aciertos: ${aciertos} / ${META_ACIERTOS}`;
}

function finDelJuego() {
    jugando = false;
    gestionarBotonRepetir(false);
    playSound('fanfarria');
    lanzarConfeti();
    if (idLeccionActual) localStorage.setItem('premio_' + idLeccionActual, 'si');
    setTimeout(() => mostrarModal('victoria'), 2000);
}

function lanzarConfeti() {
    const colores = ['#ff4081', '#76ff03', '#00bcd4', '#ffff00'];
    for(let i=0; i<100; i++) {
        const c = document.createElement('div');
        c.style.cssText = `position:fixed;top:-10px;width:12px;height:12px;z-index:3000;border-radius:50%;`;
        c.style.backgroundColor = colores[Math.floor(Math.random()*colores.length)];
        c.style.left = Math.random()*100 + 'vw';
        c.style.transition = `top ${Math.random()*2+2}s ease-in, transform 2s`;
        document.body.appendChild(c);
        setTimeout(() => { c.style.top = '110vh'; c.style.transform = `rotate(${Math.random()*360}deg)`; }, 50);
        setTimeout(() => c.remove(), 4000);
    }
}

// --- 8. VOZ (Si no soporta, oculta) ---
function iniciarRetoVoz() {
    if (!SpeechRecognition) return; // Protección extra
    const item = listaActual[Math.floor(Math.random() * listaActual.length)];
    mostrarModal('voz');
    document.getElementById('icono-voz-grande').innerText = item.icon;
    document.getElementById('texto-escuchado').innerText = "Escuchando...";
    document.getElementById('indicador-mic').style.display = 'flex';
    hablar("Say... " + item.en);
    setTimeout(() => { activarEscucha(item); }, 1500);
}

function activarEscucha(itemObjetivo) {
    if (!recognition) recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();
    recognition.onresult = (event) => {
        const loQueDijo = event.results[0][0].transcript.toLowerCase();
        const loQueEsperaba = itemObjetivo.en.toLowerCase();
        document.getElementById('texto-escuchado').innerText = `Dijiste: "${loQueDijo}"`;
        document.getElementById('indicador-mic').style.display = 'none';
        if (loQueDijo.includes(loQueEsperaba)) {
            playSound('win'); hablar("Excellent!"); lanzarConfeti();
            setTimeout(() => { document.getElementById('miModal').style.display = 'none'; }, 2000);
        } else {
            playSound('lose'); hablar(`Try again.`);
            setTimeout(() => { 
                document.getElementById('indicador-mic').style.display = 'flex';
                recognition.start();
            }, 2500);
        }
    };
    recognition.onerror = () => {
        document.getElementById('indicador-mic').style.display = 'none';
        setTimeout(() => { document.getElementById('miModal').style.display = 'none'; }, 2000);
    };
    recognition.onspeechend = () => { recognition.stop(); };
}
