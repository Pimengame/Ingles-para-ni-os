/* --- motor.js v17.5: SISTEMA COMPLETO (Políglota + Sonidos + Anti-Congelamiento) --- */

// ======================================================
// 1. CONFIGURACIÓN DE IDIOMAS (El Cerebro)
// ======================================================
const idiomaActual = localStorage.getItem('idiomaObjetivo') || 'en';

const configIdioma = {
    'en': { 
        code: 'en-US', 
        vozStart: 'en', // Pista para buscar la voz
        msgWin: "Very Good!", 
        msgLose: "Try again", 
        msgListen: "Say...",
        msgFind: "Find..."
    },
    'pt': { 
        code: 'pt-BR', 
        vozStart: 'pt', 
        msgWin: "Muito bem!", 
        msgLose: "Tente novamente", 
        msgListen: "Diga...",
        msgFind: "Encontre..."
    },
    'zh': { 
        code: 'zh-CN', 
        vozStart: 'zh', 
        msgWin: "Hěn hǎo! (Muy bien)", 
        msgLose: "Zàishì yīcì (Intenta de nuevo)", 
        msgListen: "Shuō... (Dí...)",
        msgFind: "Zhǎo... (Busca...)"
    }
};

// ======================================================
// 2. VARIABLES GLOBALES
// ======================================================
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

// Variables Juego de Voz
let modoVozActivo = false;
let rachaVoz = 0;
const META_VOZ = 5; 

// ======================================================
// 3. INICIALIZACIÓN
// ======================================================
document.addEventListener('DOMContentLoaded', () => {
    crearPantallaInicio(); 
    crearModalHTML();
    
    // Cargar voces del sistema
    cargarVoces();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = cargarVoces;
    }

    // Activar sonidos en botones (Hover y Click)
    setTimeout(activarSonidosUI, 1000);
});

function cargarVoces() {
    vocesDisponibles = window.speechSynthesis.getVoices();
    console.log(`Voces cargadas: ${vocesDisponibles.length}. Idioma: ${idiomaActual}`);
}

// ======================================================
// 4. MOTOR DE SONIDOS (SFX Sintetizados)
// ======================================================
function playSound(tipo) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); 
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (tipo === 'hover') {
        // Sonido suave al pasar mouse
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(400, now); 
        osc.frequency.linearRampToValueAtTime(600, now + 0.1); 
        gain.gain.setValueAtTime(0.05, now); 
        gain.gain.linearRampToValueAtTime(0, now + 0.1); 
        osc.start(now); osc.stop(now + 0.1);

    } else if (tipo === 'click') {
        // Sonido Pop al hacer clic
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(300, now); 
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15); 
        gain.gain.setValueAtTime(0.1, now); 
        gain.gain.linearRampToValueAtTime(0, now + 0.15); 
        osc.start(now); osc.stop(now + 0.15);

    } else if (tipo === 'flip') {
        // Sonido de carta volteando
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(100, now); 
        osc.frequency.linearRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.05, now); 
        gain.gain.linearRampToValueAtTime(0, now + 0.15); 
        osc.start(now); osc.stop(now + 0.15);

    } else if (tipo === 'win') {
        // Campanita de victoria
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(523, now); 
        osc.frequency.linearRampToValueAtTime(880, now + 0.1); 
        gain.gain.setValueAtTime(0.2, now); 
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5); 
        osc.start(now); osc.stop(now + 0.5);

    } else if (tipo === 'lose') {
        // Sonido de error (Boing)
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(150, now); 
        osc.frequency.linearRampToValueAtTime(100, now + 0.3); 
        gain.gain.setValueAtTime(0.2, now); 
        gain.gain.linearRampToValueAtTime(0, now + 0.4); 
        osc.start(now); osc.stop(now + 0.4);

    } else if (tipo === 'gameover') {
        // Melodía triste
        const notas = [400, 380, 360, 340]; 
        notas.forEach((f, i) => { 
            const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); 
            o.connect(g); g.connect(audioCtx.destination); o.type = 'triangle'; 
            o.frequency.setValueAtTime(f, now + i*0.4); 
            g.gain.setValueAtTime(0.2, now + i*0.4); 
            g.gain.linearRampToValueAtTime(0, now + i*0.4 + 0.3); 
            o.start(now + i*0.4); o.stop(now + i*0.4 + 0.4); 
        });

    } else if (tipo === 'fanfarria') {
        // Melodía de victoria
        const notas = [523.25, 659.25, 783.99, 1046.50]; 
        notas.forEach((n, i) => { 
            const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); 
            o.connect(g); g.connect(audioCtx.destination); o.type = 'square'; 
            o.frequency.value = n; 
            g.gain.setValueAtTime(0.1, now + i*0.12); 
            g.gain.exponentialRampToValueAtTime(0.001, now + i*0.12 + 0.3); 
            o.start(now + i*0.12); o.stop(now + i*0.12 + 0.3); 
        });
    }
}

function activarSonidosUI() {
    // Busca todos los elementos interactivos y les pone sonido
    const elementos = document.querySelectorAll('button, .tarjeta, .tarjeta-menu, .btn-volver');
    elementos.forEach(el => {
        if(el.getAttribute('data-s') === '1') return; // Evita duplicados
        el.setAttribute('data-s', '1');
        el.addEventListener('mouseenter', () => playSound('hover'));
        el.addEventListener('click', () => playSound('click'));
    });
}

// ======================================================
// 5. SISTEMA DE VOZ ADAPTATIVO (POLÍGLOTA)
// ======================================================
function hablar(texto) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(texto);
    
    // Busca voz según el idioma seleccionado (en, pt, zh)
    const codeBusqueda = configIdioma[idiomaActual].vozStart;
    let vozElegida = vocesDisponibles.find(voz => voz.lang.toLowerCase().includes(codeBusqueda));
    
    if (vozElegida) {
        msg.voice = vozElegida;
        msg.lang = vozElegida.lang;
    } else {
        msg.lang = configIdioma[idiomaActual].code; // Si falla, usa el código genérico
    }
    
    msg.rate = 0.9; 
    window.speechSynthesis.speak(msg);
}

function hablarBilingue(textoES, textoTarget) {
    window.speechSynthesis.cancel(); 
    
    // 1. Habla Español
    const msgES = new SpeechSynthesisUtterance(textoES);
    let vozEs = vocesDisponibles.find(voz => voz.lang.toLowerCase().includes('es'));
    if (vozEs) msgES.voice = vozEs;
    msgES.lang = 'es-ES';
    
    // 2. Habla Idioma Objetivo
    const msgTarget = new SpeechSynthesisUtterance(textoTarget);
    const codeBusqueda = configIdioma[idiomaActual].vozStart;
    let vozTarget = vocesDisponibles.find(voz => voz.lang.toLowerCase().includes(codeBusqueda));
    
    if (vozTarget) {
        msgTarget.voice = vozTarget;
        msgTarget.lang = vozTarget.lang;
    } else {
        msgTarget.lang = configIdioma[idiomaActual].code;
    }

    // Encadenar: Primero español, luego el otro
    msgES.onend = function() { window.speechSynthesis.speak(msgTarget); };
    window.speechSynthesis.speak(msgES);
}

// ======================================================
// 6. PANTALLA DE INICIO (Safe Start)
// ======================================================
function crearPantallaInicio() {
    if (document.getElementById('pantalla-inicio')) return;
    const div = document.createElement('div'); div.id = 'pantalla-inicio';
    div.innerHTML = `
        <div style="font-size:80px;margin-bottom:20px;">🚀</div>
        <h1>Start!</h1>
        <button id="btn-arranque" class="btn-inicio-gigante">GO!</button>
    `;
    document.body.appendChild(div);
    
    document.getElementById('btn-arranque').onclick = () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        // Despertar voz silenciosa
        const despertar = new SpeechSynthesisUtterance(''); 
        window.speechSynthesis.speak(despertar);
        
        playSound('fanfarria');
        div.remove();
        inyectarBotonesExtra(); 
        activarSonidosUI();
    };
}

// ======================================================
// 7. MODALES (Ventanas Emergentes)
// ======================================================
function crearModalHTML() {
    if (document.getElementById('miModal')) return;
    const html = `
    <div id="miModal" class="modal-fondo">
        <div class="modal-caja">
            <div onclick="cerrarModal()" style="position:absolute;top:10px;right:15px;cursor:pointer;font-size:24px;color:#aaa;">✖</div>
            <div id="modal-icono" class="modal-icono">🎮</div>
            <h2 id="modal-titulo" class="modal-titulo"></h2>
            
            <div id="contenido-voz" style="display:none;">
                <div id="texto-progreso-voz" class="texto-progreso-voz"></div>
                <div class="barra-voz-contenedor">
                    <div id="barra-voz-relleno" class="barra-voz-relleno"></div>
                </div>
                <div id="icono-voz-grande" style="font-size:80px;margin:10px;"></div>
                <div id="btn-mic-accion" class="microfono-activo" style="cursor:pointer;background:#2196f3;">🎤</div>
                <p id="texto-escuchado" class="texto-escuchado">...</p>
                <button id="btn-saltar-voz" style="background:#ddd;border:none;padding:8px;border-radius:5px;margin-top:10px;cursor:pointer;">Saltar ⏭️</button>
            </div>
            
            <p id="modal-mensaje" style="font-size:1.2rem;color:#666;margin-bottom:20px;"></p>
            <button id="btn-accion-modal" class="btn-modal">OK</button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Eventos
    document.getElementById('btn-saltar-voz').onclick = () => { 
        playSound('click'); siguientePalabraVoz(); 
    };
    document.getElementById('btn-mic-accion').onclick = () => { 
        if(modoVozActivo) { playSound('click'); activarEscucha(palabraObjetivo); }
    };
}

function cerrarModal() { 
    detenerMicrofono(); 
    document.getElementById('miModal').style.display = 'none'; 
    modoVozActivo = false; 
}

function detenerMicrofono() { 
    if(recognition) { try{recognition.abort();}catch(e){} recognition=null; } 
}

function mostrarModal(tipo, callback) {
    const modal = document.getElementById('miModal');
    const contenidoVoz = document.getElementById('contenido-voz');
    const elems = [document.getElementById('modal-icono'), document.getElementById('modal-mensaje'), document.getElementById('btn-accion-modal')];
    
    contenidoVoz.style.display = 'none';
    elems.forEach(e => e.style.display = 'block');
    document.getElementById('modal-titulo').style.display = 'block';

    const tit = document.getElementById('modal-titulo');
    const msg = document.getElementById('modal-mensaje');
    const ico = document.getElementById('modal-icono');
    const btn = document.getElementById('btn-accion-modal');
    const config = configIdioma[idiomaActual];

    if (tipo === 'inicio') {
        ico.innerHTML = '🎧'; tit.innerText = 'Ready?'; 
        msg.innerText = `Meta: ${META_ACIERTOS}. Vidas: 3`;
        btn.innerText = 'PLAY'; btn.style.background = '#4caf50';
        hablar("Ready?");
        btn.onclick = () => { playSound('click'); modal.style.display='none'; if(callback) callback(); };

    } else if (tipo === 'victoria') {
        ico.innerHTML = '🏆'; tit.innerText = 'WINNER!'; msg.innerText = config.msgWin;
        btn.innerText = 'Premios'; btn.style.background = '#ff4081';
        btn.onclick = () => { playSound('click'); window.location.href = '../album.html'; };

    } else if (tipo === 'derrota') {
        ico.innerHTML = '😢'; tit.innerText = 'Oh no!'; msg.innerText = config.msgLose;
        btn.innerText = 'Restart'; btn.style.background = '#f44336';
        btn.onclick = () => { playSound('click'); location.reload(); };

    } else if (tipo === 'voz') {
        elems.forEach(e => e.style.display = 'none');
        contenidoVoz.style.display = 'block';
        tit.innerText = config.msgListen;
    }
    
    modal.style.display = 'flex';
    if(tipo !== 'derrota' && tipo !== 'voz') playSound('pop');
}

// ======================================================
// 8. CARGA DE CURSO INTELIGENTE (Adaptador de Idiomas)
// ======================================================
function iniciarCursoInteligente(baseDatos, idPremio) {
    const listaIdioma = baseDatos[idiomaActual]; // Toma 'en', 'pt' o 'zh'
    if (!listaIdioma) { alert("Idioma no disponible"); return; }

    const datosProcesados = listaIdioma.map(item => ({
        es: item.es,
        en: item.target, // Usamos 'en' como llave genérica
        icon: item.icon,
        hex: item.hex || null
    }));
    cargarCurso(datosProcesados, idPremio);
}

function cargarCurso(datos, id) {
    listaActual = datos; idLeccionActual = id || '';
    const tablero = document.getElementById('tablero');
    if (!tablero) return;
    
    tablero.innerHTML = '';
    listaActual.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'tarjeta'; div.id = `card-${i}`;
        div.onclick = () => manejarClic(item, i);
        if(item.hex) div.style.backgroundColor = item.hex;
        div.innerHTML = `<div class="icono">${item.icon}</div><div class="palabra-en">${item.en}</div><div class="palabra-es">${item.es}</div>`;
        tablero.appendChild(div);
    });
    
    // Importante: Activar sonidos en las tarjetas nuevas
    setTimeout(activarSonidosUI, 500);
}

// ======================================================
// 9. LÓGICA DEL JUEGO (TÁCTIL)
// ======================================================
function manejarClic(item, index) {
    const card = document.getElementById(`card-${index}`);
    if (jugando) {
        if (item.en === palabraObjetivo.en) {
            // ACIERTO
            card.classList.add('correcto'); playSound('win');
            setTimeout(() => hablar(configIdioma[idiomaActual].msgWin), 500);
            aciertos++; actualizarMarcador();
            
            if (aciertos >= META_ACIERTOS) finDelJuego();
            else setTimeout(() => { card.classList.remove('correcto'); nuevoTurno(); }, 2000);
        } else {
            // ERROR
            card.classList.add('incorrecto'); errores++;
            if (errores >= MAX_ERRORES) {
                jugando = false; gestionarBotonRepetir(false);
                playSound('gameover'); setTimeout(() => mostrarModal('derrota'), 2000);
            } else {
                playSound('lose'); setTimeout(() => hablar(configIdioma[idiomaActual].msgLose), 500);
                actualizarMarcador(); setTimeout(() => card.classList.remove('incorrecto'), 1000);
            }
        }
    } else {
        // MODO ESTUDIO
        playSound('flip'); hablarBilingue(item.es, item.en);
    }
}

function iniciarJuego() {
    mostrarModal('inicio', () => {
        jugando = true; aciertos = 0; errores = 0;
        document.getElementById('btn-jugar').style.display = 'none';
        const btnVoz = document.getElementById('btn-voz'); if(btnVoz) btnVoz.style.display='none';
        gestionarBotonRepetir(true);
        document.getElementById('marcador').style.display = 'block';
        actualizarMarcador(); nuevoTurno();
    });
}

function nuevoTurno() {
    palabraObjetivo = listaActual[Math.floor(Math.random() * listaActual.length)];
    const frase = configIdioma[idiomaActual].msgFind + " " + palabraObjetivo.en; 
    setTimeout(() => hablar(frase), 1000);
}

function actualizarMarcador() {
    const vidas = "❤️".repeat(MAX_ERRORES - errores);
    document.getElementById('marcador').innerText = `Vidas: ${vidas} | ${aciertos}/${META_ACIERTOS}`;
}

function finDelJuego() {
    jugando = false; gestionarBotonRepetir(false);
    playSound('fanfarria'); lanzarConfeti();
    if(idLeccionActual) localStorage.setItem('premio_'+idLeccionActual, 'si');
    setTimeout(() => mostrarModal('victoria'), 2000);
}

function gestionarBotonRepetir(show) {
    let btn = document.getElementById('btn-repetir');
    if (!btn) {
        const p = document.querySelector('.panel-control');
        if (p) {
            btn = document.createElement('button'); btn.id='btn-repetir'; btn.className='btn-repetir';
            btn.innerText = '🔊'; btn.onclick = () => { playSound('click'); repetirInstruccion(); };
            p.appendChild(btn);
        }
    }
    if(btn) btn.style.display = show ? 'inline-flex' : 'none';
}

function repetirInstruccion() {
    if (palabraObjetivo && jugando) {
         const frase = configIdioma[idiomaActual].msgFind + " " + palabraObjetivo.en;
         hablar(frase);
    }
}

// ======================================================
// 10. JUEGO DE VOZ MULTILINGÜE
// ======================================================
function inyectarBotonesExtra() {
    const p = document.querySelector('.panel-control');
    if (p && !document.getElementById('btn-voz') && SpeechRecognition) {
        const b = document.createElement('button'); b.id='btn-voz'; b.className='btn-voz';
        b.innerText = '🎤'; b.onclick = () => { playSound('click'); iniciarDesafioVoz(); };
        p.appendChild(b);
    }
}

function iniciarDesafioVoz() {
    if (!SpeechRecognition) return;
    modoVozActivo = true; rachaVoz = 0; actualizarBarraVoz(); mostrarModal('voz'); siguientePalabraVoz();
}

function siguientePalabraVoz() {
    if (!modoVozActivo) return; detenerMicrofono();
    palabraObjetivo = listaActual[Math.floor(Math.random() * listaActual.length)];
    
    document.getElementById('icono-voz-grande').innerText = palabraObjetivo.icon;
    document.getElementById('texto-progreso-voz').innerText = `${rachaVoz+1} / ${META_VOZ}`;
    resetearBotonMic();
    document.getElementById('texto-escuchado').style.color = "#555";
    document.getElementById('texto-escuchado').innerText = "...";

    hablar(configIdioma[idiomaActual].msgListen + " " + palabraObjetivo.en);
    setTimeout(() => { if(modoVozActivo) activarEscucha(palabraObjetivo); }, 1500);
}

function activarEscucha(item) {
    if (!modoVozActivo) return; detenerMicrofono();
    const btn = document.getElementById('btn-mic-accion');
    btn.style.background = '#f44336'; btn.style.animation = 'latido-mic 1.5s infinite';
    document.getElementById('texto-escuchado').innerText = "👂...";

    recognition = new SpeechRecognition();
    recognition.lang = configIdioma[idiomaActual].code; // CLAVE: Idioma correcto (zh, pt, en)
    recognition.interimResults = false; recognition.maxAlternatives = 1; recognition.continuous = false;

    try{ recognition.start(); } catch(e) { resetearBotonMic(); }

    recognition.onresult = (e) => {
        const dicho = e.results[0][0].transcript.toLowerCase().trim();
        const esperado = item.en.toLowerCase().trim();
        const txt = document.getElementById('texto-escuchado');
        resetearBotonMic();

        // Comparación flexible
        if (dicho.includes(esperado) || esperado.includes(dicho)) {
            txt.style.color = "#4caf50"; txt.innerText = `✅ "${dicho}"`;
            playSound('win'); rachaVoz++; actualizarBarraVoz();
            if (rachaVoz >= META_VOZ) { lanzarConfeti(); setTimeout(()=>mostrarModal('victoria'), 1000); }
            else { hablar(configIdioma[idiomaActual].msgWin); setTimeout(siguientePalabraVoz, 2000); }
        } else {
            txt.style.color = "#f44336"; txt.innerText = `❌ "${dicho}"`;
            playSound('lose');
            setTimeout(() => {
                hablar(configIdioma[idiomaActual].msgLose);
                // MODO ANTI-CONGELAMIENTO: Espera clic
                setTimeout(() => { txt.style.color="#555"; txt.innerText="👇 Toca para intentar"; resetearBotonMic(); }, 2000);
            }, 500);
        }
    };
    recognition.onerror = () => { 
        resetearBotonMic(); 
        document.getElementById('texto-escuchado').innerText = "⚠️ Error. Toca para intentar"; 
    };
}

function resetearBotonMic() {
    const b = document.getElementById('btn-mic-accion'); b.style.background = '#2196f3'; b.style.animation = 'none';
}
function actualizarBarraVoz() {
    document.getElementById('barra-voz-relleno').style.width = `${(rachaVoz/META_VOZ)*100}%`;
}
function lanzarConfeti() { 
    const c=['#f00','#0f0','#00f']; for(let i=0;i<50;i++){ const d=document.createElement('div'); d.style.cssText=`position:fixed;top:0;left:${Math.random()*100}vw;width:10px;height:10px;background:${c[i%3]};z-index:9999;transition:2s;`; document.body.appendChild(d); setTimeout(()=>d.style.top='100vh',10); }
}
