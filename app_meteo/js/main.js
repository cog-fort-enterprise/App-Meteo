/* ================== Config ================== */
const URL_COMUNI = "https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json";
let comuni = [];

/* ========== Elementi DOM ========== */
const div_ricerca_regioni = document.getElementById("ricerca_regioni");
const ricerca_regione = document.getElementById("ricerca_regione");
const lista_regioni = document.getElementById("lista_regioni");

const div_ricerca_province = document.getElementById("ricerca_province");
const ricerca_provincia = document.getElementById("ricerca_provincia");
const lista_province = document.getElementById("lista_province");

const div_ricerca_comuni = document.getElementById("ricerca_comuni");
const ricerca_comune = document.getElementById("ricerca_comune");
const lista_comuni = document.getElementById("lista_comuni");

const campiInput = [
    ricerca_regione,
    ricerca_provincia,
    ricerca_comune
];
// Nascondere messaggio di errore appena l’utente ricomincia a scrivere
campiInput.forEach(campo => {
    campo.addEventListener("input", () => {
        avvisoErrore.style.display = "none";
    });
});

const output = document.getElementById("output");
const selezionati = document.getElementById("status");
const avvisoErrore = document.getElementById("avviso_errore");
const button_indietro = document.getElementById("bottone_indietro");
const bottoneRicerca = document.getElementById("bottone_ricerca");

const container_meteo_comune = document.getElementById("container");
const div_meteo_comune = document.getElementById("meteo_comune");
const div_temperatura = document.getElementById("temperatura");
const div_dati_ambiente = document.getElementById("dati_ambiente");
const div_info_comune = document.getElementById("info_comune");
const button_mostra_dettagli = document.getElementById("mostra_dettagli");
const link_dettaglio = document.getElementById("link_dettaglio");

/* ========== Mappa Leaflet ========== */
let map = L.map('map').setView([41.8719, 12.5674], 6); // mappa centrata sull'Italia
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
let marker = null;

// Controlla se esiste e setta il suo tipo a button
if (bottoneRicerca) bottoneRicerca.type = "button";

/* ========== Caricamento JSON comuni ========== */
async function caricaComuni() { // async perché richiede tempo e dipende dalla rete (viene chiamato fetch() all'internp, che è asincrono)
    try {
        const resp = await fetch(URL_COMUNI); //richiesta HTTP GET, await per aspettare risposta
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json(); // la conversione è asincrona e va attesa
        comuni = data;
        popolaRegioni();
    } catch (err) {
        console.error("Errore caricamento comuni:", err);
        output.textContent = "Errore nel caricamento dei comuni.";
    }
}

/* ========== Popola regioni ========== */
function popolaRegioni() {
    if (!comuni || comuni.length === 0) return; // fermare funzione se array vuoto o comuni non caricati
    const regioni = Array.from(new Set(comuni.map(c => c.regione?.nome).filter(Boolean))) // map prende il nome della regione, ?. evita errori se dato manca, filter elimina valori null o undefined, Set elimina i duplicati
                        .sort((a,b) => a.localeCompare(b, 'it')); // ordina secondo lingua italiana
    lista_regioni.innerHTML = "";
    regioni.forEach(r => {
        const op = document.createElement("option");
        op.value = r;
        lista_regioni.appendChild(op);
    });
    div_ricerca_regioni.style.display = "block";
    ricerca_regioni.focus();
}

/* ========== Ricerca regione e popola province ========== */
ricerca_regione.addEventListener("input", function () {
    const regioneSelezionata = ricerca_regione.value.trim();
    ricerca_provincia.value = "";
    ricerca_comune.value = "";
    lista_province.innerHTML = "";
    lista_comuni.innerHTML = "";
    div_ricerca_comuni.style.display = "none";

    selezionati.innerHTML = "<strong>Regione</strong>: " + regioneSelezionata; 

    // evita ricerche inutili
    if (!regioneSelezionata) {
        div_ricerca_province.style.display = "none";
        return;
    }

    const province = comuni
        .filter(c => c.regione?.nome === regioneSelezionata) // seleziona comuni appartenenti a regione selezionata
        .map(c => c.provincia?.nome) // estrae provincia
        .filter(Boolean); // elimina valori come null o undefined

    const provinceUniche = Array.from(new Set(province)).sort((a,b) => a.localeCompare(b, 'it')); // Set elimina duplicati, poi ordinamento
    if (provinceUniche.length === 0) {
        div_ricerca_province.style.display = "none";
        return;
    }

    lista_province.innerHTML = "";
    provinceUniche.forEach(p => {
        const op = document.createElement("option");
        op.value = p;
        lista_province.appendChild(op);
    });
    div_ricerca_province.style.display = "block";
    div_ricerca_regioni.style.display = "none";
        ricerca_provincia.focus();
});

ricerca_provincia.addEventListener("input", function(){selezionati.innerHTML = "<strong>Provincia</strong>: " + ricerca_provincia.value.trim();});
ricerca_comune.addEventListener("input", function(){selezionati.innerHTML = "<strong>Comune</strong>: " + ricerca_comune.value.trim();})

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
    div_ricerca_province.style.display = "none";
    ricerca_comune.focus();
}

ricerca_provincia.addEventListener("input", function () {
    const val = ricerca_provincia.value;
    const match = Array.from(lista_province.options).some(opt => opt.value === val);
    if (match) popolaComuni();
});
ricerca_provincia.addEventListener("change", popolaComuni);

/* ========== Recupera oggetto comune dal JSON ========== */
let nomeComune = "";
let nomeProvincia = "";
let nomeRegione = "";

function getComuneSelezionato() {
    nomeComune = ricerca_comune.value.trim();
    nomeProvincia = ricerca_provincia.value.trim();
    nomeRegione = ricerca_regione.value.trim();

    if (!nomeComune || !nomeProvincia || !nomeRegione) return null; // controllo completezza, se c'è un null allora resistisce null e interrompe

    return comuni.find(c => // restituisce il primo elemento che soddisfa condizione
        c.nome === nomeComune &&
        c.provincia?.nome === nomeProvincia &&
        c.regione?.nome === nomeRegione
    ) || null; // restituisce null invece di undefined se non si trova
} 

/* ========== Funzione per chiamare Open-Meteo Geocoding ========== */
async function cercaCoordinateOpenMeteo(nomeComune) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nomeComune)}&count=1&language=it&format=json`;
    // inserisce nomeComune nell'URL convertendo spazi e caratteri speciali, count per solo risultato più rilevante, language per lingua risposta, format per scegliere formato risposta
    try {
        const resp = await fetch(url); // richiesta HTTP GET
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json(); // json in oggetto js
        if (!data.results || data.results.length === 0) return null; // restituisce null per evitare errori se non trova comune
        const r = data.results[0];
        return { lat: r.latitude, lon: r.longitude, raw: r };
    } catch (err) {
        console.error("Errore Open-Meteo:", err);
        return null;
    }
}

/* ========== Associa icona a meteo ========== */
function weatherEmoji(code) {
    const mapping = {
        0: "☀️",   1: "🌤️",  2: "⛅",   3: "☁️",
        45: "🌥️", 48: "🌥️", 51: "🌦️", 53: "🌦️",
        55: "🌦️", 56: "🌦️", 57: "🌦️", 61: "🌧️",
        63: "🌧️", 65: "🌧️", 66: "🌧️", 67: "🌧️",
        71: "🌨️", 73: "🌨️", 75: "🌨️", 77: "🌨️",
        80: "🌦️", 81: "🌦️", 82: "🌦️", 85: "🌨️",
        86: "🌨️", 95: "⛈️", 96: "⛈️", 99: "⛈️"
    };
    return mapping[code] || "❓";
}

function weatherDescription(code) {
    const mapping = {
        0: "Sereno",
        1: "Poco nuvoloso",
        2: "Parzialmente nuvoloso",
        3: "Nuvoloso",
        45: "Nebbia leggera",
        48: "Nebbia con brina",
        51: "Pioggia leggera",
        53: "Pioggia moderata",
        55: "Pioggia intensa",
        56: "Pioggia ghiacciata leggera",
        57: "Pioggia ghiacciata intensa",
        61: "Pioggia debole",
        63: "Pioggia moderata",
        65: "Pioggia forte",
        66: "Pioggia ghiacciata leggera",
        67: "Pioggia ghiacciata forte",
        71: "Neve leggera",
        73: "Neve moderata",
        75: "Neve intensa",
        77: "Fiocchi di neve",
        80: "Pioggia a rovesci leggera",
        81: "Pioggia a rovesci moderata",
        82: "Pioggia a rovesci intensa",
        85: "Neve a rovesci leggera",
        86: "Neve a rovesci intensa",
        95: "Temporale",
        96: "Temporale con pioggia leggera",
        99: "Temporale con pioggia intensa"
    };
    return mapping[code] || "Meteo sconosciuto";
}


/* ========== Meteo tramite Open-Meteo ======== */
async function caricaMeteo(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}
        &current_weather=true
        &daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,wind_speed_10m_max
        &timezone=auto`.replace(/\s+/g, "");

    try {
        const resp = await fetch(url);
        if (!resp.ok) {
            output.style.display = block;
            throw new Error("Errore meteo");
        }
        const data = await resp.json();

        // Dati correnti
        const current = data.current_weather;
        const giornaliero = data.daily;

        const tempAttuale = current.temperature;
        const vento = current.windspeed;
        const codiceMeteo = current.weathercode;
        const emojiMeteo = weatherEmoji(codiceMeteo);
        const descrizioneMeteo = weatherDescription(codiceMeteo);

        const tmax = giornaliero.temperature_2m_max[0];
        const tmin = giornaliero.temperature_2m_min[0];
        const alba = giornaliero.sunrise[0];
        const tramonto = giornaliero.sunset[0];
        const precipitazioni = giornaliero.precipitation_sum[0];
        const ventoMax = giornaliero.wind_speed_10m_max[0];

        div_info_comune.innerHTML = `
            <h2>Comune di ${nomeComune}</h2>
            <p>Provincia: ${nomeProvincia}</p>
            <p>Regione: ${nomeRegione}</p>
            <p>Latitudine: ${lat}</p>
            <p>Longitudine: ${lon}</p>
        `;

        div_temperatura.innerHTML = `
            <p>${emojiMeteo} ${descrizioneMeteo}</p>
            <p>Temperatura attuale: ${tempAttuale}°C</p>
            <p>Temperatura massima: ${tmax}°C</p>
            <p>Temperatura minima: ${tmin}°C</p>
        `;

        div_dati_ambiente.innerHTML = `
            <p>Alba: ${alba.substring(11)}</p>
            <p>Tramonto: ${tramonto.substring(11)}</p>
            <p>Precipitazioni: ${precipitazioni} mm</p>
            <p>Vento attuale: ${vento} km/h</p>
            <p>Vento massimo: ${ventoMax} km/h</p>
        `;

        container_meteo_comune.style.display = "block";

        return emojiMeteo;

    } catch (err) {
        console.error(err);
        output.textContent = "Errore caricamento meteo.";
        return "❓";
    }
}

/* ========== Bottone ricerca ========== */
bottoneRicerca.addEventListener("click", async function (e) {
    e.preventDefault();

    const comuneObj = getComuneSelezionato();
    if (!comuneObj) {
        avvisoErrore.style.display = "block";
        return;
    }

    const coordsObj = await cercaCoordinateOpenMeteo(comuneObj.nome);
    if (!coordsObj) {
        output.textContent = "Coordinate non trovate tramite Open-Meteo.";
        return;
    }

    const emojiMeteo = await caricaMeteo(coordsObj.lat, coordsObj.lon);

    map.setView([coordsObj.lat, coordsObj.lon], 13);
    if (marker) map.removeLayer(marker);
    marker = L.marker([coordsObj.lat, coordsObj.lon]).addTo(map).bindPopup(`${emojiMeteo} ${comuneObj.nome}, ${comuneObj.provincia?.nome || ""}`).openPopup();

    coords = coordsObj;
});

/* ========== Pulsante indietro ========== */
button_indietro.addEventListener("click", function () {
    window.location.replace(window.location.href);
});


/* ========== Link dettagli ========== */
function trovaURL() {
    if (!coords) return;
    let url = `dettaglio.html?comune=${nomeComune}&provincia=${nomeProvincia}&regione=${nomeRegione}&lat=${coords.lat}&lon=${coords.lon}`;
    link_dettaglio.href = url;
}
button_mostra_dettagli.addEventListener("click", trovaURL);

/* ========== Avvio ========== */
document.addEventListener("DOMContentLoaded", caricaComuni);