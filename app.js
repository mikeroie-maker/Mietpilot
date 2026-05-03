let kunden = JSON.parse(localStorage.getItem("kunden")) || [];

function speichern() {
  localStorage.setItem("kunden", JSON.stringify(kunden));
}

function anzeigen() {
  let liste = document.getElementById("kundenListe");
  liste.innerHTML = "";

  kunden.forEach((kunde, index) => {
    liste.innerHTML += `
      <div class="item">
        <strong>${kunde.name}</strong><br>
        Miete: ${kunde.miete} €<br>
        <button onclick="loeschen(${index})">Löschen</button>
      </div>
    `;
  });
}

function addKunde() {
  let name = document.getElementById("name").value;
  let miete = document.getElementById("miete").value;

  if (!name || !miete) {
    alert("Bitte Name und Miete eintragen");
    return;
  }

  kunden.push({ name, miete });
  speichern();
  anzeigen();

  document.getElementById("name").value = "";
  document.getElementById("miete").value = "";
}

function loeschen(index) {
  kunden.splice(index, 1);
  speichern();
  anzeigen();
}

function demo() {
  kunden = [
    { name: "Max Mustermann", miete: "149" },
    { name: "Firma Schneider GmbH", miete: "220" }
  ];
  speichern();
  anzeigen();
}

anzeigen();