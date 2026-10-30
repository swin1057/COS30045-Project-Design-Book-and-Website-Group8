document.addEventListener("DOMContentLoaded", () => {
    setupTabNavigation();

    // tab 1
    d3.csv("data/hospitalisation_injury_publication_sep2023_clean.csv", d => ({
        calendar_year: +d.calendar_year,
        hospitalisations: +d.hospitalisations || 0,
        age_group: d.age_group
    })).then(nationalData => {
        drawAnnualTrendChart(nationalData);
        drawAgeGroupChart(nationalData);
    });

    // tab 2
    d3.csv("data/state-and-territory-hospitalisation-injury-publication-2023_breakdowns_clean.csv", d => ({
        calendar_year: +d.calendar_year,
        cause_of_injury: d.cause_of_injury,
        hospitalisations: +d.hospitalisations,
        bed_days: +d.bed_days,
        jurisdiction: d.jurisdiction,
        dimension: d.dimension,
        category: d.category
    })).then(stateData => {
        drawStateBreakdownCharts(stateData);
    }).catch(error => {
        console.error("Error loading state breakdown CSV:", error);
    });
});