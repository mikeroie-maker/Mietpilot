let kunden = JSON.parse(localStorage.getItem("mp84_kunden")) || [];
let standorte = JSON.parse(localStorage.getItem("mp84_standorte")) || [];
let objekte = JSON.parse(localStorage.getItem("mp84_objekte")) || [];
let positionen = JSON.parse(localStorage.getItem("mp84_positionen")) || [];
let zahlungen = JSON.parse(localStorage.getItem("mp84_zahlungen")) || [];

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
  localStorage.setItem("mp84_kunden", JSON.stringify(kunden));
  localStorage.setItem("mp84_standorte", JSON.stringify(standorte));
  localStorage.setItem("mp84_objekte", JSON.stringify(objekte));
  localStorage.setItem("mp84_positionen", JSON.stringify(positionen));
  localStorage.setItem("mp84_zahlungen", JSON.stringify(zahlungen));
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
  return standorte.find(s => s.id === id);
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
    return {
      netto,
      brutto,
      mwstBetrag: brutto - netto
    };
  }

  const netto = Number(miete || 0);
  const brutto = netto + netto * steuer / 100;

  return {
    netto,
    brutto,
    mwstBetrag: brutto - netto
  };
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

  el("kundeName").value = "";
  el("kundeTelefon").value = "";
  el("kundeEmail").value = "";
  el("kundeTyp").value = "privat";

  el("neuKategorie").value = "";
  el("neuAnzahl").value = 1;
  el("neuMiete").value = "";
  el("neuMwst").value = "19";
  el("neuMietbeginn").value = "";
  el("neuFaelligkeit").value = "";
  el("neuKaution").value = "";

  standortOptionen("neuStandort");
  verfuegbarkeitNeu();
}

function formSchliessen() {
  el("kundenForm").classList.add("hidden");
  bearbeiteKundeId = null;
}

function kundeSpeichern() {
  if (!el("kundeName").value.trim()) {
    alert("Bitte Namen eintragen.");
    return;
  }

  if (bearbeiteKundeId) {
    const k = kunde(bearbeiteKundeId);
    k.name = el("kundeName").value;
    k.telefon = el("kundeTelefon").value;
    k.email = el("kundeEmail").value;
    k.typ = el("kundeTyp").value;

    speichern();
    formSchliessen();
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
      kaution: Number(el("neuKaution").value || 0)
    });

    if (!ok) {
      kunden = kunden.filter(x => x.id !== k.id);
      speichern();
      return;
    }
  }

  speichern();
  formSchliessen();
  kundeOeffnen(k.id);
}

function kundeBearbeiten(id) {
  const k = kunde(id);
  if (!k) return;

  bearbeiteKundeId = id;

  el("kundenFormTitel").innerText = "Kunde bearbeiten";
  el("kundenForm").classList.remove("hidden");

  el("kundeName").value = k.name || "";
  el("kundeTelefon").value = k.telefon || "";
  el("kundeEmail").value = k.email || "";
  el("kundeTyp").value = k.typ || "privat";

  el("neuKategorie").value = "";
  verfuegbarkeitNeu();

  seite("kundenPage");
}

function kundeOeffnen(id) {
  aktiverKundeId = id;

  const k = kunde(id);
  if (!k) return;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  el("kundeDetail").classList.add("active");

  const ps = positionen.filter(p => p.kundeId === id);
  const zs = zahlungen.filter(z => z.kundeId === id);

  const aktiveMiete = ps
    .filter(p => p.status === "aktiv")
    .reduce((s, p) => s + Number(p.brutto || 0), 0);

  const bezahlt = zs
    .filter(z => z.status === "bezahlt")
    .reduce((s, z) => s + Number(z.brutto || 0), 0);

  const offen = zs
    .filter(z => z.status === "offen")
    .reduce((s, z) => s + Number(z.brutto || 0), 0);

  el("kundeDetailInhalt").innerHTML = `
    <h2>${k.name}</h2>

    <div class="item">
      <b>Kundendaten</b>
      <small>
        Kundennummer: ${k.nummer}<br>
        Status: ${k.status || "aktiv"}<br>
        Typ: ${k.typ}<br>
        Telefon: ${k.telefon || "-"}<br>
        E-Mail: ${k.email || "-"}
      </small>
    </div>

    <div class="summary">
      <div><span>Aktive Monatsmiete</span><b>${euro(aktiveMiete)}</b></div>
      <div><span>Bezahlt gesamt</span><b>${euro(bezahlt)}</b></div>
      <div><span>Offen gesamt</span><b>${euro(offen)}</b></div>
      <div><span>Zahlungen</span><b>${zs.length}</b></div>
    </div>

    <button onclick="kundeBearbeiten(${k.id})">Kunde bearbeiten</button>
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
    kaution: Number(el("posKaution").value || 0)
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
    <div class="item ${p.status === "aktiv" ? "belegt" : "archiv"}">
      <b>${p.kategorie} · ${p.objektName}</b>
      <small>
        Standort: ${p.standortName}<br>
        Status: ${p.status}<br>
        Brutto: ${euro(p.brutto)}<br>
        Mietbeginn: ${p.mietbeginn || "-"}<br>
        Kaution: ${euro(p.kaution)}
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
  const vorhanden = objekte.filter(o => o.standortId === standortId && o.kategorie === kategorie);
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

/* ZAHLUNGEN */

function aktuellerMonat() {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

function zahlungErzeugen(k, p, monat, status) {
  const vorhanden = zahlungen.some(z => z.positionId === p.id && z.monat === monat);
  if (vorhanden) return;

  zahlungen.push({
    id: Date.now() + Math.random(),
    kundeId: k.id,
    positionId: p.id,
    name: k.name,
    kundennummer: k.nummer,
    monat,
    datum: new Date().toISOString().slice(0, 10),
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
    zahlungErzeugen(k, p, monat, status);
    d.setMonth(d.getMonth() + 1);
  }

  speichern();
  kundeOeffnen(p.kundeId);
}

function zahlungToggle(id) {
  const z = zahlungen.find(x => x.id === id);
  if (!z) return;

  z.status = z.status === "bezahlt" ? "offen" : "bezahlt";

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
}

function zahlungHtml(z) {
  return `
    <div class="item ${z.status}">
      <b>${z.name}</b>
      <small>
        ${z.kategorie} · ${z.objektName}<br>
        Monat: ${z.monat}<br>
        Brutto: ${euro(z.brutto)}
      </small>
      <div class="status">${z.status === "bezahlt" ? "✅ BEZAHLT" : "❌ OFFEN"}</div>
      ${z.mahnstufe === 1 ? `<div class="mahnungGesetzt">1. Mahnung gesetzt</div>` : ""}
      <button onclick="zahlungToggle(${z.id})">${z.status === "offen" ? "Als bezahlt markieren" : "Wieder offen setzen"}</button>
      ${z.status === "offen" ? `<button class="orange" onclick="mahnungSetzen(${z.id})">1. Mahnung markieren</button>` : ""}
    </div>
  `;
}

/* ANZEIGE */

function anzeigen() {
  const suche = (el("kundenSuche")?.value || "").toLowerCase();
  const filter = el("kundenFilter")?.value || "alle";

  const kundenGefiltert = kunden.filter(k => {
    const ps = positionen.filter(p => p.kundeId === k.id);
    const text = `${k.name} ${k.telefon} ${k.email}`.toLowerCase();

    if (!text.includes(suche)) return false;
    if (filter === "aktiv") return k.status !== "archiv" && ps.some(p => p.status === "aktiv");
    if (filter === "archiv") return k.status === "archiv";
    return true;
  });

  el("kundenListe").innerHTML = kundenGefiltert.map(k => `
    <div class="item clickable" onclick="kundeOeffnen(${k.id})">
      <b>${k.name}</b>
      <small>
        Kundennummer: ${k.nummer}<br>
        Telefon: ${k.telefon || "-"}<br>
        Positionen: ${positionen.filter(p => p.kundeId === k.id).length}
      </small>
    </div>
  `).join("") || "<p>Keine Kunden gefunden.</p>";

  el("standorteListe").innerHTML = standorte.map(s => `
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

  el("dashboardStandorte").innerHTML = standorte.map(s => {
    const ps = positionen.filter(p => p.standortId === s.id && p.status === "aktiv");
    return `
      <div class="item">
        <b>${s.name}</b>
        <small>
          Aktive Positionen: ${ps.length}<br>
          Brutto: ${euro(ps.reduce((sum, p) => sum + Number(p.brutto || 0), 0))}
        </small>
      </div>
    `;
  }).join("");

  el("zahlungenListe").innerHTML = zahlungen.length
    ? zahlungen.map(zahlungHtml).join("")
    : "<p>Noch keine Zahlungen.</p>";

  const bruttoAktiv = positionen
    .filter(p => p.status === "aktiv")
    .reduce((s, p) => s + Number(p.brutto || 0), 0);

  const offen = zahlungen
    .filter(z => z.status === "offen")
    .reduce((s, z) => s + Number(z.brutto || 0), 0);

  const bezahlt = zahlungen
    .filter(z => z.status === "bezahlt")
    .reduce((s, z) => s + Number(z.brutto || 0), 0);

  el("dashKunden").innerText = kunden.filter(k => k.status !== "archiv").length;
  el("dashMiete").innerText = euro(bruttoAktiv);
  el("dashOffen").innerText = euro(offen);
  el("dashBezahlt").innerText = euro(bezahlt);

  el("auswertungInhalt").innerHTML = `
    <div class="summary">
      <div><span>Aktive Bruttomiete</span><b>${euro(bruttoAktiv)}</b></div>
      <div><span>Bezahlt</span><b>${euro(bezahlt)}</b></div>
      <div><span>Offen</span><b>${euro(offen)}</b></div>
      <div><span>Zahlungen</span><b>${zahlungen.length}</b></div>
    </div>
  `;
}

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