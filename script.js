// Set up dimensions and margins
const margin = { top: 150, right: 100, bottom: 100, left: 100 }; // Increased top margin for instructions
const width = 1000 - margin.left - margin.right;
const height = 1000 - margin.top - margin.bottom;

// Create SVG container
const svg = d3.select("#heatmap")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Add instructions
const instructions = svg.append("text")
    .attr("x", width / 2)
    .attr("y", -margin.top + 70)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#666");

instructions.append("tspan")
    .attr("x", width / 2)
    .attr("dy", "0")
    .text("Click on state labels to select them. Use the 'Filter to Selected States' button to focus on specific states.");

instructions.append("tspan")
    .attr("x", width / 2)
    .attr("dy", "20")
    .text("Hover over cells to see detailed transition probabilities. Click 'Show All States' to return to the full view.");

// Create tooltip
const tooltip = d3.select("#tooltip");

// Find the maximum value in the data
const maxValue = d3.max(transitionData, d => 
    d3.max(Object.entries(d)
        .filter(([key]) => key !== 'From')
        .map(([_, value]) => +value)
    )
);

// Custom color interpolator that emphasizes small differences
const customInterpolator = (t) => {
    // Apply power scaling to emphasize small differences
    const power = 0.3; // Lower values emphasize small differences more
    const scaledT = Math.pow(t, power);
    
    // Create a custom color scale that transitions through multiple colors
    // Using HSL color space for better control over the transition
    const hue = 240 * (1 - scaledT); // Blue (240) to Red (0)
    const saturation = 100; // Full saturation
    const lightness = 50 + 30 * (1 - scaledT); // Vary lightness for better contrast
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Color scale with custom interpolator
const colorScale = d3.scaleSequential()
    .interpolator(customInterpolator)
    .domain([0, maxValue]);

// Get the states (excluding the 'From' column)
const states = Object.keys(transitionData[0]).filter(key => key !== 'From');

// Create scales
const xScale = d3.scaleBand()
    .range([0, width])
    .domain(states)
    .padding(0.01);

const yScale = d3.scaleBand()
    .range([0, height])
    .domain(states)
    .padding(0.01);

// Store selected states
let selectedStates = new Set();
let isFiltered = false;

// Function to create axis with clickable labels
function createAxis(scale, orientation, transform = "") {
    const axis = svg.append("g")
        .attr("class", `axis ${orientation}`)
        .attr("transform", transform);
    
    if (orientation === "x") {
        axis.call(d3.axisBottom(scale))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");
    } else {
        axis.call(d3.axisLeft(scale));
    }
    
    axis.selectAll("text")
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            toggleState(d);
        });
    
    return axis;
}

// Create initial axes
let xAxis = createAxis(xScale, "x", `translate(0,${height})`);
let yAxis = createAxis(yScale, "y");

// Store all cells for highlighting
const cells = [];

// Create the heatmap
transitionData.forEach(row => {
    const origin = row.From;
    states.forEach(destination => {
        const value = +row[destination];
        
        const cell = svg.append("rect")
            .attr("class", "cell")
            .attr("x", xScale(destination))
            .attr("y", yScale(origin))
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .attr("fill", colorScale(value))
            .attr("data-origin", origin)
            .attr("data-destination", destination)
            .on("mouseover", function(event, d) {
                tooltip
                    .html(`From: ${origin}<br>To: ${destination}<br>Probability: ${(value * 100).toFixed(4)}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .classed("visible", true);
            })
            .on("mouseout", function() {
                tooltip.classed("visible", false);
            });
        
        cells.push(cell);
    });
});

// Function to toggle state selection
function toggleState(state) {
    if (selectedStates.has(state)) {
        selectedStates.delete(state);
    } else {
        selectedStates.add(state);
    }
    
    updateHighlighting();
    updateButtons();
}

// Function to update cell highlighting
function updateHighlighting() {
    // Reset all cells to normal opacity
    cells.forEach(cell => {
        cell.style("opacity", 1);
    });
    
    if (selectedStates.size > 0) {
        // Dim cells that are not connected to any selected state
        cells.forEach(cell => {
            const origin = cell.attr("data-origin");
            const destination = cell.attr("data-destination");
            
            if (!selectedStates.has(origin) && !selectedStates.has(destination)) {
                cell.style("opacity", 0.3);
            }
        });
    }
    
    // Update state labels
    svg.selectAll(".axis text")
        .classed("selected-state", d => selectedStates.has(d))
        .style("font-weight", d => selectedStates.has(d) ? "bold" : "normal")
        .style("font-size", d => selectedStates.has(d) ? "14px" : "12px");
}

// Function to update button states
function updateButtons() {
    const filterButton = d3.select("#filterButton");
    const clearButton = d3.select("#clearButton");
    
    // Filter button is only enabled when there are selected states and we're not filtered
    filterButton.property("disabled", selectedStates.size === 0 || isFiltered);
    
    // Clear button is enabled whenever we're in filtered view
    clearButton.property("disabled", !isFiltered);
}

// Function to filter the heatmap to selected states
function filterToSelectedStates() {
    if (selectedStates.size === 0) return;
    
    isFiltered = true;
    
    // Directly update button states
    d3.select("#filterButton").property("disabled", true);
    d3.select("#clearButton").property("disabled", false);
    
    // Get the selected states as an array
    const selectedStatesArray = Array.from(selectedStates);
    
    // First update the scales
    xScale.domain(selectedStatesArray);
    yScale.domain(selectedStatesArray);
    
    // Calculate new cell dimensions
    const cellWidth = xScale.bandwidth();
    const cellHeight = yScale.bandwidth();
    
    // Update cells with new positions and dimensions
    cells.forEach(cell => {
        const origin = cell.attr("data-origin");
        const destination = cell.attr("data-destination");
        
        if (!selectedStates.has(origin) || !selectedStates.has(destination)) {
            cell.style("display", "none");
        } else {
            cell.style("display", null)
                .transition()
                .duration(500)
                .attr("x", xScale(destination))
                .attr("y", yScale(origin))
                .attr("width", cellWidth)
                .attr("height", cellHeight);
        }
    });
    
    // Update axes after scale changes
    xAxis.transition()
        .duration(500)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            toggleState(d);
        });
    
    yAxis.transition()
        .duration(500)
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            toggleState(d);
        });
}

// Function to show all states
function showAllStates() {
    isFiltered = false;
    selectedStates.clear(); // Clear selected states when showing all
    
    // Directly update button states
    d3.select("#filterButton").property("disabled", selectedStates.size === 0);
    d3.select("#clearButton").property("disabled", true);
    
    // First update the scales
    xScale.domain(states);
    yScale.domain(states);
    
    // Calculate new cell dimensions
    const cellWidth = xScale.bandwidth();
    const cellHeight = yScale.bandwidth();
    
    // Show all cells and update their positions
    cells.forEach(cell => {
        const origin = cell.attr("data-origin");
        const destination = cell.attr("data-destination");
        
        cell.style("display", null)
            .transition()
            .duration(500)
            .attr("x", xScale(destination))
            .attr("y", yScale(origin))
            .attr("width", cellWidth)
            .attr("height", cellHeight);
    });
    
    // Remove old axes
    xAxis.remove();
    yAxis.remove();
    
    // Create new axes with all states
    xAxis = createAxis(xScale, "x", `translate(0,${height})`);
    yAxis = createAxis(yScale, "y");
    
    updateHighlighting();
}

// Add button event listeners
d3.select("#filterButton").on("click", filterToSelectedStates);
d3.select("#clearButton").on("click", showAllStates);

// Add axis labels
svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 20)
    .attr("text-anchor", "middle")
    .text("Destination State");

svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .attr("text-anchor", "middle")
    .text("Origin State"); 