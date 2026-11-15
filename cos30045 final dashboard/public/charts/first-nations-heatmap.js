const drawFirstNationsHeatmap = rawData => {
    const controls = d3.select("#first-nations-heatmap-controls");
    const container = d3.select("#first-nations-heatmap-chart");
    const periods = ["Jan-Jun", "Jul-Dec"];
    const statuses = ["First Nations people", "Non-Indigenous"];
    const dimensions = [
        { key: "Remoteness area", label: "Remoteness area" },
        { key: "Age group", label: "Age group" },
        { key: "Road user", label: "Road user" },
        { key: "Counterparty", label: "Counterparty" }
    ];
    const data = rawData.filter(row =>
        Number.isFinite(row.calendar_year) &&
        statuses.includes(row.first_nations_status) &&
        dimensions.some(dimension => dimension.key === row.dimension)
    );
    const selected = { dimension: "Remoteness area", display: "count" };
    const controlData = [
        { key: "dimension", label: "Break down by", options: dimensions },
        { key: "display", label: "Display", options: [
            { key: "count", label: "Hospitalisation counts" },
            { key: "share", label: "Share within status and year" }
        ] }
    ];

    const control = controls.selectAll(".profile-matrix-control")
        .data(controlData)
        .join("div")
        .attr("class", "profile-matrix-control");

    control.append("label")
        .attr("for", item => `first-nations-heatmap-${item.key}`)
        .text(item => item.label);

    control.append("select")
        .attr("id", item => `first-nations-heatmap-${item.key}`)
        .on("change", (event, item) => {
            selected[item.key] = event.target.value;
            render();
        })
        .each(function(item) {
            d3.select(this).selectAll("option")
                .data(item.options)
                .join("option")
                .attr("value", option => option.key)
                .text(option => option.label);
            d3.select(this).property("value", selected[item.key]);
        });

    const tooltip = d3.select("body").selectAll(".first-nations-heatmap-tooltip")
        .data([null])
        .join("div")
        .attr("class", "d3-tooltip first-nations-heatmap-tooltip")
        .style("opacity", 0);

    function render() {
        const dimension = dimensions.find(item => item.key === selected.dimension);
        const dimensionRows = data.filter(row => row.dimension === dimension.key);
        const years = Array.from(new Set(dimensionRows.map(row => row.calendar_year)))
            .sort((a, b) => a - b);
        const categorySet = Array.from(new Set(dimensionRows.map(row => row.category)));
        const annualByCategory = d3.rollup(
            dimensionRows,
            rows => {
                const byPeriod = d3.group(rows, row => row.period);
                const periodRows = periods.map(period => byPeriod.get(period));
                const complete = periodRows.every(rowsForPeriod =>
                    rowsForPeriod?.length && rowsForPeriod.every(row => Number.isFinite(row.hospitalisations))
                );
                return complete
                    ? d3.sum(periodRows.flat(), row => row.hospitalisations)
                    : null;
            },
            row => row.first_nations_status,
            row => row.category,
            row => row.calendar_year
        );
        const categoryTotals = new Map(categorySet.map(category => [
            category,
            d3.sum(statuses.flatMap(status => years.map(year => {
                const value = annualByCategory.get(status)?.get(category)?.get(year);
                return Number.isFinite(value) ? value : 0;
            })))
        ]));
        const categories = categorySet.sort((a, b) =>
            d3.descending(categoryTotals.get(a), categoryTotals.get(b)) ||
            d3.ascending(a, b)
        );
        const annualTotals = new Map(statuses.map(status => [
            status,
            new Map(years.map(year => {
                const values = categories.map(category =>
                    annualByCategory.get(status)?.get(category)?.get(year)
                );
                const complete = values.length === categories.length && values.every(Number.isFinite);
                return [year, complete ? d3.sum(values) : null];
            }))
        ]));
        const cells = statuses.flatMap(status => categories.flatMap(category =>
            years.map(year => {
                const value = annualByCategory.get(status)?.get(category)?.get(year) ?? null;
                const total = annualTotals.get(status).get(year);
                return {
                    status,
                    category,
                    year,
                    value,
                    share: Number.isFinite(value) && Number.isFinite(total) && total > 0
                        ? value / total
                        : null
                };
            })
        ));

        container.selectAll("*").remove();
        if (!years.length || !categories.length) {
            container.append("div")
                .attr("class", "heatmap-empty-state")
                .text("No First Nations records are available for this breakdown.");
            return;
        }

        const panelWidth = 813;
        const panelGap = 36;
        const cellWidth = 44;
        const cellHeight = 31;
        const labelWidth = 295;
        const plotWidth = years.length * cellWidth;
        const plotTop = 84;
        const width = panelWidth * statuses.length + panelGap * (statuses.length - 1);
        const height = Math.max(300, plotTop + categories.length * cellHeight + 66);
        const maxValue = selected.display === "share"
            ? 1
            : d3.max(cells, cell => cell.value) || 1;
        const intensity = d3.scaleSqrt().domain([0, maxValue]).range([0, 1]);
        const color = value => value === 0
            ? "#f2f2f2"
            : d3.interpolateCividis(intensity(value));
        const formatCompact = d3.format(".2~s");
        const formatCount = d3.format(",.0f");
        const formatShare = d3.format(".0%");
        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("role", "img")
            .attr("aria-label", `Annual ${dimension.label.toLowerCase()} hospitalisation heatmap by First Nations status`);
        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "first-nations-heatmap-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%");

        const missingPattern = defs.append("pattern")
            .attr("id", "first-nations-heatmap-missing")
            .attr("width", 7)
            .attr("height", 7)
            .attr("patternUnits", "userSpaceOnUse")
            .attr("patternTransform", "rotate(45)");
        missingPattern.append("rect")
            .attr("width", 7)
            .attr("height", 7)
            .attr("fill", "#f2f2f2");
        missingPattern.append("line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", 0)
            .attr("y2", 7)
            .attr("stroke", "#999999")
            .attr("stroke-width", 2);
        [0, 0.25, 0.5, 0.75, 1].forEach(position => {
            gradient.append("stop")
                .attr("offset", `${position * 100}%`)
                .attr("stop-color", d3.interpolateCividis(Math.sqrt(position)));
        });

        statuses.forEach((status, statusIndex) => {
            const panelX = statusIndex * (panelWidth + panelGap);
            const plotX = panelX + labelWidth;
            svg.append("text")
                .attr("class", "first-nations-heatmap-title")
                .attr("x", panelX + 8)
                .attr("y", 25)
                .text(status);
            svg.append("text")
                .attr("class", "first-nations-heatmap-summary")
                .attr("x", panelX + 8)
                .attr("y", 46)
                .text(selected.display === "count"
                    ? "Annual hospitalisations"
                    : "Share of this group's annual hospitalisations");

            years.forEach((year, yearIndex) => {
                const x = plotX + yearIndex * cellWidth;
                const isBreakYear = year === 2012 || year === 2017;
                svg.append("rect")
                    .attr("class", isBreakYear ? "first-nations-heatmap-year-break" : "first-nations-heatmap-year")
                    .attr("x", x + 1)
                    .attr("y", plotTop - 25)
                    .attr("width", cellWidth - 3)
                    .attr("height", 20)
                    .attr("rx", 2);
                svg.append("text")
                    .attr("class", `first-nations-heatmap-axis${isBreakYear ? " is-break" : ""}`)
                    .attr("x", x + (cellWidth - 2) / 2)
                    .attr("y", plotTop - 11)
                    .attr("text-anchor", "middle")
                    .text(year);
            });

            categories.forEach((category, categoryIndex) => {
                const y = plotTop + categoryIndex * cellHeight;
                const categoryLabel = category.length > 39
                    ? `${category.slice(0, 36)}...`
                    : category;
                svg.append("text")
                    .attr("class", "first-nations-heatmap-axis")
                    .attr("x", plotX - 10)
                    .attr("y", y + cellHeight / 2 + 4)
                    .attr("text-anchor", "end")
                    .text(categoryLabel)
                    .append("title")
                    .text(category);
            });
        });

        const cellsByStatus = d3.group(cells, cell => cell.status);
        statuses.forEach((status, statusIndex) => {
            const panelX = statusIndex * (panelWidth + panelGap);
            const plotX = panelX + labelWidth;
            const panelCells = cellsByStatus.get(status) || [];
            const cellGroups = svg.append("g")
                .selectAll(".first-nations-heatmap-cell")
                .data(panelCells)
                .join("g")
                .attr("class", "first-nations-heatmap-cell")
                .attr("transform", cell => {
                    const categoryIndex = categories.indexOf(cell.category);
                    const yearIndex = years.indexOf(cell.year);
                    return `translate(${plotX + yearIndex * cellWidth + 1},${plotTop + categoryIndex * cellHeight + 2})`;
                });
            cellGroups.append("rect")
                .attr("width", cellWidth - 4)
                .attr("height", cellHeight - 4)
                .attr("rx", 2)
                .attr("fill", cell => {
                    const value = selected.display === "share" ? cell.share : cell.value;
                    return Number.isFinite(value) ? color(value) : "url(#first-nations-heatmap-missing)";
                })
                .attr("tabindex", 0)
                .attr("role", "img")
                .attr("aria-label", cell => {
                    const value = selected.display === "share" ? cell.share : cell.value;
                    return `${cell.status}, ${cell.category}, ${cell.year}: ${Number.isFinite(value)
                        ? selected.display === "share" ? formatShare(value) : formatCount(value)
                        : "N.P. (not applicable)"}`;
                })
                .on("mouseenter focus", function(event, cell) {
                    const value = selected.display === "share" ? cell.share : cell.value;
                    const valueLabel = Number.isFinite(value)
                        ? selected.display === "share" ? formatShare(value) : formatCount(value)
                        : "N.P. (not applicable)";
                    tooltip.style("opacity", 1).html(
                        `<strong>${cell.status}</strong><br>${cell.category}<br>${cell.year}<br>Hospitalisations: ${Number.isFinite(cell.value) ? formatCount(cell.value) : "N.P. (not applicable)"}<br>${selected.display === "share" ? "Share" : "Display"}: ${valueLabel}`
                    );
                    if (event.type === "focus") {
                        const bounds = this.getBoundingClientRect();
                        tooltip.style("left", `${bounds.left + window.scrollX + 8}px`)
                            .style("top", `${bounds.top + window.scrollY}px`);
                    }
                })
                .on("mousemove", event => tooltip
                    .style("left", `${event.pageX + 12}px`)
                    .style("top", `${event.pageY - 28}px`))
                .on("mouseleave blur", () => tooltip.style("opacity", 0));
            cellGroups.append("text")
                .attr("class", "first-nations-heatmap-cell-label")
                .attr("x", (cellWidth - 4) / 2)
                .attr("y", (cellHeight - 4) / 2 + 3.5)
                .attr("text-anchor", "middle")
                .attr("fill", cell => {
                    const value = selected.display === "share" ? cell.share : cell.value;
                    if (!Number.isFinite(value)) return "#263238";
                    const cellColor = value === 0 ? d3.color("#efefec") : d3.color(color(value));
                    const luminance = (0.2126 * cellColor.r + 0.7152 * cellColor.g + 0.0722 * cellColor.b) / 255;
                    return luminance > 0.55 ? "#263238" : "#fff";
                })
                .text(cell => {
                    const value = selected.display === "share" ? cell.share : cell.value;
                    if (!Number.isFinite(value)) return "N.P.";
                    return selected.display === "share" ? formatShare(value) : formatCompact(value);
                });
        });

        const legendY = height - 23;
        const legendX = (width - 264) / 2;
        svg.append("text")
            .attr("class", "first-nations-heatmap-legend")
            .attr("x", legendX)
            .attr("y", legendY + 9)
            .text(selected.display === "share" ? "0%" : "Lower");
        svg.append("rect")
            .attr("x", legendX + 40)
            .attr("y", legendY)
            .attr("width", 170)
            .attr("height", 11)
            .attr("fill", "url(#first-nations-heatmap-gradient)");
        svg.append("text")
            .attr("class", "first-nations-heatmap-legend")
            .attr("x", legendX + 217)
            .attr("y", legendY + 9)
            .text(selected.display === "share" ? "100%" : "Higher");
        svg.append("rect")
            .attr("x", legendX + 282)
            .attr("y", legendY - 1)
            .attr("width", 17)
            .attr("height", 13)
            .attr("fill", "url(#first-nations-heatmap-missing)")
            .attr("stroke", "#929a96");
        svg.append("text")
            .attr("class", "first-nations-heatmap-legend")
            .attr("x", legendX + 305)
            .attr("y", legendY + 9)
            .text("N.P.");
    }

    render();
};
