const drawAnnualTrendChart = (nationalData) => {
    // 1. aggregate hospitalisations by year and calculate YoY change
    const yearlyMap = d3.rollup(
        nationalData,
        v => d3.sum(v, d => d.hospitalisations),
        d => d.calendar_year
    );

    let yearlyData = Array.from(yearlyMap, ([year, count]) => ({ year: +year, count }))
        .sort((a, b) => a.year - b.year);

    yearlyData = yearlyData.map((d, i, arr) => {
        let pctChange = 0;
        if (i > 0 && arr[i - 1].count > 0) {
            pctChange = ((d.count - arr[i - 1].count) / arr[i - 1].count) * 100;
        }
        return { ...d, pctChange };
    });

    const svg = d3.select("#annual-trend-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const innerChart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 2. setup scale
    const xScale = d3.scalePoint()
        .domain(yearlyData.map(d => d.year))
        .range([0, innerWidth])
        .padding(0.5);

    const yScaleLeft = d3.scaleLinear()
        .domain([0, d3.max(yearlyData, d => d.count) * 1.1])
        .range([innerHeight, 0])
        .nice();

    const maxAbsPct = d3.max(yearlyData, d => Math.abs(d.pctChange)) || 10;
    const yScaleRight = d3.scaleLinear()
        .domain([-maxAbsPct * 1.2, maxAbsPct * 1.2])
        .range([innerHeight, 0])
        .nice();

    // 3. define segments based on breaks (Vic 2012, NSW 2017)
    const dataSeg1 = yearlyData.filter(d => d.year <= 2012);
    const dataSeg2 = yearlyData.filter(d => d.year >= 2012 && d.year <= 2017);
    const dataSeg3 = yearlyData.filter(d => d.year >= 2017);

    const lineGenerator = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScaleLeft(d.count))
        .curve(d3.curveMonotoneX);

    // draw segment 1
    innerChart.append("path")
        .datum(dataSeg1)
        .attr("fill", "none")
        .attr("stroke", OKABE_ITO.skyBlue)
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "2,2")
        .attr("d", lineGenerator);

    // segment 2 (2012 to 2017 break)
    innerChart.append("path")
        .datum(dataSeg2)
        .attr("fill", "none")
        .attr("stroke", OKABE_ITO.orange)
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "10,4,3,4")
        .attr("d", lineGenerator);

    // segment 3 (2017 to )
    innerChart.append("path")
        .datum(dataSeg3)
        .attr("fill", "none")
        .attr("stroke", OKABE_ITO.bluishGreen)
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "4,5")
        .attr("d", lineGenerator);

    // 4. draw different pattern markers (circle for seg 1, square 2, diamond 3)
    yearlyData.forEach(d => {
        const cx = xScale(d.year);
        const cy = yScaleLeft(d.count);

        if (d.year < 2012) {
            // circle
            innerChart.append("circle")
                .attr("cx", cx).attr("cy", cy).attr("r", 4.5)
                .attr("fill", OKABE_ITO.skyBlue);
        } else if (d.year >= 2012 && d.year < 2017) {
            // square
            innerChart.append("rect")
                .attr("x", cx - 4).attr("y", cy - 4)
                .attr("width", 8).attr("height", 8)
                .attr("fill", OKABE_ITO.orange);
        } else {
            // diamond
            const size = 5;
            innerChart.append("path")
                .attr("d", `M ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} L ${cx - size} ${cy} Z`)
                .attr("fill", OKABE_ITO.bluishGreen);
        }
    });

    // 5. YoY changes line (grey dashed)
    const linePctChange = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScaleRight(d.pctChange))
        .curve(d3.curveMonotoneX);

    innerChart.append("path")
        .datum(yearlyData)
        .attr("fill", "none")
        .attr("stroke", OKABE_ITO.grey)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,4")
        .attr("d", linePctChange);

    // 6. axis
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    innerChart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis);

    const yAxisLeft = d3.axisLeft(yScaleLeft).ticks(6).tickFormat(d3.format(",.0f"));
    innerChart.append("g").call(yAxisLeft);

    const yAxisRight = d3.axisRight(yScaleRight).ticks(6).tickFormat(d => `${d.toFixed(1)}%`);
    innerChart.append("g")
        .attr("transform", `translate(${innerWidth}, 0)`)
        .call(yAxisRight);

    // 7. labels
    innerChart.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .text("Calendar Year");

    innerChart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Hospitalisations");

    // 8. legend
    const legend = svg.append("g")
        .attr("class", "chart-legend")
        .attr("transform", `translate(${margin.left}, 8)`);

    // draw legend rows
    const addLegendRow = (x, y, color, text, dasharray, markerType) => {
        const item = legend.append("g").attr("transform", `translate(${x}, ${y})`);

        // line sample
        item.append("line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", 30).attr("y2", 0)
            .attr("stroke", color)
            .attr("stroke-width", 2.5)
            .attr("stroke-dasharray", dasharray);

        // marker sample
        if (markerType === "circle") {
            item.append("circle").attr("cx", 9).attr("cy", 0).attr("r", 3.5).attr("fill", color);
        } else if (markerType === "rect") {
            item.append("rect").attr("x", 6).attr("y", -3).attr("width", 6).attr("height", 6).attr("fill", color);
        } else if (markerType === "diamond") {
            item.append("path").attr("d", "M 9 -4 L 13 0 L 9 4 L 5 0 Z").attr("fill", color);
        }

        // text label
        item.append("text").attr("x", 38).attr("y", 4).text(text);
    };

    // row 1
    addLegendRow(0, 0, OKABE_ITO.skyBlue, "2011 (Baseline)", "2,2", "circle");
    addLegendRow(220, 0, OKABE_ITO.orange, "2012–2016 (Vic Break)", "10,4,3,4", "rect");

    // row 2
    addLegendRow(0, 18, OKABE_ITO.bluishGreen, "2017–2021 (NSW Break)", "4,5", "diamond");
    addLegendRow(220, 18, OKABE_ITO.grey, "YoY Change (%)", "4,4", "none");

    attachTrendTooltips(innerChart);
};