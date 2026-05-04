let kunden = JSON.parse(localStorage.getItem("mp8_kunden")) || [];
let standorte = JSON.parse(localStorage.getItem("mp8_standorte")) || [];
let objekte = JSON.parse(localStorage.getItem("mp8_objekte")) || [];
let positionen = JSON.parse(localStorage.getItem("mp8_positionen")) || [];
let zahlungen = JSON.parse(localStorage.getItem("mp8_zahlungen")) || [];

let bearbeiteKundeId = null;
let aktiverKundeId = null;
let bearbeitePositionId = null;
let ausgewaehlterStandortId = null;

const kategorien = ["Wohnung", "Fahrzeug", "Container", "Büro", "Lagerhalle", "Stellplatz", "Sonstiges"];

function euro(wert) {
  return Number(wert || 0).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR"
  });
}

function speichern() {
  localStorage.setItem("mp8_kunden", JSON.stringify(kunden));
  localStorage.setItem("mp8_standorte", JSON.stringify(standorte));
  localStorage.setItem("mp8_objekte", JSON.stringify(objekte));
  localStorage.setItem("mp8_positionen", JSON.stringify(positionen));
  localStorage.setItem("mp8_zahlungen", JSON.stringify(zahlungen));
}

function seite(id, button) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("activeNav"));
  if (button) button.classList.add("activeNav");
  anzeigen();
}

function aktuellerMonatText() {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

function heuteISO() {
  return new Date().toISOString().slice(0, 10);
}

function heuteTag() {
  return new Date().getDate();
}

function bruttoAusNetto(netto, mwst) {
  return Number(netto || 0) + (Number(netto || 0) * Number(mwst || 0) / 100);
}

function nettoAusBrutto(brutto, mwst) {
  if (Number(mwst) === 0) return Number(brutto || 0);
  return Number(brutto || 0) / (1 + Number(mwst || 0) / 100);
}

function kunde(id) { return kunden.find(k => k.id === id); }
function standort(id) { return standorte.find(s => s.id === id); }
function objekt(id) { return objekte.find(o => o.id === id); }
function position(id) { return positionen.find(p => p.id === id); }

function kundePositionen(kundeId) {
  return positionen.filter(p => p.kundeId === kundeId);
}

function aktivePositionen() {
  return positionen.filter(p => p.status !== "abgeschlossen" && p.status !== "archiv");
}

function naechsteKundennummer() {
  if (!kunden.length) return 10001;
  return Math.max(...kunden.map(k => Number(k.nummer || 10000))) + 1;
}

function freieObjekte(kategorie, standortId) {
  return objekte.filter(o => o.kategorie === kategorie && o.standortId === standortId && o.status === "frei");
}

function belegteObjekte(kategorie, standortId) {
  return objekte.filter(o => o.kategorie === kategorie && o.standortId === standortId && o.status === "belegt");
}

function berechnePositionBetrag(kundentyp, grund, nk, hk, mwst) {
  const eingabe = Number(grund || 0) + Number(nk || 0) + Number(hk || 0);
  const steuer = Number(mwst || 0);

  if (kundentyp === "privat") {
    const brutto = eingabe;
    const netto = nettoAusBrutto(brutto, steuer);
    return { netto, brutto, mwst: steuer, mwstBetrag: brutto - netto };
  }

  const netto = eingabe;
  const brutto = bruttoAusNetto(netto, steuer);
  return { netto, brutto, mwst: steuer, mwstBetrag: brutto - netto };
}

function summeKunde(kundeId) {
  const ps = kundePositionen(kundeId).filter(p => p.status !== "abgeschlossen" && p.status !== "archiv");
  return {
    netto: ps.reduce((s, p) => s + Number(p.netto || 0), 0),
    brutto: ps.reduce((s, p) => s + Number(p.brutto || 0), 0),
    mwst: ps.reduce((s, p) => s + Number(p.mwstBetrag || 0), 0)
  };
}

function offeneZahlungenKunde(kundeId) {
  return zahlungen.filter(z => z.kundeId === kundeId && z.status === "offen");
}

function summeOffenKunde(kundeId) {
  return offeneZahlungenKunde(kundeId).reduce((s, z) => s + Number(z.brutto || 0), 0);
}

function mietfelderAnpassen() {
  const kat = posKategorie.value;

  if (kat === "Wohnung") {
    mietfelder.innerHTML = `
      <h3>Wohnungsmiete</h3>
      <input id="grundmiete" type="number" placeholder="Kaltmiete">
      <input id="nebenkosten" type="number" placeholder="Nebenkosten">
      <input id="heizkosten" type="number" placeholder="Heizkosten">
      <p class="hint">Privat = Eingabe brutto. Gewerbe = Eingabe netto.</p>
    `;
    posMwst.value = "0";
  } else if (kat === "Fahrzeug") {
    mietfelder.innerHTML = `
      <h3>Fahrzeugmiete</h3>
      <input id="grundmiete" type="number" placeholder="Fahrzeugmiete">
      <input id="nebenkosten" type="number" placeholder="Versicherung / Zusatzkosten">
      <input id="heizkosten" type="number" placeholder="Wartung / Reifen / Steuer">
    `;
  } else if (kat === "Büro" || kat === "Lagerhalle") {
    mietfelder.innerHTML = `
      <h3>Gewerbemiete</h3>
      <input id="grundmiete" type="number" placeholder="Grundmiete">
      <input id="nebenkosten" type="number" placeholder="Nebenkosten / Betriebskosten">
      <input id="heizkosten" type="number" placeholder="Strom / Heizung / Zusatzkosten">
    `;
  } else {
    mietfelder.innerHTML = `
      <h3>Miete</h3>
      <input id="grundmiete" type="number" placeholder="Monatsmiete">
      <input id="nebenkosten" type="number" placeholder="Zusatzkosten optional">
      <input id="heizkosten" type="number" placeholder="Weitere Kosten optional">
    `;
  }
}

function neuerKunde() {
  bearbeiteKundeId = null;
  kundenFormTitel.innerText = "Neuer Kunde";
  kundenForm.classList.remove("hidden");

  kundeName.value = "";
  kundeEmail.value = "";
  kundeTelefon.value = "";
  kundeTyp.value = "privat";
  kontoinhaber.value = "";
  iban.value = "";
  bic.value = "";
  bankname.value = "";
  kundeNotizen.value = "";
}

function kundenFormSchliessen() {
  kundenForm.classList.add("hidden");
  bearbeiteKundeId = null;
}

function kundeBearbeiten(id) {
  const k = kunde(id);
  if (!k) return;

  bearbeiteKundeId = id;
  kundenFormTitel.innerText = "Kunde bearbeiten";
  kundenForm.classList.remove("hidden");

  kundeName.value = k.name || "";
  kundeEmail.value = k.email || "";
  kundeTelefon.value = k.telefon || "";
  kundeTyp.value = k.typ || "privat";
  kontoinhaber.value = k.kontoinhaber || "";
  iban.value = k.iban || "";
  bic.value = k.bic || "";
  bankname.value = k.bankname || "";
  kundeNotizen.value = k.notizen || "";
}

function kundeSpeichern() {
  if (!kundeName.value) {
    alert("Bitte Name eintragen");
    return;
  }

  if (bearbeiteKundeId) {
    const k = kunde(bearbeiteKundeId);
    k.name = kundeName.value;
    k.email = kundeEmail.value;
    k.telefon = kundeTelefon.value;
    k.typ = kundeTyp.value;
    k.kontoinhaber = kontoinhaber.value;
    k.iban = iban.value;
    k.bic = bic.value;
    k.bankname = bankname.value;
    k.notizen = kundeNotizen.value;

    speichern();
    anzeigen();
    kundenFormSchliessen();
    alert("Kunde aktualisiert");
    return;
  }

  kunden.push({
    id: Date.now(),
    nummer: naechsteKundennummer(),
    name: kundeName.value,
    email: kundeEmail.value,
    telefon: kundeTelefon.value,
    typ: kundeTyp.value,
    kontoinhaber: kontoinhaber.value,
    iban: iban.value,
    bic: bic.value,
    bankname: bankname.value,
    notizen: kundeNotizen.value,
    status: "aktiv"
  });

  speichern();
  anzeigen();
  kundenFormSchliessen();
  alert("Kunde gespeichert");
}

function positionNeu(kundeId) {
  aktiverKundeId = kundeId;
  bearbeitePositionId = null;
  ausgewaehlterStandortId = null;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  positionFormPage.classList.add("active");

  positionFormTitel.innerText = "Mietposition hinzufügen";

  posKategorie.value = "Container";
  posMwst.value = "19";
  posMietbeginn.value = "";
  posFaelligkeit.value = "";
  posKaution.value = "";
  posKautionBezahlt.value = "nein";
  posKautionZahlungsart.value = "";
  posKautionDatum.value = "";
  posKautionStatus.value = "offen";
  posKautionGeklaert.value = "nein";
  posStatus.value = "aktiv";
  posKuendigungsdatum.value = "";
  posVertragsende.value = "";
  posObjektZurueck.value = "nein";
  posNotizen.value = "";

  mietfelderAnpassen();
  verfuegbarkeitAnzeigen();
}

function positionBearbeiten(id) {
  const p = position(id);
  if (!p) return;

  aktiverKundeId = p.kundeId;
  bearbeitePositionId = id;
  ausgewaehlterStandortId = p.standortId;

  document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
  positionFormPage.classList.add("active");

  positionFormTitel.innerText = "Mietposition bearbeiten";

  posKategorie.value = p.kategorie;
  posMwst.value = p.mwst;
  posMietbeginn.value = p.mietbeginn || "";
  posFaelligkeit.value = p.faelligkeit || 3;
  posKaution.value = p.kaution || "";
  posKautionBezahlt.value = p.kautionBezahlt || "nein";
  posKautionZahlungsart.value = p.kautionZahlungsart || "";
  posKautionDatum.value = p.kautionDatum || "";
  posKautionStatus.value = p.kautionStatus || "offen";
  posKautionGeklaert.value = p.kautionGeklaert || "nein";
  posStatus.value = p.status || "aktiv";
  posKuendigungsdatum.value = p.kuendigungsdatum || "";
  posVertragsende.value = p.vertragsende || "";
  posObjektZurueck.value = p.objektZurueck || "nein";
  posNotizen.value = p.notizen || "";

  mietfelderAnpassen();

  setTimeout(() => {
    grundmiete.value = p.grundmiete || "";
    nebenkosten.value = p.nebenkosten || "";
    heizkosten.value = p.heizkosten || "";
    verfuegbarkeitAnzeigen();
  }, 10);
}

function verfuegbarkeitAnzeigen() {
  if (!document.getElementById("verfuegbarkeitListe")) return;

  const kat = posKategorie.value;

  if (!standorte.length) {
    verfuegbarkeitListe.innerHTML = `<div class="warnung">Noch keine Standorte vorhanden.</div>`;
    return;
  }

  verfuegbarkeitListe.innerHTML = standorte.map(s => {
    const gesamt = objekte.filter(o => o.standortId === s.id && o.kategorie === kat).length;
    const frei = freieObjekte(kat, s.id).length;
    const belegt = belegteObjekte(kat, s.id).length;
    const selected = ausgewaehlterStandortId === s.id ? "selected" : "";

    return `
      <div class="item clickable ${frei > 0 || ausgewaehlterStandortId === s.id ? "frei" : "belegt"} ${selected}"
        onclick="standortAuswaehlen(${s.id})">
        <b>${s.name}</b>
        <small>${s.strasse || ""}, ${s.ort || ""}<br>
        ${kat}: Gesamt ${gesamt}, Frei ${frei}, Belegt ${belegt}</small>
        ${frei > 0 ? `<div class="ok">✅ verfügbar</div>` : `<div class="warnung">❌ nichts frei</div>`}
      </div>
    `;
  }).join("");
}

function standortAuswaehlen(id) {
  const kat = posKategorie.value;

  if (!bearbeitePositionId && freieObjekte(kat, id).length <= 0) {
    alert("An diesem Standort ist nichts frei.");
    return;
  }

  ausgewaehlterStandortId = id;
  verfuegbarkeitAnzeigen();
}

function positionSpeichern() {
  const k = kunde(aktiverKundeId);
  if (!k) return;

  const grund = Number(grundmiete?.value || 0);
  const nk = Number(nebenkosten?.value || 0);
  const hk = Number(heizkosten?.value || 0);
  const betrag = berechnePositionBetrag(k.typ, grund, nk, hk, Number(posMwst.value));
  const kat = posKategorie.value;

  if (betrag.brutto <= 0) {
    alert("Bitte Miete eintragen.");
    return;
  }

  if (bearbeitePositionId) {
    const p = position(bearbeitePositionId);

    p.grundmiete = grund;
    p.nebenkosten = nk;
    p.heizkosten = hk;
    p.netto = betrag.netto;
    p.mwst = betrag.mwst;
    p.mwstBetrag = betrag.mwstBetrag;
    p.brutto = betrag.brutto;
    p.mietbeginn = posMietbeginn.value;
    p.faelligkeit = posFaelligkeit.value || 3;
    p.kaution = Number(posKaution.value || 0);
    p.kautionBezahlt = posKautionBezahlt.value;
    p.kautionZahlungsart = posKautionZahlungsart.value;
    p.kautionDatum = posKautionDatum.value;
    p.kautionStatus = posKautionStatus.value;
    p.kautionGeklaert = posKautionGeklaert.value;
    p.status = posStatus.value;
    p.kuendigungsdatum = posKuendigungsdatum.value;
    p.vertragsende = posVertragsende.value;
    p.objektZurueck = posObjektZurueck.value;
    p.notizen = posNotizen.value;

    if ((p.status === "beendet" || p.status === "abgeschlossen") && p.objektZurueck === "ja") {
      const o = objekt(p.objektId);
      if (o) o.status = "frei";
    }

    speichern();
    kundeOeffnen(aktiverKundeId);
    return;
  }

  if (!ausgewaehlterStandortId) {
    alert("Bitte Standort auswählen.");
    return;
  }

  const freie = freieObjekte(kat, ausgewaehlterStandortId);

  if (!freie.length) {
    alert("Kein freies Objekt verfügbar.");
    return;
  }

  const o = freie[0];
  o.status = "belegt";

  const s = standort(ausgewaehlterStandortId);

  positionen.push({
    id: Date.now() + Math.random(),
    kundeId: aktiverKundeId,
    standortId: ausgewaehlterStandortId,
    standortName: s ? s.name : "-",
    objektId: o.id,
    objektName: o.name,
    kategorie: kat,
    grundmiete: grund,
    nebenkosten: nk,
    heizkosten: hk,
    netto: betrag.netto,
    mwst: betrag.mwst,
    mwstBetrag: betrag.mwstBetrag,
    brutto: betrag.brutto,
    mietbeginn: posMietbeginn.value,
    faelligkeit: posFaelligkeit.value || 3,
    kaution: Number(posKaution.value || 0),
    kautionBezahlt: posKautionBezahlt.value,
    kautionZahlungsart: posKautionZahlungsart.value,
    kautionDatum: posKautionDatum.value,
    kautionStatus: posKautionStatus.value,
    kautionGeklaert: posKautionGeklaert.value,
    status: "aktiv",
    kuendigungsdatum: "",
    vertragsende: "",
    objektZurueck: "nein",
    notizen: posNotizen.value
  });

  speichern();
  kundeOeffnen(aktiverKundeId);
}

function positionLoeschen(id) {
  if (!confirm("Mietposition archivieren? Sie wird nicht gelöscht.")) return;

  const p = position(id);
  if (!p) return;

  p.status = "archiv";

  const o = objekt(p.objektId);
  if (o) o.status = "frei";

  speichern();
  kundeOeffnen(aktiverKundeId);
}

function standortAnlegen() {
  if (!standortName.value || !standortOrt.value) {
    alert("Bitte Name und Ort eintragen.");
    return;
  }

  standorte.push({
    id: Date.now(),
    name: standortName.value,
    strasse: standortStrasse.value,
    ort: standortOrt.value
  });

  standortName.value = "";
  standortStrasse.value = "";
  standortOrt.value = "";

  speichern();
  anzeigen();
}

function bestandSetzen(standortId, kat) {
  const feld = document.getElementById("bestand_" + standortId + "_" + kat);
  const ziel = Number(feld.value);

  const amStandort = objekte.filter(o => o.standortId === standortId && o.kategorie === kat);
  const gesamt = amStandort.length;
  const belegt = amStandort.filter(o => o.status === "belegt").length;

  if (ziel < belegt) {
    alert("Nicht möglich. Es sind " + belegt + " belegt.");
    return;
  }

  if (ziel > gesamt) {
    for (let i = gesamt + 1; i <= ziel; i++) {
      objekte.push({
        id: Date.now() + Math.random(),
        standortId: standortId,
        kategorie: kat,
        name: kat + " " + i,
        nummer: i,
        status: "frei"
      });
    }
  }

  if (ziel < gesamt) {
    const freie = objekte
      .filter(o => o.standortId === standortId && o.kategorie === kat && o.status === "frei")
      .sort((a, b) => b.nummer - a.nummer)
      .slice(0, gesamt - ziel)
      .map(o => o.id);

    objekte = objekte.filter(o => !freie.includes(o.id));
  }

  speichern();
  anzeigen();
}

function monatErzeugen() {
  const monat = aktuellerMonatText();
  const datum = heuteISO();

  kunden.filter(k => k.status !== "archiv").forEach(k => {
    kundePositionen(k.id)
      .filter(p => p.status !== "abgeschlossen" && p.status !== "archiv")
      .forEach(p => zahlungErzeugen(k, p, monat, datum, "offen"));
  });

  speichern();
  anzeigen();
  alert("Aktueller Monat erzeugt.");
}

function zahlungErzeugen(k, p, monat, datum, status) {
  const vorhanden = zahlungen.some(z => z.positionId === p.id && z.monat === monat);

  if (vorhanden) return;

  zahlungen.push({
    id: Date.now() + Math.random(),
    kundeId: k.id,
    positionId: p.id,
    name: k.name,
    kundennummer: k.nummer,
    standortName: p.standortName,
    objektName: p.objektName,
    kategorie: p.kategorie,
    monat: monat,
    datum: datum,
    netto: p.netto,
    mwst: p.mwst,
    mwstBetrag: p.mwstBetrag,
    brutto: p.brutto,
    faelligkeit: p.faelligkeit,
    status: status,
    mahnstufe: 0
  });
}

function zahlungshistorieErzeugen(positionId, status) {
  const p = position(positionId);
  if (!p || !p.mietbeginn) {
    alert("Für diese Mietposition fehlt der Mietbeginn.");
    return;
  }

  const k = kunde(p.kundeId);
  const start = new Date(p.mietbeginn);
  const heute = new Date();

  let jahr = start.getFullYear();
  let monat = start.getMonth();

  while (new Date(jahr, monat, 1) <= new Date(heute.getFullYear(), heute.getMonth(), 1)) {
    const monatText = String(monat + 1).padStart(2, "0") + "/" + jahr;
    const datum = `${jahr}-${String(monat + 1).padStart(2, "0")}-01`;

    zahlungErzeugen(k, p, monatText, datum, status);

    monat++;
    if (monat > 11) {
      monat = 0;
      jahr++;
    }
  }

  speichern();
  kundeOeffnen(p.kundeId);
  alert("Zahlungshistorie wurde erzeugt.");
}

function zahlungToggle(id) {
  const z = zahlungen.find(x => x.id === id);
  if (!z) return;

  z.status = z.status === "offen" ? "bezahlt" : "offen";
  if (z.status === "bezahlt") z.mahnstufe = 0;

  speichern();
  anzeigen();

  if (aktiverKundeId) kundeOeffnen(aktiverKundeId);
}

function istMahnungFaellig(z) {
  return z.status === "offen" && heuteTag() > Number(z.faelligkeit || 3);
}

function mahnungSetzen(id) {
  const z = zahlungen.find(x => x.id === id);
  if (!z) return;

  z.mahnstufe = 1;
  speichern();
  anzeigen();

  if (aktiverKundeId) kundeOeffnen(aktiverKundeId);
}

function kundeArchivieren(id) {
  if (!confirm("Kunde ins Archiv verschieben? Er wird nicht gelöscht.")) return;

  const k = kunde(id);
  if (!k) return;

  k.status = "archiv";

  kundePositionen(id).forEach(p => {
    p.status = "archiv";
    const o = objekt(p.objektId);
    if (o) o.status = "frei";
  });

  speichern();
  seite("kunden");
}

function kundeOeffnen(id) {
  aktiverKundeId = id;
  const k = kunde(id);
  if (!k) return;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  kundeDetail.classList.add("active");

  const ps = kundePositionen(id);
  const sum = summeKunde(id);
  const offene = summeOffenKunde(id);

  const bankWarnung = !k.iban ? `<div class="warnung">⚠️ Keine IBAN hinterlegt – Kautionsrückzahlung nicht vorbereitet.</div>` : "";

  kundeDetailInhalt.innerHTML = `
    <h2>${k.name}</h2>

    <div class="item ${k.status === "archiv" ? "archiv" : ""}">
      <b>Kundendaten</b>
      <small>
        Kundennummer: ${k.nummer}<br>
        Status: ${k.status || "aktiv"}<br>
        Typ: ${k.typ === "gewerbe" ? "Gewerbekunde" : "Privatkunde"}<br>
        Telefon: ${k.telefon || "-"}<br>
        E-Mail: ${k.email || "-"}
      </small>
    </div>

    <div class="item">
      <b>Bankdaten für Rückzahlungen</b>
      <small>
        Kontoinhaber: ${k.kontoinhaber || "-"}<br>
        IBAN: ${k.iban || "-"}<br>
        BIC: ${k.bic || "-"}<br>
        Bank: ${k.bankname || "-"}
      </small>
      ${bankWarnung}
    </div>

    <div class="summary">
      <div><span>Positionen</span><b>${ps.length}</b></div>
      <div><span>Netto aktiv</span><b>${euro(sum.netto)}</b></div>
      <div><span>MwSt.</span><b>${euro(sum.mwst)}</b></div>
      <div><span>Brutto aktiv</span><b>${euro(sum.brutto)}</b></div>
      <div><span>Offen</span><b>${euro(offene)}</b></div>
    </div>

    <div class="item">
      <b>Notizen</b>
      <small>${k.notizen ? k.notizen.replaceAll("\n", "<br>") : "Keine Notizen vorhanden."}</small>
    </div>

    <button onclick="kundeBearbeiten(${k.id}); seite('kunden')">Kunde bearbeiten</button>
    <button onclick="positionNeu(${k.id})">+ Mietposition hinzufügen</button>
    <button class="danger" onclick="kundeArchivieren(${k.id})">Kunde archivieren</button>

    <h3>Mietpositionen</h3>
    ${ps.length ? ps.map(p => positionHtml(p)).join("") : "<p>Keine Mietpositionen vorhanden.</p>"}

    <h3>Zahlungen</h3>
    ${zahlungen.filter(z => z.kundeId === id).length
      ? zahlungen.filter(z => z.kundeId === id).map(z => zahlungHtml(z)).join("")
      : "<p>Noch keine Zahlungen vorhanden.</p>"}
  `;
}

function positionHtml(p) {
  return `
    <div class="item ${p.status === "aktiv" ? "belegt" : p.status === "archiv" ? "archiv" : "gekuendigt"}">
      <b>${p.kategorie} · ${p.objektName}</b>
      <small>
        Standort: ${p.standortName}<br>
        Status: ${p.status}<br>
        Netto: ${euro(p.netto)}<br>
        MwSt.: ${euro(p.mwstBetrag)} (${p.mwst}%)<br>
        Brutto: ${euro(p.brutto)}<br>
        Mietbeginn: ${p.mietbeginn || "-"}<br>
        Fällig bis: ${p.faelligkeit}. des Monats<br>
        Kaution: ${euro(p.kaution)} · ${p.kautionBezahlt === "ja" ? "bezahlt" : "offen"} · ${p.kautionZahlungsart || "-"}<br>
        Kaution Status: ${p.kautionStatus} · geklärt: ${p.kautionGeklaert}
      </small>

      <button onclick="zahlungshistorieErzeugen(${p.id}, 'bezahlt')">Historie ab Mietbeginn als bezahlt erzeugen</button>
      <button class="orange" onclick="zahlungshistorieErzeugen(${p.id}, 'offen')">Historie ab Mietbeginn als offen erzeugen</button>

      <div class="row">
        <button onclick="positionBearbeiten(${p.id})">Bearbeiten</button>
        <button class="danger" onclick="positionLoeschen(${p.id})">Archivieren</button>
      </div>
    </div>
  `;
}

function zahlungHtml(z) {
  return `
    <div class="item ${z.status}">
      <b>${z.name}</b>
      <small>
        Kundennummer: ${z.kundennummer}<br>
        Standort: ${z.standortName}<br>
        Objekt: ${z.objektName}<br>
        Kategorie: ${z.kategorie}<br>
        Monat: ${z.monat}<br>
        Netto: ${euro(z.netto)}<br>
        MwSt.: ${euro(z.mwstBetrag)}<br>
        Brutto: ${euro(z.brutto)}<br>
        Fällig bis: ${z.faelligkeit}. des Monats
      </small>

      <div class="status">${z.status === "bezahlt" ? "✅ BEZAHLT" : "❌ OFFEN"}</div>

      ${istMahnungFaellig(z) && z.mahnstufe === 0 ? `
        <div class="mahnung">⚠️ 1. Mahnung fällig</div>
        <button class="orange" onclick="mahnungSetzen(${z.id})">1. Mahnung markieren</button>
      ` : ""}

      ${z.mahnstufe === 1 ? `<div class="mahnungGesetzt">📩 1. Mahnung gesetzt</div>` : ""}

      <button style="background:${z.status === "offen" ? "#16a34a" : "#dc2626"}"
        onclick="zahlungToggle(${z.id})">
        ${z.status === "offen" ? "Als bezahlt markieren" : "Wieder auf offen setzen"}
      </button>
    </div>
  `;
}

function zeigeDashboardListe(typ) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  dashboardListe.classList.add("active");

  if (typ === "kunden") {
    dashboardListeInhalt.innerHTML = `<h2>Alle aktiven Kunden</h2>` + kunden.filter(k => k.status !== "archiv").map(k => `
      <div class="item clickable" onclick="kundeOeffnen(${k.id})">
        <b>${k.name}</b>
        <small>Kundennummer: ${k.nummer}<br>Typ: ${k.typ}</small>
      </div>
    `).join("");
  }

  if (typ === "netto") {
    dashboardListeInhalt.innerHTML = `<h2>Netto Zusammensetzung</h2>` + aktivePositionen().map(p => `
      <div class="item clickable" onclick="kundeOeffnen(${p.kundeId})">
        <b>${kunde(p.kundeId)?.name || "-"}</b>
        <small>${p.standortName}<br>${p.objektName}<br>Netto: ${euro(p.netto)}</small>
      </div>
    `).join("");
  }

  if (typ === "offen") {
    const offen = zahlungen.filter(z => z.status === "offen");
    dashboardListeInhalt.innerHTML = `<h2>Offene Zahlungen</h2>` + (offen.length ? offen.map(zahlungHtml).join("") : "<p>Keine offenen Zahlungen.</p>");
  }

  if (typ === "bezahlt") {
    const bezahlt = zahlungen.filter(z => z.status === "bezahlt");
    dashboardListeInhalt.innerHTML = `<h2>Bezahlte Zahlungen</h2>` + (bezahlt.length ? bezahlt.map(zahlungHtml).join("") : "<p>Keine bezahlten Zahlungen.</p>");
  }
}

function auswertungsZahlungen() {
  const typ = zeitraumTyp.value;
  const heute = new Date();
  let start = null;
  let ende = null;

  if (typ === "aktuellerMonat") {
    start = new Date(heute.getFullYear(), heute.getMonth(), 1);
    ende = new Date(heute.getFullYear(), heute.getMonth() + 1, 0);
  }

  if (typ === "letzterMonat") {
    start = new Date(heute.getFullYear(), heute.getMonth() - 1, 1);
    ende = new Date(heute.getFullYear(), heute.getMonth(), 0);
  }

  if (typ === "aktuellesJahr") {
    start = new Date(heute.getFullYear(), 0, 1);
    ende = new Date(heute.getFullYear(), 11, 31);
  }

  if (typ === "letztesJahr") {
    start = new Date(heute.getFullYear() - 1, 0, 1);
    ende = new Date(heute.getFullYear() - 1, 11, 31);
  }

  if (typ === "frei") {
    start = zeitraumStart.value ? new Date(zeitraumStart.value) : null;
    ende = zeitraumEnde.value ? new Date(zeitraumEnde.value) : null;
  }

  if (typ === "gesamt") return zahlungen;

  return zahlungen.filter(z => {
    const d = new Date(z.datum || heuteISO());
    if (start && d < start) return false;
    if (ende && d > ende) return false;
    return true;
  });
}

function anzeigen() {
  if (document.getElementById("mietfelder") && !document.getElementById("grundmiete")) {
    mietfelderAnpassen();
  }

  if (document.getElementById("verfuegbarkeitListe")) {
    verfuegbarkeitAnzeigen();
  }

  const suche = (kundenSuche?.value || "").toLowerCase();
  const statusFilter = kundenStatusFilter?.value || "aktiv";

  kundenListe.innerHTML = kunden.filter(k => {
    const ps = kundePositionen(k.id);
    const text = `${k.name} ${k.nummer} ${k.email} ${ps.map(p => p.objektName + " " + p.standortName).join(" ")}`.toLowerCase();

    let passtStatus = true;

    if (statusFilter === "aktiv") passtStatus = k.status !== "archiv" && ps.some(p => p.status === "aktiv");
    if (statusFilter === "gekündigt") passtStatus = ps.some(p => p.status === "gekündigt" || p.status === "beendet");
    if (statusFilter === "archiv") passtStatus = k.status === "archiv";
    if (statusFilter === "alle") passtStatus = true;

    return text.includes(suche) && passtStatus;
  }).map(k => {
    const sum = summeKunde(k.id);
    return `
      <div class="item clickable ${k.status === "archiv" ? "archiv" : ""}" onclick="kundeOeffnen(${k.id})">
        <b>${k.name}</b>
        <small>
          Kundennummer: ${k.nummer}<br>
          Status: ${k.status || "aktiv"}<br>
          Typ: ${k.typ === "gewerbe" ? "Gewerbe" : "Privat"}<br>
          Positionen: ${kundePositionen(k.id).length}<br>
          Brutto aktiv: ${euro(sum.brutto)}
        </small>
      </div>
    `;
  }).join("") || "<p>Keine Kunden gefunden.</p>";

  standorteListe.innerHTML = standorte.map(s => `
    <div class="item">
      <b>${s.name}</b>
      <small>${s.strasse || ""}, ${s.ort || ""}</small>

      ${kategorien.map(kat => {
        const gesamt = objekte.filter(o => o.standortId === s.id && o.kategorie === kat).length;
        const frei = freieObjekte(kat, s.id).length;
        const belegt = belegteObjekte(kat, s.id).length;

        return `
          <div class="item">
            <b>${kat}</b>
            <small>Gesamt: ${gesamt}<br>Frei: ${frei}<br>Belegt: ${belegt}</small>
            <input id="bestand_${s.id}_${kat}" type="number" value="${gesamt}">
            <button onclick="bestandSetzen(${s.id}, '${kat}')">Bestand speichern</button>
          </div>
        `;
      }).join("")}
    </div>
  `).join("") || "<p>Noch keine Standorte.</p>";

  dashStandorte.innerHTML = standorte.map(s => {
    const ps = aktivePositionen().filter(p => p.standortId === s.id);
    const netto = ps.reduce((a, p) => a + Number(p.netto || 0), 0);
    const frei = objekte.filter(o => o.standortId === s.id && o.status === "frei").length;
    const belegt = objekte.filter(o => o.standortId === s.id && o.status === "belegt").length;

    return `
      <div class="item">
        <b>${s.name}</b>
        <small>
          ${s.strasse || ""}, ${s.ort || ""}<br>
          Frei: ${frei}<br>
          Belegt: ${belegt}<br>
          Netto monatlich aktiv: ${euro(netto)}
        </small>
      </div>
    `;
  }).join("") || "<p>Noch keine Standorte.</p>";

  const filter = zahlungsFilter?.value || "Alle";
  const zlist = zahlungen.filter(z => filter === "Alle" || z.status === filter);
  zahlungenListe.innerHTML = zlist.length ? zlist.map(zahlungHtml).join("") : "<p>Noch keine Zahlungen.</p>";

  const az = auswertungsZahlungen();
  const netto = az.reduce((s, z) => s + Number(z.netto || 0), 0);
  const mwst = az.reduce((s, z) => s + Number(z.mwstBetrag || 0), 0);
  const brutto = az.reduce((s, z) => s + Number(z.brutto || 0), 0);
  const offen = az.filter(z => z.status === "offen").reduce((s, z) => s + Number(z.brutto || 0), 0);
  const bezahlt = az.filter(z => z.status === "bezahlt").reduce((s, z) => s + Number(z.brutto || 0), 0);

  auswertungInhalt.innerHTML = `
    <div class="summary">
      <div><span>Netto</span><b>${euro(netto)}</b></div>
      <div><span>MwSt.</span><b>${euro(mwst)}</b></div>
      <div><span>Brutto</span><b>${euro(brutto)}</b></div>
      <div><span>Offen</span><b>${euro(offen)}</b></div>
      <div><span>Bezahlt</span><b>${euro(bezahlt)}</b></div>
      <div><span>Zahlungen</span><b>${az.length}</b></div>
    </div>

    <h3>Details</h3>
    ${az.length ? az.map(zahlungHtml).join("") : "<p>Keine Zahlungen im Zeitraum.</p>"}
  `;

  const kuend = positionen.filter(p => p.status !== "aktiv");

  kuendigungenListe.innerHTML = kuend.length ? kuend.map(p => `
    <div class="item ${p.status === "archiv" ? "archiv" : p.status === "abgeschlossen" ? "abgeschlossen" : "gekuendigt"}">
      <b>${kunde(p.kundeId)?.name || "-"}</b>
      <small>
        Position: ${p.kategorie} · ${p.objektName}<br>
        Standort: ${p.standortName}<br>
        Status: ${p.status}<br>
        Vertragsende: ${p.vertragsende || "-"}<br>
        Kaution Status: ${p.kautionStatus} · geklärt: ${p.kautionGeklaert}
      </small>
    </div>
  `).join("") : "<p>Keine Kündigungen / Archive.</p>";

  const aktiv = aktivePositionen();
  const dashNettoSum = aktiv.reduce((s, p) => s + Number(p.netto || 0), 0);
  const dashOffenSum = zahlungen.filter(z => z.status === "offen").reduce((s, z) => s + Number(z.brutto || 0), 0);
  const dashBezahltSum = zahlungen.filter(z => z.status === "bezahlt").reduce((s, z) => s + Number(z.brutto || 0), 0);

  dashKunden.innerText = kunden.filter(k => k.status !== "archiv").length;
  dashNetto.innerText = euro(dashNettoSum);
  dashOffen.innerText = euro(dashOffenSum);
  dashBezahlt.innerText = euro(dashBezahltSum);
}

function demoLaden() {
  kunden = [];
  standorte = [
    { id: 1, name: "Mietpark Gelnhausen", strasse: "Imbruchgrund 4", ort: "Gelnhausen" },
    { id: 2, name: "Container Hasselroth", strasse: "Musterstraße 1", ort: "Hasselroth" },
    { id: 3, name: "Container Somborn", strasse: "Musterweg 2", ort: "Somborn" }
  ];

  objekte = [];
  positionen = [];
  zahlungen = [];

  standorte.forEach(s => {
    const container = s.id === 1 ? 0 : s.id === 2 ? 1 : 2;
    for (let i = 1; i <= container; i++) {
      objekte.push({ id: Date.now() + Math.random(), standortId: s.id, kategorie: "Container", name: "Container " + i, nummer: i, status: "frei" });
    }
    for (let i = 1; i <= 3; i++) {
      objekte.push({ id: Date.now() + Math.random(), standortId: s.id, kategorie: "Stellplatz", name: "Stellplatz " + i, nummer: i, status: "frei" });
    }
  });

  speichern();
  anzeigen();
  alert("Demo-Daten geladen.");
}

function allesLoeschen() {
  if (!confirm("Wirklich alles löschen?")) return;

  kunden = [];
  standorte = [];
  objekte = [];
  positionen = [];
  zahlungen = [];

  speichern();
  anzeigen();
}

anzeigen();