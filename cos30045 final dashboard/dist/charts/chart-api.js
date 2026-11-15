window.roadSafetyDashboardCharts = {
    drawAnnualTrendChart,
    drawAgeGroupChart,
    drawHighDensityHeatmap,
    drawProfileMatrix,
    drawRoadUserSankey,
    drawAgeYearHeatmap,
    drawAgeCompositionChart,
    drawAgeSexGrandTotalChart,
    drawStateBreakdownCharts,
    drawFirstNationsCharts,
    drawFirstNationsHeatmap
};

function drawFirstNationsCharts(rawData) {
    const statuses = ["First Nations people", "Non-Indigenous"];
    const rows = rawData.filter(row =>
        row.dimension === "Remoteness area" && statuses.includes(row.first_nations_status)
    );
    const grouped = d3.rollup(
        rows,
        values => {
            const reported = values.map(row => row.hospitalisations);
            return reported.length && reported.every(Number.isFinite)
                ? d3.sum(reported)
                : null;
        },
        row => row.category,
        row => row.first_nations_status
    );
    const data = Array.from(grouped, ([remoteness, byStatus]) => ({
        remoteness,
        ...Object.fromEntries(statuses.map(status => [status, byStatus.get(status) ?? null]))
    }));

    drawFirstNationsGroupedBar(data, statuses);
}
