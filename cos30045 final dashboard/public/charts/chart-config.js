// js/shared-constants.js

const OKABE_ITO = {
    orange: "#E69F00",
    skyBlue: "#56B4E9",
    bluishGreen: "#009E73",
    yellow: "#F0E442",
    blue: "#0072B2",
    vermilion: "#D55E00",
    reddishPurple: "#CC79A7",
    grey: "#999999"
};

const Paul_Tol_Banded_12 = [
    "#D2D1E2",
    "#D9070D",
    "#AD7BA4",
    "#93C7EC",
    "#6DA1D6",
    "#3E79BD",
    "#B8D29E",
    "#7BB47D",
    "#F4A937",
    "#2C925B",
    "#EB7121",
    "#C1A7C4"
];

const SEMANTIC_COLORS = {
    primaryMetric: OKABE_ITO.blue,
    secondaryMetric: OKABE_ITO.vermilion,
    safeGreen: OKABE_ITO.bluishGreen,
    neutralBase: OKABE_ITO.grey,
    background: "#ffffff"
};

const AGE_GROUPS_CONFIG = [
    { group: "0-7", color: OKABE_ITO.blue },
    { group: "8-16", color: OKABE_ITO.skyBlue },
    { group: "17-25", color: OKABE_ITO.bluishGreen },
    { group: "26-39", color: OKABE_ITO.orange },
    { group: "40-64", color: OKABE_ITO.yellow },
    { group: "65-74", color: OKABE_ITO.vermilion },
    { group: "75+", color: OKABE_ITO.reddishPurple }
];

// tab2 state breakdown
const jurisdictionColorScale = d3.scaleOrdinal()
    .domain(["NSW", "Vic", "Qld", "SA", "WA", "Tas", "NT", "ACT"])
    .range([
        OKABE_ITO.blue,
        OKABE_ITO.orange,
        OKABE_ITO.bluishGreen,
        OKABE_ITO.skyBlue,
        OKABE_ITO.vermilion,
        OKABE_ITO.reddishPurple,
        OKABE_ITO.yellow,
        OKABE_ITO.grey
    ]);

// layout constant
const margin = { top: 50, right: 55, bottom: 50, left: 65 };
const width = 600;
const height = 380;
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Age group order used by both charts
const ageGroupOrder = [
    "0-7",
    "8-16",
    "17-25",
    "26-39",
    "40-64",
    "65-74",
    "75+",
    "Missing"
];

// Prepare data for Tab 1 charts
function prepareAgeYearData(rawData) {

    const cleanedData = rawData
        .map(d => ({
            calendar_year: +d.calendar_year,
            age_group: String(d.age_group || "Missing").trim(),
            hospitalisations: +d.hospitalisations || 0
        }))
        .filter(d =>
            Number.isFinite(d.calendar_year) &&
            d.age_group !== ""
        );

    // Sum hospitalisations by year and age group
    const groupedData = d3.rollup(
        cleanedData,
        v => d3.sum(v, d => d.hospitalisations),
        d => d.calendar_year,
        d => d.age_group
    );

    const years = Array.from(
        new Set(cleanedData.map(d => d.calendar_year))
    ).sort((a, b) => a - b);

    const ageGroups = ageGroupOrder.filter(group =>
        cleanedData.some(d => d.age_group === group)
    );

    // Include any unexpected age-group labels rather than dropping them
    cleanedData.forEach(d => {
        if (!ageGroups.includes(d.age_group)) {
            ageGroups.push(d.age_group);
        }
    });

    const result = [];

    years.forEach(year => {
        ageGroups.forEach(ageGroup => {
            result.push({
                year: year,
                ageGroup: ageGroup,
                hospitalisations:
                    groupedData.get(year)?.get(ageGroup) || 0
            });
        });
    });

    return {
        years,
        ageGroups,
        data: result
    };
}