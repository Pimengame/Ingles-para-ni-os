/* --- motor.js v10.0: COMPATIBILIDAD UNIVERSAL (Safari, Firefox, Chrome) --- */

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

// Variables para compatibilidad de voz
let vocesDisponibles = [];
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

// --- 2. SISTEMA DE CARGA DE VOCES (CRUCIAL PARA SAFARI/FIREFOX) ---
function cargarVoces() {
    vocesDisponibles = window.speechSynthesis.getVoices();
    console.log("Voces cargadas:", vocesDisponibles.length);
}

// Intentar cargar voces al inicio
cargarVoces();

// Chrome y otros cargan voces asincrónicamente, así que esperamos el evento
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = cargarVoces;
}

// --- 3. AUTO-GENERADOR DE MODALES ---
document.addEventListener('DOMContentLoaded', () => {
    crearModalHTML();
    inyectarBotonesExtra();
    
    // Inicializar AudioContext (necesario para Safari)
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
});

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
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function inyectarBotonesExtra() {
    const panel = document.querySelector('.panel-control');
    if (panel && !document.getElementById('btn-voz')) {
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

    // Desbloqueo de Audio para Safari al hacer clic en cualquier modal
    desbloquearAudio();

    if (tipo === 'inicio') {
        icono.innerHTML = '🎧';
        titulo.innerText = '¿Estás lista?';
        mensaje.innerText = `Debes conseguir ${META_ACIERTOS} aciertos. Tienes 3 vidas.`;
        boton.innerText = '¡Sí, jugar!';
        boton.style.backgroundColor = '#4caf50';
        
        // Cargar voces de nuevo por si acaso
        if(vocesDisponibles.length === 0) cargarVoces();

        hablarBilingue(
            "¡Vamos a jugar! Consigue veinte aciertos.", 
            "Let's play! Get twenty correct answers."
        );

        boton.onclick = () => {
            modal.style.display = 'none';
            if (callback) callback();
        };

    } else if (tipo === 'victoria') {
        icono.innerHTML = '🏆';
        titulo.innerText = '¡INCREÍBLE!';
        mensaje.innerText = '¡Has ganado! Eres una experta.';
        boton.innerText = 'Volver al Menú';
        boton.style.backgroundColor = '#ff4081'; 
        boton.onclick = () => window.location.href = '../album.html';

    } else if (tipo === 'derrota') {
        icono.innerHTML = '😢';
        titulo.innerText = '¡Oh no!';
        mensaje.innerText = 'Sigue practicando. ¡Tú puedes!';
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

// --- 4. SISTEMA DE VOZ MEJORADO (BUSCADOR INTELIGENTE) ---
function buscarVoz(langCode) {
    // Intenta encontrar una voz que coincida con el idioma (ej: 'en-US', 'es-MX')
    return vocesDisponibles.find(voz => voz.lang.includes(langCode));
}

function hablar(texto) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(texto);
    
    // Buscar voz en Inglés
    const vozEn = buscarVoz('en');
    if (vozEn) msg.voice = vozEn;
    
    msg.lang = 'en-US';
    msg.rate = 0.8;
    window.speechSynthesis.speak(msg);
}

function hablarBilingue(textoES, textoEN) {
    window.speechSynthesis.cancel(); 
    
    // Configurar Español
    const msgES = new SpeechSynthesisUtterance(textoES);
    const vozEs = buscarVoz('es'); // Busca cualquier voz español
    if (vozEs) msgES.voice = vozEs;
    msgES.lang = 'es-ES';
    msgES.rate = 1;
    
    // Configurar Inglés
    const msgEN = new SpeechSynthesisUtterance(textoEN);
    const vozEn = buscarVoz('en'); // Busca cualquier voz inglés
    if (vozEn) msgEN.voice = vozEn;
    msgEN.lang = 'en-US';
    msgEN.rate = 0.8; 
    
    msgES.onend = function() {
        window.speechSynthesis.speak(msgEN);
    };
    
    window.speechSynthesis.speak(msgES);
}

// --- 5. SONIDOS Y DESBLOQUEO SAFARI ---
function desbloquearAudio() {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log("Audio desbloqueado para Safari");
        });
    }
}

function playSound(tipo) {
    // Intento de desbloqueo extra
    desbloquearAudio();

    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

// --- 6. FUNCIONES DEL JUEGO (REPETIR, ETC) ---
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
    if (btnRepetir) {
        btnRepetir.style.display = mostrar ? 'inline-flex' : 'none';
    }
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
        tarjeta.innerHTML = `
            <div class="icono">${item.icon}</div>
            <div class="palabra-en">${item.en}</div>
            <div class="palabra-es">${item.es}</div>
        `;
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
                setTimeout(() => {
                    tarjeta.classList.remove('correcto');
                    nuevoTurno();
                }, 1500);
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
    // Importante: Desbloquear audio al primer toque humano
    desbloquearAudio();
    
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
    setTimeout(() => {
        hablar("Find... " + palabraObjetivo.en);
    }, 1000);
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
    if (idLeccionActual) {
        localStorage.setItem('premio_' + idLeccionActual, 'si');
    }
    setTimeout(() => {
        mostrarModal('victoria');
    }, 2000);
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
        setTimeout(() => { 
            c.style.top = '110vh'; 
            c.style.transform = `rotate(${Math.random()*360}deg)`;
        }, 50);
        setTimeout(() => c.remove(), 4000);
    }
}

// Funciones para el Reto de Voz (Speech Recognition)
function iniciarRetoVoz() {
    if (!SpeechRecognition) {
        alert("Tu navegador no soporta reconocimiento de voz. Prueba con Google Chrome.");
        return;
    }
    const item = listaActual[Math.floor(Math.random() * listaActual.length)];
    mostrarModal('voz');
    document.getElementById('icono-voz-grande').innerText = item.icon;
    document.getElementById('texto-escuchado').innerText = "Escuchando...";
    document.getElementById('indicador-mic').style.display = 'flex';
    hablar("Say... " + item.en);
    setTimeout(() => {
        activarEscucha(item);
    }, 1500);
}

function activarEscucha(itemObjetivo) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.start();
    recognition.onresult = (event) => {
        const loQueDijo = event.results[0][0].transcript.toLowerCase();
        const loQueEsperaba = itemObjetivo.en.toLowerCase();
        document.getElementById('texto-escuchado').innerText = `Dijiste: "${loQueDijo}"`;
        document.getElementById('indicador-mic').style.display = 'none';
        if (loQueDijo.includes(loQueEsperaba) || loQueEsperaba.includes(loQueDijo)) {
            playSound('win'); hablar("Excellent!"); lanzarConfeti();
            setTimeout(() => { document.getElementById('miModal').style.display = 'none'; }, 2000);
        } else {
            playSound('lose'); hablar(`Try again. Say: ${itemObjetivo.en}`);
            setTimeout(() => { 
                document.getElementById('indicador-mic').style.display = 'flex';
                document.getElementById('texto-escuchado').innerText = "Escuchando...";
                recognition.start();
            }, 2500);
        }
    };
    recognition.onerror = () => {
        document.getElementById('indicador-mic').style.display = 'none';
        document.getElementById('texto-escuchado').innerText = "No te escuché bien 😕";
        setTimeout(() => { document.getElementById('miModal').style.display = 'none'; }, 2000);
    };
    recognition.onspeechend = () => { recognition.stop(); };
}
