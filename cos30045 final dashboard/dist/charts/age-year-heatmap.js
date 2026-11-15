function drawAgeYearHeatmap(rawData) {

    const container = d3.select("#age-year-heatmap-chart");
    container.selectAll("*").remove();

    const prepared = prepareAgeYearData(rawData);
    const { years, ageGroups, data } = prepared;

    const width = 650;
    const height = 420;

    const margin = {
        top: 25,
        right: 25,
        bottom: 65,
        left: 85
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxValue = d3.max(data, d => d.hospitalisations) || 1;

    const xScale = d3.scaleBand()
        .domain(years)
        .range([0, innerWidth])
        .padding(0.05);

    const yScale = d3.scaleBand()
        .domain(ageGroups)
        .range([0, innerHeight])
        .padding(0.05);

    const colorScale = d3.scaleSequential()
        .domain([0, maxValue])
        .interpolator(d3.interpolateCividis);

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("preserveAspectRatio", "xMidYMid meet");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end");

    // Y axis
    chart.append("g")
        .call(d3.axisLeft(yScale));

    // Axis titles
    svg.append("text")
        .attr("x", margin.left + innerWidth / 2)
        .attr("y", height - 8)
        .attr("text-anchor", "middle")
        .text("Calendar Year");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + innerHeight / 2))
        .attr("y", 18)
        .attr("text-anchor", "middle")
        .text("Age Group");

    // Tooltip
    const tooltip = getTab1Tooltip();

    // Heatmap cells
    chart.selectAll(".heatmap-cell")
        .data(data)
        .join("rect")
        .attr("class", "heatmap-cell")
        .attr("x", d => xScale(d.year))
        .attr("y", d => yScale(d.ageGroup))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("rx", 2)
        .attr("fill", d => colorScale(d.hospitalisations))
        .on("mouseover", function(event, d) {

            d3.select(this)
                .attr("stroke", "#333")
                .attr("stroke-width", 1.5);

            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${d.year}</strong><br>
                    Age group: ${d.ageGroup}<br>
                    Hospitalisations:
                    ${d3.format(",")(d.hospitalisations)}
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 25) + "px");
        })
        .on("mouseout", function() {

            d3.select(this)
                .attr("stroke", "none");

            tooltip.style("opacity", 0);
        });

    // Colour legend
    const legendWidth = 180;
    const legendHeight = 10;

    const defs = svg.append("defs");

    const gradient = defs.append("linearGradient")
        .attr("id", "age-heatmap-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(0));

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale(maxValue));

    const legend = svg.append("g")
        .attr("transform",
            `translate(${width - margin.right - legendWidth},${height - 28})`
        );

    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .attr("fill", "url(#age-heatmap-gradient)");

    legend.append("text")
        .attr("x", 0)
        .attr("y", -6)
        .text("Fewer");

    legend.append("text")
        .attr("x", legendWidth)
        .attr("y", -6)
        .attr("text-anchor", "end")
        .text("More");
}