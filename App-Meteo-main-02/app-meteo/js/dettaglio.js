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

            previsioni[i].innerHTML = `
                <h3>${i === 0 ? "Oggi" : giorniSettimana[numGiorno]}</h3>
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


