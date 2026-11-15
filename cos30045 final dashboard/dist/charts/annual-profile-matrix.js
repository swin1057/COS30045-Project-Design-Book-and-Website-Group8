function drawProfileMatrix(rawData) {
    const controls = d3.select("#profile-matrix-controls");
    const container = d3.select("#profile-matrix-chart");
    const dimensions = [
        { key: "road_user", label: "Road user" },
        { key: "age_group", label: "Age group" },
        { key: "remoteness_area", label: "Remoteness" },
        { key: "sex", label: "Sex" },
        { key: "counterparty", label: "Counterparty" }
    ];
    const measures = [
        { key: "hospitalisations", label: "Hospitalisations" },
        { key: "bed_days", label: "Bed days" },
        { key: "died_cases", label: "Cases ending in death" }
    ];
    const data = rawData.map(row => ({
        ...row,
        calendar_year: +row.calendar_year,
        hospitalisations: +row.hospitalisations || 0,
        bed_days: +row.bed_days || 0,
        died_cases: +row.died_cases || 0
    })).filter(row => Number.isFinite(row.calendar_year));
    const selected = {
        dimension: "road_user",
        measure: "hospitalisations",
        display: "count"
    };
    const controlData = [
        { key: "dimension", label: "Break down by", options: dimensions },
        { key: "measure", label: "Measure", options: measures },
        { key: "display", label: "Display", options: [
            { key: "count", label: "Counts" },
            { key: "share", label: "Share of each year" }
        ] }
    ];

    const control = controls.selectAll(".profile-matrix-control")
        .data(controlData)
        .join("div")
        .attr("class", "profile-matrix-control");

    control.append("label")
        .attr("for", item => `profile-matrix-${item.key}`)
        .text(item => item.label);

    control.append("select")
        .attr("id", item => `profile-matrix-${item.key}`)
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

    const tooltip = d3.select("body").selectAll(".profile-matrix-tooltip")
        .data([null])
        .join("div")
        .attr("class", "d3-tooltip profile-matrix-tooltip")
        .style("opacity", 0);

    function render() {
        const dimension = dimensions.find(item => item.key === selected.dimension);
        const measure = measures.find(item => item.key === selected.measure);
        const years = Array.from(new Set(data.map(row => row.calendar_year))).sort((a, b) => a - b);
        const totalsByYear = d3.rollup(data, rows => d3.sum(rows, row => row[selected.measure]), row => row.calendar_year);
        const grouped = d3.rollup(
            data,
            rows => d3.sum(rows, row => row[selected.measure]),
            row => String(row[dimension.key] || "Unknown / missing").trim(),
            row => row.calendar_year
        );
        const categories = Array.from(grouped, ([category, yearValues]) => ({
            category,
            total: d3.sum(yearValues.values()),
            byYear: yearValues
        })).sort((a, b) => d3.descending(a.total, b.total) || d3.ascending(a.category, b.category));
        const cells = categories.flatMap(item => years.map(year => {
            const value = item.byYear.get(year) || 0;
            const yearTotal = totalsByYear.get(year) || 0;
            return {
                category: item.category,
                year,
                value,
                share: yearTotal ? value / yearTotal : 0,
                yearTotal
            };
        }));

        container.selectAll("*").remove();
        if (!cells.length) {
            container.append("div").attr("class", "heatmap-empty-state").text("No records match these filters.");
            return;
        }

        const margin = { top: 72, right: 52, bottom: 76, left: 170 };
        const cellWidth = 40;
        const cellHeight = 25;
        const plotWidth = years.length * cellWidth;
        const plotHeight = categories.length * cellHeight;
        const totalsX = margin.left + plotWidth + 18;
        const totalsY = margin.top + plotHeight + 20;
        const width = totalsX + margin.right;
        const height = totalsY + margin.bottom;
        const lowerBound = 0;
        const upperBound = d3.max(cells, cell => selected.display === "share" ? cell.share : cell.value) || 1;
        const maxValue = upperBound;
        const intensity = selected.display === "share"
            ? d3.scaleLinear().domain([0, maxValue]).range([0, 1])
            : d3.scaleSqrt().domain([0, maxValue]).range([0, 1]);
        const color = value => value === 0 ? "#f2f2f2" : d3.interpolateCividis(intensity(value));
        const formatCount = d3.format(",.0f");
        const formatCompact = d3.format(".2~s");
        const formatCell = value => selected.display === "share"
            ? d3.format(".0%")(value)
            : formatCompact(value);
        const valueForColor = cell => selected.display === "share" ? cell.share : cell.value;
        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("role", "img")
            .attr("aria-label", `Annual ${measure.label.toLowerCase()} by ${dimension.label.toLowerCase()} from ${years[0]} to ${years[years.length - 1]}`);

        svg.append("text")
            .attr("class", "profile-matrix-summary")
            .attr("x", margin.left)
            .attr("y", 22)
            .text(`${measure.label} · ${selected.display === "share" ? "annual composition" : "2011–2021 totals"} · color scale relative to displayed groups`);

        const grid = svg.append("g");
        years.forEach((year, index) => {
            const x = margin.left + index * cellWidth;
            const isBreakYear = year === 2012 || year === 2017;
            grid.append("rect")
                .attr("x", x + 1)
                .attr("y", margin.top - 29)
                .attr("width", cellWidth - 3)
                .attr("height", 23)
                .attr("rx", 2)
                .attr("fill", isBreakYear ? "#fff0dc" : "#f2f3f1");
            grid.append("text")
                .attr("class", `profile-matrix-axis${isBreakYear ? " profile-matrix-break" : ""}`)
                .attr("x", x + (cellWidth - 3) / 2)
                .attr("y", margin.top - 13)
                .attr("text-anchor", "middle")
                .text(year);
        });

        grid.selectAll(".profile-matrix-row-label")
            .data(categories)
            .join("text")
            .attr("class", "profile-matrix-axis profile-matrix-row-label")
            .attr("x", margin.left - 10)
            .attr("y", (item, index) => margin.top + index * cellHeight + cellHeight / 2 + 4)
            .attr("text-anchor", "end")
            .text(item => item.category.length > 26 ? `${item.category.slice(0, 24)}…` : item.category)
            .append("title")
            .text(item => item.category);

        const cell = grid.selectAll(".profile-matrix-cell")
            .data(cells)
            .join("g")
            .attr("class", "profile-matrix-cell")
            .attr("transform", item => `translate(${margin.left + years.indexOf(item.year) * cellWidth},${margin.top + categories.findIndex(category => category.category === item.category) * cellHeight})`)
            .attr("tabindex", 0)
            .attr("role", "img")
            .attr("aria-label", item => `${item.category}, ${item.year}: ${selected.display === "share" ? d3.format(".1%")(item.share) : formatCount(item.value)} ${selected.display === "share" ? "of yearly total" : measure.label.toLowerCase()}`)
            .on("mouseenter focus", function(event, item) {
                d3.select(this).select("rect").attr("stroke", "#202b2b").attr("stroke-width", 2);
                tooltip.style("opacity", 1).html(
                    `<strong>${item.category}</strong><br>${item.year}<br>${measure.label}: ${formatCount(item.value)}<br>Share of year: ${d3.format(".1%")(item.share)}`
                );
                if (event.type === "focus") {
                    const bounds = this.getBoundingClientRect();
                    tooltip.style("left", `${bounds.left + bounds.width / 2 + window.scrollX + 10}px`)
                        .style("top", `${bounds.top + window.scrollY}px`);
                }
            })
            .on("mousemove", event => tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`))
            .on("mouseleave blur", function() {
                d3.select(this).select("rect").attr("stroke", "#fff").attr("stroke-width", 1);
                tooltip.style("opacity", 0);
            });

        cell.append("rect")
            .attr("width", cellWidth - 3)
            .attr("height", cellHeight - 3)
            .attr("rx", 2)
            .attr("fill", item => color(valueForColor(item)))
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);
        cell.append("text")
            .attr("class", "profile-matrix-cell-label")
            .attr("x", (cellWidth - 3) / 2)
            .attr("y", (cellHeight - 3) / 2 + 3.5)
            .attr("text-anchor", "middle")
            .attr("fill", item => d3.lab(color(valueForColor(item))).l > 58 ? "#263238" : "#fff")
            .text(item => formatCell(valueForColor(item)));

        svg.append("text").attr("class", "profile-matrix-total").attr("x", totalsX).attr("y", margin.top - 13).text("Year total");
        years.forEach((year, index) => {
            const yearTotal = totalsByYear.get(year) || 0;
            svg.append("text")
                .attr("class", "profile-matrix-total")
                .attr("x", margin.left + index * cellWidth + (cellWidth - 3) / 2)
                .attr("y", totalsY + 4)
                .attr("text-anchor", "middle")
                .text(selected.display === "share" ? "100%" : formatCompact(yearTotal));
        });
        svg.append("text")
            .attr("class", "profile-matrix-total")
            .attr("x", margin.left - 10)
            .attr("y", totalsY + 4)
            .attr("text-anchor", "end")
            .text(selected.display === "share" ? "Avg. share" : "Period total");
        categories.forEach((item, index) => {
            const rowTotal = selected.display === "share"
                ? d3.mean(years, year => totalsByYear.get(year) ? (item.byYear.get(year) || 0) / totalsByYear.get(year) : 0)
                : item.total;
            svg.append("text")
                .attr("class", "profile-matrix-total")
                .attr("x", totalsX)
                .attr("y", margin.top + index * cellHeight + cellHeight / 2 + 4)
                .text(selected.display === "share" ? d3.format(".1%")(rowTotal) : formatCompact(rowTotal));
        });

        const legendX = margin.left;
        const legendY = height - 19;
        const gradientId = "profile-matrix-gradient";
        const gradient = svg.append("defs").append("linearGradient")
            .attr("id", gradientId).attr("x1", "0%").attr("x2", "100%");
        gradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateCividis(0));
        gradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateCividis(1));
        const formatLegend = selected.display === "share"
            ? d3.format(".0%")
            : formatCompact;
        svg.append("text").attr("class", "profile-matrix-legend").attr("x", legendX).attr("y", legendY + 8).text(formatLegend(lowerBound));
        svg.append("rect").attr("x", legendX + 38).attr("y", legendY).attr("width", 170).attr("height", 10).attr("fill", `url(#${gradientId})`);
        svg.append("text").attr("class", "profile-matrix-legend").attr("x", legendX + 214).attr("y", legendY + 8).text(formatLegend(upperBound));
    }

    render();
}
