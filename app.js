let kunden = JSON.parse(localStorage.getItem("mp_kunden")) || [];
let objekte = JSON.parse(localStorage.getItem("mp_objekte")) || [];
let zahlungen = JSON.parse(localStorage.getItem("mp_zahlungen")) || [];
let bearbeiteKundeId = null;

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

function seite(id, button) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  document.querySelectorAll("nav button").forEach(b => b.classList.remove("activeNav"));
  if (button) button.classList.add("activeNav");

  anzeigen();
}

function brutto(netto, mwst) {
  return Number(netto) + (Number(netto) * Number(mwst) / 100);
}

function aktuellerMonat() {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

function heuteTag() {
  return new Date().getDate();
}

function naechsteKundennummer() {
  if (!kunden.length) return 10001;

  const hoechste = Math.max(...kunden.map(k => Number(k.nummer || 10000)));
  return hoechste + 1;
}

function freieObjekte(kategorie) {
  return objekte.filter(o => o.kategorie === kategorie && o.status === "frei");
}

function belegteObjekte(kategorie) {
  return objekte.filter(o => o.kategorie === kategorie && o.status === "belegt");
}

function formularNeu() {
  bearbeiteKundeId = null;
  formularTitel.innerText = "Neuer Kunde";
  kundenFormular.classList.remove("hidden");

  kundeName.value = "";
  kundeEmail.value = "";
  kundeTelefon.value = "";
  nettoMiete.value = "";
  mwst.value = "19";
  mietArt.value = "Kaltmiete";
  mietbeginn.value = "";
  faelligkeit.value = "";
  kategorie.value = "Wohnung";
}

function formularSchliessen() {
  kundenFormular.classList.add("hidden");
  bearbeiteKundeId = null;
}

function kundeBearbeiten(id) {
  const k = kunden.find(x => x.id === id);
  if (!k) return;

  bearbeiteKundeId = id;
  formularTitel.innerText = "Kunde bearbeiten";
  kundenFormular.classList.remove("hidden");

  kundeName.value = k.name || "";
  kundeEmail.value = k.email || "";
  kundeTelefon.value = k.telefon || "";
  nettoMiete.value = k.netto || "";
  mwst.value = k.mwst || "19";
  mietArt.value = k.mietArt || "Kaltmiete";
  mietbeginn.value = k.mietbeginn || "";
  faelligkeit.value = k.faelligkeit || 3;
  kategorie.value = k.kategorie || "Wohnung";
}

function kundeSpeichern() {
  if (!kundeName.value || !nettoMiete.value) {
    alert("Bitte Name und Nettomiete eintragen");
    return;
  }

  const netto = Number(nettoMiete.value);
  const steuer = Number(mwst.value);
  const bruttoMiete = brutto(netto, steuer);

  if (bearbeiteKundeId) {
    const k = kunden.find(x => x.id === bearbeiteKundeId);
    if (!k) return;

    k.name = kundeName.value;
    k.email = kundeEmail.value;
    k.telefon = kundeTelefon.value;
    k.netto = netto;
    k.mwst = steuer;
    k.brutto = bruttoMiete;
    k.mietArt = mietArt.value;
    k.mietbeginn = mietbeginn.value;
    k.faelligkeit = faelligkeit.value || 3;

    speichern();
    anzeigen();
    formularSchliessen();
    alert("Kunde wurde aktualisiert");
    return;
  }

  const kat = kategorie.value;
  const frei = freieObjekte(kat);

  if (frei.length === 0) {
    alert("Alle " + kat + "-Objekte sind belegt. Bitte zuerst im Bereich Objekte neue hinzufügen.");
    return;
  }

  const objekt = frei[0];
  objekt.status = "belegt";

  kunden.push({
    id: Date.now(),
    nummer: naechsteKundennummer(),
    name: kundeName.value,
    email: kundeEmail.value,
    telefon: kundeTelefon.value,
    kategorie: kat,
    objektId: objekt.id,
    objektName: objekt.name,
    netto: netto,
    mwst: steuer,
    brutto: bruttoMiete,
    mietArt: mietArt.value,
    mietbeginn: mietbeginn.value,
    faelligkeit: faelligkeit.value || 3
  });

  speichern();
  anzeigen();
  formularSchliessen();
  alert("Kunde gespeichert und Objekt zugewiesen");
}

function objekteHinzufuegen() {
  const kat = objektKategorie.value;
  const anzahl = Number(objektAnzahl.value);

  if (!anzahl || anzahl < 1) {
    alert("Bitte Anzahl eintragen");
    return;
  }

  const vorhandene = objekte.filter(o => o.kategorie === kat).length;

  for (let i = 1; i <= anzahl; i++) {
    const nummer = vorhandene + i;

    objekte.push({
      id: Date.now() + Math.random(),
      kategorie: kat,
      name: kat + " " + nummer,
      nummer: nummer,
      status: "frei"
    });
  }

  objektAnzahl.value = "";
  speichern();
  anzeigen();
  alert(anzahl + " Objekt(e) hinzugefügt");
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
        kundennummer: k.nummer,
        objektName: k.objektName,
        monat: monat,
        netto: k.netto,
        mwst: k.mwst,
        brutto: k.brutto,
        faelligkeit: k.faelligkeit || 3,
        status: "offen",
        mahnstufe: 0
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

  if (z.status === "bezahlt") {
    z.mahnstufe = 0;
  }

  speichern();
  anzeigen();
}

function istMahnungFaellig(z) {
  if (z.status === "bezahlt") return false;
  return heuteTag() > Number(z.faelligkeit || 3);
}

function mahnungSetzen(id) {
  const z = zahlungen.find(x => x.id === id);
  if (!z) return;

  z.mahnstufe = 1;
  speichern();
  anzeigen();
}

function kundeLoeschen(id) {
  if (!confirm("Kunde wirklich löschen?")) return;

  const k = kunden.find(x => x.id === id);

  if (k && k.objektId) {
    const o = objekte.find(x => x.id === k.objektId);
    if (o) o.status = "frei";
  }

  kunden = kunden.filter(k => k.id !== id);
  zahlungen = zahlungen.filter(z => z.kundeId !== id);

  speichern();
  anzeigen();
}

function demoLaden() {
  objekte = [];
  kunden = [];
  zahlungen = [];

  ["Container", "Stellplatz", "Büro", "Lagerhalle", "Wohnung", "Fahrzeug"].forEach(kat => {
    for (let i = 1; i <= 3; i++) {
      objekte.push({
        id: Date.now() + Math.random(),
        kategorie: kat,
        name: kat + " " + i,
        nummer: i,
        status: "frei"
      });
    }
  });

  speichern();
  anzeigen();
  alert("Demo-Daten geladen. Jetzt kannst du Kunden anlegen.");
}

function allesLoeschen() {
  if (!confirm("Wirklich alle Daten löschen?")) return;

  kunden = [];
  objekte = [];
  zahlungen = [];
  bearbeiteKundeId = null;

  speichern();
  anzeigen();
}

function anzeigen() {
  const suche = (kundenSuche?.value || "").toLowerCase();
  const filter = kundenFilter?.value || "Alle";

  let kundenGefiltert = kunden.filter(k => {
    const text = `${k.name} ${k.nummer} ${k.objektName} ${k.kategorie}`.toLowerCase();
    const passtSuche = text.includes(suche);
    const passtFilter = filter === "Alle" || k.kategorie === filter;
    return passtSuche && passtFilter;
  });

  kundenListe.innerHTML = kundenGefiltert.length ? kundenGefiltert.map(k => `
    <div class="item">
      <b>${k.name}</b>
      <small>
        Kundennummer: ${k.nummer}<br>
        Objekt: ${k.objektName}<br>
        Kategorie: ${k.kategorie}<br>
        Netto: ${euro(k.netto)}<br>
        MwSt.: ${k.mwst}%<br>
        Brutto: ${euro(k.brutto)}<br>
        Mietbeginn: ${k.mietbeginn || "-"}<br>
        Fällig bis: ${k.faelligkeit}. des Monats<br>
        ${k.email || ""} ${k.telefon ? " · " + k.telefon : ""}
      </small>
      <div class="row">
        <button onclick="kundeBearbeiten(${k.id})">Bearbeiten</button>
        <button class="danger" onclick="kundeLoeschen(${k.id})">Löschen</button>
      </div>
    </div>
  `).join("") : "<p>Keine Kunden gefunden.</p>";

  const kategorien = ["Wohnung", "Fahrzeug", "Container", "Büro", "Lagerhalle", "Stellplatz", "Sonstiges"];

  objektListe.innerHTML = kategorien.map(kat => {
    const gesamt = objekte.filter(o => o.kategorie === kat).length;
    const frei = freieObjekte(kat).length;
    const belegt = belegteObjekte(kat).length;

    return `
      <div class="item">
        <b>${kat}</b>
        <small>
          Gesamt: ${gesamt}<br>
          Frei: ${frei}<br>
          Belegt: ${belegt}
        </small>
      </div>
    `;
  }).join("");

  dashObjekte.innerHTML = objektListe.innerHTML;

  const zahlFilter = zahlungsFilter?.value || "Alle";

  let zahlungenGefiltert = zahlungen.filter(z => {
    return zahlFilter === "Alle" || z.status === zahlFilter;
  });

  zahlungenListe.innerHTML = zahlungenGefiltert.length ? zahlungenGefiltert.map(z => {
    const mahnungFaellig = istMahnungFaellig(z);

    return `
      <div class="item ${z.status}">
        <b>${z.name}</b>
        <small>
          Kundennummer: ${z.kundennummer}<br>
          Objekt: ${z.objektName}<br>
          Monat: ${z.monat}<br>
          Netto: ${euro(z.netto)}<br>
          MwSt.: ${z.mwst}%<br>
          Brutto: ${euro(z.brutto)}<br>
          Fällig bis: ${z.faelligkeit}. des Monats
        </small>

        <div class="status">
          ${z.status === "bezahlt" ? "✅ BEZAHLT" : "❌ OFFEN"}
        </div>

        ${mahnungFaellig && z.mahnstufe === 0 ? `
          <div class="mahnung">⚠️ 1. Mahnung fällig</div>
          <button style="background:#f97316" onclick="mahnungSetzen(${z.id})">1. Mahnung markieren</button>
        ` : ""}

        ${z.mahnstufe === 1 ? `
          <div class="mahnungGesetzt">📩 1. Mahnung wurde gesetzt</div>
        ` : ""}

        <button style="background:${z.status === "offen" ? "#16a34a" : "#dc2626"}"
          onclick="zahlungToggle(${z.id})">
          ${z.status === "offen" ? "Als bezahlt markieren" : "Wieder auf offen setzen"}
        </button>
      </div>
    `;
  }).join("") : "<p>Noch keine Zahlungen vorhanden.</p>";

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