let kunden = JSON.parse(localStorage.getItem("mp9_kunden")) || [];
let standorte = JSON.parse(localStorage.getItem("mp9_standorte")) || [];
let objekte = JSON.parse(localStorage.getItem("mp9_objekte")) || [];
let positionen = JSON.parse(localStorage.getItem("mp9_positionen")) || [];
let zahlungen = JSON.parse(localStorage.getItem("mp9_zahlungen")) || [];
let einstellungen = JSON.parse(localStorage.getItem("mp9_einstellungen")) || {};

let aktiverKundeId = null;
let bearbeiteKundeId = null;
let bearbeitePositionId = null;

const kategorien = ["Container", "Stellplatz", "Wohnung", "Lagerhalle", "Büro", "Fahrzeug", "Sonstiges"];

function el(id) {
  return document.getElementById(id);
}

function euro(wert) {
  return Number(wert || 0).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR"
  });
}

function speichern() {
  localStorage.setItem("mp9_kunden", JSON.stringify(kunden));
  localStorage.setItem("mp9_standorte", JSON.stringify(standorte));
  localStorage.setItem("mp9_objekte", JSON.stringify(objekte));
  localStorage.setItem("mp9_positionen", JSON.stringify(positionen));
  localStorage.setItem("mp9_zahlungen", JSON.stringify(zahlungen));
  localStorage.setItem("mp9_einstellungen", JSON.stringify(einstellungen));
}

function seite(id, button) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  el(id).classList.add("active");

  document.querySelectorAll("nav button").forEach(b => b.classList.remove("activeNav"));
  if (button) button.classList.add("activeNav");

  anzeigen();
}

function kunde(id) {
  return kunden.find(k => k.id === id);
}

function standort(id) {
  return standorte.find(s => Number(s.id) === Number(id));
}

function objekt(id) {
  return objekte.find(o => o.id === id);
}

function position(id) {
  return positionen.find(p => p.id === id);
}

function freieObjekte(kategorie, standortId) {
  return objekte.filter(o =>
    o.kategorie === kategorie &&
    Number(o.standortId) === Number(standortId) &&
    o.status === "frei"
  );
}

function belegteObjekte(kategorie, standortId) {
  return objekte.filter(o =>
    o.kategorie === kategorie &&
    Number(o.standortId) === Number(standortId) &&
    o.status === "belegt"
  );
}

function naechsteKundennummer() {
  if (!kunden.length) return 10001;
  return Math.max(...kunden.map(k => Number(k.nummer || 10000))) + 1;
}

function berechneBetrag(kundentyp, miete, mwst) {
  const steuer = Number(mwst || 0);

  if (kundentyp === "privat") {
    const brutto = Number(miete || 0);
    const netto = steuer === 0 ? brutto : brutto / (1 + steuer / 100);
    return { netto, brutto, mwstBetrag: brutto - netto };
  }

  const netto = Number(miete || 0);
  const brutto = netto + netto * steuer / 100;
  return { netto, brutto, mwstBetrag: brutto - netto };
}

function standortOptionen(selectId) {
  const s = el(selectId);
  if (!s) return;

  s.innerHTML = "";

  standorte.forEach(st => {
    const opt = document.createElement("option");
    opt.value = st.id;
    opt.textContent = `${st.name} · ${st.ort || ""}`;
    s.appendChild(opt);
  });
}

/* KUNDEN */

function neuerKunde() {
  bearbeiteKundeId = null;
  el("kundenFormTitel").innerText = "Neuer Kunde";
  el("kundenForm").classList.remove("hidden");
  el("erstePositionBereich").style.display = "block";

  el("kundeName").value = "";
  el("kundeTelefon").value = "";
  el("kundeEmail").value = "";
  el("kundeTyp").value = "privat";
  el("kontoinhaber").value = "";
  el("iban").value = "";
  el("bic").value = "";
  el("bankname").value = "";
  el("kundeNotizen").value = "";

  el("neuKategorie").value = "";
  el("neuAnzahl").value = 1;
  el("neuMiete").value = "";
  el("neuMwst").value = "19";
  el("neuMietbeginn").value = "";
  el("neuFaelligkeit").value = "";
  el("neuKaution").value = "";
  el("neuKautionBezahlt").value = "nein";
  el("neuKautionZahlungsart").value = "";

  standortOptionen("neuStandort");
  verfuegbarkeitNeu();
}

function kundenFormSchliessen() {
  el("kundenForm").classList.add("hidden");
  bearbeiteKundeId = null;
}

function kundeBearbeiten(id) {
  const k = kunde(id);
  if (!k) return;

  bearbeiteKundeId = id;
  el("kundenFormTitel").innerText = "Kunde bearbeiten";
  el("kundenForm").classList.remove("hidden");
  el("erstePositionBereich").style.display = "none";

  el("kundeName").value = k.name || "";
  el("kundeTelefon").value = k.telefon || "";
  el("kundeEmail").value = k.email || "";
  el("kundeTyp").value = k.typ || "privat";
  el("kontoinhaber").value = k.kontoinhaber || "";
  el("iban").value = k.iban || "";
  el("bic").value = k.bic || "";
  el("bankname").value = k.bankname || "";
  el("kundeNotizen").value = k.notizen || "";

  seite("kundenPage");
}

function kundeSpeichern() {
  if (!el("kundeName").value.trim()) {
    alert("Bitte Namen eintragen.");
    return;
  }

  if (bearbeiteKundeId) {
    const k = kunde(bearbeiteKundeId);
    if (!k) return;

    k.name = el("kundeName").value;
    k.telefon = el("kundeTelefon").value;
    k.email = el("kundeEmail").value;
    k.typ = el("kundeTyp").value;
    k.kontoinhaber = el("kontoinhaber").value;
    k.iban = el("iban").value;
    k.bic = el("bic").value;
    k.bankname = el("bankname").value;
    k.notizen = el("kundeNotizen").value;

    speichern();
    kundenFormSchliessen();
    kundeOeffnen(k.id);
    return;
  }

  const k = {
    id: Date.now(),
    nummer: naechsteKundennummer(),
    name: el("kundeName").value,
    telefon: el("kundeTelefon").value,
    email: el("kundeEmail").value,
    typ: el("kundeTyp").value,
    kontoinhaber: el("kontoinhaber").value,
    iban: el("iban").value,
    bic: el("bic").value,
    bankname: el("bankname").value,
    notizen: el("kundeNotizen").value,
    status: "aktiv"
  };

  kunden.push(k);

  if (el("neuKategorie").value) {
    const ok = positionenAusFormularErstellen(k.id, {
      kategorie: el("neuKategorie").value,
      standortId: Number(el("neuStandort").value),
      anzahl: Number(el("neuAnzahl").value || 1),
      miete: Number(el("neuMiete").value || 0),
      mwst: Number(el("neuMwst").value || 0),
      mietbeginn: el("neuMietbeginn").value,
      faelligkeit: el("neuFaelligkeit").value || 3,
      kaution: Number(el("neuKaution").value || 0),
      kautionBezahlt: el("neuKautionBezahlt").value,
      kautionZahlungsart: el("neuKautionZahlungsart").value
    });

    if (!ok) {
      kunden = kunden.filter(x => x.id !== k.id);
      speichern();
      return;
    }
  }

  speichern();
  kundenFormSchliessen();
  kundeOeffnen(k.id);
}

function kundeOeffnen(id) {
  aktiverKundeId = id;
  const k = kunde(id);
  if (!k) return;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  el("kundeDetail").classList.add("active");

  const ps = positionen.filter(p => p.kundeId === id);
  const zs = zahlungen.filter(z => z.kundeId === id);

  const aktiveMiete = ps.filter(p => p.status === "aktiv").reduce((s, p) => s + Number(p.brutto || 0), 0);
  const bezahlt = zs.filter(z => z.status === "bezahlt").reduce((s, z) => s + Number(z.brutto || 0), 0);
  const offen = zs.filter(z => z.status === "offen").reduce((s, z) => s + Number(z.brutto || 0), 0);

  const bankWarnung = !k.iban ? `<div class="warnung">⚠️ Keine IBAN hinterlegt – Kautionsrückzahlung nicht vorbereitet.</div>` : "";

  el("kundeDetailInhalt").innerHTML = `
    <h2>${k.name}</h2>

    <div class="item ${k.status === "archiv" ? "archiv" : ""}">
      <b>Kundendaten</b>
      <small>
        Kundennummer: ${k.nummer}<br>
        Status: ${k.status || "aktiv"}<br>
        Typ: ${k.typ}<br>
        Telefon: ${k.telefon || "-"}<br>
        E-Mail: ${k.email || "-"}
      </small>
    </div>

    <div class="item">
      <b>Bankdaten</b>
      <small>
        Kontoinhaber: ${k.kontoinhaber || "-"}<br>
        IBAN: ${k.iban || "-"}<br>
        BIC: ${k.bic || "-"}<br>
        Bank: ${k.bankname || "-"}
      </small>
      ${bankWarnung}
    </div>

    <div class="summary">
      <div><span>Aktive Monatsmiete</span><b>${euro(aktiveMiete)}</b></div>
      <div><span>Bezahlt gesamt</span><b>${euro(bezahlt)}</b></div>
      <div><span>Offen gesamt</span><b>${euro(offen)}</b></div>
      <div><span>Zahlungen</span><b>${zs.length}</b></div>
    </div>

    <div class="item">
      <b>Notizen</b>
      <small>${k.notizen ? k.notizen.replaceAll("\n", "<br>") : "Keine Notizen vorhanden."}</small>
    </div>

    <button onclick="kundeBearbeiten(${k.id})">Kunde bearbeiten</button>
    ${k.status === "archiv" ? `<button class="blue" onclick="kundeReaktivieren(${k.id})">Kunde reaktivieren</button>` : ""}
    <button onclick="positionNeu(${k.id})">+ Mietposition hinzufügen</button>
    <button class="gray" onclick="kundeArchivieren(${k.id})">Archivieren</button>
    <button class="danger" onclick="kundeEndgueltigLoeschen(${k.id})">Endgültig löschen</button>

    <h3>Mietpositionen</h3>
    ${ps.length ? ps.map(positionHtml).join("") : "<p>Keine Mietposition vorhanden.</p>"}

    <h3>Zahlungen</h3>
    ${zs.length ? zs.map(zahlungHtml).join("") : "<p>Noch keine Zahlungen vorhanden.</p>"}
  `;
}

function kundeArchivieren(id) {
  if (!confirm("Kunde archivieren?")) return;

  const k = kunde(id);
  if (!k) return;

  k.status = "archiv";

  positionen.filter(p => p.kundeId === id).forEach(p => {
    p.status = "archiv";
    const o = objekt(p.objektId);
    if (o) o.status = "frei";
  });

  speichern();
  seite("kundenPage");
}

function kundeReaktivieren(id) {
  const k = kunde(id);
  if (!k) return;

  k.status = "aktiv";
  speichern();
  kundeOeffnen(id);
}

function kundeEndgueltigLoeschen(id) {
  if (!confirm("Kunde endgültig löschen? Nur für Test/Fehleintrag nutzen.")) return;

  positionen.filter(p => p.kundeId === id).forEach(p => {
    const o = objekt(p.objektId);
    if (o) o.status = "frei";
  });

  kunden = kunden.filter(k => k.id !== id);
  positionen = positionen.filter(p => p.kundeId !== id);
  zahlungen = zahlungen.filter(z => z.kundeId !== id);

  speichern();
  seite("kundenPage");
}

/* POSITIONEN */

function verfuegbarkeitNeu() {
  standortOptionen("neuStandort");

  if (!el("neuKategorie").value) {
    el("neuVerfuegbarkeit").innerHTML = "Keine Mietposition ausgewählt.";
    return;
  }

  const frei = freieObjekte(el("neuKategorie").value, Number(el("neuStandort").value)).length;
  const anzahl = Number(el("neuAnzahl").value || 1);

  el("neuVerfuegbarkeit").innerHTML = frei >= anzahl
    ? `✅ verfügbar: ${frei} frei`
    : `❌ nicht genug frei: ${frei} frei`;
}

function positionNeu(kundeId) {
  aktiverKundeId = kundeId;
  bearbeitePositionId = null;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  el("positionPage").classList.add("active");

  el("positionTitel").innerText = "Mietposition hinzufügen";

  el("posKategorie").value = "Container";
  standortOptionen("posStandort");
  el("posAnzahl").value = 1;
  el("posMiete").value = "";
  el("posMwst").value = "19";
  el("posMietbeginn").value = "";
  el("posFaelligkeit").value = "";
  el("posKaution").value = "";
  el("posKautionBezahlt").value = "nein";
  el("posKautionZahlungsart").value = "";
  el("posStatus").value = "aktiv";

  el("posKategorie").disabled = false;
  el("posStandort").disabled = false;
  el("posAnzahl").disabled = false;

  verfuegbarkeitPos();
}

function positionBearbeiten(id) {
  const p = position(id);
  if (!p) return;

  bearbeitePositionId = id;
  aktiverKundeId = p.kundeId;

  document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
  el("positionPage").classList.add("active");

  el("positionTitel").innerText = "Mietposition bearbeiten";

  el("posKategorie").value = p.kategorie;
  standortOptionen("posStandort");
  el("posStandort").value = p.standortId;
  el("posAnzahl").value = 1;
  el("posMiete").value = p.miete || "";
  el("posMwst").value = p.mwst || 19;
  el("posMietbeginn").value = p.mietbeginn || "";
  el("posFaelligkeit").value = p.faelligkeit || 3;
  el("posKaution").value = p.kaution || "";
  el("posKautionBezahlt").value = p.kautionBezahlt || "nein";
  el("posKautionZahlungsart").value = p.kautionZahlungsart || "";
  el("posStatus").value = p.status || "aktiv";

  el("posKategorie").disabled = true;
  el("posStandort").disabled = true;
  el("posAnzahl").disabled = true;

  verfuegbarkeitPos();
}

function verfuegbarkeitPos() {
  const frei = freieObjekte(el("posKategorie").value, Number(el("posStandort").value)).length;
  const anzahl = Number(el("posAnzahl").value || 1);

  el("posVerfuegbarkeit").innerHTML = frei >= anzahl || bearbeitePositionId
    ? `✅ verfügbar: ${frei} frei`
    : `❌ nicht genug frei: ${frei} frei`;
}

function positionSpeichern() {
  if (bearbeitePositionId) {
    const p = position(bearbeitePositionId);
    const k = kunde(p.kundeId);
    const betrag = berechneBetrag(k.typ, Number(el("posMiete").value || 0), Number(el("posMwst").value || 0));

    p.miete = Number(el("posMiete").value || 0);
    p.mwst = Number(el("posMwst").value || 0);
    p.netto = betrag.netto;
    p.brutto = betrag.brutto;
    p.mwstBetrag = betrag.mwstBetrag;
    p.mietbeginn = el("posMietbeginn").value;
    p.faelligkeit = el("posFaelligkeit").value || 3;
    p.kaution = Number(el("posKaution").value || 0);
    p.kautionBezahlt = el("posKautionBezahlt").value;
    p.kautionZahlungsart = el("posKautionZahlungsart").value;
    p.status = el("posStatus").value;

    if (p.status === "archiv" || p.status === "beendet") {
      const o = objekt(p.objektId);
      if (o) o.status = "frei";
    }

    speichern();
    kundeOeffnen(p.kundeId);
    return;
  }

  const ok = positionenAusFormularErstellen(aktiverKundeId, {
    kategorie: el("posKategorie").value,
    standortId: Number(el("posStandort").value),
    anzahl: Number(el("posAnzahl").value || 1),
    miete: Number(el("posMiete").value || 0),
    mwst: Number(el("posMwst").value || 0),
    mietbeginn: el("posMietbeginn").value,
    faelligkeit: el("posFaelligkeit").value || 3,
    kaution: Number(el("posKaution").value || 0),
    kautionBezahlt: el("posKautionBezahlt").value,
    kautionZahlungsart: el("posKautionZahlungsart").value
  });

  if (ok) {
    speichern();
    kundeOeffnen(aktiverKundeId);
  }
}

function positionenAusFormularErstellen(kundeId, d) {
  const k = kunde(kundeId);

  if (!d.miete || d.miete <= 0) {
    alert("Bitte Miete eintragen.");
    return false;
  }

  const frei = freieObjekte(d.kategorie, d.standortId);

  if (frei.length < d.anzahl) {
    alert("Nicht genug freie Objekte vorhanden.");
    return false;
  }

  const s = standort(d.standortId);
  const betrag = berechneBetrag(k.typ, d.miete, d.mwst);

  for (let i = 0; i < d.anzahl; i++) {
    const o = frei[i];
    o.status = "belegt";

    positionen.push({
      id: Date.now() + Math.random(),
      kundeId,
      kategorie: d.kategorie,
      standortId: d.standortId,
      standortName: s ? s.name : "-",
      objektId: o.id,
      objektName: o.name,
      miete: d.miete,
      mwst: d.mwst,
      netto: betrag.netto,
      brutto: betrag.brutto,
      mwstBetrag: betrag.mwstBetrag,
      mietbeginn: d.mietbeginn,
      faelligkeit: d.faelligkeit,
      kaution: d.kaution,
      kautionBezahlt: d.kautionBezahlt || "nein",
      kautionZahlungsart: d.kautionZahlungsart || "",
      status: "aktiv"
    });
  }

  return true;
}

function positionArchivieren(id) {
  if (!confirm("Mietposition archivieren?")) return;

  const p = position(id);
  if (!p) return;

  p.status = "archiv";

  const o = objekt(p.objektId);
  if (o) o.status = "frei";

  speichern();
  kundeOeffnen(p.kundeId);
}

function positionHtml(p) {
  return `
    <div class="item ${p.status === "aktiv" ? "belegt" : p.status === "gekündigt" ? "gekuendigt" : "archiv"}">
      <b>${p.kategorie} · ${p.objektName}</b>
      <small>
        Standort: ${p.standortName}<br>
        Status: ${p.status}<br>
        Netto: ${euro(p.netto)}<br>
        MwSt.: ${euro(p.mwstBetrag)}<br>
        Brutto: ${euro(p.brutto)}<br>
        Mietbeginn: ${p.mietbeginn || "-"}<br>
        Fällig bis: ${p.faelligkeit}. des Monats<br>
        Kaution: ${euro(p.kaution)} · ${p.kautionBezahlt || "nein"} · ${p.kautionZahlungsart || "-"}
      </small>
      <button onclick="positionBearbeiten(${p.id})">Bearbeiten</button>
      <button onclick="zahlungshistorieErzeugen(${p.id}, 'bezahlt')">Historie bezahlt</button>
      <button class="orange" onclick="zahlungshistorieErzeugen(${p.id}, 'offen')">Historie offen</button>
      <button class="danger" onclick="positionArchivieren(${p.id})">Archivieren</button>
    </div>
  `;
}

/* STANDORTE */

function standortAnlegen() {
  if (!el("standortName").value || !el("standortOrt").value) {
    alert("Bitte Standortname und Ort eintragen.");
    return;
  }

  standorte.push({
    id: Date.now(),
    name: el("standortName").value,
    strasse: el("standortStrasse").value,
    ort: el("standortOrt").value
  });

  el("standortName").value = "";
  el("standortStrasse").value = "";
  el("standortOrt").value = "";

  speichern();
  anzeigen();
}

function bestandSetzen(standortId, kategorie) {
  const ziel = Number(el(`bestand_${standortId}_${kategorie}`).value);
  const vorhanden = objekte.filter(o => Number(o.standortId) === Number(standortId) && o.kategorie === kategorie);
  const belegt = vorhanden.filter(o => o.status === "belegt").length;

  if (ziel < belegt) {
    alert("Nicht möglich, es sind noch Objekte belegt.");
    return;
  }

  if (ziel > vorhanden.length) {
    for (let i = vorhanden.length + 1; i <= ziel; i++) {
      objekte.push({
        id: Date.now() + Math.random(),
        standortId,
        kategorie,
        name: `${kategorie} ${i}`,
        nummer: i,
        status: "frei"
      });
    }
  }

  if (ziel < vorhanden.length) {
    const freie = vorhanden
      .filter(o => o.status === "frei")
      .slice(0, vorhanden.length - ziel)
      .map(o => o.id);

    objekte = objekte.filter(o => !freie.includes(o.id));
  }

  speichern();
  anzeigen();
}

function standortOeffnen(id) {
  const s = standort(id);
  if (!s) return;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  el("standortDetail").classList.add("active");

  const ps = positionen.filter(p => Number(p.standortId) === Number(id) && p.status !== "archiv");
  const zs = zahlungen.filter(z => ps.some(p => p.id === z.positionId));

  const brutto = ps.filter(p => p.status === "aktiv").reduce((a, p) => a + Number(p.brutto || 0), 0);
  const offen = zs.filter(z => z.status === "offen").reduce((a, z) => a + Number(z.brutto || 0), 0);
  const bezahlt = zs.filter(z => z.status === "bezahlt").reduce((a, z) => a + Number(z.brutto || 0), 0);

  el("standortDetailInhalt").innerHTML = `
    <h2>${s.name}</h2>
    <p class="info">${s.strasse || ""}, ${s.ort || ""}</p>

    <div class="summary">
      <div><span>Aktive Positionen</span><b>${ps.length}</b></div>
      <div><span>Aktive Monatsmiete</span><b>${euro(brutto)}</b></div>
      <div><span>Bezahlt</span><b>${euro(bezahlt)}</b></div>
      <div><span>Offen</span><b>${euro(offen)}</b></div>
    </div>

    <h3>Kunden / Positionen</h3>
    ${ps.length ? ps.map(p => `
      <div class="item clickable" onclick="kundeOeffnen(${p.kundeId})">
        <b>${kunde(p.kundeId)?.name || "-"}</b>
        <small>
          ${p.kategorie} · ${p.objektName}<br>
          Brutto: ${euro(p.brutto)}<br>
          Status: ${p.status}
        </small>
      </div>
    `).join("") : "<p>Keine Positionen an diesem Standort.</p>"}
  `;
}

/* ZAHLUNGEN */

function aktuellerMonat() {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

function zahlungErzeugen(k, p, monat, status, datum) {
  const vorhanden = zahlungen.some(z => z.positionId === p.id && z.monat === monat);
  if (vorhanden) return;

  zahlungen.push({
    id: Date.now() + Math.random(),
    kundeId: k.id,
    positionId: p.id,
    name: k.name,
    kundennummer: k.nummer,
    monat,
    datum: datum || new Date().toISOString().slice(0, 10),
    standortName: p.standortName,
    objektName: p.objektName,
    kategorie: p.kategorie,
    netto: p.netto,
    brutto: p.brutto,
    mwstBetrag: p.mwstBetrag,
    status,
    faelligkeit: p.faelligkeit || 3,
    mahnstufe: 0
  });
}

function monatErzeugen() {
  kunden.filter(k => k.status !== "archiv").forEach(k => {
    positionen.filter(p => p.kundeId === k.id && p.status === "aktiv").forEach(p => {
      zahlungErzeugen(k, p, aktuellerMonat(), "offen");
    });
  });

  speichern();
  anzeigen();
}

function zahlungshistorieErzeugen(positionId, status) {
  const p = position(positionId);

  if (!p.mietbeginn) {
    alert("Mietbeginn fehlt.");
    return;
  }

  const k = kunde(p.kundeId);
  let d = new Date(p.mietbeginn);
  const heute = new Date();

  while (d <= heute) {
    const monat = String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
    const datum = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    zahlungErzeugen(k, p, monat, status, datum);
    d.setMonth(d.getMonth() + 1);
  }

  speichern();
  kundeOeffnen(p.kundeId);
}

function zahlungToggle(id) {
  const z = zahlungen.find(x => x.id === id);
  if (!z) return;

  z.status = z.status === "bezahlt" ? "offen" : "bezahlt";

  if (z.status === "bezahlt") {
    z.mahnstufe = 0;
  }

  speichern();
  anzeigen();

  if (aktiverKundeId) kundeOeffnen(aktiverKundeId);
}

function mahnungSetzen(id) {
  const z = zahlungen.find(x => x.id === id);
  if (!z) return;

  z.mahnstufe = 1;
  speichern();
  anzeigen();

  if (aktiverKundeId) kundeOeffnen(aktiverKundeId);
}

function zahlungHtml(z) {
  return `
    <div class="item ${z.status}">
      <b>${z.name}</b>
      <small>
        ${z.kategorie} · ${z.objektName}<br>
        Standort: ${z.standortName}<br>
        Monat: ${z.monat}<br>
        Brutto: ${euro(z.brutto)}<br>
        Fällig bis: ${z.faelligkeit}. des Monats
      </small>

      <div class="status">${z.status === "bezahlt" ? "✅ BEZAHLT" : "❌ OFFEN"}</div>

      ${z.mahnstufe === 1 ? `<div class="mahnungGesetzt">1. Mahnung gesetzt</div>` : ""}

      <button onclick="zahlungToggle(${z.id})">
        ${z.status === "offen" ? "Als bezahlt markieren" : "Wieder offen setzen"}
      </button>

      ${z.status === "offen" ? `<button class="orange" onclick="mahnungSetzen(${z.id})">1. Mahnung markieren</button>` : ""}
    </div>
  `;
}

/* DASHBOARD DETAILS */

function zeigeDashboardDetail(typ) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  el("dashboardDetail").classList.add("active");

  if (typ === "kunden") {
    el("dashboardDetailInhalt").innerHTML = `
      <h2>Kunden</h2>
      ${kunden.filter(k => k.status !== "archiv").map(k => `
        <div class="item clickable" onclick="kundeOeffnen(${k.id})">
          <b>${k.name}</b>
          <small>Kundennummer: ${k.nummer}</small>
        </div>
      `).join("")}
    `;
  }

  if (typ === "miete") {
    el("dashboardDetailInhalt").innerHTML = `
      <h2>Aktive Monatsmieten</h2>
      ${positionen.filter(p => p.status === "aktiv").map(positionHtml).join("") || "<p>Keine aktiven Positionen.</p>"}
    `;
  }

  if (typ === "offen") {
    const list = zahlungen.filter(z => z.status === "offen");
    el("dashboardDetailInhalt").innerHTML = `<h2>Offene Zahlungen</h2>${list.length ? list.map(zahlungHtml).join("") : "<p>Keine offenen Zahlungen.</p>"}`;
  }

  if (typ === "bezahlt") {
    const list = zahlungen.filter(z => z.status === "bezahlt");
    el("dashboardDetailInhalt").innerHTML = `<h2>Bezahlte Zahlungen</h2>${list.length ? list.map(zahlungHtml).join("") : "<p>Keine bezahlten Zahlungen.</p>"}`;
  }
}

/* BACKUP */

function backupExportieren() {
  const daten = {
    kunden,
    standorte,
    objekte,
    positionen,
    zahlungen,
    einstellungen,
    exportiertAm: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(daten, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "mietpilot_backup_" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();

  URL.revokeObjectURL(url);
}

function backupImportieren(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const daten = JSON.parse(e.target.result);

      if (!confirm("Backup wirklich importieren? Aktuelle Daten werden ersetzt.")) return;

      kunden = daten.kunden || [];
      standorte = daten.standorte || [];
      objekte = daten.objekte || [];
      positionen = daten.positionen || [];
      zahlungen = daten.zahlungen || [];
      einstellungen = daten.einstellungen || {};

      speichern();
      anzeigen();
      alert("Backup importiert.");
    } catch (err) {
      alert("Backup konnte nicht gelesen werden.");
    }
  };

  reader.readAsText(file);
}

/* EINSTELLUNGEN */

function einstellungenSpeichern() {
  einstellungen = {
    firmaName: el("firmaName").value,
    firmaAdresse: el("firmaAdresse").value,
    firmaEmail: el("firmaEmail").value,
    firmaTelefon: el("firmaTelefon").value,
    sprache: el("sprache").value,
    land: el("land").value,
    waehrung: el("waehrung").value,
    push: el("push").value
  };

  speichern();
  alert("Einstellungen gespeichert.");
}

function einstellungenLaden() {
  if (!el("firmaName")) return;

  el("firmaName").value = einstellungen.firmaName || "";
  el("firmaAdresse").value = einstellungen.firmaAdresse || "";
  el("firmaEmail").value = einstellungen.firmaEmail || "";
  el("firmaTelefon").value = einstellungen.firmaTelefon || "";
  el("sprache").value = einstellungen.sprache || "de";
  el("land").value = einstellungen.land || "deutschland";
  el("waehrung").value = einstellungen.waehrung || "EUR";
  el("push").value = einstellungen.push || "aus";
}

/* ANZEIGE */

function anzeigen() {
  const suche = (el("kundenSuche")?.value || "").toLowerCase();
  const filter = el("kundenFilter")?.value || "aktiv";

  const kundenGefiltert = kunden.filter(k => {
    const ps = positionen.filter(p => p.kundeId === k.id);
    const text = `${k.name} ${k.telefon} ${k.email} ${k.nummer}`.toLowerCase();

    if (!text.includes(suche)) return false;
    if (filter === "aktiv") return k.status !== "archiv" && ps.some(p => p.status === "aktiv");
    if (filter === "interessent") return k.status !== "archiv" && ps.length === 0;
    if (filter === "gekündigt") return ps.some(p => p.status === "gekündigt" || p.status === "beendet");
    if (filter === "archiv") return k.status === "archiv";
    return true;
  });

  if (el("kundenListe")) {
    el("kundenListe").innerHTML = kundenGefiltert.map(k => `
      <div class="item clickable ${k.status === "archiv" ? "archiv" : ""}" onclick="kundeOeffnen(${k.id})">
        <b>${k.name}</b>
        <small>
          Kundennummer: ${k.nummer}<br>
          Telefon: ${k.telefon || "-"}<br>
          Positionen: ${positionen.filter(p => p.kundeId === k.id).length}
        </small>
      </div>
    `).join("") || "<p>Keine Kunden gefunden.</p>";
  }

  if (el("standorteListe")) {
    el("standorteListe").innerHTML = standorte.map(s => `
      <div class="item">
        <b>${s.name}</b>
        <small>${s.strasse || ""}, ${s.ort || ""}</small>

        ${kategorien.map(kat => {
          const gesamt = objekte.filter(o => Number(o.standortId) === Number(s.id) && o.kategorie === kat).length;
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
  }

  if (el("dashboardStandorte")) {
    el("dashboardStandorte").innerHTML = standorte.map(s => {
      const ps = positionen.filter(p => Number(p.standortId) === Number(s.id) && p.status === "aktiv");
      const frei = objekte.filter(o => Number(o.standortId) === Number(s.id) && o.status === "frei").length;
      const belegt = objekte.filter(o => Number(o.standortId) === Number(s.id) && o.status === "belegt").length;

      return `
        <div class="item clickable" onclick="standortOeffnen(${s.id})">
          <b>${s.name}</b>
          <small>
            Aktive Positionen: ${ps.length}<br>
            Frei: ${frei}<br>
            Belegt: ${belegt}<br>
            Brutto: ${euro(ps.reduce((sum, p) => sum + Number(p.brutto || 0), 0))}
          </small>
        </div>
      `;
    }).join("") || "<p>Noch keine Standorte.</p>";
  }

  const zahlungsFilter = el("zahlungsFilter")?.value || "alle";
  const zahlungenGefiltert = zahlungen.filter(z => zahlungsFilter === "alle" || z.status === zahlungsFilter);

  if (el("zahlungenListe")) {
    el("zahlungenListe").innerHTML = zahlungenGefiltert.length
      ? zahlungenGefiltert.map(zahlungHtml).join("")
      : "<p>Noch keine Zahlungen.</p>";
  }

  const bruttoAktiv = positionen.filter(p => p.status === "aktiv").reduce((s, p) => s + Number(p.brutto || 0), 0);
  const offen = zahlungen.filter(z => z.status === "offen").reduce((s, z) => s + Number(z.brutto || 0), 0);
  const bezahlt = zahlungen.filter(z => z.status === "bezahlt").reduce((s, z) => s + Number(z.brutto || 0), 0);

  if (el("dashKunden")) el("dashKunden").innerText = kunden.filter(k => k.status !== "archiv").length;
  if (el("dashMiete")) el("dashMiete").innerText = euro(bruttoAktiv);
  if (el("dashOffen")) el("dashOffen").innerText = euro(offen);
  if (el("dashBezahlt")) el("dashBezahlt").innerText = euro(bezahlt);

  if (el("auswertungInhalt")) {
    el("auswertungInhalt").innerHTML = `
      <div class="summary">
        <div><span>Aktive Bruttomiete</span><b>${euro(bruttoAktiv)}</b></div>
        <div><span>Bezahlt</span><b>${euro(bezahlt)}</b></div>
        <div><span>Offen</span><b>${euro(offen)}</b></div>
        <div><span>Zahlungen</span><b>${zahlungen.length}</b></div>
      </div>
    `;
  }

  einstellungenLaden();
}

/* DEMO / RESET */

function demoLaden() {
  standorte = [
    { id: 1, name: "Mietpark Gelnhausen", strasse: "Imbruchgrund 4", ort: "Gelnhausen" },
    { id: 2, name: "Reußweg Stellplätze", strasse: "Reußweg", ort: "Gelnhausen" }
  ];

  objekte = [];
  kunden = [];
  positionen = [];
  zahlungen = [];

  for (let i = 1; i <= 5; i++) {
    objekte.push({
      id: Date.now() + Math.random(),
      standortId: 1,
      kategorie: "Container",
      name: "Container " + i,
      status: "frei"
    });
  }

  for (let i = 1; i <= 2; i++) {
    objekte.push({
      id: Date.now() + Math.random(),
      standortId: 2,
      kategorie: "Stellplatz",
      name: "Stellplatz " + i,
      status: "frei"
    });
  }

  speichern();
  anzeigen();
  alert("Demo-Daten geladen.");
}

function allesLoeschen() {
  if (!confirm("Alles löschen?")) return;

  kunden = [];
  standorte = [];
  objekte = [];
  positionen = [];
  zahlungen = [];

  speichern();
  anzeigen();
}

anzeigen();