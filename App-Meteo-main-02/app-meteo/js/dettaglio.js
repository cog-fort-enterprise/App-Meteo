const giorniSettimana = [
    "Domenica",
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato"
];


const previsioni = document.getElementsByClassName("prev");
const comune = document.getElementById("comune");

/* ======== Previsioni settimana ======== */
async function caricaPrevisioniSettimana(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}
        &daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code
        &timezone=auto`.replace(/\s+/g, "");

    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Errore previsioni settimana");
        const data = await resp.json();

        const daily = data.daily;

        let oggi = new Date();
        let numGiorno = oggi.getDay();

        for (let i = 0; i < previsioni.length && i < daily.time.length; i++) {

            const dataGiorno = daily.time[i];
            const tmax = daily.temperature_2m_max[i];
            const tmin = daily.temperature_2m_min[i];
            const pioggia = daily.precipitation_sum[i];
            const ventoMax = daily.wind_speed_10m_max[i];
            const codiceMeteo = daily.weather_code[i];

            previsioni[i].innerHTML = `
                <h3>${i === 0 ? "Oggi" : giorniSettimana[numGiorno]}</h3>
                <p>${weatherEmoji(codiceMeteo)} ${weatherDescription(codiceMeteo)}</p>
                <p>Max: ${tmax}°C</p>
                <p>Min: ${tmin}°C</p>
                <p>Pioggia: ${pioggia} mm</p>
                <p>Vento max: ${ventoMax} km/h</p>
            `;

            if(numGiorno == 6){
                numGiorno = 0
            } else {
                numGiorno+=1
            }
        }

    } catch (err) {
        console.error(err);
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

/* ======== Lettura da URL ======== */
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let nomeComune = urlParams.get('comune')
let nomeProvincia = urlParams.get('provincia')
let nomeRegione = urlParams.get('regione')
let lat = urlParams.get('lat')
let lon = urlParams.get('lon')


/* ======== Caricare dati ======== */
document.addEventListener("DOMContentLoaded", function(){
    comune.innerHTML = nomeComune + " (" + nomeProvincia + "), " + nomeRegione;
    caricaPrevisioniSettimana(lat, lon);
})

