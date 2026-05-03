let kunden = JSON.parse(localStorage.getItem("mp_kunden")) || [];
let objekte = JSON.parse(localStorage.getItem("mp_objekte")) || [];
let zahlungen = JSON.parse(localStorage.getItem("mp_zahlungen")) || [];

function euro(wert) {
  return Number(wert || 0).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR"
  });
}

function speichern() {
  localStorage.setItem("mp_kunden", JSON.stringify(kunden));
  localStorage.setItem("mp_objekte", JSON.stringify(objekte));
  localStorage.setItem("mp_zahlungen", JSON.stringify(zahlungen));
}

function seite(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  document.querySelectorAll("nav button").forEach(b => b.classList.remove("activeNav"));
  event.target.classList.add("activeNav");
}

function aktuellerMonat() {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

function brutto(netto, mwst) {
  return Number(netto) + (Number(netto) * Number(mwst) / 100);
}

function kundeAnlegen() {
  if (!kundeName.value || !nettoMiete.value) {
    alert("Bitte Name und Nettomiete eintragen");
    return;
  }

  const netto = Number(nettoMiete.value);
  const steuer = Number(mwst.value);
  const bruttoMiete = brutto(netto, steuer);

  kunden.push({
    id: Date.now(),
    name: kundeName.value,
    nummer: kundeNummer.value,
    email: kundeEmail.value,
    telefon: kundeTelefon.value,
    netto: netto,
    mwst: steuer,
    brutto: bruttoMiete,
    mietArt: mietArt.value,
    kategorie: kategorie.value
  });

  kundeName.value = "";
  kundeNummer.value = "";
  kundeEmail.value = "";
  kundeTelefon.value = "";
  nettoMiete.value = "";

  speichern();
  anzeigen();
  alert("Kunde gespeichert");
}

function objektAnlegen() {
  if (!objektName.value) {
    alert("Bitte Objektname eintragen");
    return;
  }

  objekte.push({
    id: Date.now(),
    name: objektName.value,
    typ: objektTyp.value,
    status: "frei"
  });

  objektName.value = "";

  speichern();
  anzeigen();
}

function monatErzeugen() {
  const monat = aktuellerMonat();

  kunden.forEach(k => {
    const vorhanden = zahlungen.some(z => z.kundeId === k.id && z.monat === monat);

    if (!vorhanden) {
      zahlungen.push({
        id: Date.now() + Math.random(),
        kundeId: k.id,
        name: k.name,
        monat: monat,
        netto: k.netto,
        mwst: k.mwst,
        brutto: k.brutto,
        status: "offen"
      });
    }
  });

  speichern();
  anzeigen();
  alert("Monatliche Zahlungen wurden erzeugt");
}

function zahlungToggle(id) {
  const z = zahlungen.find(x => x.id === id);
  if (!z) return;

  z.status = z.status === "offen" ? "bezahlt" : "offen";

  speichern();
  anzeigen();
}

function kundeLoeschen(id) {
  if (!confirm("Kunde wirklich löschen?")) return;

  kunden = kunden.filter(k => k.id !== id);
  zahlungen = zahlungen.filter(z => z.kundeId !== id);

  speichern();
  anzeigen();
}

function objektLoeschen(id) {
  if (!confirm("Objekt wirklich löschen?")) return;

  objekte = objekte.filter(o => o.id !== id);

  speichern();
  anzeigen();
}

function demoLaden() {
  kunden = [
    {
      id: 10001,
      name: "Max Mustermann",
      nummer: "10001",
      email: "max@example.de",
      telefon: "0170 123456",
      netto: 149,
      mwst: 19,
      brutto: 177.31,
      mietArt: "Kaltmiete",
      kategorie: "Container"
    },
    {
      id: 10002,
      name: "Firma Schneider GmbH",
      nummer: "10002",
      email: "info@schneider.de",
      telefon: "06051 12345",
      netto: 220,
      mwst: 19,
      brutto: 261.80,
      mietArt: "Kaltmiete",
      kategorie: "Lagerhalle"
    }
  ];

  objekte = [
    { id: 1, name: "Container 01", typ: "Container", status: "vermietet" },
    { id: 2, name: "Container 02", typ: "Container", status: "frei" },
    { id: 3, name: "Stellplatz A1", typ: "Stellplatz", status: "vermietet" }
  ];

  zahlungen = [];

  speichern();
  anzeigen();
}

function allesLoeschen() {
  if (!confirm("Wirklich alle Daten löschen?")) return;

  kunden = [];
  objekte = [];
  zahlungen = [];

  speichern();
  anzeigen();
}

function anzeigen() {
  kundenListe.innerHTML = kunden.length ? kunden.map(k => `
    <div class="item">
      <b>${k.name}</b>
      <small>
        Kundennummer: ${k.nummer || "-"}<br>
        Kategorie: ${k.kategorie}<br>
        Mietart: ${k.mietArt}<br>
        Netto: ${euro(k.netto)}<br>
        MwSt.: ${k.mwst}%<br>
        Brutto: ${euro(k.brutto)}<br>
        ${k.email || ""} ${k.telefon ? " · " + k.telefon : ""}
      </small>
      <button class="danger" onclick="kundeLoeschen(${k.id})">Kunde löschen</button>
    </div>
  `).join("") : "<p>Keine Kunden angelegt.</p>";

  objektListe.innerHTML = objekte.length ? objekte.map(o => `
    <div class="item">
      <b>${o.name}</b>
      <small>
        Typ: ${o.typ}<br>
        Status: ${o.status}
      </small>
      <button class="danger" onclick="objektLoeschen(${o.id})">Objekt löschen</button>
    </div>
  `).join("") : "<p>Keine Objekte angelegt.</p>";

  zahlungenListe.innerHTML = zahlungen.length ? zahlungen.map(z => `
    <div class="item ${z.status}">
      <b>${z.name}</b>
      <small>
        Monat: ${z.monat}<br>
        Netto: ${euro(z.netto)}<br>
        MwSt.: ${z.mwst}%<br>
        Brutto: ${euro(z.brutto)}<br>
        Status: ${z.status}
      </small>
      <button onclick="zahlungToggle(${z.id})">
        ${z.status === "offen" ? "Als bezahlt markieren" : "Auf offen setzen"}
      </button>
    </div>
  `).join("") : "<p>Noch keine Zahlungen erzeugt.</p>";

  const nettoGesamt = kunden.reduce((s, k) => s + Number(k.netto || 0), 0);
  const offen = zahlungen
    .filter(z => z.status === "offen")
    .reduce((s, z) => s + Number(z.brutto || 0), 0);
  const bezahlt = zahlungen
    .filter(z => z.status === "bezahlt")
    .reduce((s, z) => s + Number(z.brutto || 0), 0);

  dashKunden.innerText = kunden.length;
  dashNetto.innerText = euro(nettoGesamt);
  dashOffen.innerText = euro(offen);
  dashBezahlt.innerText = euro(bezahlt);
}

anzeigen();