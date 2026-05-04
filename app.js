let kunden = JSON.parse(localStorage.getItem("kunden")) || [];
let positionen = JSON.parse(localStorage.getItem("positionen")) || [];

let draftCounter = 0;

/* SPEICHERN */

function speichern() {
  localStorage.setItem("kunden", JSON.stringify(kunden));
  localStorage.setItem("positionen", JSON.stringify(positionen));
}

/* NEUER KUNDE */

function neuerKunde() {
  kundenForm.classList.remove("hidden");

  kundeName.value = "";
  kundeTelefon.value = "";
  kundeEmail.value = "";
  kundeTyp.value = "privat";

  draftPositionenListe.innerHTML = "";
  draftCounter = 0;

  draftPositionHinzufuegen();
}

/* FORM SCHLIESSEN */

function kundenFormSchliessen() {
  kundenForm.classList.add("hidden");
}

/* MIETPOSITION HINZUFÜGEN */

function draftPositionHinzufuegen() {

  draftCounter++;

  let div = document.createElement("div");
  div.className = "item";

  div.innerHTML = `
    <b>Position ${draftCounter}</b>

    <input class="kat" placeholder="Kategorie (Container / Stellplatz)">
    <input class="anzahl" type="number" value="1">
    <input class="preis" type="number" placeholder="Monatsmiete">

    <hr>
  `;

  draftPositionenListe.appendChild(div);
}

/* KUNDE SPEICHERN */

function kundeSpeichern() {

  if (!kundeName.value) {
    alert("Name fehlt");
    return;
  }

  let neuerKunde = {
    id: Date.now(),
    name: kundeName.value,
    telefon: kundeTelefon.value,
    email: kundeEmail.value,
    typ: kundeTyp.value
  };

  kunden.push(neuerKunde);

  let blocks = document.querySelectorAll(".item");

  blocks.forEach(b => {

    let kat = b.querySelector(".kat").value;
    let anzahl = Number(b.querySelector(".anzahl").value);
    let preis = Number(b.querySelector(".preis").value);

    if (kat && preis) {

      for (let i = 0; i < anzahl; i++) {

        positionen.push({
          id: Date.now() + Math.random(),
          kundeId: neuerKunde.id,
          kategorie: kat,
          preis: preis
        });

      }
    }

  });

  speichern();
  anzeigen();
  kundenFormSchliessen();
}

/* ANZEIGE */

function anzeigen() {

  kundenListe.innerHTML = kunden.map(k => {

    let pos = positionen.filter(p => p.kundeId === k.id);

    return `
      <div class="item">
        <b>${k.name}</b><br>
        ${k.telefon || ""}<br>

        ${pos.map(p => `
          <div>
            ${p.kategorie} - ${p.preis}€
          </div>
        `).join("")}

      </div>
    `;

  }).join("");
}

anzeigen();