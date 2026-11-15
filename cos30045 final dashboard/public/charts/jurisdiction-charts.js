// js/state-breakdown.js

const drawStateBreakdownCharts = (stateData) => {
    // filter for overall jurisdiction total
    const filteredData = stateData.filter(d => d.dimension === 'jurisdiction' && d.category === 'all_cases');
    const sumApplicable = (values, accessor) => {
        const metricValues = values.map(accessor);
        return metricValues.length && metricValues.every(Number.isFinite)
            ? d3.sum(metricValues)
            : null;
    };

    // aggregate total hospitalisations by state 2011-2021 period
    const stateMap = d3.rollup(
        filteredData,
        v => ({
            hospitalisations: sumApplicable(v, d => d.hospitalisations),
            bed_days: sumApplicable(v, d => d.bed_days)
        }),
        d => d.jurisdiction
    );

    let stateArray = Array.from(stateMap, ([jurisdiction, metrics]) => ({
        jurisdiction,
        hospitalisations: metrics.hospitalisations,
        bed_days: metrics.bed_days
    })).sort((a, b) => b.hospitalisations - a.hospitalisations); // descending

    // 1. draw jurisdiction hospitalisation bar chart
    drawJurisdictionBar(stateArray);

    // 2. jurisdiction bed days bar chart
    drawJurisdictionBedDays(stateArray);

    // 3. annual jurisdiction choropleth
    drawStateChoropleth(stateData);

    // 4. annual jurisdiction trends
    drawStateTrendChart(stateData);

};

const drawJurisdictionBar = (data) => {
    const svg = d3.select("#jurisdiction-bar-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const innerChart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleBand()
        .domain(data.map(d => d.jurisdiction))
        .range([0, innerWidth])
        .padding(0.25);

    const yScale = d3.scaleLinear()
        .domain([0, (d3.max(data, d => d.hospitalisations) || 1) * 1.1])
        .range([innerHeight, 0])
        .nice();

    // using jurisdiction color scale
    innerChart.selectAll(".bar-jurisdiction")
        .data(data.filter(d => Number.isFinite(d.hospitalisations)))
        .join("rect")
        .attr("class", "bar-jurisdiction")
        .attr("x", d => xScale(d.jurisdiction))
        .attr("y", d => yScale(d.hospitalisations))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScale(d.hospitalisations))
        .attr("fill", d => jurisdictionColorScale(d.jurisdiction))
        .attr("rx", 3);

    innerChart.selectAll(".state-no-data-label")
        .data(data.filter(d => !Number.isFinite(d.hospitalisations)))
        .join("text")
        .attr("class", "state-no-data-label")
        .attr("x", d => xScale(d.jurisdiction) + xScale.bandwidth() / 2)
        .attr("y", innerHeight - 5)
        .attr("text-anchor", "middle")
        .attr("aria-label", d => `${d.jurisdiction}: N.P. (not applicable)`)
        .text("N.P.");

    // axis
    const xAxis = d3.axisBottom(xScale);
    innerChart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis);

    const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(",.0f"));
    innerChart.append("g").call(yAxis);

    // label
    innerChart.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .text("State / Territory");

    innerChart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Total Hospitalisations (2011–2021)");

    attachStateTooltips(innerChart, "hospitalisations");
};

const drawJurisdictionBedDays = (data) => {
    // sort by bed days descending
    const bedDaysData = [...data].sort((a, b) => b.bed_days - a.bed_days);

    const svg = d3.select("#jurisdiction-beddays-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const innerChart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleBand()
        .domain(bedDaysData.map(d => d.jurisdiction))
        .range([0, innerWidth])
        .padding(0.25);

    const yScale = d3.scaleLinear()
        .domain([0, (d3.max(bedDaysData, d => d.bed_days) || 1) * 1.1])
        .range([innerHeight, 0])
        .nice();

    innerChart.selectAll(".bar-beddays")
        .data(bedDaysData.filter(d => Number.isFinite(d.bed_days)))
        .join("rect")
        .attr("class", "bar-beddays")
        .attr("x", d => xScale(d.jurisdiction))
        .attr("y", d => yScale(d.bed_days))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScale(d.bed_days))
        .attr("fill", d => jurisdictionColorScale(d.jurisdiction))
        .attr("rx", 3);

    innerChart.selectAll(".state-no-data-label")
        .data(bedDaysData.filter(d => !Number.isFinite(d.bed_days)))
        .join("text")
        .attr("class", "state-no-data-label")
        .attr("x", d => xScale(d.jurisdiction) + xScale.bandwidth() / 2)
        .attr("y", innerHeight - 5)
        .attr("text-anchor", "middle")
        .attr("aria-label", d => `${d.jurisdiction}: N.P. (not applicable)`)
        .text("N.P.");

    const xAxis = d3.axisBottom(xScale);
    innerChart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis);

    const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(",.0f"));
    innerChart.append("g").call(yAxis);

    innerChart.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .text("State / Territory");

    innerChart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Total Bed Days (2011–2021)");

    attachStateTooltips(innerChart, "bed_days");
};

const attachStateTooltips = (innerChart, metricKey) => {
    const tooltip = getTooltip();

    innerChart.selectAll("rect")
        .on("mouseenter", (event, d) => {
            tooltip.transition().duration(150).style("opacity", 1);
            const val = metricKey === "hospitalisations" ? d.hospitalisations : d.bed_days;
            tooltip.html(`
                <strong>Jurisdiction:</strong> ${d.jurisdiction}<br/>
                <strong>${metricKey === "hospitalisations" ? "Hospitalisations" : "Bed Days"}:</strong> ${d3.format(",")(val)}
            `);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", () => {
            tooltip.transition().duration(200).style("opacity", 0);
        });
};

    const drawStateChoropleth = (rawData) => {
        const container = d3.select("#state-choropleth-chart");
        const controls = d3.select("#state-map-controls");
        const summary = d3.select("#state-map-summary");
        const measures = [
            { key: "hospitalisations", label: "Hospitalisations" },
            { key: "bed_days", label: "Bed days" }
        ];
        const stateCodes = {
            "New South Wales": "NSW",
            "Victoria": "Vic",
            "Queensland": "Qld",
            "South Australia": "SA",
            "Western Australia": "WA",
            "Tasmania": "Tas",
            "Northern Territory": "NT",
            "Australian Capital Territory": "ACT"
        };
        const stateNames = Object.fromEntries(Object.entries(stateCodes).map(([name, code]) => [code, name]));
        const data = rawData.filter(row => row.dimension === "jurisdiction" && row.category === "all_cases");
        const years = Array.from(new Set(data.map(row => +row.calendar_year))).sort((a, b) => a - b);
        const periods = ["Jan-Jun", "Jul-Dec"];
        const annualValue = (rows, key) => {
            const values = periods.map(period => rows.find(row => row.period === period)?.[key]);
            return values.every(value => Number.isFinite(value)) ? d3.sum(values) : null;
        };
        const annualData = years.flatMap(year => Object.keys(stateNames).map(jurisdiction => {
            const rows = data.filter(row => +row.calendar_year === year && row.jurisdiction === jurisdiction);
            return {
                year,
                jurisdiction,
                hospitalisations: annualValue(rows, "hospitalisations"),
                bed_days: annualValue(rows, "bed_days")
            };
        }));
        const selected = { year: years[years.length - 1], measure: "hospitalisations", jurisdiction: "NSW" };
        const numberFormat = d3.format(",.0f");
        let features = [];
        let paths;
        let mapLabels;
        let mapSvg;

        const controlSpecs = [
            { key: "year", label: "Calendar year", values: years.map(year => ({ value: year, label: year })) },
            { key: "measure", label: "Measure", values: measures.map(measure => ({ value: measure.key, label: measure.label })) },
            { key: "jurisdiction", label: "State focus", values: Object.keys(stateNames).map(code => ({ value: code, label: stateNames[code] })) }
        ];

        const control = controls.selectAll(".state-map-control")
            .data(controlSpecs)
            .join("div")
            .attr("class", "state-map-control");
        control.append("label")
            .attr("for", spec => `state-map-${spec.key}`)
            .text(spec => spec.label);
        control.append("select")
            .attr("id", spec => `state-map-${spec.key}`)
            .on("change", (event, spec) => {
                selected[spec.key] = spec.key === "year" ? +event.target.value : event.target.value;
                render();
            })
            .each(function(spec) {
                d3.select(this).selectAll("option")
                    .data(spec.values)
                    .join("option")
                    .attr("value", option => option.value)
                    .text(option => option.label);
                d3.select(this).property("value", selected[spec.key]);
            });

        const tooltip = d3.select("body").selectAll(".state-map-tooltip")
            .data([null])
            .join("div")
            .attr("class", "d3-tooltip state-map-tooltip")
            .style("opacity", 0);

        const loading = container.append("div")
            .attr("class", "state-map-loading")
            .text("Loading state boundaries...");

        d3.json("https://raw.githubusercontent.com/rowanhogan/australian-states/master/states.geojson")
            .then(geoJson => {
                features = geoJson.features.filter(feature => stateCodes[feature.properties.STATE_NAME]);
                loading.remove();
                if (!features.length) {
                    container.append("div").attr("class", "state-map-loading").text("State boundary data is unavailable.");
                    return;
                }

                const width = 920;
                const height = 560;
                const projection = d3.geoMercator().fitExtent([[22, 38], [width - 22, height - 90]], geoJson);
                const path = d3.geoPath(projection);
                mapSvg = container.append("svg")
                    .attr("viewBox", `0 0 ${width} ${height}`)
                    .attr("role", "img")
                    .attr("aria-label", "Map of Australian states and territories coloured by annual road injury burden");

                const defs = mapSvg.append("defs");
                const pattern = defs.append("pattern")
                    .attr("id", "state-map-no-data")
                    .attr("width", 7)
                    .attr("height", 7)
                    .attr("patternUnits", "userSpaceOnUse")
                    .attr("patternTransform", "rotate(45)");
                pattern.append("rect").attr("width", 7).attr("height", 7).attr("fill", "#f2f2f2");
                pattern.append("line").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 7).attr("stroke", "#999999").attr("stroke-width", 2);

                const legendGradient = defs.append("linearGradient")
                    .attr("id", "state-map-gradient")
                    .attr("x1", "0%")
                    .attr("x2", "100%");
                legendGradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateCividis(0.12));
                legendGradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateCividis(0.98));

                mapSvg.append("text")
                    .attr("class", "state-map-kicker")
                    .attr("x", 22)
                    .attr("y", 24)
                    .text("TRAFFIC INJURIES · ANNUAL TOTALS");
                paths = mapSvg.append("g").selectAll(".state-map-region")
                    .data(features)
                    .join("path")
                    .attr("class", "state-map-region")
                    .attr("d", path)
                    .attr("tabindex", 0)
                    .attr("role", "button")
                    .attr("aria-label", feature => stateNames[stateCodes[feature.properties.STATE_NAME]])
                    .on("click keydown", function(event, feature) {
                        if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
                        if (event.type === "keydown") event.preventDefault();
                        selected.jurisdiction = stateCodes[feature.properties.STATE_NAME];
                        controls.select("#state-map-jurisdiction").property("value", selected.jurisdiction);
                        render();
                    })
                    .on("mouseenter focus", function(event, feature) {
                        const jurisdiction = stateCodes[feature.properties.STATE_NAME];
                        const row = annualData.find(item => item.year === selected.year && item.jurisdiction === jurisdiction);
                        const value = row?.[selected.measure];
                        d3.select(this).classed("is-hovered", true);
                        tooltip.style("opacity", 1).html(
                            `<strong>${feature.properties.STATE_NAME}</strong><br>${selected.year} ${measures.find(item => item.key === selected.measure).label}: ${value == null ? "N.P. (not applicable)" : numberFormat(value)}`
                        );
                        if (event.type === "focus") {
                            const bounds = this.getBoundingClientRect();
                            tooltip.style("left", `${bounds.left + bounds.width / 2 + window.scrollX + 10}px`)
                                .style("top", `${bounds.top + window.scrollY}px`);
                        }
                    })
                    .on("mousemove", event => tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`))
                    .on("mouseleave blur", function() {
                        d3.select(this).classed("is-hovered", false);
                        tooltip.style("opacity", 0);
                    });

                mapLabels = mapSvg.append("g")
                    .attr("class", "state-map-labels")
                    .selectAll("text")
                    .data(features)
                    .join("text")
                    .attr("x", feature => path.centroid(feature)[0])
                    .attr("y", feature => path.centroid(feature)[1] + 4)
                    .attr("text-anchor", "middle")
                    .text(feature => stateCodes[feature.properties.STATE_NAME]);

                mapSvg.append("text").attr("class", "state-map-legend-label").attr("x", 30).attr("y", height - 41).text("Lower");
                mapSvg.append("rect").attr("class", "state-map-legend-bar").attr("x", 76).attr("y", height - 54).attr("width", 230).attr("height", 14).attr("fill", "url(#state-map-gradient)");
                mapSvg.append("text").attr("class", "state-map-legend-label").attr("x", 314).attr("y", height - 41).text("Higher");
                mapSvg.append("rect").attr("x", 408).attr("y", height - 54).attr("width", 21).attr("height", 14).attr("fill", "url(#state-map-no-data)").attr("stroke", "#86948e");
                mapSvg.append("text").attr("class", "state-map-legend-label").attr("x", 436).attr("y", height - 41).text("N.P. / no data");
                render();
            })
            .catch(error => {
                loading.text("State boundaries could not be loaded. Check your internet connection and reload the dashboard.");
                console.error("Error loading Australian state boundaries:", error);
            });

        function render() {
            if (!paths) return;
            const metric = measures.find(item => item.key === selected.measure);
            const yearRows = annualData.filter(row => row.year === selected.year);
            const validRows = yearRows.filter(row => Number.isFinite(row[selected.measure]));
            const maximumAcrossYears = d3.max(annualData, row => row[selected.measure]) || 1;
            const minimumAcrossYears = d3.min(annualData.filter(row => row[selected.measure] > 0), row => row[selected.measure]) || 1;
            const color = d3.scaleSequentialLog(d3.interpolateCividis)
                .domain([minimumAcrossYears, Math.max(minimumAcrossYears * 1.01, maximumAcrossYears)]);
            const values = new Map(yearRows.map(row => [row.jurisdiction, row[selected.measure]]));
            const labelContrast = value => {
                if (!Number.isFinite(value) || value <= 0) {
                    return { fill: "#111111", stroke: "#ffffff" };
                }
                const textColor = d3.lab(color(value)).l > 58
                    ? { fill: "#111111", stroke: "#ffffff" }
                    : { fill: "#ffffff", stroke: "#111111" };
                return textColor;
            };
            const ranked = validRows.slice().sort((a, b) => d3.descending(a[selected.measure], b[selected.measure]));
            const selectedRow = yearRows.find(row => row.jurisdiction === selected.jurisdiction);
            const selectedValue = selectedRow?.[selected.measure];
            const previousRow = annualData.find(row => row.year === selected.year - 1 && row.jurisdiction === selected.jurisdiction);
            const previousValue = previousRow?.[selected.measure];
            const rank = ranked.findIndex(row => row.jurisdiction === selected.jurisdiction);
            const nationalTotal = validRows.length === Object.keys(stateNames).length
                ? d3.sum(validRows, row => row[selected.measure])
                : null;

            paths
                .attr("fill", feature => {
                    const value = values.get(stateCodes[feature.properties.STATE_NAME]);
                    return value == null ? "url(#state-map-no-data)" : value > 0 ? color(value) : "#edf1ee";
                })
                .classed("is-selected", feature => stateCodes[feature.properties.STATE_NAME] === selected.jurisdiction)
                .attr("aria-pressed", feature => stateCodes[feature.properties.STATE_NAME] === selected.jurisdiction ? "true" : "false");
            mapLabels
                .attr("fill", feature => labelContrast(values.get(stateCodes[feature.properties.STATE_NAME])).fill)
                .attr("stroke", feature => labelContrast(values.get(stateCodes[feature.properties.STATE_NAME])).stroke);

            const change = Number.isFinite(selectedValue) && Number.isFinite(previousValue)
                ? `${d3.format("+,.0f")(selectedValue - previousValue)} (${d3.format("+.1%")((selectedValue - previousValue) / (previousValue || 1))})`
                : selected.year === years[0] ? "No prior year" : "N.P. / unavailable";
            summary.html(`
                <div class="state-map-stat"><span>Selected jurisdiction</span><strong>${stateNames[selected.jurisdiction]}</strong><b>${selectedValue == null ? "N.P." : numberFormat(selectedValue)}</b></div>
                <div class="state-map-stat"><span>${selected.year} mapped total</span><strong>${nationalTotal == null ? "Incomplete data" : numberFormat(nationalTotal)}</strong><small>${metric.label.toLowerCase()}${nationalTotal == null ? "" : " across 8 jurisdictions"}</small></div>
                <div class="state-map-stat"><span>Rank by ${metric.label.toLowerCase()}</span><strong>${rank < 0 ? "N.P." : `${rank + 1} of ${ranked.length}`}</strong><small>${rank < 0 ? "Not applicable" : "selected year"}</small></div>
                <div class="state-map-stat"><span>Change from previous year</span><strong>${change}</strong><small>${metric.label.toLowerCase()}</small></div>
            `);

            const legend = mapSvg.selectAll(".state-map-legend-range").data([null]).join("text")
                .attr("class", "state-map-legend-range")
                .attr("x", 76)
                .attr("y", 493)
                .text(`${numberFormat(minimumAcrossYears)}  –  ${numberFormat(maximumAcrossYears)} ${metric.label.toLowerCase()} per jurisdiction`);
            void legend;
        }
    };

const drawStateTrendChart = rawData => {
    const controls = d3.select("#state-trend-controls");
    const container = d3.select("#state-trend-chart");
    const jurisdictions = ["NSW", "Vic", "Qld", "SA", "WA", "Tas", "NT", "ACT"];
    const stateNames = {
        NSW: "New South Wales",
        Vic: "Victoria",
        Qld: "Queensland",
        SA: "South Australia",
        WA: "Western Australia",
        Tas: "Tasmania",
        NT: "Northern Territory",
        ACT: "Australian Capital Territory"
    };
    const periods = ["Jan-Jun", "Jul-Dec"];
    const measures = [
        { key: "hospitalisations", label: "Hospitalisations" },
        { key: "bed_days", label: "Bed days" }
    ];
    const data = rawData.filter(row => row.dimension === "jurisdiction" && row.category === "all_cases");
    const years = Array.from(new Set(data.map(row => +row.calendar_year))).sort((a, b) => a - b);
    const annualData = jurisdictions.flatMap(jurisdiction => years.map(year => {
        const rows = data.filter(row => row.jurisdiction === jurisdiction && +row.calendar_year === year);
        const values = periods.map(period => rows.find(row => row.period === period));
        return {
            jurisdiction,
            year,
            hospitalisations: values.every(row => Number.isFinite(row?.hospitalisations))
                ? d3.sum(values, row => row.hospitalisations)
                : null,
            bed_days: values.every(row => Number.isFinite(row?.bed_days))
                ? d3.sum(values, row => row.bed_days)
                : null
        };
    }));
    const selected = { measure: "hospitalisations", scale: "absolute" };
    const numberFormat = d3.format("~s");
    const fullNumberFormat = d3.format(",.0f");
    const indexFormat = d3.format(".1f");
    const chartWidth = 960;
    const chartHeight = 450;
    const chartMargin = { top: 42, right: 24, bottom: 112, left: 76 };
    const plotWidth = chartWidth - chartMargin.left - chartMargin.right;
    const plotHeight = chartHeight - chartMargin.top - chartMargin.bottom;
    const trendColor = jurisdiction => jurisdictionColorScale(jurisdiction);

    const scaleOptions = [
        { key: "absolute", label: "Absolute values" },
        { key: "relative", label: "Relative (2011 = 100)" }
    ];
    const scaleToggle = controls.selectAll(".state-trend-scale-toggle")
        .data([null])
        .join("div")
        .attr("class", "state-trend-scale-toggle")
        .attr("role", "group")
        .attr("aria-label", "Jurisdiction trend value scale");
    scaleToggle.selectAll("span")
        .data([null])
        .join("span")
        .text("Values");
    scaleToggle.selectAll("button")
        .data(scaleOptions, item => item.key)
        .join("button")
        .attr("type", "button")
        .attr("class", "state-trend-scale-button")
        .attr("aria-pressed", item => item.key === selected.scale ? "true" : "false")
        .classed("active", item => item.key === selected.scale)
        .text(item => item.label)
        .on("click", (event, item) => {
            selected.scale = item.key;
            scaleToggle.selectAll("button")
                .classed("active", option => option.key === selected.scale)
                .attr("aria-pressed", option => option.key === selected.scale ? "true" : "false");
            render();
        });

    const control = controls.selectAll(".state-trend-control")
        .data([{ key: "measure", label: "Measure", options: measures }])
        .join("div")
        .attr("class", "state-trend-control");
    control.selectAll("label")
        .data(item => [item])
        .join("label")
        .attr("for", "state-trend-measure")
        .text(item => item.label);
    control.selectAll("select")
        .data(item => [item])
        .join("select")
        .attr("id", "state-trend-measure")
        .on("change", event => {
            selected.measure = event.target.value;
            render();
        })
        .each(function(item) {
            d3.select(this).selectAll("option")
                .data(item.options)
                .join("option")
                .attr("value", option => option.key)
                .text(option => option.label);
            d3.select(this).property("value", selected.measure);
        });

    const tooltip = d3.select("body").selectAll(".state-trend-tooltip")
        .data([null])
        .join("div")
        .attr("class", "d3-tooltip state-trend-tooltip")
        .style("opacity", 0);

    function render() {
        const measure = measures.find(item => item.key === selected.measure);
        const baselines = new Map(jurisdictions.map(jurisdiction => [
            jurisdiction,
            annualData.find(row => row.jurisdiction === jurisdiction && row.year === 2011)?.[selected.measure]
        ]));
        const chartData = annualData.map(row => {
            const rawValue = row[selected.measure];
            const baseline = baselines.get(row.jurisdiction);
            return {
                ...row,
                rawValue,
                value: selected.scale === "relative"
                    ? Number.isFinite(rawValue) && Number.isFinite(baseline) && baseline > 0
                        ? rawValue / baseline * 100
                        : null
                    : rawValue
            };
        });
        const plottedValues = chartData.map(row => row.value).filter(Number.isFinite);
        const maxValue = d3.max(plottedValues) || 1;
        const minValue = d3.min(plottedValues) || 0;
        const yDomain = selected.scale === "relative"
            ? [
                Math.min(100, minValue) * 0.92,
                Math.max(100, maxValue) * 1.08
            ]
            : [0, maxValue * 1.08];
        const yScale = d3.scaleLinear()
            .domain(yDomain)
            .range([plotHeight, 0])
            .nice();
        const xScale = d3.scalePoint()
            .domain(years)
            .range([0, plotWidth])
            .padding(0.15);

        container.selectAll("*").remove();
        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("role", "img")
            .attr("aria-label", `Annual ${measure.label.toLowerCase()} by jurisdiction${selected.scale === "relative" ? ", indexed to 2011 equals 100" : ""}`);
        const plot = svg.append("g")
            .attr("transform", `translate(${chartMargin.left},${chartMargin.top})`);

        plot.append("g")
            .attr("class", "state-trend-grid")
            .call(d3.axisLeft(yScale).ticks(6).tickSize(-plotWidth)
                .tickFormat(""));
        plot.append("g")
            .call(d3.axisLeft(yScale).ticks(6)
                .tickFormat(selected.scale === "relative" ? d3.format(".0f") : numberFormat));
        plot.append("g")
            .attr("transform", `translate(0,${plotHeight})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

        const breakMarkers = [
            { year: 2012, label: "Victoria · 2012 policy change", anchor: "start", offset: 5 },
            { year: 2017, label: "NSW · 2017 policy change", anchor: "end", offset: -5 }
        ];
        const line = d3.line()
            .defined(row => Number.isFinite(row.value))
            .x(row => xScale(row.year))
            .y(row => yScale(row.value))
            .curve(d3.curveMonotoneX);
        jurisdictions.forEach(jurisdiction => {
            const series = chartData.filter(row => row.jurisdiction === jurisdiction);
            const color = trendColor(jurisdiction);
            plot.append("path")
                .datum(series)
                .attr("class", "state-trend-line")
                .attr("stroke", color)
                .attr("aria-label", stateNames[jurisdiction])
                .attr("d", line);

            plot.selectAll(`.state-trend-point-${jurisdiction}`)
                .data(series.filter(row => Number.isFinite(row.value)))
                .join("circle")
                .attr("class", `state-trend-point state-trend-point-${jurisdiction}`)
                .attr("cx", row => xScale(row.year))
                .attr("cy", row => yScale(row.value))
                .attr("fill", color)
                .attr("r", 3.5)
                .attr("tabindex", 0)
                .attr("role", "img")
                .attr("aria-label", row => selected.scale === "relative"
                    ? `${stateNames[jurisdiction]}, ${row.year}: index ${indexFormat(row.value)}, 2011 equals 100; ${fullNumberFormat(row.rawValue)} ${measure.label.toLowerCase()}`
                    : `${stateNames[jurisdiction]}, ${row.year}: ${fullNumberFormat(row.value)} ${measure.label.toLowerCase()}`)
                .on("mouseenter focus", function(event, row) {
                    d3.select(this).attr("r", 5);
                    tooltip.style("opacity", 1).html(
                        selected.scale === "relative"
                            ? `<strong>${stateNames[jurisdiction]}</strong><br>${row.year}<br>Index (2011 = 100): ${indexFormat(row.value)}<br>${measure.label}: ${fullNumberFormat(row.rawValue)}`
                            : `<strong>${stateNames[jurisdiction]}</strong><br>${row.year}<br>${measure.label}: ${fullNumberFormat(row.value)}`
                    );
                    if (event.type === "focus") {
                        const bounds = this.getBoundingClientRect();
                        tooltip.style("left", `${bounds.left + window.scrollX + 8}px`)
                            .style("top", `${bounds.top + window.scrollY}px`);
                    }
                })
                .on("mousemove", event => tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`))
                .on("mouseleave blur", function() {
                    d3.select(this).attr("r", 3.5);
                    tooltip.style("opacity", 0);
                });
        });

        breakMarkers.forEach(item => {
            const x = xScale(item.year);
            if (x == null) return;
            plot.append("line")
                .attr("class", "state-trend-break-line")
                .attr("x1", x)
                .attr("x2", x)
                .attr("y1", 0)
                .attr("y2", plotHeight)
                .attr("data-break-year", item.year);
            plot.append("text")
                .attr("class", "state-trend-break-label")
                .attr("x", x + item.offset)
                .attr("y", 13)
                .attr("text-anchor", item.anchor)
                .text(item.label);
        });
        if (selected.scale === "relative" && yScale.domain()[0] <= 100 && yScale.domain()[1] >= 100) {
            plot.append("line")
                .attr("class", "state-trend-baseline")
                .attr("x1", 0)
                .attr("x2", plotWidth)
                .attr("y1", yScale(100))
                .attr("y2", yScale(100));
            plot.append("text")
                .attr("class", "state-trend-baseline-label")
                .attr("x", plotWidth - 4)
                .attr("y", yScale(100) - 5)
                .attr("text-anchor", "end")
                .text("2011 baseline");
        }

        const legend = svg.append("g").attr("class", "state-trend-legend");
        const legendColumns = 4;
        const legendColumnWidth = plotWidth / legendColumns;
        legend.selectAll(".state-trend-legend-item")
            .data(jurisdictions)
            .join("g")
            .attr("class", "state-trend-legend-item")
            .attr("transform", (jurisdiction, index) =>
                `translate(${chartMargin.left + (index % legendColumns) * legendColumnWidth},${chartHeight - 70 + Math.floor(index / legendColumns) * 28})`
            )
            .each(function(jurisdiction) {
                const item = d3.select(this);
                item.append("line")
                    .attr("x1", 0)
                    .attr("x2", 22)
                    .attr("y1", 0)
                    .attr("y2", 0)
                    .attr("stroke-width", 3)
                    .attr("stroke", trendColor(jurisdiction));
                item.append("text")
                    .attr("x", 29)
                    .attr("y", 4)
                    .text(stateNames[jurisdiction]);
            });

        svg.append("text")
            .attr("class", "axis-label")
            .attr("x", 20)
            .attr("y", chartMargin.top + plotHeight / 2)
            .attr("transform", `rotate(-90,20,${chartMargin.top + plotHeight / 2})`)
            .attr("text-anchor", "middle")
            .text(selected.scale === "relative" ? "Index (2011 = 100)" : measure.label);
        svg.append("text")
            .attr("class", "axis-label")
            .attr("x", chartMargin.left + plotWidth / 2)
            .attr("y", chartHeight - 8)
            .attr("text-anchor", "middle")
            .text("Calendar year");
    }

    render();
};
