// Set up dimensions and margins
const margin = { top: 100, right: 100, bottom: 100, left: 100 };
const width = 1000 - margin.left - margin.right;
const height = 1000 - margin.top - margin.bottom;

// Create SVG container
const svg = d3.select("#heatmap")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create tooltip
const tooltip = d3.select("#tooltip");

// Color scale
const colorScale = d3.scaleSequential()
    .interpolator(d3.interpolateYlOrRd)
    .domain([0, 1]);

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

// Add X axis
svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

// Add Y axis
svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale));

// Create the heatmap
transitionData.forEach(row => {
    const origin = row.From;
    states.forEach(destination => {
        const value = +row[destination];
        
        svg.append("rect")
            .attr("class", "cell")
            .attr("x", xScale(destination))
            .attr("y", yScale(origin))
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .attr("fill", colorScale(value))
            .on("mouseover", function(event, d) {
                tooltip
                    .html(`From: ${origin}<br>To: ${destination}<br>Probability: ${(value * 100).toFixed(2)}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .classed("visible", true);
            })
            .on("mouseout", function() {
                tooltip.classed("visible", false);
            });
    });
});

// Add title
svg.append("text")
    .attr("x", width / 2)
    .attr("y", -margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Migration Probability Heatmap");

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