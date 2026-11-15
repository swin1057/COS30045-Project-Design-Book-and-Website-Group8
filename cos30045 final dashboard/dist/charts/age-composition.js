function drawAgeCompositionChart(rawData) {

    const container = d3.select("#age-composition-chart");
    container.selectAll("*").remove();

    const prepared = prepareAgeYearData(rawData);
    const { years, ageGroups, data } = prepared;

    const width = 650;
    const height = 440;

    const margin = {
        top: 25,
        right: 25,
        bottom: 105,
        left: 65
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Convert grouped records into one object per year
    const yearlyData = years.map(year => {

        const row = { year: year };

        ageGroups.forEach(ageGroup => {

            const record = data.find(d =>
                d.year === year && d.ageGroup === ageGroup
            );

            row[ageGroup] = record
                ? record.hospitalisations
                : 0;
        });

        return row;
    });

    const xScale = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, 1])
        .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(ageGroups)
        .range([
            ...AGE_GROUPS_CONFIG.map(item => item.color),
            OKABE_ITO.grey
        ]);

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("preserveAspectRatio", "xMidYMid meet");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Generate 100% stacked area data
    const stack = d3.stack()
        .keys(ageGroups)
        .offset(d3.stackOffsetExpand);

    const stackedData = stack(yearlyData);

    const area = d3.area()
        .x(d => xScale(d.data.year))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveMonotoneX);

    // Draw stacked areas
    chart.selectAll(".age-area")
        .data(stackedData)
        .join("path")
        .attr("class", "age-area")
        .attr("fill", d => colorScale(d.key))
        .attr("d", area)
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5);

    // X axis
    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
            d3.axisBottom(xScale)
                .tickValues(years)
                .tickFormat(d3.format("d"))
        )
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end");

    // Y axis
    chart.append("g")
        .call(
            d3.axisLeft(yScale)
                .ticks(5)
                .tickFormat(d3.format(".0%"))
        );

    // Axis titles
    svg.append("text")
        .attr("x", margin.left + innerWidth / 2)
        .attr("y", height - 60)
        .attr("text-anchor", "middle")
        .text("Calendar Year");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + innerHeight / 2))
        .attr("y", 18)
        .attr("text-anchor", "middle")
        .text("Share of Annual Hospitalisations");

    // Tooltip
    const tooltip = getTab1Tooltip();

    // Vertical guide line for inspecting a year
    const guideLine = chart.append("line")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "#333")
        .attr("stroke-dasharray", "4,4")
        .style("opacity", 0);

    // Transparent interaction layer
    chart.append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "transparent")
        .style("cursor", "crosshair")
        .on("mousemove", function(event) {

            const [mouseX] = d3.pointer(event, this);
            const selectedYear = Math.round(xScale.invert(mouseX));

            const year = years.reduce((previous, current) =>
                Math.abs(current - selectedYear) <
                Math.abs(previous - selectedYear)
                    ? current
                    : previous
            );

            const yearRecord = yearlyData.find(d => d.year === year);

            const total = d3.sum(
                ageGroups,
                group => yearRecord[group]
            );

            const details = ageGroups.map(group => {

                const count = yearRecord[group];
                const percentage = total > 0
                    ? count / total
                    : 0;

                return `
                    <div>
                        <span style="color:${colorScale(group)}">●</span>
                        ${group}: ${d3.format(",")(count)}
                        (${d3.format(".1%")(percentage)})
                    </div>
                `;
            }).join("");

            guideLine
                .attr("x1", xScale(year))
                .attr("x2", xScale(year))
                .style("opacity", 1);

            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${year}</strong>
                    <div>Total: ${d3.format(",")(total)}</div>
                    <hr>
                    ${details}
                `);
        })
        .on("mouseout", function() {

            guideLine.style("opacity", 0);
            tooltip.style("opacity", 0);
        })
        .on("mousemove", function(event) {
            // Position the tooltip near the pointer
            tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 25) + "px");
        });

    // Legend
    const legend = svg.append("g")
        .attr("transform",
            `translate(${margin.left},${height - 25})`
        );

    const columns = 4;
    const itemWidth = innerWidth / columns;

    ageGroups.forEach((group, i) => {

        const item = legend.append("g")
            .attr("transform",
                `translate(${(i % columns) * itemWidth},
                ${Math.floor(i / columns) * 20})`
            );

        item.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", colorScale(group));

        item.append("text")
            .attr("x", 15)
            .attr("y", 9)
            .text(group);
    });
}