const drawAnnualTrendChart = nationalData => {
    const controls = d3.select("#filters_trend");
    const container = d3.select("#annual-trend-chart");
    const summary = d3.select("#annual-trend-summary");
    const defaultSeries = 6;
    const maxSeries = 12;
    const dimensions = [
        { key: "road_user", label: "Road user" },
        { key: "age_group", label: "Age group" },
        { key: "sex", label: "Sex" },
        { key: "remoteness_area", label: "Remoteness" },
        { key: "counterparty", label: "Counterparty" }
    ];
    const measures = [
        { key: "hospitalisations", label: "Hospitalisations" },
        { key: "bed_days", label: "Bed days" }
    ];
    const okabeItoLineColors = [
        OKABE_ITO.blue,
        OKABE_ITO.orange,
        OKABE_ITO.bluishGreen,
        OKABE_ITO.vermilion,
        OKABE_ITO.reddishPurple,
        OKABE_ITO.skyBlue,
        OKABE_ITO.yellow,
        OKABE_ITO.grey
    ];
    const data = nationalData.map(row => ({
        ...row,
        calendar_year: +row.calendar_year,
        hospitalisations: Number.isFinite(row.hospitalisations) ? row.hospitalisations : null,
        bed_days: Number.isFinite(row.bed_days) ? row.bed_days : null
    })).filter(row => Number.isFinite(row.calendar_year));
    const selected = {
        view: "breakdown",
        dimension: "road_user",
        measure: "hospitalisations",
        scale: "absolute",
        groups: []
    };
    let initializeGroups = true;
    const numberFormat = d3.format(",.0f");

    const controlSpecs = [
        {
            key: "dimension",
            label: "Break down by",
            options: dimensions.map(dimension => ({ value: dimension.key, label: dimension.label }))
        },
        {
            key: "measure",
            label: "Measure",
            options: measures.map(measure => ({ value: measure.key, label: measure.label }))
        }
    ];
    const viewOptions = [
        { value: "total", label: "Total" },
        { value: "breakdown", label: "Breakdown" }
    ];
    const viewToggle = controls.selectAll(".annual-trend-view-toggle")
        .data([null])
        .join("div")
        .attr("class", "annual-trend-view-toggle")
        .attr("role", "group")
        .attr("aria-label", "Annual trend view");
    const viewButtons = viewToggle.selectAll("button")
        .data(viewOptions, item => item.value)
        .join("button")
        .attr("type", "button")
        .attr("class", "annual-trend-view-button")
        .text(item => item.label)
        .on("click", (event, item) => {
            selected.view = item.value;
            render();
        });
    const scaleOptions = [
        { value: "absolute", label: "Absolute values" },
        { value: "relative", label: "Relative (2011 = 100)" }
    ];
    const scaleToggle = controls.selectAll(".annual-trend-scale-toggle")
        .data([null])
        .join("div")
        .attr("class", "annual-trend-scale-toggle")
        .attr("role", "group")
        .attr("aria-label", "Annual trend value scale");
    scaleToggle.selectAll("span")
        .data([null])
        .join("span")
        .text("Values");
    const scaleButtons = scaleToggle.selectAll("button")
        .data(scaleOptions, item => item.value)
        .join("button")
        .attr("type", "button")
        .attr("class", "annual-trend-scale-button")
        .text(item => item.label)
        .on("click", (event, item) => {
            selected.scale = item.value;
            render();
        });
    const control = controls.selectAll(".annual-trend-filter")
        .data(controlSpecs)
        .join("div")
        .attr("class", "annual-trend-filter");

    control.append("label")
        .attr("for", item => `annual-trend-${item.key}`)
        .text(item => item.label);
    control.append("select")
        .attr("id", item => `annual-trend-${item.key}`)
        .on("change", (event, item) => {
            selected[item.key] = event.target.value;
            initializeGroups = true;
            render();
        })
        .each(function(item) {
            d3.select(this).selectAll("option")
                .data(item.options)
                .join("option")
                .attr("value", option => option.value)
                .text(option => option.label);
            d3.select(this).property("value", selected[item.key]);
        });

    const seriesPicker = controls.selectAll(".annual-trend-series-picker")
        .data([null])
        .join("div")
        .attr("class", "annual-trend-series-picker");
    const seriesHeading = seriesPicker.selectAll(".annual-trend-series-heading")
        .data([null])
        .join("div")
        .attr("class", "annual-trend-series-heading");
    seriesHeading.selectAll("span")
        .data([null])
        .join("span")
        .text("Series");
    seriesHeading.selectAll("small")
        .data([null])
        .join("small");
    const seriesActions = seriesHeading.selectAll(".annual-trend-series-actions")
        .data([null])
        .join("div")
        .attr("class", "annual-trend-series-actions");
    const toggleSeriesButton = seriesActions.selectAll(".annual-trend-toggle-series")
        .data([null])
        .join("button")
        .attr("class", "annual-trend-toggle-series")
        .attr("type", "button");
    const resetButton = seriesActions.selectAll(".annual-trend-reset")
        .data([null])
        .join("button")
        .attr("class", "annual-trend-reset")
        .attr("type", "button")
        .text("Reset");
    resetButton.on("click", () => {
        selected.view = "breakdown";
        selected.dimension = "road_user";
        selected.measure = "hospitalisations";
        selected.scale = "absolute";
        controls.select("#annual-trend-dimension").property("value", selected.dimension);
        controls.select("#annual-trend-measure").property("value", selected.measure);
        initializeGroups = true;
        render();
    });
    const seriesOptions = seriesPicker.selectAll(".annual-trend-series-options")
        .data([null])
        .join("div")
        .attr("class", "annual-trend-series-options")
        .attr("role", "group")
        .attr("aria-label", "Select annual trend series");

    const tooltip = d3.select("body").selectAll(".annual-trend-tooltip")
        .data([null])
        .join("div")
        .attr("class", "d3-tooltip annual-trend-tooltip")
        .style("opacity", 0);

    function render() {
        const dimension = dimensions.find(item => item.key === selected.dimension);
        const measure = measures.find(item => item.key === selected.measure);
        const categoryFor = row => String(row[dimension.key] || "Unknown / missing").trim();
        const grouped = d3.rollup(
            data,
            rows => {
                const applicable = rows.filter(row => Number.isFinite(row[selected.measure]));
                return applicable.length ? d3.sum(applicable, row => row[selected.measure]) : null;
            },
            row => row.calendar_year,
            categoryFor
        );
        const years = Array.from(new Set(data.map(row => row.calendar_year))).sort((a, b) => a - b);
        const totalByYear = d3.rollup(
            data,
            rows => {
                const applicable = rows.filter(row => Number.isFinite(row[selected.measure]));
                return applicable.length ? d3.sum(applicable, row => row[selected.measure]) : null;
            },
            row => row.calendar_year
        );
        const rankedGroups = Array.from(new Set(data.map(categoryFor)))
            .map(group => ({
                group,
                total: d3.sum(years, year => {
                    const value = grouped.get(year)?.get(group);
                    return Number.isFinite(value) ? value : 0;
                }),
                hasData: years.some(year => Number.isFinite(grouped.get(year)?.get(group)))
            }))
            .filter(item => item.hasData)
            .sort((a, b) => d3.descending(a.total, b.total) || d3.ascending(a.group, b.group));
        const availableGroups = new Set(rankedGroups.map(item => item.group));

        if (initializeGroups) {
            selected.groups = rankedGroups.slice(0, defaultSeries).map(item => item.group);
            initializeGroups = false;
        } else {
            selected.groups = selected.groups.filter(group => availableGroups.has(group)).slice(0, maxSeries);
        }

        const palette = selected.groups.length > 8 ? Paul_Tol_Banded_12 : okabeItoLineColors;
        const colors = selected.view === "total"
            ? new Map([["Australia total", OKABE_ITO.blue]])
            : new Map(selected.groups.map((group, index) => [group, palette[index]]));
        const allSelected = rankedGroups.length > 0 && selected.groups.length === rankedGroups.length;
        const selectAllLimited = rankedGroups.length > maxSeries && selected.groups.length < maxSeries;
        viewButtons
            .classed("active", item => selected.view === item.value)
            .attr("aria-pressed", item => selected.view === item.value ? "true" : "false");
        scaleButtons
            .classed("active", item => selected.scale === item.value)
            .attr("aria-pressed", item => selected.scale === item.value ? "true" : "false");
        control.filter(item => item.key === "dimension")
            .style("display", selected.view === "total" ? "none" : null);
        seriesPicker.style("display", selected.view === "total" ? "none" : null);
        seriesHeading.select("small").text(`${selected.groups.length} of ${Math.min(maxSeries, rankedGroups.length)} selected`);
        toggleSeriesButton
            .text(allSelected ? "Deselect all" : rankedGroups.length > maxSeries ? `Select top ${maxSeries}` : "Select all")
            .property("disabled", selectAllLimited)
            .attr("title", selectAllLimited ? `Select up to ${maxSeries} series at a time.` : null)
            .on("click", () => {
                selected.groups = allSelected
                    ? []
                    : rankedGroups.slice(0, maxSeries).map(item => item.group);
                render();
            });
        const option = seriesOptions.selectAll("label")
            .data(rankedGroups, item => item.group)
            .join(enter => {
                const label = enter.append("label").attr("class", "annual-trend-series-option");
                label.append("input").attr("type", "checkbox");
                label.append("span").attr("class", "annual-trend-series-swatch");
                label.append("span").attr("class", "annual-trend-series-name");
                return label;
            });
        option.select("input")
            .property("checked", item => selected.groups.includes(item.group))
            .property("disabled", item => !selected.groups.includes(item.group) && selected.groups.length >= maxSeries)
            .attr("aria-label", item => `Show ${item.group}`)
            .on("change", (event, item) => {
                if (event.target.checked) {
                    if (selected.groups.length >= maxSeries) {
                        event.target.checked = false;
                        return;
                    }
                    selected.groups.push(item.group);
                } else {
                    selected.groups = selected.groups.filter(group => group !== item.group);
                }
                render();
            });
        option.select(".annual-trend-series-swatch")
            .style("border-top-color", item => colors.get(item.group) || "#aab5b0");
        option.select(".annual-trend-series-name").text(item => item.group);

        container.selectAll("*").remove();
        if (selected.view === "breakdown" && !selected.groups.length) {
            container.append("div")
                .attr("class", "annual-trend-empty-state")
                .text("Select at least one series to display the annual trend.");
            summary.text(`Choose one or more category series. The chart supports up to ${maxSeries} lines at a time.`);
            return;
        }

        const yearsForChart = years;
        const absoluteSeries = selected.view === "total"
            ? [{
                group: "Australia total",
                values: yearsForChart.map(year => ({ year, rawValue: totalByYear.get(year) ?? null }))
            }]
            : selected.groups.map(group => ({
                group,
                values: yearsForChart.map(year => ({
                    year,
                    rawValue: grouped.get(year)?.get(group) ?? null
                }))
            }));
        const series = absoluteSeries.map(item => {
            const baseline = item.values.find(point => point.year === 2011)?.rawValue;
            return {
                group: item.group,
                values: item.values.map(point => ({
                    ...point,
                    value: selected.scale === "relative"
                        ? Number.isFinite(point.rawValue) && Number.isFinite(baseline) && baseline > 0
                            ? point.rawValue / baseline * 100
                            : null
                        : point.rawValue
                }))
            };
        });
        const maxValue = d3.max(series, item => d3.max(item.values, point => point.value)) || 1;
        const width = 760;
        const height = 410;
        const margin = { top: 66, right: 24, bottom: 56, left: 78 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        const xScale = d3.scalePoint()
            .domain(yearsForChart)
            .range([0, plotWidth])
            .padding(0.45);
        const relativeValues = series.flatMap(item =>
            item.values.filter(point => Number.isFinite(point.value)).map(point => point.value)
        );
        const yDomain = selected.scale === "relative"
            ? [
                Math.min(100, d3.min(relativeValues) ?? 100) * 0.92,
                Math.max(100, d3.max(relativeValues) ?? 100) * 1.08
            ]
            : [0, maxValue * 1.08];
        const yScale = d3.scaleLinear()
            .domain(yDomain)
            .range([plotHeight, 0])
            .nice();
        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("role", "img")
            .attr("aria-label", selected.view === "total"
                ? `Annual Australia-wide ${measure.label.toLowerCase()} ${selected.scale === "relative" ? "index, 2011 equals 100" : "total"}`
                : `Annual ${measure.label.toLowerCase()} by ${dimension.label.toLowerCase()}, ${selected.groups.length} ${selected.scale === "relative" ? "indexed " : ""}series`);
        const plot = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        plot.append("g")
            .attr("class", "annual-trend-grid")
            .call(d3.axisLeft(yScale).ticks(5).tickSize(-plotWidth).tickFormat(""));
        plot.append("g")
            .attr("transform", `translate(0,${plotHeight})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
        plot.append("g")
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(selected.scale === "relative" ? d3.format(".0f") : d3.format("~s")));

        if (selected.scale === "relative" && yScale.domain()[0] <= 100 && yScale.domain()[1] >= 100) {
            plot.append("line")
                .attr("class", "annual-trend-baseline")
                .attr("x1", 0)
                .attr("x2", plotWidth)
                .attr("y1", yScale(100))
                .attr("y2", yScale(100));
            plot.append("text")
                .attr("class", "annual-trend-baseline-label")
                .attr("x", plotWidth - 4)
                .attr("y", yScale(100) - 5)
                .attr("text-anchor", "end")
                .text("2011 baseline");
        }

        const line = d3.line()
            .defined(point => Number.isFinite(point.value))
            .x(point => xScale(point.year))
            .y(point => yScale(point.value))
            .curve(d3.curveMonotoneX);
        plot.selectAll(".annual-trend-series-line")
            .data(series, item => item.group)
            .join("path")
            .attr("class", "annual-trend-series-line")
            .attr("d", item => line(item.values))
            .attr("stroke", item => colors.get(item.group));

        const points = series.flatMap(item => item.values
            .filter(point => Number.isFinite(point.value))
            .map(point => ({ ...point, group: item.group })));
        plot.selectAll(".annual-trend-point")
            .data(points)
            .join("circle")
            .attr("class", "annual-trend-point")
            .attr("cx", point => xScale(point.year))
            .attr("cy", point => yScale(point.value))
            .attr("r", 3.5)
            .attr("fill", point => colors.get(point.group))
            .attr("tabindex", 0)
            .attr("role", "img")
            .attr("aria-label", point => selected.scale === "relative"
                ? `${point.group}, ${point.year}: ${d3.format(".1f")(point.value)}, 2011 equals 100; ${numberFormat(point.rawValue)} ${measure.label.toLowerCase()}`
                : `${point.group}, ${point.year}: ${numberFormat(point.value)} ${measure.label.toLowerCase()}`)
            .on("mouseenter focus", function(event, point) {
                d3.select(this).attr("r", 5.5).attr("stroke", "#fff").attr("stroke-width", 1.5);
                tooltip.style("opacity", 1).html(
                    selected.scale === "relative"
                        ? `<strong>${point.group}</strong><br>${point.year}<br>Index (2011 = 100): ${d3.format(".1f")(point.value)}<br>${measure.label}: ${numberFormat(point.rawValue)}`
                        : `<strong>${point.group}</strong><br>${point.year}<br>${measure.label}: ${numberFormat(point.value)}`
                );
                if (event.type === "focus") {
                    const bounds = this.getBoundingClientRect();
                    tooltip.style("left", `${bounds.left + window.scrollX + 10}px`)
                        .style("top", `${bounds.top + window.scrollY}px`);
                }
            })
            .on("mousemove", event => tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`))
            .on("mouseleave blur", function() {
                d3.select(this).attr("r", 3.5).attr("stroke", "none");
                tooltip.style("opacity", 0);
            });

        [
            { year: 2012, label: "Victoria · 2012 policy change", anchor: "start", offset: -10 },
            { year: 2017, label: "NSW · 2017 policy change", anchor: "end", offset: 50 }
        ].forEach(item => {
            const x = xScale(item.year);
            if (x == null) return;
            plot.append("line")
                .attr("class", "annual-trend-break-line")
                .attr("x1", x)
                .attr("x2", x)
                .attr("y1", 20)
                .attr("y2", plotHeight);
            plot.append("text")
                .attr("class", "annual-trend-break-label")
                .attr("x", x + item.offset)
                .attr("y", 13)
                .attr("text-anchor", item.anchor)
                .text(item.label);
        });

        plot.append("text")
            .attr("class", "annual-trend-axis-title")
            .attr("transform", "rotate(-90)")
            .attr("x", -plotHeight / 2)
            .attr("y", -56)
            .attr("text-anchor", "middle")
            .text(selected.scale === "relative" ? "Index (2011 = 100)" : measure.label);
        svg.append("text")
            .attr("class", "annual-trend-axis-title")
            .attr("x", margin.left + plotWidth / 2)
            .attr("y", height - 8)
            .attr("text-anchor", "middle")
            .text("Calendar year");

        const missingRows = data.filter(row =>
            (selected.view === "total" || selected.groups.includes(categoryFor(row))) &&
            !Number.isFinite(row[selected.measure])
        ).length;
        const scaleSummary = selected.scale === "relative"
            ? "Values are indexed to 2011 = 100; tooltips also show absolute counts."
            : "Values are absolute counts.";
        const breakSummary = "Breaks in series: from 1 July 2012, Victoria excluded cases treated only in emergency departments (estimated 2.8% reduction in recorded 2012 cases; effects varied by road-user group). From June 2017, NSW excluded episodes treated entirely in emergency departments or urgent care. The changes reduce recorded admissions, so comparisons across the breaks are not like-for-like and do not necessarily reflect changes in injury incidence.";
        summary.text(selected.view === "total"
            ? `Australia-wide total. ${scaleSummary} ${breakSummary} ${numberFormat(missingRows)} N.P. records excluded.`
            : `${selected.groups.length} ${dimension.label.toLowerCase()} series selected. ${scaleSummary} ${breakSummary} ${numberFormat(missingRows)} N.P. records excluded.`);
    }

    render();
};