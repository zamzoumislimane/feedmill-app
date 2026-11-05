const form = document.querySelector("#feedmill-form");
const summary = document.querySelector("#summary");
const alerts = document.querySelector("#alerts");
const priorities = document.querySelector("#priorities");
const resetButton = document.querySelector("#reset-button");

const comparableMedian = {
  electricityIntensity: 20,
  energyCost: 55,
  laborCost: 80,
  throughput: 14,
  marginGap: 420,
};

const formatNumber = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("fr-MA", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const checkedValues = (name) =>
  [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((item) => item.value);

const divide = (numerator, denominator) => {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
};

const makeCard = ({ title, value, unit, detail, status = "ok" }) => `
  <article class="metric ${status}">
    <span>${title}</span>
    <strong>${value}</strong>
    <small>${unit || ""}${detail ? ` · ${detail}` : ""}</small>
  </article>
`;

const addAlert = (messages, type, text) => {
  messages.push(`<p class="${type}">${text}</p>`);
};

const improvementAxes = {
  "purchase-formulation-quality":
    "Axe choisi : Achat / Formulation / Qualite. TOPOLIS optimisera les achats, substitutions, prix rendu usine, qualite MP et ecarts formule vs reel.",
  process:
    "Axe choisi : Process. TOPOLIS optimisera energie, debit, arrets, maintenance, rendement ligne et organisation des series.",
  logistics:
    "Axe choisi : Logistiques. TOPOLIS optimisera logistique amont MP, stockage, distribution aliment fini, remplissage camion et distances.",
  other:
    "Axe choisi : Autres. TOPOLIS proposera d'abord une fiabilisation des donnees, puis isolera les pertes, rework, marge ou points hors standard.",
};

const getCalendarHours = (monthValue) => {
  if (!monthValue) return null;
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return null;
  return new Date(year, month, 0).getDate() * 24;
};

const calculate = () => {
  const data = new FormData(form);
  const productionTons = toNumber(data.get("productionTons"));
  const materialCost = toNumber(data.get("materialCost"));
  const purchasePrice = toNumber(data.get("purchasePrice"));
  const kwh = toNumber(data.get("kwh"));
  const electricCost = toNumber(data.get("electricCost"));
  const thermalCost = toNumber(data.get("thermalCost"));
  const laborCost = toNumber(data.get("laborCost"));
  const laborHours = toNumber(data.get("laborHours"));
  const lineTons = toNumber(data.get("lineTons"));
  const lineHours = toNumber(data.get("lineHours"));
  const soldTons = toNumber(data.get("soldTons"));
  const revenue = toNumber(data.get("revenue"));
  const soldMaterialCost = toNumber(data.get("soldMaterialCost"));
  const pelletShare = toNumber(data.get("pelletShare"));
  const feedConversion = toNumber(data.get("feedConversion"));

  const forms = checkedValues("forms");
  const bottlenecks = checkedValues("bottlenecks");
  const month = data.get("month");
  const calendarHours = getCalendarHours(month);
  const thermalStatus = data.get("thermalStatus");
  const meterScope = data.get("meterScope");
  const improvementAxis = data.get("improvementAxis");

  const totalEnergyCost =
    electricCost === null && thermalCost === null
      ? null
      : (electricCost || 0) + (thermalStatus === "Oui" ? thermalCost || 0 : 0);

  const metrics = {
    materialCost,
    purchasePrice,
    electricityIntensity: divide(kwh, productionTons),
    energyCost: divide(totalEnergyCost, productionTons),
    laborCost: divide(laborCost, productionTons),
    laborHours: divide(laborHours, productionTons),
    throughput: divide(lineTons, lineHours),
    averageSalePrice: divide(revenue, soldTons),
    marginGap:
      divide(revenue, soldTons) !== null && soldMaterialCost !== null
        ? divide(revenue, soldTons) - soldMaterialCost
        : null,
    producedTonCost:
      materialCost !== null && divide(totalEnergyCost, productionTons) !== null && divide(laborCost, productionTons) !== null
        ? materialCost + divide(totalEnergyCost, productionTons) + divide(laborCost, productionTons)
        : null,
    feedConversion,
  };

  const alertMessages = [];
  if (forms.length === 0) {
    addAlert(alertMessages, "warning", "Selectionnez au moins une forme fabriquee.");
  }
  if (pelletShare !== null && (pelletShare < 0 || pelletShare > 100)) {
    addAlert(alertMessages, "danger", "La part granules + miettes doit rester entre 0 et 100%.");
  }
  if (productionTons > 0 && kwh === 0) {
    addAlert(alertMessages, "warning", "Production positive avec electricite nulle : chiffre a confirmer.");
  }
  if (productionTons > 0 && materialCost === 0) {
    addAlert(alertMessages, "warning", "Production positive avec cout matiere nul : chiffre a confirmer.");
  }
  if (soldTons !== null && productionTons !== null && soldTons > productionTons) {
    addAlert(alertMessages, "warning", "Les ventes depassent la fabrication : verifier sortie de stock ou perimetre.");
  }
  if (calendarHours !== null && lineHours !== null && lineHours > calendarHours) {
    addAlert(alertMessages, "danger", "Les heures de marche de ligne depassent les heures calendaires du mois.");
  }
  if (lineTons !== null && productionTons !== null && lineTons > productionTons) {
    addAlert(alertMessages, "danger", "Le tonnage de ligne depasse le tonnage total du site.");
  }
  if (lineTons > 0 && lineHours === 0) {
    addAlert(alertMessages, "danger", "Une ligne productive avec zero heure doit etre corrigee.");
  }
  if (meterScope === "Compteur partage" && metrics.electricityIntensity !== null) {
    addAlert(alertMessages, "warning", "Compteur partage : intensite visible mais exclue du benchmark.");
  }

  const coreMetrics = [
    metrics.materialCost,
    meterScope === "Fabrication seule" ? metrics.electricityIntensity : null,
    metrics.laborCost,
    metrics.throughput,
    metrics.averageSalePrice,
    metrics.marginGap,
  ];
  const coverage = coreMetrics.filter((value) => value !== null).length;

  summary.innerHTML = [
    makeCard({
      title: "Couverture donnees",
      value: `${coverage}/6`,
      unit: "indicateurs cles calculables",
      detail: "objectif pilote",
    }),
    makeCard({
      title: "Volume fabrique",
      value: formatNumber(productionTons || 0),
      unit: "t/mois",
      detail: data.get("family") || "famille non renseignee",
    }),
    makeCard({
      title: "Cout matiere",
      value: materialCost === null ? "-" : formatNumber(materialCost),
      unit: "MAD HT/t",
      detail: data.get("materialBasis") || "base non precisee",
    }),
    makeCard({
      title: "Prix achat rendu",
      value: purchasePrice === null ? "-" : formatNumber(purchasePrice),
      unit: "MAD HT/t",
      detail: data.get("purchaseItem") || "matiere non renseignee",
    }),
    makeCard({
      title: "Intensite electrique",
      value: metrics.electricityIntensity === null ? "-" : formatNumber(metrics.electricityIntensity),
      unit: "kWh/t",
      detail: meterScope,
      status: metrics.electricityIntensity > comparableMedian.electricityIntensity ? "watch" : "ok",
    }),
    makeCard({
      title: "Cout energie",
      value: metrics.energyCost === null ? "-" : formatNumber(metrics.energyCost),
      unit: "MAD/t",
      detail: thermalStatus === "Inconnu" ? "thermique inconnu" : "elec. + thermique",
      status: metrics.energyCost > comparableMedian.energyCost ? "watch" : "ok",
    }),
    makeCard({
      title: "Main-d'oeuvre directe",
      value: metrics.laborCost === null ? "-" : formatNumber(metrics.laborCost),
      unit: "MAD/t",
      detail: metrics.laborHours === null ? "" : `${formatNumber(metrics.laborHours, 3)} h/t`,
      status: metrics.laborCost > comparableMedian.laborCost ? "watch" : "ok",
    }),
    makeCard({
      title: "Debit reel",
      value: metrics.throughput === null ? "-" : formatNumber(metrics.throughput),
      unit: "t/h",
      detail: data.get("lineName") || "ligne non renseignee",
      status: metrics.throughput !== null && metrics.throughput < comparableMedian.throughput ? "watch" : "ok",
    }),
    makeCard({
      title: "Prix vente moyen",
      value: metrics.averageSalePrice === null ? "-" : formatNumber(metrics.averageSalePrice),
      unit: "MAD HT/t vendue",
    }),
    makeCard({
      title: "Ecart sur matiere",
      value: metrics.marginGap === null ? "-" : formatNumber(metrics.marginGap),
      unit: "MAD/t vendue",
      detail: "prix net - cout matiere vendue",
      status: metrics.marginGap !== null && metrics.marginGap < comparableMedian.marginGap ? "watch" : "ok",
    }),
    makeCard({
      title: "Cout d'une tonne produite",
      value: metrics.producedTonCost === null ? "-" : formatNumber(metrics.producedTonCost),
      unit: "MAD/t produite",
      detail: "matiere + energie + main-d'oeuvre",
    }),
    makeCard({
      title: "Performance client",
      value: feedConversion === null ? "-" : formatNumber(feedConversion, 3),
      unit: "kg/kg",
      detail: data.get("batchCount") ? `${data.get("batchCount")} lots` : "",
    }),
  ].join("");

  const priorityList = [];
  if (improvementAxis && improvementAxes[improvementAxis]) {
    priorityList.push(improvementAxes[improvementAxis]);
  }
  if (metrics.electricityIntensity > comparableMedian.electricityIntensity && meterScope === "Fabrication seule") {
    const excess = (metrics.electricityIntensity - comparableMedian.electricityIntensity) * productionTons;
    priorityList.push(`Verifier energie : +${formatNumber(metrics.electricityIntensity - comparableMedian.electricityIntensity)} kWh/t vs mediane pilote, soit ${formatNumber(excess, 0)} kWh a investiguer.`);
  }
  if (metrics.throughput !== null && metrics.throughput < comparableMedian.throughput) {
    priorityList.push(`Analyser debit ligne : ${formatNumber(metrics.throughput)} t/h vs reference pilote ${comparableMedian.throughput} t/h.`);
  }
  if (metrics.marginGap !== null && metrics.marginGap < comparableMedian.marginGap) {
    priorityList.push(`Controler marge matiere : ecart ${formatNumber(metrics.marginGap)} MAD/t, inferieur a la reference pilote.`);
  }
  if (coverage < 4) {
    priorityList.push("Completer les donnees manquantes sur cout matiere, energie, main-d'oeuvre, debit, ventes et marge.");
  }
  if (bottlenecks.length > 0) {
    priorityList.push(`Freins declares a verifier terrain : ${bottlenecks.slice(0, 3).join(", ")}.`);
  }

  alerts.innerHTML = alertMessages.length ? alertMessages.join("") : '<p class="success">Aucune alerte bloquante detectee.</p>';
  priorities.innerHTML = (priorityList.length ? priorityList.slice(0, 3) : ["Aucune priorite critique avec les donnees saisies."])
    .map((item) => `<li>${item}</li>`)
    .join("");
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  calculate();
});

resetButton.addEventListener("click", () => {
  form.reset();
  summary.innerHTML = "";
  alerts.innerHTML = "";
  priorities.innerHTML = "<li>Renseignez une fiche pour obtenir les priorites.</li>";
});
