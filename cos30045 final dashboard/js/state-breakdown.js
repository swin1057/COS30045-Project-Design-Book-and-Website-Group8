// js/state-breakdown.js

const drawStateBreakdownCharts = (stateData) => {
    // filter for overall jurisdiction total
    const filteredData = stateData.filter(d => d.dimension === 'jurisdiction' && d.category === 'all_cases');

    // aggregate total hospitalisations by state 2011-2021 period
    const stateMap = d3.rollup(
        filteredData,
        v => ({
            hospitalisations: d3.sum(v, d => d.hospitalisations),
            bed_days: d3.sum(v, d => d.bed_days)
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
        .domain([0, d3.max(data, d => d.hospitalisations) * 1.1])
        .range([innerHeight, 0])
        .nice();

    // using jurisdiction color scale
    innerChart.selectAll(".bar-jurisdiction")
        .data(data)
        .join("rect")
        .attr("class", "bar-jurisdiction")
        .attr("x", d => xScale(d.jurisdiction))
        .attr("y", d => yScale(d.hospitalisations))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScale(d.hospitalisations))
        .attr("fill", d => jurisdictionColorScale(d.jurisdiction))
        .attr("rx", 3);

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
        .domain([0, d3.max(bedDaysData, d => d.bed_days) * 1.1])
        .range([innerHeight, 0])
        .nice();

    innerChart.selectAll(".bar-beddays")
        .data(bedDaysData)
        .join("rect")
        .attr("class", "bar-beddays")
        .attr("x", d => xScale(d.jurisdiction))
        .attr("y", d => yScale(d.bed_days))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScale(d.bed_days))
        .attr("fill", d => jurisdictionColorScale(d.jurisdiction))
        .attr("rx", 3);

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