/* --- motor.js v9.0: CON RECONOCIMIENTO DE VOZ 🎤 --- */

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

// Variable para el reconocimiento de voz
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null; // Se inicializa si el navegador es compatible

// --- 2. AUTO-GENERADOR DE MODALES ---
document.addEventListener('DOMContentLoaded', () => {
    crearModalHTML();
    inyectarBotonesExtra(); // Inyectamos el botón de micrófono
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

// Inyecta el botón azul de micrófono al lado del verde
function inyectarBotonesExtra() {
    const panel = document.querySelector('.panel-control');
    if (panel && !document.getElementById('btn-voz')) {
        // Verificar si el navegador soporta voz
        if (SpeechRecognition) {
            const btnVoz = document.createElement('button');
            btnVoz.id = 'btn-voz';
            btnVoz.className = 'btn-voz';
            btnVoz.innerHTML = '🎤 Pronunciación';
            btnVoz.onclick = iniciarRetoVoz;
            panel.appendChild(btnVoz);
        } else {
            console.log("Este navegador no soporta reconocimiento de voz.");
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

    // Reseteamos visuales
    contenidoVoz.style.display = 'none';
    icono.style.display = 'block';
    mensaje.style.display = 'block';
    boton.style.display = 'inline-block';

    if (tipo === 'inicio') {
        icono.innerHTML = '🎧';
        titulo.innerText = '¿Estás lista?';
        mensaje.innerText = `Debes conseguir ${META_ACIERTOS} aciertos. Tienes 3 vidas.`;
        boton.innerText = '¡Sí, jugar!';
        boton.style.backgroundColor = '#4caf50';
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
        // --- MODO MODAL PARA VOZ ---
        icono.style.display = 'none'; // Ocultamos icono normal
        mensaje.style.display = 'none'; // Ocultamos mensaje normal
        boton.style.display = 'none';   // Ocultamos botón
        contenidoVoz.style.display = 'block'; // Mostramos UI de voz
        
        titulo.innerText = 'Dí esta palabra:';
    }

    modal.style.display = 'flex';
    if(tipo !== 'derrota' && tipo !== 'voz') playSound('pop');
}

// --- 3. LÓGICA DE RECONOCIMIENTO DE VOZ ---
function iniciarRetoVoz() {
    if (!SpeechRecognition) {
        alert("Tu navegador no soporta reconocimiento de voz. Prueba con Google Chrome.");
        return;
    }

    // Seleccionar palabra al azar
    const item = listaActual[Math.floor(Math.random() * listaActual.length)];
    
    // Mostrar Modal Especial
    mostrarModal('voz');
    
    // Actualizar elementos del modal voz
    document.getElementById('icono-voz-grande').innerText = item.icon;
    document.getElementById('texto-escuchado').innerText = "Escuchando...";
    document.getElementById('indicador-mic').style.display = 'flex';

    // Decir la palabra primero
    hablar("Say... " + item.en);

    // Iniciar escucha después de 1 segundo
    setTimeout(() => {
        activarEscucha(item);
    }, 1500);
}

function activarEscucha(itemObjetivo) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // Escuchar en Inglés
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event) => {
        const loQueDijo = event.results[0][0].transcript.toLowerCase();
        const loQueEsperaba = itemObjetivo.en.toLowerCase();
        
        document.getElementById('texto-escuchado').innerText = `Dijiste: "${loQueDijo}"`;
        document.getElementById('indicador-mic').style.display = 'none';

        // Comparación simple
        if (loQueDijo.includes(loQueEsperaba) || loQueEsperaba.includes(loQueDijo)) {
            // ACIERTO
            playSound('win');
            hablar("Excellent!");
            lanzarConfeti();
            setTimeout(() => {
                document.getElementById('miModal').style.display = 'none';
            }, 2000);
        } else {
            // ERROR
            playSound('lose');
            hablar(`Try again. Say: ${itemObjetivo.en}`);
            setTimeout(() => {
                // Reintentar misma palabra
                document.getElementById('indicador-mic').style.display = 'flex';
                document.getElementById('texto-escuchado').innerText = "Escuchando...";
                recognition.start();
            }, 2500);
        }
    };

    recognition.onerror = (event) => {
        document.getElementById('indicador-mic').style.display = 'none';
        document.getElementById('texto-escuchado').innerText = "No te escuché bien 😕";
        setTimeout(() => {
            document.getElementById('miModal').style.display = 'none';
        }, 2000);
    };
    
    recognition.onspeechend = () => {
        recognition.stop();
    };
}


// --- 4. CARGADOR DE CURSO (Igual que antes) ---
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

// --- 5. SISTEMA DE VOZ (TTS) ---
function hablar(texto) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = 'en-US';
    msg.rate = 0.8;
    window.speechSynthesis.speak(msg);
}

function hablarBilingue(textoES, textoEN) {
    window.speechSynthesis.cancel(); 
    const msgES = new SpeechSynthesisUtterance(textoES);
    msgES.lang = 'es-ES';
    msgES.rate = 1;
    const msgEN = new SpeechSynthesisUtterance(textoEN);
    msgEN.lang = 'en-US';
    msgEN.rate = 0.8; 
    window.speechSynthesis.speak(msgES);
    window.speechSynthesis.speak(msgEN);
}

// --- 6. GESTIÓN BOTÓN REPETIR ---
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

// --- 7. SONIDOS ---
function playSound(tipo) {
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

// --- 8. LÓGICA DEL JUEGO (CLICS) ---
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
    mostrarModal('inicio', () => {
        jugando = true;
        aciertos = 0; 
        errores = 0;
        document.getElementById('btn-jugar').style.display = 'none';
        const btnVoz = document.getElementById('btn-voz');
        if(btnVoz) btnVoz.style.display = 'none'; // Ocultar botón voz durante examen
        
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

// --- 9. CONFETI ---
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