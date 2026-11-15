const drawFirstNationsGroupedBar = (data, statuses) => {
    const svg = d3.select("#first-nations-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const innerChart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const remotenessCategories = data.map(d => d.remoteness);

    const xScale0 = d3.scaleBand()
        .domain(remotenessCategories)
        .range([0, innerWidth])
        .padding(0.2);

    const xScale1 = d3.scaleBand()
        .domain(statuses)
        .range([0, xScale0.bandwidth()])
        .padding(0.05);

    const maxVal = (d3.max(data, d => d3.max(statuses, status => d[status])) || 1) * 1.1;
    const yScale = d3.scaleLinear()
        .domain([0, maxVal])
        .range([innerHeight, 0])
        .nice();

    // Color scale for First Nations status
    const colorScale = d3.scaleOrdinal()
        .domain(statuses)
        .range([OKABE_ITO.orange, OKABE_ITO.blue]);

    // Draw grouped bars
    const remotenessGroups = innerChart.selectAll(".remoteness-group")
        .data(data)
        .join("g")
        .attr("transform", d => `translate(${xScale0(d.remoteness)}, 0)`);

    remotenessGroups.selectAll("rect")
        .data(d => statuses
            .filter(status => Number.isFinite(d[status]))
            .map(status => ({ status, count: d[status], remoteness: d.remoteness })))
        .join("rect")
        .attr("x", d => xScale1(d.status))
        .attr("y", d => yScale(d.count))
        .attr("width", xScale1.bandwidth())
        .attr("height", d => innerHeight - yScale(d.count))
        .attr("fill", d => colorScale(d.status))
        .attr("rx", 2);

    remotenessGroups.selectAll(".first-nations-no-data")
        .data(d => statuses
            .filter(status => !Number.isFinite(d[status]))
            .map(status => ({ status, remoteness: d.remoteness })))
        .join("text")
        .attr("class", "first-nations-no-data")
        .attr("x", d => xScale1(d.status) + xScale1.bandwidth() / 2)
        .attr("y", innerHeight - 5)
        .attr("text-anchor", "middle")
        .attr("aria-label", d => `${d.status}, ${d.remoteness}: N.P. (not applicable)`)
        .text("N.P.");

    // Axes
    const xAxis = d3.axisBottom(xScale0);
    innerChart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis);

    const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(",.0f"));
    innerChart.append("g").call(yAxis);

    // Labels
    innerChart.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .text("ABS Remoteness Area");

    innerChart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Total Hospitalisations");

    // Legend
    const legend = svg.append("g")
        .attr("class", "chart-legend")
        .attr("transform", `translate(${margin.left}, 15)`);

    statuses.forEach((status, i) => {
        const item = legend.append("g").attr("transform", `translate(${i * 180}, 0)`);
        item.append("rect").attr("width", 12).attr("height", 12).attr("fill", colorScale(status)).attr("rx", 2);
        item.append("text").attr("x", 18).attr("y", 10).text(status);
    });

    // Tooltips
    const tooltip = getTooltip();
    remotenessGroups.selectAll("rect")
        .on("mouseenter", (event, d) => {
            tooltip.transition().duration(150).style("opacity", 1);
            tooltip.html(`
                <strong>Remoteness:</strong> ${d.remoteness}<br/>
                <strong>Status:</strong> ${d.status}<br/>
                <strong>Hospitalisations:</strong> ${d3.format(",")(d.count)}
            `);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", () => {
            tooltip.transition().duration(200).style("opacity", 0);
        });
};
