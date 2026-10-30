// tab switching
const setupTabNavigation = () => {
    d3.selectAll(".tab-button").on("click", function () {
        const targetTab = d3.select(this).attr("data-tab");

        // update active class
        d3.selectAll(".tab-button").classed("active", false);
        d3.select(this).classed("active", true);

        d3.selectAll(".tab-content").classed("active", false);
        d3.select(`#${targetTab}`).classed("active", true);
    });
};

// singleton tooltip element
const getTooltip = () => {
    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body")
            .append("div")
            .attr("class", "d3-tooltip")
            .style("opacity", 0);
    }
    return tooltip;
};

// trend tooltip
const attachTrendTooltips = (innerChart) => {
    const tooltip = getTooltip();

    innerChart.selectAll(".bar-trend, .circle-trend")
        .on("mouseenter", (event, d) => {
            tooltip.transition().duration(150).style("opacity", 1);
            tooltip.html(`
                <strong>Year:</strong> ${d.year}<br/>
                <strong>Hospitalisations:</strong> ${d3.format(",")(d.count)}<br/>
                <strong>YoY Change:</strong> ${d.pctChange.toFixed(2)}%
            `);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", () => {
            tooltip.transition().duration(200).style("opacity", 0);
        });
};

// age tooltip
const attachAgeTooltips = (innerChart) => {
    const tooltip = getTooltip();

    innerChart.selectAll(".bar-age")
        .on("mouseenter", (event, d) => {
            tooltip.transition().duration(150).style("opacity", 1);
            tooltip.html(`
                <strong>Age Group:</strong> ${d.age_group}<br/>
                <strong>Hospitalisations:</strong> ${d3.format(",")(d.count)}
            `);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", () => {
            tooltip.transition().duration(200).style("opacity", 0);
        });
};