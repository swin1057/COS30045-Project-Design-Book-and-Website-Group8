function drawAgeSexGrandTotalChart(rawData) {
    const controls = d3.select("#age-sex-total-controls");
    const container = d3.select("#age-sex-total-chart");
    const summary = d3.select("#age-sex-total-summary");
    const ageGroups = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"];
    const remotenessGroups = [
        { key: "Major Cities", label: "Cities", color: Paul_Tol_Banded_12[4] },
        { key: "Regional", label: "Regional", color: Paul_Tol_Banded_12[7] },
        { key: "Remote", label: "Remote", color: Paul_Tol_Banded_12[9] },
        { key: "Missing", label: "Unknown", color: OKABE_ITO.grey }
    ];
    const sexGroups = [
        { key: "Female", label: "Female", color: OKABE_ITO.reddishPurple },
        { key: "Male", label: "Male", color: OKABE_ITO.blue },
        { key: "intersex or indeterminate or missing", label: "Other / unspecified", color: OKABE_ITO.orange }
    ];
    const measures = [
        { key: "count_cases", label: "Count cases" },
        { key: "bed_days", label: "Bed days" }
    ];
    const data = rawData.filter(row =>
        Number.isFinite(row.calendar_year) &&
        remotenessGroups.some(group => group.key === String(row.remoteness_area || "Missing").trim()) &&
        sexGroups.some(group => group.key === row.sex) &&
        ageGroups.includes(String(row.age_group || "Missing").trim())
    );
    const years = Array.from(new Set(data.map(row => row.calendar_year)))
        .sort((a, b) => a - b);
    const selected = {
        year: years[0],
        measure: "count_cases"
    };
    const formatNumber = d3.format(",.0f");
    const aggregates = d3.rollup(
        data,
        rows => {
            return Object.fromEntries(measures.map(measure => {
                const values = rows.map(row => row[measure.key]);
                const available = values.filter(Number.isFinite);
                return [measure.key, {
                    value: available.length ? d3.sum(available) : null,
                    missingCount: values.length - available.length
                }];
            }));
        },
        row => row.calendar_year,
        row => String(row.age_group || "Missing").trim(),
        row => String(row.remoteness_area || "Missing").trim(),
        row => row.sex
    );

    const measureControl = controls.selectAll(".age-sex-total-control")
        .data([null])
        .join("div")
        .attr("class", "age-sex-total-control");
    measureControl.selectAll("label")
        .data([null])
        .join("label")
        .attr("for", "age-sex-total-measure")
        .text("Measure");
    measureControl.selectAll("select")
        .data([null])
        .join("select")
        .attr("id", "age-sex-total-measure")
        .on("change", event => {
            selected.measure = event.target.value;
            render();
        })
        .each(function() {
            d3.select(this).selectAll("option")
                .data(measures)
                .join("option")
                .attr("value", measure => measure.key)
                .text(measure => measure.label);
            d3.select(this).property("value", selected.measure);
        });

    const yearControl = controls.selectAll(".age-sex-total-year-control")
        .data([null])
        .join("div")
        .attr("class", "age-sex-total-year-control");
    yearControl.selectAll("label")
        .data([null])
        .join("label")
        .attr("for", "age-sex-total-year")
        .text("Year");
    yearControl.selectAll("input")
        .data([null])
        .join("input")
        .attr("id", "age-sex-total-year")
        .attr("type", "range")
        .attr("min", years[0])
        .attr("max", years[years.length - 1])
        .attr("step", 1)
        .attr("aria-label", "Select year")
        .on("input", event => {
            selected.year = +event.target.value;
            render();
        });
    yearControl.selectAll("output")
        .data([null])
        .join("output")
        .attr("for", "age-sex-total-year");

    const tooltip = d3.select("body").selectAll(".age-sex-total-tooltip")
        .data([null])
        .join("div")
        .attr("class", "d3-tooltip age-sex-total-tooltip")
        .style("opacity", 0);

    function render() {
        const measure = measures.find(item => item.key === selected.measure);
        yearControl.select("input")
            .property("value", selected.year)
            .attr("aria-valuetext", String(selected.year));
        yearControl.select("output").text(selected.year);
        container.selectAll("*").remove();
        if (!years.length) {
            container.append("div")
                .attr("class", "heatmap-empty-state")
                .text("No age, remoteness, and sex records are available.");
            summary.text("");
            return;
        }

        const chartData = ageGroups.map(ageGroup => {
            const childBars = remotenessGroups.map(remoteness => {
                const segments = sexGroups.map(sex => {
                    const cell = aggregates.get(selected.year)
                        ?.get(ageGroup)
                        ?.get(remoteness.key)
                        ?.get(sex.key)?.[selected.measure];
                    return {
                        sex,
                        value: cell?.value ?? null,
                        missingCount: cell?.missingCount ?? 0
                    };
                });
                return {
                    remoteness,
                    segments,
                    total: d3.sum(segments, segment =>
                        Number.isFinite(segment.value) ? segment.value : 0
                    ),
                    missingCount: d3.sum(segments, segment => segment.missingCount)
                };
            });
            return {
                ageGroup,
                childBars,
                total: d3.sum(childBars, bar => bar.total),
                missingCount: d3.sum(childBars, bar => bar.missingCount)
            };
        });
        const maxTotal = d3.max(chartData, row => row.total) || 1;
        const width = 1120;
        const height = 660;
        const margin = { top: 50, right: 28, bottom: 198, left: 78 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        const ageScale = d3.scaleBand()
            .domain(ageGroups)
            .range([0, plotWidth])
            .paddingInner(0.13)
            .paddingOuter(0.03);
        const valueScale = d3.scaleLinear()
            .domain([0, maxTotal * 1.12])
            .range([plotHeight, 0])
            .nice();
        const ageGroupWidth = ageScale.bandwidth();
        const childPadding = 5;
        const childWidth = (ageGroupWidth - childPadding * (remotenessGroups.length - 1)) /
            remotenessGroups.length;
        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("role", "img")
            .attr("aria-label", `${selected.year} ${measure.label.toLowerCase()} by age group, remoteness, and sex`);
        const plot = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        plot.append("g")
            .attr("class", "age-sex-total-grid")
            .call(d3.axisLeft(valueScale).ticks(6).tickSize(-plotWidth).tickFormat(d3.format("~s")));
        plot.append("g")
            .attr("class", "age-sex-total-age-axis")
            .attr("transform", `translate(0,${plotHeight})`)
            .call(d3.axisBottom(ageScale).tickSize(0).tickFormat(""));
        plot.selectAll(".age-sex-total-age-label")
            .data(ageGroups)
            .join("text")
            .attr("class", "age-sex-total-age-label")
            .attr("x", ageGroup => ageScale(ageGroup) + ageGroupWidth / 2)
            .attr("y", plotHeight + 91)
            .attr("text-anchor", "middle")
            .text(ageGroup => ageGroup);

        chartData.forEach(age => {
            const ageX = ageScale(age.ageGroup);
            const grandY = valueScale(age.total);
            const grandHeight = plotHeight - grandY;
            plot.append("rect")
                .attr("class", "age-sex-total-reference")
                .attr("x", ageX)
                .attr("y", grandY)
                .attr("width", ageGroupWidth)
                .attr("height", grandHeight)
                .attr("rx", 3)
                .attr("aria-label", `${age.ageGroup} grand total: ${formatNumber(age.total)} ${measure.label.toLowerCase()}`);
            plot.append("text")
                .attr("class", "age-sex-total-grand-label")
                .attr("x", ageX + ageGroupWidth / 2)
                .attr("y", Math.max(12, grandY - 5))
                .attr("text-anchor", "middle")
                .text(formatNumber(age.total));

            age.childBars.forEach((bar, remotenessIndex) => {
                const x = ageX + remotenessIndex * (childWidth + childPadding);
                let cumulative = 0;
                bar.segments.forEach(segment => {
                    if (!Number.isFinite(segment.value) || segment.value <= 0) return;
                    const yTop = valueScale(cumulative + segment.value);
                    const yBottom = valueScale(cumulative);
                    const rect = plot.append("rect")
                        .attr("class", "age-sex-total-segment")
                        .attr("x", x)
                        .attr("y", yTop)
                        .attr("width", childWidth)
                        .attr("height", Math.max(0, yBottom - yTop))
                        .attr("fill", segment.sex.color)
                        .attr("tabindex", 0)
                        .attr("role", "img")
                        .attr("aria-label", `${selected.year}, age ${age.ageGroup}, ${bar.remoteness.key}, ${segment.sex.label}: ${formatNumber(segment.value)} ${measure.label.toLowerCase()}`);
                    rect.append("title")
                        .text(`${selected.year} · Age ${age.ageGroup} · ${bar.remoteness.key} · ${segment.sex.label}: ${formatNumber(segment.value)} ${measure.label.toLowerCase()}`);
                    rect
                        .on("mouseenter focus", function(event) {
                            tooltip.style("opacity", 1).html(
                                `<strong>${selected.year} · Age ${age.ageGroup}</strong><br>Remoteness: ${bar.remoteness.key}<br>Sex: ${segment.sex.label}<br>${measure.label}: ${formatNumber(segment.value)}<br>Remoteness total: ${formatNumber(bar.total)}<br>Age-group grand total: ${formatNumber(age.total)}`
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
                    cumulative += segment.value;
                });
                plot.append("text")
                    .attr("class", "age-sex-total-remoteness-label")
                    .attr("transform", `translate(${x + childWidth / 2},${plotHeight + 9}) rotate(50)`)
                    .attr("text-anchor", "start")
                    .text(bar.remoteness.label);
            });
        });

        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -(margin.top + plotHeight / 2))
            .attr("y", 18)
            .attr("text-anchor", "middle")
            .text(measure.label);

        const legend = svg.append("g")
            .attr("class", "age-sex-total-legend");
        const sexLegendY = height - 38;
        const sexLegendWidth = plotWidth / sexGroups.length;
        legend.selectAll(".age-sex-total-legend-item")
            .data(sexGroups)
            .join("g")
            .attr("class", "age-sex-total-legend-item")
            .attr("transform", (sex, index) =>
                `translate(${margin.left + index * sexLegendWidth},${sexLegendY})`
            )
            .each(function(sex) {
                const item = d3.select(this);
                item.append("rect")
                    .attr("width", 12)
                    .attr("height", 12)
                    .attr("rx", 2)
                    .attr("fill", sex.color);
                item.append("text")
                    .attr("x", 18)
                    .attr("y", 10)
                    .text(sex.label);
            });
        const grandLegend = legend.append("g")
            .attr("transform", `translate(${width - margin.right - 220},${sexLegendY})`);
        grandLegend.append("rect")
            .attr("width", 14)
            .attr("height", 12)
            .attr("rx", 2)
            .attr("fill", "#e4e9e6")
            .attr("stroke", "#aab5b0");
        grandLegend.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .text("Age-group grand total");

        const missingCount = d3.sum(chartData, age => age.missingCount);
        summary.text(
            `${selected.year} ${measure.label.toLowerCase()}. Age-group background bars show grand totals; remoteness bars are stacked by sex.${missingCount ? ` ${formatNumber(missingCount)} N.P. records excluded from reported values.` : ""}`
        );
    }

    render();
}
