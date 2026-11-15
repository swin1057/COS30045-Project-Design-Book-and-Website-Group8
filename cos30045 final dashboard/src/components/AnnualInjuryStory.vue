<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as d3 from "d3";

const props = defineProps({
  data: {
    type: Array,
    required: true
  }
});

const dimensions = [
  { key: "age_group", label: "Age group" },
  { key: "road_user", label: "Road user" }
];
const selectedDimension = ref("age_group");
const selectedYear = ref(null);
const isPlaying = ref(false);
const staticView = ref(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const chartElement = ref(null);
let playbackTimer;
let resizeObserver;

const years = computed(() => Array.from(new Set(
  props.data
    .map(row => +row.calendar_year)
    .filter(Number.isFinite)
)).sort((a, b) => a - b));

const annualTotals = computed(() => {
  const grouped = d3.rollup(
    props.data.filter(row => Number.isFinite(row.hospitalisations)),
    rows => d3.sum(rows, row => row.hospitalisations),
    row => +row.calendar_year
  );
  return years.value.map(year => ({ year, value: grouped.get(year) ?? null }));
});

const currentYear = computed(() => selectedYear.value ?? years.value[0] ?? 0);
const currentTotal = computed(() =>
  annualTotals.value.find(item => item.year === currentYear.value)?.value ?? null
);
const previousTotal = computed(() =>
  annualTotals.value.find(item => item.year === currentYear.value - 1)?.value ?? null
);
const currentDimension = computed(() =>
  dimensions.find(item => item.key === selectedDimension.value) ?? dimensions[0]
);
const numberFormat = d3.format(",.0f");
const percentFormat = d3.format("+.1%");

const categoryTotals = computed(() => {
  const values = d3.rollup(
    props.data.filter(row =>
      Number.isFinite(row.hospitalisations) && +row.calendar_year === currentYear.value
    ),
    rows => d3.sum(rows, row => row.hospitalisations),
    row => String(row[selectedDimension.value] || "Unknown / missing").trim()
  );
  return Array.from(values, ([label, value]) => ({ label, value }))
    .sort((a, b) => d3.descending(a.value, b.value))
    .slice(0, 6);
});

const peakYear = computed(() =>
  annualTotals.value.reduce((peak, item) => item.value > peak.value ? item : peak, annualTotals.value[0] ?? { year: 0, value: 0 })
);
const accessibleBreakdown = computed(() =>
  `${currentDimension.value.label} breakdown for ${currentYear.value}: ${categoryTotals.value
    .map(item => `${item.label}, ${numberFormat(item.value)}`)
    .join("; ")}.`
);

const storyCaption = computed(() => {
  const previous = previousTotal.value;
  const change = Number.isFinite(previous) && previous !== 0 && Number.isFinite(currentTotal.value)
    ? (currentTotal.value - previous) / previous
    : null;

  if (currentYear.value === years.value[0]) {
    return `Starting point: ${numberFormat(currentTotal.value)} reported hospitalisations. This is the first year in the selected series, not a population-adjusted rate.`;
  }
  if (currentYear.value === 2012) {
    return `Victoria changed which emergency presentations counted from 1 July 2012. The national total is ${change == null ? "not comparable as a simple like-for-like change" : `${percentFormat(change)} from the prior year`}; the break is a reporting-context warning, not evidence of a sudden change in injury incidence.`;
  }
  if (currentYear.value === 2017) {
    return `New South Wales changed its emergency and urgent-care admission coverage from June 2017. The national total is ${change == null ? "not directly comparable across this reporting break" : `${percentFormat(change)} from the prior year`}; this difference should not be attributed to injury incidence alone.`;
  }
  if (currentYear.value === peakYear.value) {
    return `Period peak: ${numberFormat(currentTotal.value)} reported hospitalisations. The series records hospital activity, not population-adjusted risk.`;
  }
  if (currentYear.value === 2020 && change != null) {
    return `${numberFormat(currentTotal.value)} reported hospitalisations, ${percentFormat(change)} from 2019. This descriptive change alone does not establish a cause.`;
  }
  if (change != null) {
    return `${numberFormat(currentTotal.value)} reported hospitalisations, ${percentFormat(change)} from ${currentYear.value - 1}. Use the category bars below to see how the selected breakdown is distributed this year.`;
  }
  return `${numberFormat(currentTotal.value)} reported hospitalisations. Use the category bars below to inspect the selected breakdown.`;
});

function stopPlayback() {
  isPlaying.value = false;
  window.clearInterval(playbackTimer);
  playbackTimer = undefined;
}

function togglePlayback() {
  if (staticView.value || !years.value.length) return;
  if (isPlaying.value) {
    stopPlayback();
    return;
  }
  if (currentYear.value >= years.value[years.value.length - 1]) {
    selectedYear.value = years.value[0];
  }
  isPlaying.value = true;
  playbackTimer = window.setInterval(() => {
    const index = years.value.indexOf(currentYear.value);
    if (index >= years.value.length - 1) {
      stopPlayback();
      return;
    }
    selectedYear.value = years.value[index + 1];
  }, 1100);
}

function renderChart() {
  if (!chartElement.value || !annualTotals.value.length) return;

  const element = chartElement.value;
  const width = Math.max(320, element.clientWidth);
  const height = 440;
  const margin = { top: 42, right: 24, bottom: 30, left: width < 500 ? 112 : 174 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = 142;
  const firstYear = years.value[0];
  const lastYear = years.value[years.value.length - 1];
  const chartData = annualTotals.value.filter(item => Number.isFinite(item.value));
  const visibleData = staticView.value
    ? chartData
    : chartData.filter(item => item.year <= currentYear.value);
  const x = d3.scaleLinear()
    .domain([firstYear, lastYear])
    .range([margin.left, margin.left + plotWidth]);
  const maxTotal = d3.max(chartData, item => item.value) ?? 1;
  const y = d3.scaleLinear()
    .domain([0, maxTotal * 1.12])
    .nice()
    .range([margin.top + plotHeight, margin.top]);
  const svg = d3.select(element).selectAll("svg")
    .data([null])
    .join("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", `Annual Australian hospitalisations from ${firstYear} to ${lastYear}; ${staticView.value ? "full series" : `animated through ${currentYear.value}`}`);
  svg.selectAll("*").remove();

  const line = d3.line()
    .x(item => x(item.year))
    .y(item => y(item.value))
    .curve(d3.curveMonotoneX);
  const axis = d3.axisLeft(y).ticks(4).tickFormat(d3.format("~s"));
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(axis)
    .call(group => group.select(".domain").remove());

  [2012, 2017].filter(year => year >= firstYear && year <= lastYear).forEach(year => {
    const markerX = x(year);
    svg.append("line")
      .attr("x1", markerX)
      .attr("x2", markerX)
      .attr("y1", margin.top - 8)
      .attr("y2", margin.top + plotHeight)
      .attr("stroke", "#666666")
      .attr("stroke-dasharray", "4 4");
    svg.append("text")
      .attr("x", markerX + 4)
      .attr("y", margin.top - 14)
      .attr("fill", "#4d4d4d")
      .text(year === 2012 ? "Vic. '12" : "NSW '17");
  });

  svg.append("path")
    .datum(visibleData)
    .attr("fill", "none")
    .attr("stroke", "#0072B2")
    .attr("stroke-width", 3)
    .attr("stroke-linejoin", "round")
    .attr("d", line);
  svg.append("g")
    .selectAll("circle")
    .data(visibleData)
    .join("circle")
    .attr("cx", item => x(item.year))
    .attr("cy", item => y(item.value))
    .attr("r", item => item.year === currentYear.value ? 6 : 3)
    .attr("fill", item => item.year === currentYear.value ? "#0072B2" : "#ffffff")
    .attr("stroke", "#0072B2")
    .attr("stroke-width", 2);

  svg.append("text")
    .attr("x", x(currentYear.value))
    .attr("y", y(currentTotal.value) - 12)
    .attr("text-anchor", x(currentYear.value) > width - 95 ? "end" : "start")
    .attr("fill", "#141414")
    .attr("font-weight", 600)
    .text(numberFormat(currentTotal.value));

  svg.append("g")
    .attr("transform", `translate(0,${margin.top + plotHeight})`)
    .call(d3.axisBottom(x)
      .tickValues(years.value.filter((_, index) => plotWidth >= 400 || index % 2 === 0 || index === years.value.length - 1))
      .tickFormat(d3.format("d"))
      .tickSizeOuter(0))
    .call(group => group.select(".domain").attr("stroke", "#999999"));
  svg.append("text")
    .attr("x", 12)
    .attr("y", margin.top + plotHeight / 2)
    .attr("transform", `rotate(-90,12,${margin.top + plotHeight / 2})`)
    .attr("text-anchor", "middle")
    .attr("fill", "#333333")
    .text("Hospitalisations");

  const barTop = 264;
  const barBottom = height - 24;
  const barHeight = Math.min(24, (barBottom - barTop) / Math.max(categoryTotals.value.length, 1) - 5);
  const maxCategory = d3.max(categoryTotals.value, item => item.value) ?? 1;
  const barX = d3.scaleLinear()
    .domain([0, maxCategory])
    .range([margin.left, margin.left + plotWidth]);

  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 226)
    .attr("fill", "#141414")
    .attr("font-weight", 600)
    .text(`Largest ${categoryTotals.value.length} ${currentDimension.value.label.toLowerCase()} categories · ${currentYear.value}`);

  const bars = svg.append("g")
    .selectAll("g")
    .data(categoryTotals.value)
    .join("g")
    .attr("transform", (_, index) => `translate(0,${barTop + index * ((barBottom - barTop) / Math.max(categoryTotals.value.length, 1))})`);
  bars.append("text")
    .attr("x", margin.left - 10)
    .attr("y", barHeight / 2 + 4)
    .attr("text-anchor", "end")
    .attr("fill", "#333333")
    .text(item => item.label.length > Math.floor(margin.left / 7)
      ? `${item.label.slice(0, Math.floor(margin.left / 7) - 1)}…`
      : item.label)
    .append("title")
    .text(item => item.label);
  bars.append("rect")
    .attr("x", margin.left)
    .attr("y", 0)
    .attr("width", item => barX(item.value) - margin.left)
    .attr("height", barHeight)
    .attr("fill", "#0072B2");
  bars.append("text")
    .attr("x", item => barX(item.value) + numberFormat(item.value).length * 7 + 12 > width - margin.right
      ? barX(item.value) - 6
      : barX(item.value) + 6)
    .attr("y", barHeight / 2 + 4)
    .attr("text-anchor", item => barX(item.value) + numberFormat(item.value).length * 7 + 12 > width - margin.right ? "end" : "start")
    .attr("fill", item => barX(item.value) + numberFormat(item.value).length * 7 + 12 > width - margin.right ? "#ffffff" : "#333333")
    .text(item => numberFormat(item.value));
}

watch([annualTotals, currentYear, selectedDimension, staticView], renderChart, { deep: true });
watch(staticView, value => {
  if (value) stopPlayback();
});
watch(currentYear, year => {
  if (isPlaying.value && year === years.value[years.value.length - 1]) {
    window.setTimeout(stopPlayback, 1100);
  }
});

onMounted(() => {
  if (years.value.length) selectedYear.value = years.value[0];
  resizeObserver = new ResizeObserver(renderChart);
  if (chartElement.value) resizeObserver.observe(chartElement.value);
  renderChart();
});

onBeforeUnmount(() => {
  stopPlayback();
  resizeObserver?.disconnect();
});
</script>

<template>
  <v-card variant="flat" border class="visual-card annual-story-card">
    <v-card-title>A decade of reported hospitalisations</v-card-title>
    <v-card-text>
      <p class="chart-description">
        Step through national annual totals and see the largest age-group or road-user categories for each year.
        Dashed markers flag state reporting changes; they are context, not causal explanations.
      </p>
      <div class="annual-story-controls">
        <button
          type="button"
          class="annual-story-button"
          :disabled="staticView"
          :aria-label="isPlaying ? 'Pause story' : 'Play year-by-year story'"
          @click="togglePlayback"
        >
          {{ isPlaying ? "Pause" : "Play" }}
        </button>
        <label class="annual-story-dimension">
          Breakdown
          <select v-model="selectedDimension" aria-label="Break down annual totals by">
            <option v-for="dimension in dimensions" :key="dimension.key" :value="dimension.key">
              {{ dimension.label }}
            </option>
          </select>
        </label>
        <button
          type="button"
          class="annual-story-button"
          :aria-pressed="staticView"
          @click="staticView = !staticView"
        >
          {{ staticView ? "Static overview on" : "Use static overview" }}
        </button>
        <label class="annual-story-year">
          <span>Year: <strong>{{ currentYear }}</strong></span>
          <input
            v-model.number="selectedYear"
            type="range"
            :min="years[0]"
            :max="years[years.length - 1]"
            :step="1"
            :aria-label="`Select story year, ${years[0]} to ${years[years.length - 1]}`"
            @input="stopPlayback"
          />
        </label>
      </div>
      <p class="annual-story-caption" aria-live="polite">{{ storyCaption }}</p>
      <p class="visually-hidden" aria-live="polite">{{ accessibleBreakdown }}</p>
      <div ref="chartElement" class="annual-story-chart"></div>
      <p class="chart-note">
        The Victoria emergency-department admission exclusion began on 1 July 2012; NSW changed emergency/urgent-care
        coverage from June 2017. These reporting changes affect comparability. Counts are not population-adjusted rates.
      </p>
    </v-card-text>
  </v-card>
</template>
