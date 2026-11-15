function drawRoadUserSankey(rawData) {
    const controls = d3.select("#road-user-sankey-controls");
    const container = d3.select("#road-user-sankey-chart");
    const summary = d3.select("#road-user-sankey-summary");
    const measures = [
        { key: "hospitalisations", label: "Hospitalisations" },
        { key: "bed_days", label: "Bed days" }
    ];
    const years = Array.from(new Set(rawData.map(row => +row.calendar_year)))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
    const flowOptions = [
        { value: "12", label: "Top 12 flows" },
        { value: "24", label: "Top 24 flows" },
        { value: "all", label: "All flows" }
    ];
    const normalizedData = rawData.map(row => ({
        calendar_year: +row.calendar_year,
        road_user: String(row.road_user || "Unknown / missing").trim(),
        counterparty: String(row.counterparty || "Unknown / missing").trim(),
        hospitalisations: Number.isFinite(row.hospitalisations) ? row.hospitalisations : null,
        bed_days: Number.isFinite(row.bed_days) ? row.bed_days : null
    })).filter(row => Number.isFinite(row.calendar_year));
    const selected = {
        year: "all",
        measure: "hospitalisations",
        flowCount: "24"
    };
    const controlSpecs = [
        {
            key: "year",
            label: "Calendar year",
            options: [
                { value: "all", label: "All years" },
                ...years.map(year => ({ value: year, label: year }))
            ]
        },
        {
            key: "measure",
            label: "Measure",
            options: measures.map(measure => ({ value: measure.key, label: measure.label }))
        },
        { key: "flowCount", label: "Link detail", options: flowOptions }
    ];
    const numberFormat = d3.format(",.0f");
    const compactFormat = d3.format(".3~s");

    const control = controls.selectAll(".road-user-sankey-control")
        .data(controlSpecs)
        .join("div")
        .attr("class", "road-user-sankey-control");

    control.append("label")
        .attr("for", spec => `road-user-sankey-${spec.key}`)
        .text(spec => spec.label);

    control.append("select")
        .attr("id", spec => `road-user-sankey-${spec.key}`)
        .on("change", (event, spec) => {
            selected[spec.key] = spec.key === "year" && event.target.value !== "all"
                ? +event.target.value
                : event.target.value;
            render();
        })
        .each(function(spec) {
            d3.select(this).selectAll("option")
                .data(spec.options)
                .join("option")
                .attr("value", option => option.value)
                .text(option => option.label);
            d3.select(this).property("value", selected[spec.key]);
        });

    const tooltip = d3.select("body").selectAll(".road-user-sankey-tooltip")
        .data([null])
        .join("div")
        .attr("class", "d3-tooltip road-user-sankey-tooltip")
        .style("opacity", 0);

    function render() {
        const measure = measures.find(item => item.key === selected.measure);
        const filtered = normalizedData.filter(row =>
            selected.year === "all" || row.calendar_year === selected.year
        );
        const grouped = d3.rollup(
            filtered,
            rows => {
                const applicable = rows.filter(row => Number.isFinite(row[selected.measure]));
                return {
                    value: d3.sum(applicable, row => row[selected.measure]),
                    records: applicable.length,
                    notApplicable: rows.length - applicable.length
                };
            },
            row => row.road_user,
            row => row.counterparty
        );
        const flows = Array.from(grouped, ([roadUser, counterparties]) =>
            Array.from(counterparties, ([counterparty, totals]) => ({
                roadUser,
                counterparty,
                ...totals
            }))
        ).flat().filter(flow => flow.value > 0)
            .sort((a, b) => d3.descending(a.value, b.value));
        const missingRows = filtered.filter(row => !Number.isFinite(row[selected.measure])).length;
        const requestedCount = selected.flowCount === "all" ? flows.length : +selected.flowCount;
        const visibleFlows = flows.slice(0, requestedCount);
        const omittedFlows = flows.length - visibleFlows.length;
        const omittedValue = d3.sum(flows.slice(visibleFlows.length), flow => flow.value);

        container.selectAll("*").remove();
        if (!visibleFlows.length) {
            container.append("div")
                .attr("class", "sankey-empty-state")
                .text("No applicable flows match these selections.");
            summary.text(`${missingRows} N.P. records excluded from flow widths.`);
            return;
        }

        const sourceTotals = d3.rollup(visibleFlows, rows => d3.sum(rows, row => row.value), row => row.roadUser);
        const targetTotals = d3.rollup(visibleFlows, rows => d3.sum(rows, row => row.value), row => row.counterparty);
        const nodes = [
            ...Array.from(sourceTotals, ([name, value]) => ({ id: `road:${name}`, name, side: "road", value }))
                .sort((a, b) => d3.descending(a.value, b.value)),
            ...Array.from(targetTotals, ([name, value]) => ({ id: `counterparty:${name}`, name, side: "counterparty", value }))
                .sort((a, b) => d3.descending(a.value, b.value))
        ];
        const links = visibleFlows.map(flow => ({
            source: `road:${flow.roadUser}`,
            target: `counterparty:${flow.counterparty}`,
            value: flow.value,
            records: flow.records,
            notApplicable: flow.notApplicable
        }));
        const width = 800;
        const leftPadding = 135;
        const rightPadding = 210;
        const height = Math.max(430, Math.max(sourceTotals.size, targetTotals.size) * 31 + 96);
        const layout = d3.sankey()
            .nodeId(node => node.id)
            .nodeAlign(d3.sankeyLeft)
            .nodeWidth(15)
            .nodePadding(14)
            .extent([[leftPadding, 54], [width - rightPadding, height - 46]])({ nodes, links });
        const roadUserDomain = Array.from(new Set(normalizedData.map(row => row.road_user))).sort();
        const sourceColor = d3.scaleOrdinal()
            .domain(roadUserDomain)
            .range(Paul_Tol_Banded_12);
        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("role", "img")
            .attr("aria-label", `${measure.label} flows from road-user types to counterparties`)    ;

        svg.append("text")
            .attr("class", "sankey-summary-label")
            .attr("x", leftPadding)
            .attr("y", 24)
            .text(`${selected.year === "all" ? "2011-2021" : selected.year} · ${measure.label} · ${visibleFlows.length} flows shown`);
        svg.append("text")
            .attr("class", "sankey-column-label")
            .attr("x", leftPadding)
            .attr("y", 43)
            .text("ROAD USER");
        svg.append("text")
            .attr("class", "sankey-column-label")
            .attr("x", width - rightPadding)
            .attr("y", 43)
            .text("COUNTERPARTY");

        const linkPath = d3.sankeyLinkHorizontal();
        const linkSelection = svg.append("g")
            .attr("fill", "none")
            .selectAll(".sankey-link")
            .data(layout.links)
            .join("path")
            .attr("class", "sankey-link")
            .attr("d", linkPath)
            .attr("stroke", link => sourceColor(link.source.name))
            .attr("stroke-width", link => Math.max(1, link.width))
            .attr("tabindex", 0)
            .attr("role", "img")
            .attr("aria-label", link => `${link.source.name} to ${link.target.name}: ${numberFormat(link.value)} ${measure.label.toLowerCase()}`)
            .on("mouseenter focus", function(event, link) {
                linkSelection.classed("is-muted", item => item !== link);
                linkSelection.classed("is-active", item => item === link);
                nodeSelection.classed("is-muted", node => node.id !== link.source.id && node.id !== link.target.id);
                tooltip.style("opacity", 1).html(
                    `<strong>${link.source.name} to ${link.target.name}</strong><br>${measure.label}: ${numberFormat(link.value)}<br>Applicable records: ${numberFormat(link.records)}${link.notApplicable ? `<br>N.P. records excluded: ${numberFormat(link.notApplicable)}` : ""}`
                );
                if (event.type === "focus") {
                    const bounds = this.getBoundingClientRect();
                    tooltip.style("left", `${bounds.left + bounds.width / 2 + window.scrollX + 10}px`)
                        .style("top", `${bounds.top + window.scrollY}px`);
                }
            })
            .on("mousemove", event => tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`))
            .on("mouseleave blur", () => {
                linkSelection.classed("is-muted", false).classed("is-active", false);
                nodeSelection.classed("is-muted", false);
                tooltip.style("opacity", 0);
            });

        const nodeSelection = svg.append("g")
            .selectAll(".sankey-node")
            .data(layout.nodes)
            .join("g")
            .attr("class", "sankey-node")
            .attr("tabindex", 0)
            .attr("role", "img")
            .attr("aria-label", node => `${node.name}, ${numberFormat(node.value)} ${measure.label.toLowerCase()}`)
            .on("mouseenter focus", function(event, node) {
                linkSelection.classed("is-muted", link => link.source.id !== node.id && link.target.id !== node.id);
                nodeSelection.classed("is-muted", item => item.id !== node.id);
                tooltip.style("opacity", 1).html(
                    `<strong>${node.name}</strong><br>${numberFormat(node.value)} ${measure.label.toLowerCase()} across visible links`
                );
                if (event.type === "focus") {
                    const bounds = this.getBoundingClientRect();
                    tooltip.style("left", `${bounds.left + bounds.width / 2 + window.scrollX + 10}px`)
                        .style("top", `${bounds.top + window.scrollY}px`);
                }
            })
            .on("mousemove", event => tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`))
            .on("mouseleave blur", () => {
                linkSelection.classed("is-muted", false).classed("is-active", false);
                nodeSelection.classed("is-muted", false);
                tooltip.style("opacity", 0);
            });

        nodeSelection.append("rect")
            .attr("x", node => node.x0)
            .attr("y", node => node.y0)
            .attr("height", node => Math.max(1, node.y1 - node.y0))
            .attr("width", node => node.x1 - node.x0)
            .attr("rx", 2)
            .attr("fill", node => node.side === "road" ? sourceColor(node.name) : OKABE_ITO.grey);

        nodeSelection.append("text")
            .attr("class", "sankey-node-label")
            .attr("x", node => node.side === "road" ? node.x0 - 9 : node.x1 + 9)
            .attr("y", node => (node.y0 + node.y1) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", node => node.side === "road" ? "end" : "start")
            .text(node => node.name.length > 30 ? `${node.name.slice(0, 27)}...` : node.name)
            .append("title")
            .text(node => node.name);

        const shownValue = d3.sum(visibleFlows, flow => flow.value);
        const hiddenMessage = omittedFlows
            ? ` ${omittedFlows} lower-volume flows (${compactFormat(omittedValue)}) are omitted.`
            : " All applicable flows are shown.";
        summary.text(
            `${numberFormat(shownValue)} ${measure.label.toLowerCase()} across shown links.${hiddenMessage} ${numberFormat(missingRows)} N.P. records excluded from flow widths.`
        );
    }

    render();
}