// main.js - versione risistemata
// Assicurati che questo file sia caricato DOPO il DOM (tu lo includi alla fine dell'HTML)

/* ================== Config ================== */
const URL_COMUNI = "https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json";
let comuni = [];

/* ========== Elementi DOM ========== */
const div_ricerca_regioni = document.getElementById("ricerca_regioni");
const ricerca_regione = document.getElementById("ricerca_regione");
const lista_regioni = document.getElementById("lista_regioni");

const div_ricerca_provincie = document.getElementById("ricerca_provincie");
const ricerca_provincia = document.getElementById("ricerca_provincia");
const lista_provincie = document.getElementById("lista_provincie");

const div_ricerca_comuni = document.getElementById("ricerca_comuni");
const ricerca_comune = document.getElementById("ricerca_comune");
const lista_comuni = document.getElementById("lista_comuni");

const output = document.getElementById("output");
const button_indietro = document.getElementById("bottone_indietro");
const bottoneRicerca = document.getElementById("bottone_ricerca");

/* ========== Mappa Leaflet ========== */
let map = L.map('map').setView([41.8719, 12.5674], 6); // Italia centrata
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
let marker = null;

// sicurezza: rendi il bottone tipo button (evita submit involontario)
if (bottoneRicerca) bottoneRicerca.type = "button";

/* ========== Caricamento JSON comuni ========== */
async function caricaComuni() {
    try {
        const resp = await fetch(URL_COMUNI);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        comuni = data;
        output.textContent = `Comuni caricati: ${comuni.length}`;
        console.log("Caricati comuni (esempio):", comuni.slice(0,3));
        popolaRegioni();
    } catch (err) {
        console.error("Errore caricamento comuni:", err);
        output.textContent = "Errore nel caricamento dei comuni. Controlla la console.";
    }
}

/* ========== Popola regioni ========== */
function popolaRegioni() {
    if (!comuni || comuni.length === 0) return;
    const regioni = Array.from(new Set(comuni.map(c => c.regione?.nome).filter(Boolean)))
                         .sort((a,b) => a.localeCompare(b, 'it'));
    lista_regioni.innerHTML = "";
    regioni.forEach(r => {
        const op = document.createElement("option");
        op.value = r;
        lista_regioni.appendChild(op);
    });
    div_ricerca_regioni.style.display = "block";
}

/* ========== Quando si scrive regione -> popola province ========== */
ricerca_regione.addEventListener("input", function () {
    const regioneSelezionata = ricerca_regione.value.trim();
    ricerca_provincia.value = "";
    ricerca_comune.value = "";
    lista_provincie.innerHTML = "";
    lista_comuni.innerHTML = "";
    div_ricerca_comuni.style.display = "none";

    if (!regioneSelezionata) {
        div_ricerca_provincie.style.display = "none";
        return;
    }

    const provincie = comuni
        .filter(c => c.regione?.nome === regioneSelezionata)
        .map(c => c.provincia?.nome)
        .filter(Boolean);

    const provincieUniche = Array.from(new Set(provincie)).sort((a,b) => a.localeCompare(b, 'it'));
    if (provincieUniche.length === 0) {
        div_ricerca_provincie.style.display = "none";
        return;
    }

    provincieUniche.forEach(p => {
        const op = document.createElement("option");
        op.value = p;
        lista_provincie.appendChild(op);
    });
    div_ricerca_provincie.style.display = "block";
});

/* ========== Popola comuni quando provincia valida ========== */
function popolaComuni() {
    const provinciaSelezionata = ricerca_provincia.value.trim();
    const regioneSelezionata = ricerca_regione.value.trim();
    ricerca_comune.value = "";
    lista_comuni.innerHTML = "";

    if (!provinciaSelezionata || !regioneSelezionata) {
        div_ricerca_comuni.style.display = "none";
        return;
    }

    const comm = comuni
        .filter(c => c.provincia?.nome === provinciaSelezionata && c.regione?.nome === regioneSelezionata)
        .map(c => c.nome)
        .filter(Boolean);

    const commUnici = Array.from(new Set(comm)).sort((a,b) => a.localeCompare(b, 'it'));
    if (commUnici.length === 0) {
        div_ricerca_comuni.style.display = "none";
        return;
    }

    commUnici.forEach(nome => {
        const op = document.createElement("option");
        op.value = nome;
        lista_comuni.appendChild(op);
    });
    div_ricerca_comuni.style.display = "block";
}

// attiva popolaComuni sia quando l'utente digita qualcosa che quando cambia il campo
ricerca_provincia.addEventListener("input", function () {
    const val = ricerca_provincia.value;
    const match = Array.from(lista_provincie.options).some(opt => opt.value === val);
    if (match) popolaComuni();
});
ricerca_provincia.addEventListener("change", popolaComuni);

/* ========== Recupera oggetto comune dal JSON ==========
   (serve solo a verificare che il comune esista nel dataset) */
function getComuneSelezionato() {
    const nomeComune = ricerca_comune.value.trim();
    const nomeProvincia = ricerca_provincia.value.trim();
    const nomeRegione = ricerca_regione.value.trim();

    if (!nomeComune || !nomeProvincia || !nomeRegione) return null;

    return comuni.find(c =>
        c.nome === nomeComune &&
        c.provincia?.nome === nomeProvincia &&
        c.regione?.nome === nomeRegione
    ) || null;
}

/* ========== Funzione per chiamare Open-Meteo Geocoding e scegliere il risultato migliore ==========*/
async function cercaCoordinateOpenMeteo(nomeComune) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nomeComune)}&count=1&language=it&format=json`;
    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        if (!data.results || data.results.length === 0) return null;

        const r = data.results[0]; // prendi il primo risultato
        return { lat: r.latitude, lon: r.longitude, raw: r };
    } catch (err) {
        console.error("Errore Open-Meteo:", err);
        return null;
    }
}
/* ========== Evento bottone ricerca: usa Open-Meteo per ottenere coords ==========
Flusso:
    1) Verifica che il comune esista nel JSON (evita ricerche inutili)
    2) Chiede Open-Meteo per le coordinate
    3) Se ok: sposta mappa e crea marker
*/
bottoneRicerca.addEventListener("click", async function (e) {
    e.preventDefault();

    const comuneObj = getComuneSelezionato();
    if (!comuneObj) {
        output.textContent = "Seleziona regione, provincia e comune validi.";
        return;
    }

    output.textContent = "Ricerca coordinate…";

    // chiamiamo la funzione semplificata
    const coords = await cercaCoordinateOpenMeteo(comuneObj.nome);

    if (!coords) {
        output.textContent = "Coordinate non trovate tramite Open-Meteo.";
        return;
    }

    map.setView([coords.lat, coords.lon], 13);
    if (marker) map.removeLayer(marker);
    marker = L.marker([coords.lat, coords.lon]).addTo(map)
            .bindPopup(`${comuneObj.nome}, ${comuneObj.provincia?.nome || ""}`).openPopup();

    output.textContent = `Comune trovato: ${comuneObj.nome} (${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)})`;
});

/* ========== Pulsante indietro: reset minimo ========== */

button_indietro.addEventListener("click", function () {
    
    div_ricerca_comuni.style.display = "none";
    div_ricerca_provincie.style.display = "none";
    ricerca_regione.value = "";
    ricerca_provincia.value = "";
    ricerca_comune.value = "";
    output.textContent = "";
    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }
    map.setView([41.8719, 12.5674], 6);
});


/* ========== Avvio ========== */
document.addEventListener("DOMContentLoaded", caricaComuni);
