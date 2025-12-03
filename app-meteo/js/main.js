
//----------------------------Fetch comuni----------------------------
const URL_COMUNI = 
    "https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json";

let comuni = [];
const div_ricerca_regioni = document.getElementById("ricerca_regioni")
const ricerca_regione = document.getElementById("ricerca_regione")
const lista_regioni = document.getElementById("lista_regioni")

const div_ricerca_provincie = document.getElementById("ricerca_provincie")
const ricerca_provincia = document.getElementById("ricerca_provincia")
const lista_provincie = document.getElementById("lista_provincie")

const div_ricerca_comuni = document.getElementById("ricerca_comuni")
const ricerca_comune = document.getElementById("ricerca_comune")
const lista_comuni = document.getElementById("lista_comuni")

const output = document.getElementById("output")

const button_indietro = document.getElementById("bottone_indietro")

//Caricamento comuni

function caricaComuni(){
    fetch(URL_COMUNI)
        .then(response => response.json())
        .then(data => {
            comuni = data
            output.textContent = "Comuni caricati: " + data.length;
            popolaRegioni()
            
            /*
            data.forEach(c => {
                const option = document.createElement("option");
                option.value = c.nome;  
                lista_comuni.appendChild(option);
            });
            */
        })
        .catch(err => {
            output.textContent = "Errore nel caricamento dei comuni: " + err;
        })
}

function popolaRegioni() {
    const regioni = Array.from(new Set(comuni.map(c => c.regione.nome)))
                        .sort((a, b) => a.localeCompare(b));

    regioni.forEach(nomeRegione => {
        const option = document.createElement("option");
        option.value = nomeRegione;
        lista_regioni.appendChild(option);
    });
}

ricerca_regione.addEventListener("change", function() {
    const regioneSelezionata = ricerca_regione.value;

    // Filtra le province solo per la regione selezionata
    const provincieFiltrate = comuni
        .filter(c => c.regione.nome === regioneSelezionata)
        .map(c => c.provincia.nome);

    // Rimuove duplicati e ordina
    const provincieUniche = Array.from(new Set(provincieFiltrate))
                                .sort((a, b) => a.localeCompare(b));

    // Pulisce il datalist delle province
    lista_provincie.innerHTML = "";

    // Popola il datalist con le province filtrate
    provincieUniche.forEach(nomeProvincia => {
        const option = document.createElement("option");
        option.value = nomeProvincia;
        lista_provincie.appendChild(option);
    });

    // Mostra il div delle province
    div_ricerca_provincie.style.display = "block";

});

document.addEventListener("DOMContentLoaded", caricaComuni)

button_indietro.addEventListener("click", function(){
    if(div_ricerca_comune.style.display == "block"){
        if(div_ricerca_provincie.style.display == "block"){
            div_ricerca_provincie.style.display = "none"
            div_ricerca_comune.style.display = "none"
        }
    } else {
        if(div_ricerca_provincie.style.display == "block"){
            div_ricerca_provincie.style.display = "none"
        }
    }  
    
})

document.getElementById("form").addEventListener("submit", function(e){
    if(div_ricerca_provincie.style.display == "none" && div_ricerca_comuni.style.display == "none"){
        e.preventDefault()
    }
})

//----------------------------Ricerca del comune e filtri----------------------------


//----------------------------Mappa----------------------------
let map = L.map('map').setView([41.9028, 12.4964], 13);
        
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
maxZoom: 19,
attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


let marker = L.marker([41.9028, 12.4964]).addTo(map);
marker.bindPopup("Ciao, questa è Roma!");

