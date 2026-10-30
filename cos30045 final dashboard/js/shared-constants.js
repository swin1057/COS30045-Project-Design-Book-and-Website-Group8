// js/shared-constants.js

// 1. Okabe Ito Palette
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

// 2. D3 scripts
const SEMANTIC_COLORS = {
    primaryMetric: OKABE_ITO.blue,       // primary trends, total volume
    secondaryMetric: OKABE_ITO.vermilion,// growth rates, YoY change, highlights
    safeGreen: OKABE_ITO.bluishGreen,    // positive indicators / standard bars
    neutralBase: OKABE_ITO.grey,         // gridlines, neutral elements
    background: "#fffaf0"
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