let kunden = JSON.parse(localStorage.getItem("kunden")) || [];
let objekte = JSON.parse(localStorage.getItem("objekte")) || [];
let zahlungen = JSON.parse(localStorage.getItem("zahlungen")) || [];

function speichern() {
  localStorage.setItem("kunden", JSON.stringify(kunden));
  localStorage.setItem("objekte", JSON.stringify(objekte));
  localStorage.setItem("zahlungen", JSON.stringify(zahlungen));
}

function anzeigen() {
  kundenListe.innerHTML = kunden.map((k, i) =>
    `<div class="item"><b>${k.name}</b><br>Miete: ${k.miete} € <button onclick="kundeLoeschen(${i})">Löschen</button></div>`
  ).join("");

  objektListe.innerHTML = objekte.map((o, i) =>
    `<div class="item"><b>${o.name}</b><br>Status: ${o.status} <button onclick="objektLoeschen(${i})">Löschen</button></div>`
  ).join("");

  zahlungenListe.innerHTML = zahlungen.map((z, i) =>
    `<div class="item ${z.status}">
      <b>${z.name}</b><br>
      Monat: ${z.monat}<br>
      Betrag: ${z.miete} €<br>
      Status: ${z.status}
      <br><button onclick="zahlungAendern(${i})">bezahlt/offen</button>
    </div>`
  ).join("");
}

function addKunde() {
  if (!name.value || !miete.value) {
    alert("Bitte Name und Miete eintragen");
    return;
  }

  kunden.push({
    name: name.value,
    miete: miete.value
  });

  name.value = "";
  miete.value = "";

  speichern();
  anzeigen();
}

function addObjekt() {
  if (!objekt.value) {
    alert("Bitte Objekt eintragen");
    return;
  }

  objekte.push({
    name: objekt.value,
    status: "frei"
  });

  objekt.value = "";

  speichern();
  anzeigen();
}

function monatStart() {
  const heute = new Date();
  const monat = (heute.getMonth() + 1) + "/" + heute.getFullYear();

  kunden.forEach(k => {
    zahlungen.push({
      name: k.name,
      miete: k.miete,
      monat: monat,
      status: "offen"
    });
  });

  speichern();
  anzeigen();
}

function zahlungAendern(i) {
  zahlungen[i].status = zahlungen[i].status === "offen" ? "bezahlt" : "offen";
  speichern();
  anzeigen();
}

function kundeLoeschen(i) {
  kunden.splice(i, 1);
  speichern();
  anzeigen();
}

function objektLoeschen(i) {
  objekte.splice(i, 1);
  speichern();
  anzeigen();
}

function demo() {
  kunden = [
    { name: "Max Mustermann", miete: "149" },
    { name: "Firma Schneider GmbH", miete: "220" }
  ];

  objekte = [
    { name: "Container 01", status: "vermietet" },
    { name: "Container 02", status: "frei" },
    { name: "Stellplatz A1", status: "vermietet" }
  ];

  zahlungen = [];

  speichern();
  anzeigen();
}

anzeigen();