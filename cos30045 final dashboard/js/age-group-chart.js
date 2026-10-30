const drawAgeGroupChart = (nationalData) => {
    const ageMap = d3.rollup(
        nationalData,
        v => d3.sum(v, d => d.hospitalisations),
        d => d.age_group
    );

    let ageData = AGE_GROUPS_CONFIG.map(config => ({
        age_group: config.group,
        count: ageMap.get(config.group) || 0,
        color: config.color
    }));

    const svg = d3.select("#age-group-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const innerChart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleBand()
        .domain(ageData.map(d => d.age_group))
        .range([0, innerWidth])
        .padding(0.25);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(ageData, d => d.count) * 1.1])
        .range([innerHeight, 0])
        .nice();

    // categorical bar with Okabe Ito colors
    innerChart.selectAll(".bar-age")
        .data(ageData)
        .join("rect")
        .attr("class", "bar-age")
        .attr("x", d => xScale(d.age_group))
        .attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScale(d.count))
        .attr("fill", d => d.color)
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
        .text("Age Group (Categorical Segments)");

    innerChart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Hospitalisations");

    attachAgeTooltips(innerChart);
};