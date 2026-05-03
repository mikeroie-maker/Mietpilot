let kunden = JSON.parse(localStorage.getItem("mp_kunden")) || [];
let objekte = JSON.parse(localStorage.getItem("mp_objekte")) || [];
let zahlungen = JSON.parse(localStorage.getItem("mp_zahlungen")) || [];

let bearbeiteKundeId = null;
let aktiverKundeId = null;
let aktiveKategorie = null;

const kategorien = ["Wohnung", "Fahrzeug", "Container", "Büro", "Lagerhalle", "Stellplatz", "Sonstiges"];

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

function aktuellerMonat() {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

function heuteTag() {
  return new Date().getDate();
}

function brutto(netto, mwst) {
  return Number(netto || 0) + (Number(netto || 0) * Number(mwst || 0) / 100);
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

function mietfelderAnpassen() {
  const kat = kategorie.value;

  if (kat === "Wohnung") {
    mietfelder.innerHTML = `
      <h3>Wohnungsmiete</h3>
      <input id="grundmiete" type="number" placeholder="Kaltmiete in €">
      <input id="nebenkosten" type="number" placeholder="Nebenkosten-Vorauszahlung in €">
      <input id="heizkosten" type="number" placeholder="Heizkosten-Vorauszahlung in €">
      <p class="hint">Warmmiete = Kaltmiete + Nebenkosten + Heizkosten</p>
    `;
    mwst.value = "0";
  } else if (kat === "Fahrzeug") {
    mietfelder.innerHTML = `
      <h3>Fahrzeugmiete</h3>
      <input id="grundmiete" type="number" placeholder="Monatliche Fahrzeugmiete in €">
      <input id="nebenkosten" type="number" placeholder="Versicherung / Zusatzkosten in €">
      <input id="heizkosten" type="number" placeholder="Wartung / Reifen / Steuer in €">
      <p class="hint">Gesamt = Fahrzeugmiete + Zusatzkosten</p>
    `;
  } else if (kat === "Büro" || kat === "Lagerhalle") {
    mietfelder.innerHTML = `
      <h3>Gewerbemiete</h3>
      <input id="grundmiete" type="number" placeholder="Grundmiete netto in €">
      <input id="nebenkosten" type="number" placeholder="Nebenkosten / Betriebskosten netto in €">
      <input id="heizkosten" type="number" placeholder="Strom / Heizung / Zusatzkosten netto in €">
      <p class="hint">Gesamt netto = Grundmiete + Nebenkosten + Zusatzkosten</p>
    `;
  } else {
    mietfelder.innerHTML = `
      <h3>Miete</h3>
      <input id="grundmiete" type="number" placeholder="Monatsmiete netto in €">
      <input id="nebenkosten" type="number" placeholder="Zusatzkosten optional in €">
      <input id="heizkosten" type="number" placeholder="Weitere Kosten optional in €">
      <p class="hint">Bei Container/Stellplatz normalerweise nur Monatsmiete eintragen.</p>
    `;
  }
}

function berechneMiete() {
  const grund = Number(document.getElementById("grundmiete")?.value || 0);
  const nk = Number(document.getElementById("nebenkosten")?.value || 0);
  const hk = Number(document.getElementById("heizkosten")?.value || 0);
  const netto = grund + nk + hk;
  const steuer = Number(mwst.value || 0);

  return {
    grundmiete: grund,
    nebenkosten: nk,
    heizkosten: hk,
    netto: netto,
    mwst: steuer,
    brutto: brutto(netto, steuer)
  };
}

function formularNeu() {
  bearbeiteKundeId = null;
  formularTitel.innerText = "Neuer Kunde";
  kundenFormular.classList.remove("hidden");

  kundeName.value = "";
  kundeEmail.value = "";
  kundeTelefon.value = "";
  kategorie.value = "Wohnung";
  mwst.value = "0";
  mietbeginn.value = "";
  faelligkeit.value = "";
  kaution.value = "";
  kautionBezahlt.value = "nein";

  mietfelderAnpassen();
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
  kategorie.value = k.kategorie || "Wohnung";
  mwst.value = k.mwst || "0";
  mietbeginn.value = k.mietbeginn || "";
  faelligkeit.value = k.faelligkeit || 3;
  kaution.value = k.kaution || "";
  kautionBezahlt.value = k.kautionBezahlt || "nein";

  mietfelderAnpassen();

  setTimeout(() => {
    if (document.getElementById("grundmiete")) grundmiete.value = k.grundmiete || "";
    if (document.getElementById("nebenkosten")) nebenkosten.value = k.nebenkosten || "";
    if (document.getElementById("heizkosten")) heizkosten.value = k.heizkosten || "";
  }, 10);
}

function kundeSpeichern() {
  if (!kundeName.value) {
    alert("Bitte Name eintragen");
    return;
  }

  const miete = berechneMiete();

  if (!miete.netto || miete.netto <= 0) {
    alert("Bitte Miete eintragen");
    return;
  }

  if (bearbeiteKundeId) {
    const k = kunden.find(x => x.id === bearbeiteKundeId);
    if (!k) return;

    k.name = kundeName.value;
    k.email = kundeEmail.value;
    k.telefon = kundeTelefon.value;
    k.grundmiete = miete.grundmiete;
    k.nebenkosten = miete.nebenkosten;
    k.heizkosten = miete.heizkosten;
    k.netto = miete.netto;
    k.mwst = miete.mwst;
    k.brutto = miete.brutto;
    k.mietbeginn = mietbeginn.value;
    k.faelligkeit = faelligkeit.value || 3;
    k.kaution = Number(kaution.value || 0);
    k.kautionBezahlt = kautionBezahlt.value;

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
    grundmiete: miete.grundmiete,
    nebenkosten: miete.nebenkosten,
    heizkosten: miete.heizkosten,
    netto: miete.netto,
    mwst: miete.mwst,
    brutto: miete.brutto,
    mietbeginn: mietbeginn.value,
    faelligkeit: faelligkeit.value || 3,
    kaution: Number(kaution.value || 0),
    kautionBezahlt: kautionBezahlt.value
  });

  speichern();
  anzeigen();
  formularSchliessen();
  alert("Kunde gespeichert und Objekt zugewiesen");
}

function bestandSetzen(kategorieName) {
  const feld = document.getElementById("bestand_" + kategorieName);
  const ziel = Number(feld.value);

  if (ziel < 0 || isNaN(ziel)) {
    alert("Bitte gültige Anzahl eintragen");
    return;
  }

  const gesamt = objekte.filter(o => o.kategorie === kategorieName).length;
  const belegt = belegteObjekte(kategorieName).length;

  if (ziel < belegt) {
    alert("Nicht möglich. " + belegt + " " + kategorieName + "-Objekte sind aktuell vermietet.");
    return;
  }

  if (ziel > gesamt) {
    for (let i = gesamt + 1; i <= ziel; i++) {
      objekte.push({
        id: Date.now() + Math.random(),
        kategorie: kategorieName,
        name: kategorieName + " " + i,
        nummer: i,
        status: "frei"
      });
    }
  }

  if (ziel < gesamt) {
    const zuLoeschen = gesamt - ziel;
    let freie = objekte
      .filter(o => o.kategorie === kategorieName && o.status === "frei")
      .sort((a, b) => b.nummer - a.nummer)
      .slice(0, zuLoeschen)
      .map(o => o.id);

    objekte = objekte.filter(o => !freie.includes(o.id));
  }

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
        kundennummer: k.nummer,
        objektName: k.objektName,
        kategorie: k.kategorie,
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
  if (z.status === "bezahlt") z.mahnstufe = 0;

  speichern();
  anzeigen();

  if (aktiverKundeId) kundeOeffnen(aktiverKundeId);
  if (aktiveKategorie) kategorieOeffnen(aktiveKategorie);
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

  if (aktiverKundeId) kundeOeffnen(aktiverKundeId);
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
  seite("kunden");
}

function kundeOeffnen(id) {
  aktiverKundeId = id;
  const k = kunden.find(x => x.id === id);
  if (!k) return;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  kundeDetail.classList.add("active");

  const kundeZahlungen = zahlungen.filter(z => z.kundeId === id);

  kundeDetailInhalt.innerHTML = `
    <h2>${k.name}</h2>

    <div class="item">
      <b>Kundendaten</b>
      <small>
        Kundennummer: ${k.nummer}<br>
        Objekt: ${k.objektName}<br>
        Kategorie: ${k.kategorie}<br>
        Mietbeginn: ${k.mietbeginn || "-"}<br>
        Fällig bis: ${k.faelligkeit}. des Monats<br>
        Telefon: ${k.telefon || "-"}<br>
        E-Mail: ${k.email || "-"}
      </small>
    </div>

    <div class="item">
      <b>Miete</b>
      <small>
        Grundmiete: ${euro(k.grundmiete)}<br>
        Nebenkosten/Zusatzkosten: ${euro(k.nebenkosten)}<br>
        Weitere Kosten: ${euro(k.heizkosten)}<br>
        Netto gesamt: ${euro(k.netto)}<br>
        MwSt.: ${k.mwst}%<br>
        Brutto gesamt: ${euro(k.brutto)}
      </small>
    </div>

    <div class="item ${k.kautionBezahlt === "ja" ? "bezahlt" : "offen"}">
      <b>Kaution</b>
      <small>
        Betrag: ${euro(k.kaution)}<br>
        Status: ${k.kautionBezahlt === "ja" ? "bezahlt" : "offen"}
      </small>
    </div>

    <button onclick="kundeBearbeiten(${k.id}); seite('kunden')">Bearbeiten</button>
    <button class="danger" onclick="kundeLoeschen(${k.id})">Kunde löschen</button>

    <h3>Zahlungen dieses Kunden</h3>
    ${
      kundeZahlungen.length
      ? kundeZahlungen.map(z => zahlungHtml(z)).join("")
      : "<p>Noch keine Zahlungen vorhanden.</p>"
    }
  `;
}

function kategorieOeffnen(kategorieName) {
  aktiveKategorie = kategorieName;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  kategorieDetail.classList.add("active");

  const katKunden = kunden.filter(k => k.kategorie === kategorieName);
  const katObjekte = objekte.filter(o => o.kategorie === kategorieName);
  const katZahlungen = zahlungen.filter(z => z.kategorie === kategorieName);

  const gesamt = katObjekte.length;
  const belegt = katObjekte.filter(o => o.status === "belegt").length;
  const frei = katObjekte.filter(o => o.status === "frei").length;
  const netto = katKunden.reduce((s, k) => s + Number(k.netto || 0), 0);
  const brutto = katKunden.reduce((s, k) => s + Number(k.brutto || 0), 0);
  const offen = katZahlungen.filter(z => z.status === "offen").reduce((s, z) => s + Number(z.brutto || 0), 0);
  const bezahlt = katZahlungen.filter(z => z.status === "bezahlt").reduce((s, z) => s + Number(z.brutto || 0), 0);

  kategorieDetailInhalt.innerHTML = `
    <h2>${kategorieName}</h2>

    <div class="summary">
      <div><span>Gesamt</span><b>${gesamt}</b></div>
      <div><span>Belegt</span><b>${belegt}</b></div>
      <div><span>Frei</span><b>${frei}</b></div>
      <div><span>Mieter</span><b>${katKunden.length}</b></div>
      <div><span>Monat netto</span><b>${euro(netto)}</b></div>
      <div><span>Monat brutto</span><b>${euro(brutto)}</b></div>
      <div><span>Offen</span><b>${euro(offen)}</b></div>
      <div><span>Bezahlt</span><b>${euro(bezahlt)}</b></div>
    </div>

    <h3>Mieter in ${kategorieName}</h3>

    ${
      katKunden.length
      ? katKunden.map(k => `
        <div class="item clickable" onclick="kundeOeffnen(${k.id})">
          <b>${k.name}</b>
          <small>
            Kundennummer: ${k.nummer}<br>
            Objekt: ${k.objektName}<br>
            Netto: ${euro(k.netto)}<br>
            Brutto: ${euro(k.brutto)}
          </small>
        </div>
      `).join("")
      : "<p>Keine Mieter in dieser Rubrik.</p>"
    }
  `;
}

function zahlungHtml(z) {
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
        <button class="orange" onclick="mahnungSetzen(${z.id})">1. Mahnung markieren</button>
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
}

function demoLaden() {
  objekte = [];
  kunden = [];
  zahlungen = [];
  bearbeiteKundeId = null;

  kategorien.forEach(kat => {
    const anzahl = kat === "Container" ? 10 : 3;

    for (let i = 1; i <= anzahl; i++) {
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
  alert("Demo-Bestand geladen. Jetzt kannst du Kunden anlegen.");
}

function allesLoeschen() {
  if (!confirm("Wirklich alle Daten löschen?")) return;

  kunden = [];
  objekte = [];
  zahlungen = [];
  bearbeiteKundeId = null;
  aktiverKundeId = null;
  aktiveKategorie = null;

  speichern();
  anzeigen();
}

function anzeigen() {
  mietfelderAnpassen();

  const suche = (kundenSuche?.value || "").toLowerCase();
  const filter = kundenFilter?.value || "Alle";

  let kundenGefiltert = kunden.filter(k => {
    const text = `${k.name} ${k.nummer} ${k.objektName} ${k.kategorie}`.toLowerCase();
    const passtSuche = text.includes(suche);
    const passtFilter = filter === "Alle" || k.kategorie === filter;
    return passtSuche && passtFilter;
  });

  kundenListe.innerHTML = kundenGefiltert.length ? kundenGefiltert.map(k => `
    <div class="item clickable" onclick="kundeOeffnen(${k.id})">
      <b>${k.name}</b>
      <small>
        Kundennummer: ${k.nummer}<br>
        Objekt: ${k.objektName}<br>
        Kategorie: ${k.kategorie}<br>
        Netto: ${euro(k.netto)}<br>
        Brutto: ${euro(k.brutto)}<br>
        Kaution: ${euro(k.kaution)} (${k.kautionBezahlt === "ja" ? "bezahlt" : "offen"})
      </small>
      <div class="row">
        <button onclick="event.stopPropagation(); kundeBearbeiten(${k.id})">Bearbeiten</button>
        <button class="danger" onclick="event.stopPropagation(); kundeLoeschen(${k.id})">Löschen</button>
      </div>
    </div>
  `).join("") : "<p>Keine Kunden gefunden.</p>";

  objektBestandBearbeiten.innerHTML = kategorien.map(kat => {
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
        <input id="bestand_${kat}" type="number" value="${gesamt}">
        <button onclick="bestandSetzen('${kat}')">Bestand speichern</button>
      </div>
    `;
  }).join("");

  dashObjekte.innerHTML = kategorien.map(kat => {
    const gesamt = objekte.filter(o => o.kategorie === kat).length;
    const frei = freieObjekte(kat).length;
    const belegt = belegteObjekte(kat).length;
    const katKunden = kunden.filter(k => k.kategorie === kat);
    const netto = katKunden.reduce((s, k) => s + Number(k.netto || 0), 0);

    return `
      <div class="item clickable" onclick="kategorieOeffnen('${kat}')">
        <b>${kat}</b>
        <small>
          Gesamt: ${gesamt}<br>
          Frei: ${frei}<br>
          Belegt: ${belegt}<br>
          Mieter: ${katKunden.length}<br>
          Monatsmiete netto: ${euro(netto)}
        </small>
      </div>
    `;
  }).join("");

  const zahlFilter = zahlungsFilter?.value || "Alle";

  let zahlungenGefiltert = zahlungen.filter(z => {
    return zahlFilter === "Alle" || z.status === zahlFilter;
  });

  zahlungenListe.innerHTML = zahlungenGefiltert.length
    ? zahlungenGefiltert.map(z => zahlungHtml(z)).join("")
    : "<p>Noch keine Zahlungen vorhanden.</p>";

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