import readXlsxFile from "read-excel-file/browser";
import workbookUrl from "../../clean_data/clean_3tabs.xlsx?url";

let dashboardDataPromise;

const parseApplicableMetric = value => {
  if (value == null || String(value).trim() === "" || String(value).trim().toLowerCase() === "n.p.") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readSheet = (workbook, sheetName) => {
  const sheet = workbook.find(item => item.sheet === sheetName);
  if (!sheet) {
    throw new Error(`The workbook is missing the "${sheetName}" sheet.`);
  }
  const [headerRow, ...rows] = sheet.data;
  if (!headerRow) {
    throw new Error(`The "${sheetName}" sheet does not contain a header row.`);
  }
  const headers = headerRow.map(header => String(header ?? "").trim());
  return rows.map(row => Object.fromEntries(
    headers.flatMap((header, index) => header ? [[header, row[index] ?? null]] : [])
  ));
};

export function loadDashboardData() {
  if (!dashboardDataPromise) {
    dashboardDataPromise = fetch(workbookUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Workbook request failed with HTTP ${response.status}.`);
        }
        return response.arrayBuffer();
      })
      .then(buffer => {
        return readXlsxFile(buffer);
      })
      .then(workbook => {
        const nationalData = readSheet(workbook, "hospitalisation_injury").map(row => ({
          calendar_year: +row.calendar_year,
          month: row.month,
          cause_of_injury: row.cause_of_injury,
          remoteness_area: row.remoteness_area,
          count_cases: parseApplicableMetric(row.count_cases),
          hospitalisations: parseApplicableMetric(row.hospitalisations),
          bed_days: parseApplicableMetric(row.bed_days),
          died_cases: parseApplicableMetric(row.died_cases),
          age_group: row.age_group,
          sex: row.sex,
          road_user: row.road_user,
          counterparty: row.counterparty
        }));
        const jurisdictionData = readSheet(workbook, "state-and-territory").map(row => ({
          calendar_year: +row.calendar_year,
          period: row.period,
          hospitalisations: parseApplicableMetric(row.hospitalisations),
          bed_days: parseApplicableMetric(row.bed_days),
          jurisdiction: row.jurisdiction,
          dimension: row.dimension,
          category: row.category
        }));
        const firstNationsData = readSheet(workbook, "First-Nations-hospitalised").map(row => ({
          calendar_year: +row.calendar_year,
          period: String(row.period || "").trim(),
          hospitalisations: parseApplicableMetric(row.hospitalisations),
          bed_days: parseApplicableMetric(row.bed_days),
          first_nations_status: row.first_nations_status,
          category: row.category,
          dimension: row.dimension
        }));

        return { nationalData, jurisdictionData, firstNationsData };
      })
      .catch(error => {
        dashboardDataPromise = undefined;
        throw error;
      });
  }
  return dashboardDataPromise;
}
