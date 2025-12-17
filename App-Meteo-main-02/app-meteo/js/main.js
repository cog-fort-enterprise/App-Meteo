

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

const div_meteo_comune = document.getElementById("meteo_comune");
const div_temperatura = document.getElementById("temperatura");
const div_dati_ambiente = document.getElementById("dati_ambiente");
const div_info_comune = document.getElementById("info_comune");
const button_mostra_dettagli = document.getElementById("mostra_dettagli");
const link_dettaglio = document.getElementById("link_dettaglio");


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
    div_ricerca_regioni.style.display = "none";
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
    div_ricerca_provincie.style.display = "none";
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
let nomeComune = "";
let nomeProvincia = "";
let nomeRegione = "";
function getComuneSelezionato() {
    nomeComune = ricerca_comune.value.trim();
    nomeProvincia = ricerca_provincia.value.trim();
    nomeRegione = ricerca_regione.value.trim();

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
let coords = "";
bottoneRicerca.addEventListener("click", async function (e) {
    e.preventDefault();

    const comuneObj = getComuneSelezionato();
    if (!comuneObj) {
        output.textContent = "Seleziona regione, provincia e comune validi.";
        return;
    }

    output.textContent = "Ricerca coordinate…";

    // chiamiamo la funzione semplificata
    coords = await cercaCoordinateOpenMeteo(comuneObj.nome);

    if (!coords) {
        output.textContent = "Coordinate non trovate tramite Open-Meteo.";
        return;
    }

    map.setView([coords.lat, coords.lon], 13);
    if (marker) map.removeLayer(marker);
    marker = L.marker([coords.lat, coords.lon]).addTo(map)
            .bindPopup(`${comuneObj.nome}, ${comuneObj.provincia?.nome || ""}`).openPopup();

    await caricaMeteo(coords.lat, coords.lon);


    output.textContent = `Comune trovato: ${comuneObj.nome} (${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)})`;
});

/* ========== Pulsante indietro: reset minimo ========== */
button_indietro.addEventListener("click", function () {
    div_ricerca_regioni.style.display ="block"
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
    div_meteo_comune.style.display = "none";

});

/* ======== Meteo tramite Open-Meteo ======== */
async function caricaMeteo(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}
        &current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m
        &daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,wind_speed_10m_max
        &timezone=auto`.replace(/\s+/g, "");

    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Errore meteo");
        const data = await resp.json();

        // Estrazione dati
        const giornaliero = data.daily;
        const current = data.current;

        const tmax = giornaliero.temperature_2m_max[0];
        const tmin = giornaliero.temperature_2m_min[0];
        const alba = giornaliero.sunrise[0];
        const tramonto = giornaliero.sunset[0];
        const precipitazioni = giornaliero.precipitation_sum[0];
        const ventoMax = giornaliero.wind_speed_10m_max[0];

        const tempAttuale = current.temperature_2m;
        const umidita = current.relative_humidity_2m;
        const vento = current.wind_speed_10m;

        // Popola HTML
        div_info_comune.innerHTML = `
            <h2>Comune di ${nomeComune}</h2>
            <p>Provincia: ${nomeProvincia}</p>
            <p>Regione: ${nomeRegione}</p>
            <p>Latitudine: ${coords.lat}</p>
            <p>Longitudine: ${coords.lon}</p>
        `;

        div_temperatura.innerHTML = `
            <p>Temperatura attuale: ${tempAttuale}°C</p>
            <p>Massima oggi: ${tmax}°C</p>
            <p>Minima oggi: ${tmin}°C</p>
        `;

        div_dati_ambiente.innerHTML = `
            <p>Alba: ${alba}</p>
            <p>Tramonto: ${tramonto}</p>
            <p>Precipitazioni: ${precipitazioni} mm</p>
            <p>Vento attuale: ${vento} km/h</p>
            <p>Vento massimo previsto: ${ventoMax} km/h</p>
            <p>Umidità: ${umidita}%</p>
        `;

        div_meteo_comune.style.display = "block";

    } catch (err) {
        console.error(err);
        div_temperatura.textContent = "Errore caricamento meteo.";
    }
}

function trovaURL(){
    let url = "dettaglio.html?comune="+nomeComune+"&provincia="+nomeProvincia+"&regione="+nomeRegione+"&lat="+coords.lat+"&lon="+coords.lon;
    link_dettaglio.href = url;
}

button_mostra_dettagli.addEventListener("click",trovaURL)



/* ========== Avvio ========== */
document.addEventListener("DOMContentLoaded", caricaComuni);

