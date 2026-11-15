function drawHighDensityHeatmap(rawData) {
    const controls = d3.select("#high-density-heatmap-controls");
    const container = d3.select("#high-density-heatmap-chart");
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const filters = [
        { key: "cause_of_injury", label: "Injury cause", allLabel: "All causes" },
        { key: "road_user", label: "Road user", allLabel: "All road users" },
        { key: "sex", label: "Sex", allLabel: "All sexes" },
        { key: "age_group", label: "Age group", allLabel: "All ages" },
        { key: "remoteness_area", label: "Remoteness", allLabel: "All areas" },
        { key: "counterparty", label: "Counterparty", allLabel: "All counterparties" }
    ];
    const metrics = [
        { key: "hospitalisations", label: "Hospitalisations" },
        { key: "bed_days", label: "Bed days" },
        { key: "died_cases", label: "Cases ending in death" }
    ];
    const normalizedData = rawData.map(d => ({
        ...d,
        calendar_year: +d.calendar_year,
        month: String(d.month || "").trim(),
        cause_of_injury: String(d.cause_of_injury || "Unknown / missing").trim(),
        road_user: String(d.road_user || "Unknown / missing").trim(),
        sex: String(d.sex || "Unknown / missing").trim(),
        age_group: String(d.age_group || "Unknown / missing").trim(),
        remoteness_area: String(d.remoteness_area || "Unknown / missing").trim(),
        counterparty: String(d.counterparty || "Unknown / missing").trim()
    })).filter(d => Number.isFinite(d.calendar_year) && months.includes(d.month));

    const selected = Object.fromEntries(filters.map(filter => [filter.key, "All"]));
    selected.cause_of_injury = "Traffic";
    selected.metric = "hospitalisations";
    selected.scale = "relative";

    const tooltip = d3.select("body").selectAll(".heatmap-tooltip")
        .data([null])
        .join("div")
        .attr("class", "d3-tooltip heatmap-tooltip")
        .style("opacity", 0);

    const controlData = [
        ...filters.map(filter => ({ ...filter, type: "dimension" })),
        { key: "metric", label: "Measure", type: "metric" }
    ];

    const scaleOptions = [
        { value: "relative", label: "Relative to current filters" },
        { value: "absolute", label: "Absolute across groups" }
    ];
    const scaleToggle = controls.selectAll(".heatmap-scale-toggle")
        .data([null])
        .join("div")
        .attr("class", "heatmap-scale-toggle")
        .attr("role", "group")
        .attr("aria-label", "Monthly heatmap color scale");
    scaleToggle.append("span")
        .attr("class", "heatmap-scale-label")
        .text("Color scale");
    const scaleButtons = scaleToggle.selectAll("button")
        .data(scaleOptions, option => option.value)
        .join("button")
        .attr("type", "button")
        .attr("class", "heatmap-scale-button")
        .text(option => option.label)
        .on("click", (event, option) => {
            selected.scale = option.value;
            scaleButtons
                .classed("active", item => selected.scale === item.value)
                .attr("aria-pressed", item => selected.scale === item.value ? "true" : "false");
            render();
        });

    const control = controls.selectAll(".heatmap-control")
        .data(controlData)
        .join("div")
        .attr("class", "heatmap-control");

    control.append("label")
        .attr("for", d => `heatmap-filter-${d.key}`)
        .text(d => d.label);

    control.append("select")
        .attr("id", d => `heatmap-filter-${d.key}`)
        .on("change", (event, d) => {
            selected[d.key] = event.target.value;
            render();
        })
        .each(function(d) {
            const select = d3.select(this);
            if (d.type === "metric") {
                select.selectAll("option")
                    .data(metrics)
                    .join("option")
                    .attr("value", option => option.key)
                    .text(option => option.label);
                select.property("value", selected.metric);
                return;
            }

            const values = Array.from(new Set(normalizedData.map(row => row[d.key])))
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            const options = [{ value: "All", label: d.allLabel }, ...values.map(value => ({ value, label: value }))];
            select.selectAll("option")
                .data(options)
                .join("option")
                .attr("value", option => option.value)
                .text(option => option.label);
            select.property("value", selected[d.key]);
        });

    function render() {
        const filtered = normalizedData.filter(row =>
            filters.every(filter =>
                selected[filter.key] === "All" || row[filter.key] === selected[filter.key]
            )
        );

        container.selectAll("*").remove();
        if (filtered.length === 0) {
            container.append("div")
                .attr("class", "heatmap-empty-state")
                .text("No records match these filters.");
            return;
        }

        const years = Array.from(new Set(filtered.map(d => d.calendar_year))).sort((a, b) => a - b);
        const metric = metrics.find(d => d.key === selected.metric);
        const byYearMonth = d3.rollup(
            filtered,
            rows => d3.sum(rows, d => Number.isFinite(+d[selected.metric]) ? +d[selected.metric] : 0),
            d => d.calendar_year,
            d => d.month
        );
        const cells = years.flatMap(year => months.map(month => ({
            year,
            month,
            value: byYearMonth.get(year)?.get(month) || 0
        })));
        const monthTotals = new Map(months.map(month => [
            month,
            d3.sum(cells.filter(cell => cell.month === month), d => d.value)
        ]));
        const yearTotals = new Map(years.map(year => [
            year,
            d3.sum(cells.filter(cell => cell.year === year), d => d.value)
        ]));
        const grandTotal = d3.sum(yearTotals.values());
        const peak = cells.reduce((best, cell) => cell.value > best.value ? cell : best, cells[0]);

        const margin = { top: 90, right: 80, bottom: 92, left: 70 };
        const cellWidth = 40;
        const cellHeight = 25;
        const plotWidth = years.length * cellWidth;
        const plotHeight = months.length * cellHeight;
        const totalsX = margin.left + plotWidth + 18;
        const totalsY = margin.top + plotHeight + 20;
        const width = totalsX + margin.right;
        const height = totalsY + margin.bottom;
        const positiveValues = cells.map(cell => cell.value).filter(value => value > 0);
        const absoluteByYearMonth = d3.rollup(
            normalizedData,
            rows => d3.sum(rows, d => Number.isFinite(+d[selected.metric]) ? +d[selected.metric] : 0),
            d => d.calendar_year,
            d => d.month
        );
        const absoluteUpperBound = d3.max(
            Array.from(absoluteByYearMonth.values()).flatMap(byMonth => Array.from(byMonth.values()))
        ) ?? 1;
        const lowerBound = selected.scale === "absolute" ? 0 : d3.min(positiveValues) ?? 0;
        const upperBound = selected.scale === "absolute" ? absoluteUpperBound : d3.max(positiveValues) ?? 1;
        const intensity = d3.scaleLinear()
            .domain([lowerBound, upperBound > lowerBound ? upperBound : lowerBound + 1])
            .range([0, 1])
            .clamp(true);
        const color = value => value === 0 ? "#f2f2f2" : d3.interpolateCividis(intensity(value));
        const compact = value => d3.format(value >= 10000 ? ".3~s" : ",.0f")(value);
        const valueFormat = d3.format(",.0f");
        scaleButtons
            .classed("active", option => selected.scale === option.value)
            .attr("aria-pressed", option => selected.scale === option.value ? "true" : "false");

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("role", "img")
            .attr("aria-label", `Monthly ${metric.label.toLowerCase()} heatmap from ${years[0]} to ${years[years.length - 1]}, ${selected.scale} color scale from ${compact(lowerBound)} to ${compact(upperBound)}`);

        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "monthly-heatmap-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%");
        gradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateCividis(0));
        gradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateCividis(1));

        svg.append("text")
            .attr("class", "heatmap-total-label")
            .attr("x", margin.left)
            .attr("y", 20)
            .text(`Filtered total: ${valueFormat(grandTotal)} ${metric.label.toLowerCase()}  |  Peak: ${peak.month} ${peak.year} (${valueFormat(peak.value)})`);

        const grid = svg.append("g");
        years.forEach((year, index) => {
            const x = margin.left + index * cellWidth;
            const isBreakYear = year === 2012 || year === 2017;
            const yearHeader = grid.append("rect")
                .attr("x", x + 1)
                .attr("y", margin.top - 35)
                .attr("width", cellWidth - 3)
                .attr("height", 27)
                .attr("rx", 2)
                .attr("fill", isBreakYear ? "#fff0dc" : "#f2f3f1");
            if (isBreakYear) {
                yearHeader.append("title").text(year === 2012
                    ? "Victoria emergency-department admission policy changed from 2012."
                    : "New South Wales emergency-department admission policy changed from 2017.");
            }
            grid.append("text")
                .attr("class", `heatmap-axis-label${isBreakYear ? " heatmap-year-break" : ""}`)
                .attr("x", x + (cellWidth - 2) / 2)
                .attr("y", margin.top - 17)
                .attr("text-anchor", "middle")
                .text(year);
        });

        grid.selectAll(".heatmap-month-label")
            .data(months)
            .join("text")
            .attr("class", "heatmap-axis-label")
            .attr("x", margin.left - 10)
            .attr("y", (month, index) => margin.top + index * cellHeight + cellHeight / 2 + 4)
            .attr("text-anchor", "end")
            .text(month => month);

        const cell = grid.selectAll(".heatmap-cell")
            .data(cells)
            .join("g")
            .attr("transform", d => `translate(${margin.left + years.indexOf(d.year) * cellWidth},${margin.top + months.indexOf(d.month) * cellHeight})`)
            .attr("tabindex", 0)
            .attr("role", "img")
            .attr("aria-label", d => `${d.month} ${d.year}: ${valueFormat(d.value)} ${metric.label.toLowerCase()}`)
            .on("mouseenter focus", function(event, d) {
                d3.select(this).select("rect")
                    .attr("stroke", "#242424")
                    .attr("stroke-width", 1.5);
                tooltip.style("opacity", 1).html(
                    `<strong>${d.month} ${d.year}</strong><br>${metric.label}: ${valueFormat(d.value)}`
                );
                if (event.type === "focus") {
                    const bounds = this.getBoundingClientRect();
                    tooltip.style("left", `${bounds.left + bounds.width / 2 + window.scrollX + 10}px`)
                        .style("top", `${bounds.top + window.scrollY}px`);
                }
            })
            .on("mousemove", event => {
                tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`);
            })
            .on("mouseleave blur", function() {
                d3.select(this).select("rect").attr("stroke", "#fff").attr("stroke-width", 1);
                tooltip.style("opacity", 0);
            });

        cell.append("rect")
            .attr("width", cellWidth - 3)
            .attr("height", cellHeight - 3)
            .attr("rx", 2)
            .attr("fill", d => color(d.value))
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);

        cell.append("text")
            .attr("class", "heatmap-cell-label")
            .attr("x", (cellWidth - 3) / 2)
            .attr("y", (cellHeight - 3) / 2 + 3.5)
            .attr("text-anchor", "middle")
            .attr("fill", d => d3.lab(color(d.value)).l > 58 ? "#292929" : "#fff")
            .text(d => compact(d.value));

        svg.append("text")
            .attr("class", "heatmap-total-label")
            .attr("x", totalsX)
            .attr("y", margin.top - 17)
            .text("Month total");
        months.forEach((month, index) => {
            svg.append("text")
                .attr("class", "heatmap-total-label")
                .attr("x", totalsX)
                .attr("y", margin.top + index * cellHeight + cellHeight / 2 + 4)
                .text(compact(monthTotals.get(month)));
        });

        svg.append("text")
            .attr("class", "heatmap-total-label")
            .attr("x", margin.left - 10)
            .attr("y", totalsY + 4)
            .attr("text-anchor", "end")
            .text("Year total");
        years.forEach((year, index) => {
            svg.append("text")
                .attr("class", "heatmap-total-label")
                .attr("x", margin.left + index * cellWidth + (cellWidth - 3) / 2)
                .attr("y", totalsY + 4)
                .attr("text-anchor", "middle")
                .text(compact(yearTotals.get(year)));
        });
        svg.append("text")
            .attr("class", "heatmap-total-label")
            .attr("x", totalsX)
            .attr("y", totalsY + 4)
            .text(compact(grandTotal));

        const legendWidth = 150;
        const legendY = height - 19;
        svg.append("text")
            .attr("class", "heatmap-legend-label")
            .attr("x", margin.left)
            .attr("y", legendY + 8)
            .text(compact(lowerBound));
        svg.append("rect")
            .attr("x", margin.left + 38)
            .attr("y", legendY)
            .attr("width", legendWidth)
            .attr("height", 10)
            .attr("fill", "url(#monthly-heatmap-gradient)");
        svg.append("text")
            .attr("class", "heatmap-legend-label")
            .attr("x", margin.left + 38 + legendWidth + 6)
            .attr("y", legendY + 8)
            .text(compact(upperBound));
        svg.append("text")
            .attr("class", "heatmap-legend-label")
            .attr("x", margin.left)
            .attr("y", legendY - 5)
            .text(selected.scale === "absolute" ? "Absolute scale · all groups" : "Relative scale · current filters");
    }

    render();
}
