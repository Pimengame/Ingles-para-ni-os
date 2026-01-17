/* --- motor.js v14.0: MODO ANTI-CONGELAMIENTO (CLICK-TO-SPEAK) --- */

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

// VARIABLES JUEGO DE VOZ
let modoVozActivo = false;
let rachaVoz = 0;
const META_VOZ = 5; 

// --- 2. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    crearPantallaInicio(); 
    crearModalHTML();
    cargarVoces();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = cargarVoces;
    }
});

function cargarVoces() {
    vocesDisponibles = window.speechSynthesis.getVoices();
}

// --- 3. PANTALLA DE INICIO ---
function crearPantallaInicio() {
    if (document.getElementById('pantalla-inicio')) return;
    const divInicio = document.createElement('div');
    divInicio.id = 'pantalla-inicio';
    divInicio.innerHTML = `
        <div style="font-size: 80px; margin-bottom: 20px;">🚀</div>
        <h1>¿Lista para aprender?</h1>
        <button id="btn-arranque" class="btn-inicio-gigante">¡ENTRAR!</button>
    `;
    document.body.appendChild(divInicio);

    document.getElementById('btn-arranque').onclick = () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
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
            <div onclick="cerrarModal()" style="position:absolute; top:10px; right:15px; cursor:pointer; font-size:24px; color:#aaa;">✖</div>
            
            <div id="modal-icono" class="modal-icono">🎮</div>
            <h2 id="modal-titulo" class="modal-titulo">¡Vamos a Jugar!</h2>
            
            <div id="contenido-voz" style="display:none;">
                <div class="texto-progreso-voz" id="texto-progreso-voz">Palabra 1 de 5</div>
                <div class="barra-voz-contenedor">
                    <div id="barra-voz-relleno" class="barra-voz-relleno"></div>
                </div>
                
                <div id="icono-voz-grande" style="font-size: 80px; margin: 10px 0;">🦁</div>
                
                <div id="btn-mic-accion" class="microfono-activo" style="cursor:pointer; margin: 10px auto; background:#2196f3;">🎤</div>
                
                <p id="texto-escuchado" class="texto-escuchado">Toca el micrófono para hablar</p>
                <button id="btn-saltar-voz" style="background:#ddd; border:none; padding:8px 20px; border-radius:5px; margin-top:15px; cursor:pointer; font-size:1rem;">Saltar palabra ⏭️</button>
            </div>

            <p id="modal-mensaje" style="font-size: 1.2rem; color: #666; margin-bottom: 20px;">
                Escucha la palabra y toca la tarjeta correcta.
            </p>
            <button id="btn-accion-modal" class="btn-modal">¡Empezar!</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Eventos Manuales
    document.getElementById('btn-saltar-voz').onclick = siguientePalabraVoz;
    document.getElementById('btn-mic-accion').onclick = () => {
        if(modoVozActivo) activarEscucha(palabraObjetivo);
    };
}

function cerrarModal() {
    detenerMicrofono(); // Seguridad extra
    document.getElementById('miModal').style.display = 'none';
    modoVozActivo = false;
}

function detenerMicrofono() {
    if(recognition) {
        try { recognition.abort(); } catch(e){}
        recognition = null; // Destruir instancia
    }
}

function inyectarBotonesExtra() {
    const panel = document.querySelector('.panel-control');
    if (panel && !document.getElementById('btn-voz')) {
        if (SpeechRecognition) {
            const btnVoz = document.createElement('button');
            btnVoz.id = 'btn-voz';
            btnVoz.className = 'btn-voz';
            btnVoz.innerHTML = '🎤 Desafío de Voz';
            btnVoz.onclick = iniciarDesafioVoz;
            panel.appendChild(btnVoz);
        }
    }
}

function mostrarModal(tipo, callback) {
    const modal = document.getElementById('miModal');
    const contenidoVoz = document.getElementById('contenido-voz');
    const elementosNormales = [
        document.getElementById('modal-icono'),
        document.getElementById('modal-titulo'),
        document.getElementById('modal-mensaje'),
        document.getElementById('btn-accion-modal')
    ];

    // Resetear visibilidad
    contenidoVoz.style.display = 'none';
    elementosNormales.forEach(el => el.style.display = 'block');

    if (tipo === 'inicio') {
        const titulo = document.getElementById('modal-titulo');
        const mensaje = document.getElementById('modal-mensaje');
        const boton = document.getElementById('btn-accion-modal');
        const icono = document.getElementById('modal-icono');
        
        icono.innerHTML = '🎧';
        titulo.innerText = '¿Estás lista?';
        mensaje.innerText = `Meta: ${META_ACIERTOS} aciertos. Tienes 3 vidas.`;
        boton.innerText = '¡Sí, jugar!';
        boton.style.backgroundColor = '#4caf50';
        hablar("Ready?");
        boton.onclick = () => {
            modal.style.display = 'none';
            if (callback) callback();
        };

    } else if (tipo === 'victoria') {
        const titulo = document.getElementById('modal-titulo');
        const mensaje = document.getElementById('modal-mensaje');
        const boton = document.getElementById('btn-accion-modal');
        const icono = document.getElementById('modal-icono');

        icono.innerHTML = '🏆';
        titulo.innerText = '¡GANASTE!';
        mensaje.innerText = '¡Has completado el desafío!';
        boton.innerText = 'Premios';
        boton.style.backgroundColor = '#ff4081'; 
        boton.onclick = () => window.location.href = '../album.html';

    } else if (tipo === 'derrota') {
        const titulo = document.getElementById('modal-titulo');
        const mensaje = document.getElementById('modal-mensaje');
        const boton = document.getElementById('btn-accion-modal');
        const icono = document.getElementById('modal-icono');

        icono.innerHTML = '😢';
        titulo.innerText = '¡Oh no!';
        mensaje.innerText = 'Inténtalo de nuevo.';
        boton.innerText = 'Reiniciar';
        boton.style.backgroundColor = '#f44336';
        boton.onclick = () => location.reload();
        
    } else if (tipo === 'voz') {
        elementosNormales.forEach(el => el.style.display = 'none');
        contenidoVoz.style.display = 'block';
        document.getElementById('modal-titulo').style.display = 'block';
        document.getElementById('modal-titulo').innerText = '¡Dilo fuerte!';
    }

    modal.style.display = 'flex';
    if(tipo !== 'derrota' && tipo !== 'voz') playSound('pop');
}

// --- 5. LOGICA JUEGO DE VOZ (ANTI-CONGELAMIENTO) ---

function iniciarDesafioVoz() {
    if (!SpeechRecognition) return;
    modoVozActivo = true;
    rachaVoz = 0;
    actualizarBarraVoz();
    mostrarModal('voz');
    siguientePalabraVoz();
}

function siguientePalabraVoz() {
    if (!modoVozActivo) return;
    detenerMicrofono(); // LIMPIEZA TOTAL

    palabraObjetivo = listaActual[Math.floor(Math.random() * listaActual.length)];
    
    // UI: Estado Neutro
    document.getElementById('icono-voz-grande').innerText = palabraObjetivo.icon;
    document.getElementById('texto-progreso-voz').innerText = `Palabra ${rachaVoz + 1} de ${META_VOZ}`;
    
    // Botón en Azul (Listo para pulsar)
    const btnMic = document.getElementById('btn-mic-accion');
    btnMic.style.backgroundColor = '#2196f3'; // Azul
    btnMic.style.animation = 'none'; // No parpadea
    btnMic.innerHTML = '🎤';

    document.getElementById('texto-escuchado').style.color = "#555";
    document.getElementById('texto-escuchado').innerText = "Escucha...";

    // 1. Decir la palabra
    hablar("Say... " + palabraObjetivo.en);
    
    // 2. Esperar un poco y activar micro AUTOMÁTICAMENTE (solo la primera vez)
    setTimeout(() => {
        if(modoVozActivo) activarEscucha(palabraObjetivo);
    }, 1500);
}

function activarEscucha(itemObjetivo) {
    if (!modoVozActivo) return;
    detenerMicrofono(); // Asegurar que no hay otro corriendo

    // UI: Estado Escuchando
    const btnMic = document.getElementById('btn-mic-accion');
    btnMic.style.backgroundColor = '#f44336'; // Rojo
    btnMic.style.animation = 'latido-mic 1.5s infinite'; // Parpadea
    document.getElementById('texto-escuchado').innerText = "👂 Escuchando...";

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; 
    recognition.interimResults = false; 
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    try {
        recognition.start();
    } catch (e) {
        console.log("Error al iniciar mic:", e);
        resetearBotonMic(); // Si falla, volver a estado manual
    }

    recognition.onresult = (event) => {
        const loQueDijo = event.results[0][0].transcript.toLowerCase().trim();
        const loQueEsperaba = itemObjetivo.en.toLowerCase().trim();
        const elementoTexto = document.getElementById('texto-escuchado');

        // Detener animación inmediatamente
        resetearBotonMic(); 

        if (loQueDijo === loQueEsperaba || loQueDijo.includes(loQueEsperaba)) {
            // --- ACIERTO ✅ ---
            elementoTexto.style.color = "#4caf50";
            elementoTexto.innerHTML = `✅ ¡SÍ! Dijiste: <b>"${loQueDijo}"</b>`;
            playSound('win'); 
            rachaVoz++;
            actualizarBarraVoz();

            if (rachaVoz >= META_VOZ) {
                lanzarConfeti();
                setTimeout(() => { hablar("Challenge complete!"); mostrarModal('victoria'); }, 1000);
            } else {
                hablar("Good!");
                setTimeout(siguientePalabraVoz, 2000);
            }

        } else {
            // --- ERROR ❌ (Aquí evitamos el bucle) ---
            elementoTexto.style.color = "#f44336";
            elementoTexto.innerHTML = `❌ Oí: <b>"${loQueDijo}"</b>`;
            playSound('lose');
            
            // Feedback
            setTimeout(() => {
                hablar(`No. Say: ${itemObjetivo.en}`);
                
                // CAMBIO IMPORTANTE: NO REINICIAMOS AUTOMÁTICAMENTE
                setTimeout(() => {
                    elementoTexto.style.color = "#555";
                    elementoTexto.innerText = "Toca el micrófono para intentar de nuevo 👇";
                    
                    // El botón vuelve a estar azul y quieto, esperando el click
                    resetearBotonMic(); 
                }, 2000);
            }, 500);
        }
    };

    recognition.onerror = (event) => {
        resetearBotonMic(); // Volver a manual
        const texto = document.getElementById('texto-escuchado');
        if (event.error === 'no-speech') {
            texto.innerText = "🔇 No escuché nada. Toca para intentar.";
        } else {
            texto.innerText = "⚠️ Error. Toca para intentar.";
        }
    };
    
    recognition.onspeechend = () => {
        // Solo visual, el stop real se hace en onresult o error
        if(recognition) recognition.stop();
    };
}

function resetearBotonMic() {
    const btnMic = document.getElementById('btn-mic-accion');
    btnMic.style.backgroundColor = '#2196f3'; // Azul
    btnMic.style.animation = 'none'; // Quieto
}

function actualizarBarraVoz() {
    const porcentaje = (rachaVoz / META_VOZ) * 100;
    document.getElementById('barra-voz-relleno').style.width = `${porcentaje}%`;
}

// --- 6. FUNCIONES DE APOYO ---

function hablar(texto) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(texto);
    let vozEn = vocesDisponibles.find(voz => voz.lang.startsWith('en'));
    if (vozEn) { msg.voice = vozEn; msg.lang = 'en-US'; }
    if (vocesDisponibles.length > 0) msg.rate = 0.8; 
    window.speechSynthesis.speak(msg);
}

function hablarBilingue(textoES, textoEN) {
    window.speechSynthesis.cancel(); 
    const msgES = new SpeechSynthesisUtterance(textoES);
    let vozEs = vocesDisponibles.find(voz => voz.lang.startsWith('es'));
    if (vozEs) { msgES.voice = vozEs; msgES.lang = 'es-ES'; }
    
    const msgEN = new SpeechSynthesisUtterance(textoEN);
    let vozEn = vocesDisponibles.find(voz => voz.lang.startsWith('en'));
    if (vozEn) { msgEN.voice = vozEn; msgEN.lang = 'en-US'; }
    if (vocesDisponibles.length > 0) msgEN.rate = 0.8;

    msgES.onend = function() { window.speechSynthesis.speak(msgEN); };
    window.speechSynthesis.speak(msgES);
}

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
    }
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

// --- 7. LOGICA JUEGO NORMAL ---
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
        if(item.hex) tarjeta.style.backgroundColor = item.hex;
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
            setTimeout(() => hablar("Very Good!"), 500); 
            aciertos++; 
            actualizarMarcador();
            if (aciertos >= META_ACIERTOS) {
                finDelJuego();
            } else {
                setTimeout(() => { tarjeta.classList.remove('correcto'); nuevoTurno(); }, 2000);
            }
        } else {
            tarjeta.classList.add('incorrecto');
            errores++; 
            if (errores >= MAX_ERRORES) {
                jugando = false;
                gestionarBotonRepetir(false);
                setTimeout(() => mostrarModal('derrota'), 1000);
            } else {
                playSound('lose');
                setTimeout(() => hablar("Try again."), 500);
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
