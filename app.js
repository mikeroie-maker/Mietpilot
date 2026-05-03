let kunden = JSON.parse(localStorage.getItem("mp_kunden")) || [];
let standorte = JSON.parse(localStorage.getItem("mp_standorte")) || [];
let objekte = JSON.parse(localStorage.getItem("mp_objekte")) || [];
let zahlungen = JSON.parse(localStorage.getItem("mp_zahlungen")) || [];

let bearbeiteKundeId = null;
let aktiverKundeId = null;
let aktiverStandortId = null;
let ausgewaehlterStandortId = null;

const kategorien = ["Wohnung", "Fahrzeug", "Container", "Büro", "Lagerhalle", "Stellplatz", "Sonstiges"];

function euro(wert) {
  return Number(wert || 0).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR"
  });
}

function speichern() {
  localStorage.setItem("mp_kunden", JSON.stringify(kunden));
  localStorage.setItem("mp_standorte", JSON.stringify(standorte));
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

function freieObjekte(kategorie, standortId = null) {
  return objekte.filter(o =>
    o.kategorie === kategorie &&
    o.status === "frei" &&
    (!standortId || o.standortId === standortId)
  );
}

function belegteObjekte(kategorie, standortId = null) {
  return objekte.filter(o =>
    o.kategorie === kategorie &&
    o.status === "belegt" &&
    (!standortId || o.standortId === standortId)
  );
}

function offeneZahlungenKunde(kundeId) {
  return zahlungen.filter(z => z.kundeId === kundeId && z.status === "offen");
}

function summeOffenKunde(kundeId) {
  return offeneZahlungenKunde(kundeId).reduce((s, z) => s + Number(z.brutto || 0), 0);
}

function abschlussStatus(k) {
  const offen = summeOffenKunde(k.id);
  const kautionOffen = k.kaution > 0 && k.kautionGeklaert !== "ja";
  const objektOffen = k.objektZurueck !== "ja";

  if (offen > 0) return "Offene Zahlungen vorhanden";
  if (kautionOffen) return "Kaution noch nicht geklärt";
  if (objektOffen) return "Objekt noch nicht zurückgegeben";
  return "Abschluss möglich";
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
    `;
  } else if (kat === "Büro" || kat === "Lagerhalle") {
    mietfelder.innerHTML = `
      <h3>Gewerbemiete</h3>
      <input id="grundmiete" type="number" placeholder="Grundmiete netto in €">
      <input id="nebenkosten" type="number" placeholder="Nebenkosten / Betriebskosten netto in €">
      <input id="heizkosten" type="number" placeholder="Strom / Heizung / Zusatzkosten netto in €">
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

function verfuegbarkeitAnzeigen() {
  if (!document.getElementById("verfuegbarkeitListe")) return;

  const kat = kategorie.value;

  if (!standorte.length) {
    verfuegbarkeitListe.innerHTML = `<p class="warnung">Noch keine Standorte vorhanden. Bitte zuerst unter Standorte einen Standort anlegen.</p>`;
    return;
  }

  verfuegbarkeitListe.innerHTML = standorte.map(s => {
    const gesamt = objekte.filter(o => o.standortId === s.id && o.kategorie === kat).length;
    const frei = freieObjekte(kat, s.id).length;
    const belegt = belegteObjekte(kat, s.id).length;
    const selected = ausgewaehlterStandortId === s.id ? "selected" : "";

    return `
      <div class="item clickable ${frei > 0 ? "frei" : "belegt"} ${selected}" onclick="standortAuswaehlen(${s.id})">
        <b>${s.name}</b>
        <small>
          ${s.strasse || ""}, ${s.ort || ""}<br>
          Kategorie: ${kat}<br>
          Gesamt: ${gesamt}<br>
          Frei: ${frei}<br>
          Belegt: ${belegt}
        </small>
        ${frei > 0 ? `<div class="ok">✅ verfügbar</div>` : `<div class="warnung">❌ nichts frei</div>`}
      </div>
    `;
  }).join("");
}

function standortAuswaehlen(id) {
  const kat = kategorie.value;
  const frei = freieObjekte(kat, id).length;

  if (frei <= 0) {
    alert("An diesem Standort ist für " + kat + " nichts frei.");
    return;
  }

  ausgewaehlterStandortId = id;
  verfuegbarkeitAnzeigen();
}

function formularNeu() {
  bearbeiteKundeId = null;
  ausgewaehlterStandortId = null;

  formularTitel.innerText = "Neuer Kunde";
  kundenFormular.classList.remove("hidden");

  kundeName.value = "";
  kundeEmail.value = "";
  kundeTelefon.value = "";
  kategorie.value = "Container";
  mwst.value = "19";
  mietbeginn.value = "";
  faelligkeit.value = "";
  kaution.value = "";
  kautionBezahlt.value = "nein";
  vertragsStatus.value = "aktiv";
  kuendigungsdatum.value = "";
  vertragsende.value = "";
  objektZurueck.value = "nein";
  kautionGeklaert.value = "nein";
  notizen.value = "";

  mietfelderAnpassen();
  verfuegbarkeitAnzeigen();
}

function formularSchliessen() {
  kundenFormular.classList.add("hidden");
  bearbeiteKundeId = null;
  ausgewaehlterStandortId = null;
}

function kundeBearbeiten(id) {
  const k = kunden.find(x => x.id === id);
  if (!k) return;

  bearbeiteKundeId = id;
  ausgewaehlterStandortId = k.standortId || null;

  formularTitel.innerText = "Kunde bearbeiten";
  kundenFormular.classList.remove("hidden");

  kundeName.value = k.name || "";
  kundeEmail.value = k.email || "";
  kundeTelefon.value = k.telefon || "";
  kategorie.value = k.kategorie || "Container";
  mwst.value = k.mwst || "19";
  mietbeginn.value = k.mietbeginn || "";
  faelligkeit.value = k.faelligkeit || 3;
  kaution.value = k.kaution || "";
  kautionBezahlt.value = k.kautionBezahlt || "nein";
  vertragsStatus.value = k.vertragsStatus || "aktiv";
  kuendigungsdatum.value = k.kuendigungsdatum || "";
  vertragsende.value = k.vertragsende || "";
  objektZurueck.value = k.objektZurueck || "nein";
  kautionGeklaert.value = k.kautionGeklaert || "nein";
  notizen.value = k.notizen || "";

  mietfelderAnpassen();

  setTimeout(() => {
    if (document.getElementById("grundmiete")) grundmiete.value = k.grundmiete || "";
    if (document.getElementById("nebenkosten")) nebenkosten.value = k.nebenkosten || "";
    if (document.getElementById("heizkosten")) heizkosten.value = k.heizkosten || "";
    verfuegbarkeitAnzeigen();
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
    k.vertragsStatus = vertragsStatus.value;
    k.kuendigungsdatum = kuendigungsdatum.value;
    k.vertragsende = vertragsende.value;
    k.objektZurueck = objektZurueck.value;
    k.kautionGeklaert = kautionGeklaert.value;
    k.notizen = notizen.value;

    if ((k.vertragsStatus === "beendet" || k.vertragsStatus === "abgeschlossen") && k.objektZurueck === "ja") {
      const o = objekte.find(x => x.id === k.objektId);
      if (o) o.status = "frei";
    }

    speichern();
    anzeigen();
    formularSchliessen();
    alert("Kunde wurde aktualisiert");
    return;
  }

  const kat = kategorie.value;

  if (!ausgewaehlterStandortId) {
    alert("Bitte einen Standort mit freiem Objekt auswählen.");
    return;
  }

  const frei = freieObjekte(kat, ausgewaehlterStandortId);

  if (!frei.length) {
    alert("An diesem Standort ist für " + kat + " nichts frei.");
    return;
  }

  const objekt = frei[0];
  objekt.status = "belegt";

  const standort = standorte.find(s => s.id === ausgewaehlterStandortId);

  kunden.push({
    id: Date.now(),
    nummer: naechsteKundennummer(),
    name: kundeName.value,
    email: kundeEmail.value,
    telefon: kundeTelefon.value,
    kategorie: kat,
    standortId: ausgewaehlterStandortId,
    standortName: standort ? standort.name : "-",
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
    kautionBezahlt: kautionBezahlt.value,
    vertragsStatus: "aktiv",
    kuendigungsdatum: "",
    vertragsende: "",
    objektZurueck: "nein",
    kautionGeklaert: "nein",
    notizen: ""
  });

  speichern();
  anzeigen();
  formularSchliessen();
  alert("Kunde gespeichert und Objekt zugewiesen");
}

function standortAnlegen() {
  if (!standortName.value || !standortOrt.value) {
    alert("Bitte mindestens Name und Ort eintragen");
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
  alert("Standort gespeichert");
}

function bestandSetzen(standortId, kategorieName) {
  const feld = document.getElementById("bestand_" + standortId + "_" + kategorieName);
  const ziel = Number(feld.value);

  if (ziel < 0 || isNaN(ziel)) {
    alert("Bitte gültige Anzahl eintragen");
    return;
  }

  const standortObjekte = objekte.filter(o => o.standortId === standortId && o.kategorie === kategorieName);
  const gesamt = standortObjekte.length;
  const belegt = standortObjekte.filter(o => o.status === "belegt").length;

  if (ziel < belegt) {
    alert("Nicht möglich. " + belegt + " " + kategorieName + "-Objekte sind an diesem Standort vermietet.");
    return;
  }

  if (ziel > gesamt) {
    for (let i = gesamt + 1; i <= ziel; i++) {
      objekte.push({
        id: Date.now() + Math.random(),
        standortId: standortId,
        kategorie: kategorieName,
        name: kategorieName + " " + i,
        nummer: i,
        status: "frei"
      });
    }
  }

  if (ziel < gesamt) {
    const zuLoeschen = gesamt - ziel;

    const freie = objekte
      .filter(o => o.standortId === standortId && o.kategorie === kategorieName && o.status === "frei")
      .sort((a, b) => b.nummer - a.nummer)
      .slice(0, zuLoeschen)
      .map(o => o.id);

    objekte = objekte.filter(o => !freie.includes(o.id));
  }

  speichern();
  anzeigen();
}

function standortLoeschen(id) {
  const hatKunden = kunden.some(k => k.standortId === id);
  const hatBelegte = objekte.some(o => o.standortId === id && o.status === "belegt");

  if (hatKunden || hatBelegte) {
    alert("Standort kann nicht gelöscht werden, weil noch Kunden oder belegte Objekte vorhanden sind.");
    return;
  }

  if (!confirm("Standort wirklich löschen?")) return;

  standorte = standorte.filter(s => s.id !== id);
  objekte = objekte.filter(o => o.standortId !== id);

  speichern();
  anzeigen();
}

function monatErzeugen() {
  const monat = aktuellerMonat();

  kunden
    .filter(k => k.vertragsStatus !== "abgeschlossen")
    .forEach(k => {
      const vorhanden = zahlungen.some(z => z.kundeId === k.id && z.monat === monat);

      if (!vorhanden) {
        zahlungen.push({
          id: Date.now() + Math.random(),
          kundeId: k.id,
          name: k.name,
          kundennummer: k.nummer,
          objektName: k.objektName,
          standortName: k.standortName,
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
  if (aktiverStandortId) standortOeffnen(aktiverStandortId);
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
  const offen = summeOffenKunde(id);
  const abschluss = abschlussStatus(k);

  kundeDetailInhalt.innerHTML = `
    <h2>${k.name}</h2>

    <div class="item ${k.vertragsStatus === "aktiv" ? "" : "gekuendigt"}">
      <b>Kundendaten</b>
      <small>
        Kundennummer: ${k.nummer}<br>
        Status: ${k.vertragsStatus || "aktiv"}<br>
        Standort: ${k.standortName || "-"}<br>
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
        Kaution bezahlt: ${k.kautionBezahlt === "ja" ? "ja" : "nein"}<br>
        Kaution geklärt: ${k.kautionGeklaert === "ja" ? "ja" : "nein"}
      </small>
    </div>

    <div class="item">
      <b>Kündigung / Abschluss</b>
      <small>
        Kündigungsdatum: ${k.kuendigungsdatum || "-"}<br>
        Vertragsende: ${k.vertragsende || "-"}<br>
        Objekt zurückgegeben: ${k.objektZurueck || "nein"}<br>
        Offene Zahlungen: ${euro(offen)}<br>
        Abschlussprüfung: ${abschluss}
      </small>
      ${abschluss === "Abschluss möglich" ? `<div class="ok">✅ Kunde kann abgeschlossen werden</div>` : `<div class="warnung">⚠️ ${abschluss}</div>`}
    </div>

    <div class="item">
      <b>Notizen</b>
      <small>${k.notizen ? k.notizen.replaceAll("\n", "<br>") : "Keine Notizen vorhanden."}</small>
    </div>

    <button onclick="kundeBearbeiten(${k.id}); seite('kunden')">Bearbeiten</button>
    <button class="danger" onclick="kundeLoeschen(${k.id})">Kunde löschen</button>

    <h3>Zahlungen dieses Kunden</h3>
    ${kundeZahlungen.length ? kundeZahlungen.map(z => zahlungHtml(z)).join("") : "<p>Noch keine Zahlungen vorhanden.</p>"}
  `;
}

function standortOeffnen(id) {
  aktiverStandortId = id;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  standortDetailPage.classList.add("active");

  const s = standorte.find(x => x.id === id);
  if (!s) return;

  const standortKunden = kunden.filter(k => k.standortId === id);
  const standortObjekte = objekte.filter(o => o.standortId === id);
  const standortZahlungen = zahlungen.filter(z => standortKunden.some(k => k.id === z.kundeId));

  const netto = standortKunden.reduce((sum, k) => sum + Number(k.netto || 0), 0);
  const brutto = standortKunden.reduce((sum, k) => sum + Number(k.brutto || 0), 0);
  const offen = standortZahlungen.filter(z => z.status === "offen").reduce((sum, z) => sum + Number(z.brutto || 0), 0);
  const bezahlt = standortZahlungen.filter(z => z.status === "bezahlt").reduce((sum, z) => sum + Number(z.brutto || 0), 0);

  standortDetailInhalt.innerHTML = `
    <h2>${s.name}</h2>
    <p class="info">${s.strasse || ""}, ${s.ort || ""}</p>

    <div class="summary">
      <div><span>Objekte gesamt</span><b>${standortObjekte.length}</b></div>
      <div><span>Mieter</span><b>${standortKunden.length}</b></div>
      <div><span>Monat netto</span><b>${euro(netto)}</b></div>
      <div><span>Monat brutto</span><b>${euro(brutto)}</b></div>
      <div><span>Offen</span><b>${euro(offen)}</b></div>
      <div><span>Bezahlt</span><b>${euro(bezahlt)}</b></div>
    </div>

    <h3>Bestand</h3>
    ${kategorien.map(kat => {
      const gesamt = objekte.filter(o => o.standortId === id && o.kategorie === kat).length;
      const frei = freieObjekte(kat, id).length;
      const belegt = belegteObjekte(kat, id).length;

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
    }).join("")}

    <h3>Mieter an diesem Standort</h3>
    ${standortKunden.length ? standortKunden.map(k => `
      <div class="item clickable" onclick="kundeOeffnen(${k.id})">
        <b>${k.name}</b>
        <small>
          Kundennummer: ${k.nummer}<br>
          Objekt: ${k.objektName}<br>
          Kategorie: ${k.kategorie}<br>
          Netto: ${euro(k.netto)}<br>
          Brutto: ${euro(k.brutto)}
        </small>
      </div>
    `).join("") : "<p>Keine Mieter an diesem Standort.</p>"}
  `;
}

function openDashboardDetail(typ) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  dashboardDetailPage.classList.add("active");

  if (typ === "kunden") {
    dashboardDetailInhalt.innerHTML = `
      <h2>Alle Kunden</h2>
      ${kunden.length ? kunden.map(k => `
        <div class="item clickable" onclick="kundeOeffnen(${k.id})">
          <b>${k.name}</b>
          <small>
            Kundennummer: ${k.nummer}<br>
            Standort: ${k.standortName || "-"}<br>
            Objekt: ${k.objektName}<br>
            Brutto: ${euro(k.brutto)}
          </small>
        </div>
      `).join("") : "<p>Keine Kunden vorhanden.</p>"}
    `;
  }

  if (typ === "netto") {
    dashboardDetailInhalt.innerHTML = `
      <h2>Monat netto Zusammensetzung</h2>
      ${kunden.length ? kunden.map(k => `
        <div class="item clickable" onclick="kundeOeffnen(${k.id})">
          <b>${k.name}</b>
          <small>
            Standort: ${k.standortName || "-"}<br>
            Objekt: ${k.objektName}<br>
            Kategorie: ${k.kategorie}<br>
            Netto: ${euro(k.netto)}
          </small>
        </div>
      `).join("") : "<p>Keine Kunden vorhanden.</p>"}
    `;
  }

  if (typ === "offen") {
    const offen = zahlungen.filter(z => z.status === "offen");
    dashboardDetailInhalt.innerHTML = `
      <h2>Offene Zahlungen</h2>
      ${offen.length ? offen.map(z => zahlungHtml(z)).join("") : "<p>Keine offenen Zahlungen.</p>"}
    `;
  }

  if (typ === "bezahlt") {
    const bezahlt = zahlungen.filter(z => z.status === "bezahlt");
    dashboardDetailInhalt.innerHTML = `
      <h2>Bezahlte Zahlungen</h2>
      ${bezahlt.length ? bezahlt.map(z => zahlungHtml(z)).join("") : "<p>Keine bezahlten Zahlungen.</p>"}
    `;
  }
}

function zahlungHtml(z) {
  const mahnungFaellig = istMahnungFaellig(z);

  return `
    <div class="item ${z.status}">
      <b>${z.name}</b>
      <small>
        Kundennummer: ${z.kundennummer}<br>
        Standort: ${z.standortName || "-"}<br>
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
  standorte = [
    { id: 1, name: "Mietpark Gelnhausen", strasse: "Imbruchgrund 4", ort: "Gelnhausen" },
    { id: 2, name: "Container Hasselroth", strasse: "Musterstraße 1", ort: "Hasselroth" },
    { id: 3, name: "Container Somborn", strasse: "Musterweg 2", ort: "Somborn" }
  ];

  objekte = [];
  kunden = [];
  zahlungen = [];
  bearbeiteKundeId = null;
  aktiverKundeId = null;
  aktiverStandortId = null;
  ausgewaehlterStandortId = null;

  standorte.forEach(s => {
    const containerAnzahl = s.id === 1 ? 0 : s.id === 2 ? 1 : 2;

    for (let i = 1; i <= containerAnzahl; i++) {
      objekte.push({
        id: Date.now() + Math.random(),
        standortId: s.id,
        kategorie: "Container",
        name: "Container " + i,
        nummer: i,
        status: "frei"
      });
    }

    for (let i = 1; i <= 3; i++) {
      objekte.push({
        id: Date.now() + Math.random(),
        standortId: s.id,
        kategorie: "Stellplatz",
        name: "Stellplatz " + i,
        nummer: i,
        status: "frei"
      });
    }
  });

  speichern();
  anzeigen();
  alert("Demo-Daten geladen.");
}

function allesLoeschen() {
  if (!confirm("Wirklich alle Daten löschen?")) return;

  kunden = [];
  standorte = [];
  objekte = [];
  zahlungen = [];

  speichern();
  anzeigen();
}

function anzeigen() {
  if (document.getElementById("mietfelder") && document.getElementById("kategorie")) {
    if (!document.getElementById("grundmiete")) {
      mietfelderAnpassen();
    }
  }

  if (document.getElementById("verfuegbarkeitListe")) {
    verfuegbarkeitAnzeigen();
  }

  const suche = (kundenSuche?.value || "").toLowerCase();
  const filter = kundenFilter?.value || "Alle";

  const kundenGefiltert = kunden.filter(k => {
    const text = `${k.name} ${k.nummer} ${k.objektName} ${k.kategorie} ${k.standortName}`.toLowerCase();
    return text.includes(suche) && (filter === "Alle" || k.kategorie === filter);
  });

  kundenListe.innerHTML = kundenGefiltert.length ? kundenGefiltert.map(k => `
    <div class="item clickable ${k.vertragsStatus !== "aktiv" ? "gekuendigt" : ""}" onclick="kundeOeffnen(${k.id})">
      <b>${k.name}</b>
      <small>
        Kundennummer: ${k.nummer}<br>
        Status: ${k.vertragsStatus || "aktiv"}<br>
        Standort: ${k.standortName || "-"}<br>
        Objekt: ${k.objektName}<br>
        Kategorie: ${k.kategorie}<br>
        Netto: ${euro(k.netto)}<br>
        Brutto: ${euro(k.brutto)}
      </small>
      <div class="row">
        <button onclick="event.stopPropagation(); kundeBearbeiten(${k.id})">Bearbeiten</button>
        <button class="danger" onclick="event.stopPropagation(); kundeLoeschen(${k.id})">Löschen</button>
      </div>
    </div>
  `).join("") : "<p>Keine Kunden gefunden.</p>";

  standorteListe.innerHTML = standorte.length ? standorte.map(s => `
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
            <small>
              Gesamt: ${gesamt}<br>
              Frei: ${frei}<br>
              Belegt: ${belegt}
            </small>
            <input id="bestand_${s.id}_${kat}" type="number" value="${gesamt}">
            <button onclick="bestandSetzen(${s.id}, '${kat}')">Bestand speichern</button>
          </div>
        `;
      }).join("")}

      <button class="blue" onclick="standortOeffnen(${s.id})">Standort öffnen</button>
      <button class="danger" onclick="standortLoeschen(${s.id})">Standort löschen</button>
    </div>
  `).join("") : "<p>Noch keine Standorte angelegt.</p>";

  dashStandorte.innerHTML = standorte.length ? standorte.map(s => {
    const standortKunden = kunden.filter(k => k.standortId === s.id);
    const netto = standortKunden.reduce((sum, k) => sum + Number(k.netto || 0), 0);
    const freiGesamt = objekte.filter(o => o.standortId === s.id && o.status === "frei").length;
    const belegtGesamt = objekte.filter(o => o.standortId === s.id && o.status === "belegt").length;

    return `
      <div class="item clickable" onclick="standortOeffnen(${s.id})">
        <b>${s.name}</b>
        <small>
          ${s.strasse || ""}, ${s.ort || ""}<br>
          Frei gesamt: ${freiGesamt}<br>
          Belegt gesamt: ${belegtGesamt}<br>
          Mieter: ${standortKunden.length}<br>
          Monatsmiete netto: ${euro(netto)}
        </small>
      </div>
    `;
  }).join("") : "<p>Noch keine Standorte angelegt.</p>";

  const zahlFilter = zahlungsFilter?.value || "Alle";

  const zahlungenGefiltert = zahlungen.filter(z => {
    return zahlFilter === "Alle" || z.status === zahlFilter;
  });

  zahlungenListe.innerHTML = zahlungenGefiltert.length
    ? zahlungenGefiltert.map(z => zahlungHtml(z)).join("")
    : "<p>Noch keine Zahlungen vorhanden.</p>";

  const kuendigungsKunden = kunden.filter(k => k.vertragsStatus && k.vertragsStatus !== "aktiv");

  kuendigungenListe.innerHTML = kuendigungsKunden.length ? kuendigungsKunden.map(k => {
    const offen = summeOffenKunde(k.id);
    const abschluss = abschlussStatus(k);

    return `
      <div class="item clickable ${k.vertragsStatus === "abgeschlossen" ? "abgeschlossen" : "gekuendigt"}" onclick="kundeOeffnen(${k.id})">
        <b>${k.name}</b>
        <small>
          Status: ${k.vertragsStatus}<br>
          Kundennummer: ${k.nummer}<br>
          Standort: ${k.standortName || "-"}<br>
          Objekt: ${k.objektName}<br>
          Kündigungsdatum: ${k.kuendigungsdatum || "-"}<br>
          Vertragsende: ${k.vertragsende || "-"}<br>
          Offene Zahlungen: ${euro(offen)}<br>
          Abschlussprüfung: ${abschluss}
        </small>
      </div>
    `;
  }).join("") : "<p>Keine Kündigungen vorhanden.</p>";

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