// Set up dimensions and margins
const margin = { top: 80, right: 80, bottom: 100, left: 100 };
const mobileMargin = { top: 60, right: 60, bottom: 80, left: 80 };

// Function to calculate responsive dimensions
function calculateDimensions() {
    const isMobile = window.innerWidth <= 767;
    const container = document.querySelector('.container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate available space
    const availableWidth = containerWidth - (isMobile ? mobileMargin.left + mobileMargin.right : margin.left + margin.right);
    const availableHeight = containerHeight - (isMobile ? mobileMargin.top + mobileMargin.bottom : margin.top + margin.bottom);
    
    // Use the smaller dimension to ensure square cells
    const size = Math.min(availableWidth, availableHeight);
    
    // Ensure minimum size for mobile
    const minSize = isMobile ? 300 : 500;
    const finalSize = Math.max(size, minSize);
    
    return {
        width: finalSize,
        height: finalSize,
        isMobile
    };
}

// Initial dimensions
let { width, height, isMobile } = calculateDimensions();

// Create SVG container
const svg = d3.select("#heatmap")
    .append("svg")
    .attr("width", width + (isMobile ? mobileMargin.left + mobileMargin.right : margin.left + margin.right))
    .attr("height", height + (isMobile ? mobileMargin.top + mobileMargin.bottom : margin.top + margin.bottom))
    .append("g")
    .attr("transform", `translate(${isMobile ? mobileMargin.left : margin.left},${isMobile ? mobileMargin.top : margin.top})`);

// Add instructions with mobile-friendly text
const instructions = svg.append("text")
    .attr("x", width / 2)
    .attr("y", -margin.top + 50)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#666");

instructions.append("tspan")
    .attr("x", width / 2)
    .attr("dy", "0")
    .text("Tap state labels to select them. Use buttons to filter.");

instructions.append("tspan")
    .attr("x", width / 2)
    .attr("dy", "20")
    .text("Tap cells to see probabilities. Pinch to zoom if needed.");

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
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em");
    } else {
        axis.call(d3.axisLeft(scale))
            .selectAll("text")
            .attr("dx", "-.5em");
    }
    
    axis.selectAll("text")
        .style("cursor", "pointer")
        .on("click touchstart", function(event) {
            event.preventDefault();
            toggleState(d3.select(this).datum());
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
        
        const cell = createCell(origin, destination, value);
        
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
        .on("click touchstart", function(event) {
            event.preventDefault();
            toggleState(d3.select(this).datum());
        });
    
    yAxis.transition()
        .duration(500)
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .style("cursor", "pointer")
        .on("click touchstart", function(event) {
            event.preventDefault();
            toggleState(d3.select(this).datum());
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
    .attr("class", "x-axis-label")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "12px" : "14px")
    .text("Destination State");

svg.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "12px" : "14px")
    .text("Origin State");

// Update the cell event handlers to work better on mobile
function createCell(origin, destination, value) {
    const cell = svg.append("rect")
        .attr("class", "cell")
        .attr("x", xScale(destination))
        .attr("y", yScale(origin))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", colorScale(value))
        .attr("data-origin", origin)
        .attr("data-destination", destination);

    // Handle both mouse and touch events
    cell.on("mouseover touchstart", function(event) {
        event.preventDefault();
        const touch = event.touches ? event.touches[0] : event;
        tooltip
            .html(`From: ${origin}<br>To: ${destination}<br>Probability: ${(value * 100).toFixed(4)}%`)
            .style("left", (touch.pageX + 10) + "px")
            .style("top", (touch.pageY - 10) + "px")
            .classed("visible", true);
    })
    .on("mouseout touchend", function() {
        tooltip.classed("visible", false);
    });

    return cell;
}

// Update the resize handler with better mobile support
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const newDimensions = calculateDimensions();
        width = newDimensions.width;
        height = newDimensions.height;
        isMobile = newDimensions.isMobile;

        // Update SVG dimensions
        d3.select("#heatmap svg")
            .attr("width", width + (isMobile ? mobileMargin.left + mobileMargin.right : margin.left + margin.right))
            .attr("height", height + (isMobile ? mobileMargin.top + mobileMargin.bottom : margin.top + margin.bottom))
            .select("g")
            .attr("transform", `translate(${isMobile ? mobileMargin.left : margin.left},${isMobile ? mobileMargin.top : margin.top})`);

        // Update scales with equal bandwidth
        xScale.range([0, width]);
        yScale.range([0, height]);

        // Update axes with better spacing
        svg.select(".x-axis")
            .call(xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .style("font-size", isMobile ? "10px" : "12px");

        svg.select(".y-axis")
            .call(yAxis)
            .selectAll("text")
            .attr("dx", "-.5em")
            .style("font-size", isMobile ? "10px" : "12px");

        // Update cells to maintain square shape
        svg.selectAll(".cell")
            .attr("x", d => xScale(d[0]))
            .attr("y", d => yScale(d[1]))
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth());

        // Update axis labels with better positioning
        svg.select(".x-axis-label")
            .attr("x", width / 2)
            .attr("y", height + (isMobile ? mobileMargin.bottom - 10 : margin.bottom - 10))
            .style("font-size", isMobile ? "12px" : "14px");

        svg.select(".y-axis-label")
            .attr("transform", `rotate(-90) translate(${-height / 2}, ${isMobile ? -mobileMargin.left + 15 : -margin.left + 15})`)
            .style("font-size", isMobile ? "12px" : "14px");
    }, 250);
}); 