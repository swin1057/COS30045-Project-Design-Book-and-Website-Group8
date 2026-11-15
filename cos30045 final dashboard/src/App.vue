<script setup>
import { computed, onMounted, ref } from "vue";
import * as d3 from "d3";
import * as d3Sankey from "d3-sankey";
import { loadDashboardData } from "./services/dashboard-data.js";
import AnnualInjuryStory from "./components/AnnualInjuryStory.vue";

window.d3 = { ...d3, ...d3Sankey };

const base = import.meta.env.BASE_URL;
const chartScriptFiles = [
  "chart-config.js",
  "chart-interactions.js",
  "annual-trend.js",
  "age-group-summary.js",
  "monthly-injury-heatmap.js",
  "annual-profile-matrix.js",
  "road-user-flows.js",
  "age-year-heatmap.js",
  "age-composition.js",
  "age-remoteness-sex.js",
  "jurisdiction-charts.js",
  "first-nations-remoteness.js",
  "first-nations-heatmap.js",
  "chart-api.js"
];

let chartScriptsPromise;
const activeTab = ref("overview");
const mobileMenuOpen = ref(false);
const loading = ref(true);
const dashboardError = ref("");
const chartErrors = ref([]);
const dashboardData = ref(null);
const navigationItems = [
  { value: "overview", label: "Overview" },
  { value: "jurisdictions", label: "Jurisdictions" },
  { value: "first-nations", label: "First Nations" },
  { value: "story", label: "Story" }
];

const totalHospitalisations = computed(() => {
  if (!dashboardData.value) return null;
  return d3.sum(dashboardData.value.nationalData, row =>
    Number.isFinite(row.hospitalisations) ? row.hospitalisations : 0
  );
});
const totalBedDays = computed(() => {
  if (!dashboardData.value) return null;
  return d3.sum(dashboardData.value.nationalData, row =>
    Number.isFinite(row.bed_days) ? row.bed_days : 0
  );
});
const yearsCovered = computed(() => {
  if (!dashboardData.value) return "2011–2021";
  const years = dashboardData.value.nationalData
    .map(row => row.calendar_year)
    .filter(Number.isFinite);
  return `${d3.min(years)}–${d3.max(years)}`;
});
const numberFormat = d3.format(",.0f");

function loadChartScripts() {
  if (!chartScriptsPromise) {
    chartScriptsPromise = chartScriptFiles.reduce((promise, fileName) =>
      promise.then(() => new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${base}charts/${fileName}`;
        script.dataset.dashboardChart = fileName;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Could not load chart script "${fileName}".`));
        document.body.appendChild(script);
      })), Promise.resolve())
      .then(() => {
        const chartApi = window.roadSafetyDashboardCharts;
        if (!chartApi) {
          throw new Error("The dashboard chart API did not initialize.");
        }
        return chartApi;
      })
      .catch(error => {
        chartScriptsPromise = undefined;
        throw error;
      });
  }
  return chartScriptsPromise;
}

function renderCharts(data, chartApi) {
  const chartCalls = [
    ["Annual trend", () => chartApi.drawAnnualTrendChart(data.nationalData)],
    ["Age-group summary", () => chartApi.drawAgeGroupChart(data.nationalData)],
    ["Monthly injury heatmap", () => chartApi.drawHighDensityHeatmap(data.nationalData)],
    ["Annual profile matrix", () => chartApi.drawProfileMatrix(data.nationalData)],
    ["Road-user flows", () => chartApi.drawRoadUserSankey(data.nationalData)],
    ["Age-by-year heatmap", () => chartApi.drawAgeYearHeatmap(data.nationalData)],
    ["Age composition", () => chartApi.drawAgeCompositionChart(data.nationalData)],
    ["Age, remoteness, and sex chart", () => chartApi.drawAgeSexGrandTotalChart(data.nationalData)],
    ["Jurisdiction charts", () => chartApi.drawStateBreakdownCharts(data.jurisdictionData)],
    ["First Nations remoteness chart", () => chartApi.drawFirstNationsCharts(data.firstNationsData)],
    ["First Nations heatmap", () => chartApi.drawFirstNationsHeatmap(data.firstNationsData)]
  ];

  chartErrors.value = chartCalls.flatMap(([label, draw]) => {
    try {
      draw();
      return [];
    } catch (error) {
      console.error(`${label} failed to render:`, error);
      return [`${label}: ${error.message}`];
    }
  });
}

onMounted(async () => {
  try {
    const [data, chartApi] = await Promise.all([
      loadDashboardData(),
      loadChartScripts()
    ]);
    dashboardData.value = data;
    renderCharts(data, chartApi);
  } catch (error) {
    console.error("Dashboard initialization failed:", error);
    dashboardError.value = error.message || "The dashboard could not be initialized.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <v-app class="dashboard-app">
    <v-app-bar flat class="dashboard-app-bar">
      <v-container fluid class="dashboard-app-bar-inner">
        <v-menu v-model="mobileMenuOpen" location="bottom start">
          <template #activator="{ props: menuProps }">
            <button
              v-bind="menuProps"
              type="button"
              class="mobile-navigation-toggle"
              aria-label="Open dashboard navigation"
              :aria-expanded="mobileMenuOpen"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
            </button>
          </template>
          <v-list aria-label="Dashboard sections">
            <v-list-item
              v-for="item in navigationItems"
              :key="item.value"
              :title="item.label"
              :active="activeTab === item.value"
              @click="activeTab = item.value; mobileMenuOpen = false"
            />
          </v-list>
        </v-menu>
        <div class="brand-lockup">
          <div class="brand-mark" aria-hidden="true">RS</div>
          <div>
            <div class="brand-title">Road Safety</div>
            <div class="brand-subtitle">Australian injury dashboard</div>
          </div>
        </div>
        <v-tabs
          v-model="activeTab"
          color="primary"
          class="dashboard-tabs desktop-navigation"
          aria-label="Dashboard sections"
        >
          <v-tab v-for="item in navigationItems" :key="item.value" :value="item.value">
            {{ item.label }}
          </v-tab>
        </v-tabs>
        <v-chip variant="outlined" size="small" class="period-chip">
          {{ yearsCovered }}
        </v-chip>
      </v-container>
    </v-app-bar>

    <v-main>
      <v-container fluid class="dashboard-shell">
        <v-alert
          v-if="dashboardError"
          type="error"
          variant="tonal"
          class="dashboard-alert"
        >
          {{ dashboardError }}
        </v-alert>
        <v-alert
          v-for="error in chartErrors"
          :key="error"
          type="warning"
          variant="tonal"
          class="dashboard-alert"
        >
          {{ error }}
        </v-alert>

        <v-tabs-window v-model="activeTab" class="dashboard-tab-panels">
          <v-tabs-window-item value="overview" eager>
            <header class="dashboard-intro">
              <div>
                <p class="eyebrow">HOSPITALISATIONS · BED DAYS · DEMOGRAPHICS</p>
                <h1>Road injury burden in Australia</h1>
                <p class="intro-copy">
                  Explore hospital admissions and inpatient bed days over time, across jurisdictions, and by population group.
                </p>
              </div>
              <div class="intro-meta">
                <span class="status-dot" :class="{ 'is-loading': loading }"></span>
                <span v-if="loading">Loading workbook…</span>
                <span v-else-if="!dashboardError">Workbook loaded</span>
                <span v-else>Data unavailable</span>
              </div>
            </header>

            <div class="summary-strip" aria-label="Dashboard summary">
              <section class="summary-metric" aria-label="Total hospitalisations">
                <span class="summary-label">Hospitalisations</span>
                <strong>{{ totalHospitalisations == null ? "—" : numberFormat(totalHospitalisations) }}</strong>
                <span class="summary-detail">Reported total · {{ yearsCovered }}</span>
              </section>
              <section class="summary-metric" aria-label="Total bed days">
                <span class="summary-label">Bed days</span>
                <strong>{{ totalBedDays == null ? "—" : numberFormat(totalBedDays) }}</strong>
                <span class="summary-detail">Reported total · {{ yearsCovered }}</span>
              </section>
              <aside class="summary-note" aria-label="How to read not applicable values">
                <span class="summary-note-mark" aria-hidden="true">i</span>
                <div>
                  <span class="summary-label">Data note</span>
                  <p><strong>N.P. is not zero.</strong> It means the measure is not applicable.</p>
                </div>
              </aside>
            </div>

            <section class="section-intro">
              <div>
                <h2>National patterns</h2>
                <p>Annual changes, monthly seasonality, and population profiles.</p>
              </div>
            </section>

            <v-row class="chart-grid">
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Hospitalisations by age group</v-card-title>
                  <v-card-text>
                    <p class="chart-description">Distribution across the reported age brackets.</p>
                    <div id="filters_age" class="filter-container"></div>
                    <div id="age-group-chart" class="responsive-svg-container"></div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Annual trends</v-card-title>
                  <v-card-text>
                    <p class="chart-description">
                      Compare Australia-wide totals or selected categories. Switch between counts and a relative index.
                    </p>
                    <div id="filters_trend" class="annual-trend-controls"></div>
                    <div id="annual-trend-chart" class="responsive-svg-container"></div>
                    <p id="annual-trend-summary" class="chart-note"></p>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Monthly injury patterns</v-card-title>
                  <v-card-text>
                    <p class="chart-description">
                      Filter by injury cause and population group to explore monthly patterns and totals.
                      Relative color scaling is based on the current filters by default; switch to an absolute scale
                      to compare filtered groups against the same all-group range. Zero values are gray.
                    </p>
                    <div id="high-density-heatmap-controls" class="heatmap-controls"></div>
                    <div id="high-density-heatmap-chart" class="high-density-chart" role="region" aria-label="Monthly road injury heatmap"></div>
                    <p class="chart-note">
                      Breaks in the series: from 1 July 2012, Victoria excluded admissions treated only in emergency departments;
                      from June 2017, NSW excluded episodes treated entirely in emergency departments or urgent care.
                      These changes reduced recorded admissions, so year-to-year comparisons across these dates are not like-for-like.
                    </p>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Annual population profile</v-card-title>
                  <v-card-text>
                    <p class="chart-description">
                      Compare annual counts or within-year shares by road user, age, remoteness, sex, or counterparty.
                      Color intensity is scaled to the categories shown. The cleaned workbook contains Traffic-cause
                      records only, so no injury-cause filter is needed.
                    </p>
                    <div id="profile-matrix-controls" class="profile-matrix-controls"></div>
                    <div id="profile-matrix-chart" class="profile-matrix-chart" role="region" aria-label="Annual injury burden by selected population group"></div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Road users and counterparties</v-card-title>
                  <v-card-text>
                    <p class="chart-description">
                      Follow injury burden from road-user type to the other party or object involved.
                    </p>
                    <div id="road-user-sankey-controls" class="road-user-sankey-controls"></div>
                    <div id="road-user-sankey-chart" class="road-user-sankey-chart" role="region" aria-label="Road user to counterparty Sankey diagram"></div>
                    <p id="road-user-sankey-summary" class="chart-note" aria-live="polite"></p>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Age group by year</v-card-title>
                  <v-card-text>
                    <div id="age-year-heatmap-chart" class="responsive-svg-container"></div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Age-group composition</v-card-title>
                  <v-card-text>
                    <div id="age-composition-chart" class="responsive-svg-container"></div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Age-group totals by remoteness and sex</v-card-title>
                  <v-card-text>
                    <p class="chart-description">
                      Select a year. Background bars show age-group totals; remoteness child bars are stacked by sex.
                    </p>
                    <div id="age-sex-total-controls" class="age-sex-total-controls"></div>
                    <div id="age-sex-total-chart" class="age-sex-total-chart" role="region" aria-label="Selected-year age-group totals by remoteness and sex"></div>
                    <p id="age-sex-total-summary" class="chart-note"></p>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-tabs-window-item>

          <v-tabs-window-item value="jurisdictions" eager>
            <section class="section-intro">
              <div>
                <h2>State and territory comparison</h2>
                <p>Compare annual jurisdiction counts and resource use. Values are not population-adjusted rates.</p>
              </div>
            </section>
            <v-row class="chart-grid">
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Where the burden falls</v-card-title>
                  <v-card-text>
                    <p class="chart-description">Select a year and measure, or choose a jurisdiction on the map.</p>
                    <div id="state-map-controls" class="state-map-controls"></div>
                    <div id="state-choropleth-chart" class="state-choropleth-chart" role="region" aria-label="Australian state and territory choropleth map"></div>
                    <div id="state-map-summary" class="state-map-summary" aria-live="polite"></div>
                    <p class="chart-note">
                      N.P. means not applicable and is displayed as unavailable, not zero.
                    </p>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Annual trends by jurisdiction</v-card-title>
                  <v-card-text>
                    <p class="chart-description">
                      Compare jurisdiction trends using reported counts or an index (2011 = 100). Dashed lines mark
                      Victoria's 2012 and NSW's 2017 admission-policy changes; the resulting drops do not necessarily
                      indicate fewer injuries. Gaps indicate an unavailable reporting period.
                    </p>
                    <div id="state-trend-controls" class="state-trend-controls"></div>
                    <div id="state-trend-chart" class="state-trend-chart" role="region" aria-label="Annual state and territory trend comparison"></div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Hospitalisations by jurisdiction</v-card-title>
                  <v-card-text>
                    <p class="chart-description">Total reported hospital admissions across the available period.</p>
                    <div id="jurisdiction-bar-chart" class="responsive-svg-container"></div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Bed days by jurisdiction</v-card-title>
                  <v-card-text>
                    <p class="chart-description">Total reported inpatient bed days across the available period.</p>
                    <div id="jurisdiction-beddays-chart" class="responsive-svg-container"></div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-tabs-window-item>

          <v-tabs-window-item value="first-nations" eager>
            <section class="section-intro">
              <div>
                <h2>First Nations analysis</h2>
                <p>Explore hospitalisations by remoteness and compare category patterns over time.</p>
              </div>
            </section>
            <v-row class="chart-grid">
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Hospitalisations by remoteness</v-card-title>
                  <v-card-text>
                    <p class="chart-description">Compare First Nations and non-Indigenous hospitalisations.</p>
                    <div id="first-nations-chart" class="responsive-svg-container"></div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="12" xl="6">
                <v-card variant="flat" border class="visual-card">
                  <v-card-title>Annual First Nations hospitalisation patterns</v-card-title>
                  <v-card-text>
                    <p class="chart-description">
                      Choose a category breakdown and compare counts or within-group annual shares. N.P. values are not zero.
                    </p>
                    <div id="first-nations-heatmap-controls" class="profile-matrix-controls"></div>
                    <div id="first-nations-heatmap-chart" class="first-nations-heatmap-chart" role="region" aria-label="Annual hospitalisation heatmap by First Nations status"></div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-tabs-window-item>

          <v-tabs-window-item value="story" eager>
            <section class="section-intro">
              <div>
                <h2>Annual injury story</h2>
                <p>Step through reported national hospitalisations and inspect the age or road-user breakdown.</p>
              </div>
            </section>
            <AnnualInjuryStory
              v-if="dashboardData"
              :data="dashboardData.nationalData"
            />
          </v-tabs-window-item>
        </v-tabs-window>

        <footer class="dashboard-footer">
          <span>Source: supplied clean_3tabs workbook</span>
          <span>Counts describe hospital activity, not population-adjusted risk.</span>
        </footer>
      </v-container>
    </v-main>
  </v-app>
</template>
