// Let's keep track of all our data and what's currently happening
let data = [];
let selectedData = [];
let csvData = []; // This holds the real CSV data for our fancy parallel coordinates
let currentMetric = 'anxiety';
let brush, zoom;

// Create a nice tooltip that follows your mouse around
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

/**
 * Load the actual CSV file - this is where the magic happens!
 * We're reading real survey data about music and mental health
 */
async function loadCSVData() {
    try {
        // Grab the CSV file from wherever it's hiding
        const csvContent = await window.fs.readFile('mxmh_survey_results.csv', { encoding: 'utf8' });
        
        // Papa Parse is our friend - it makes messy CSV data nice and clean
        const parseResult = Papa.parse(csvContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            transformHeader: function(header) {
                // Clean up those messy header names
                return header.trim();
            }
        });
        
        // Now let's clean up this data and make it useful
        csvData = parseResult.data
            .filter(row => {
                // Only keep rows that have the important stuff we need
                return row.Age && 
                       row['Hours per day'] && 
                       (row.Anxiety !== null && row.Anxiety !== undefined) &&
                       (row.Depression !== null && row.Depression !== undefined) &&
                       (row.Insomnia !== null && row.Insomnia !== undefined) &&
                       (row.OCD !== null && row.OCD !== undefined);
            })
            .map(row => ({
                // Transform the messy CSV into something we can actually work with
                age: parseFloat(row.Age),
                hoursPerDay: parseFloat(row['Hours per day']),
                anxiety: parseFloat(row.Anxiety),
                depression: parseFloat(row.Depression),
                insomnia: parseFloat(row.Insomnia),
                ocd: parseFloat(row.OCD),
                musicEffect: row['Music effects'] || 'No effect',
                favGenre: row['Fav genre'] || 'Unknown',
                service: row['Primary streaming service'] || 'Unknown'
            }));
        
        console.log(`Sweet! Loaded ${csvData.length} people's survey responses`);
        return csvData;
        
    } catch (error) {
        console.error('Oops, something went wrong loading the CSV:', error);
        // If things go sideways, we'll just use fake data instead
        csvData = generateSyntheticData().slice(0, 100);
        return csvData;
    }
}

/**
 * Make some fake data that looks realistic
 * Sometimes you need fake data when the real stuff isn't cooperating
 */
function generateSyntheticData() {
    const genres = ['Classical', 'Country', 'EDM', 'Folk', 'Gospel', 'Hip hop', 'Jazz', 'K pop', 
                   'Latin', 'Lofi', 'Metal', 'Pop', 'R&B', 'Rap', 'Rock', 'Video game music'];
    const frequencies = ['Never', 'Rarely', 'Sometimes', 'Very frequently'];
    const services = ['Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music', 'Other'];
    const effects = ['Improve', 'Worsen', 'No effect'];
    
    const syntheticData = [];
    
    // Let's create 600 fake people with realistic-ish data
    for (let i = 0; i < 600; i++) {
        const age = Math.random() * 50 + 16; // People from 16 to 66 years old
        const hoursPerDay = Math.random() * 12 + 0.5; // Between half an hour and 12.5 hours of music daily
        
        // Mental health scores from 0-10 (higher = worse)
        const anxiety = Math.random() * 10;
        const depression = Math.random() * 10;
        const insomnia = Math.random() * 10;
        const ocd = Math.random() * 10;
        
        // Let's make some patterns - people who listen to more music might feel differently
        const musicEffect = hoursPerDay > 6 ? 
            (Math.random() > 0.6 ? 'Improve' : (Math.random() > 0.5 ? 'Worsen' : 'No effect')) :
            (Math.random() > 0.4 ? 'Improve' : (Math.random() > 0.3 ? 'No effect' : 'Worsen'));
        
        // Everyone has their own music taste preferences
        const genreFreqs = {};
        genres.forEach(genre => {
            genreFreqs[genre] = frequencies[Math.floor(Math.random() * frequencies.length)];
        });
        
        syntheticData.push({
            id: i,
            age: age,
            hoursPerDay: hoursPerDay,
            service: services[Math.floor(Math.random() * services.length)],
            anxiety: anxiety,
            depression: depression,
            insomnia: insomnia,
            ocd: ocd,
            musicEffect: musicEffect,
            genreFrequencies: genreFreqs,
            favGenre: genres[Math.floor(Math.random() * genres.length)]
        });
    }
    
    return syntheticData;
}

/**
 * Get everything set up and ready to go!
 */
async function initDashboard() {
    // First, let's get that real CSV data loaded up
    await loadCSVData();
    
    // Create some fake data for the other charts (they need different structure)
    data = generateSyntheticData();
    selectedData = [...data]; // Start with everything selected
    
    // Set up all our visualization areas
    setupOverviewChart();
    setupGenreChart();
    setupMentalHealthChart();
    
    // Make everything look pretty right from the start
    updateAllCharts();
}

/**
 * This creates our main scatter plot where all the action happens
 * It's got clicking, brushing, zooming - the whole nine yards!
 */
function setupOverviewChart() {
    const margin = {top: 20, right: 20, bottom: 60, left: 60};
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Make our main canvas
    const svg = d3.select("#overview-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
    
    // This is where we'll actually draw stuff (with some breathing room)
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Figure out how to map our data values to pixel positions
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.hoursPerDay)])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, 10])
        .range([height, 0]);
    
    // Different colors for how music affects people
    const colorScale = d3.scaleOrdinal()
        .domain(['Improve', 'Worsen', 'No effect'])
        .range(['#2ecc71', '#e74c3c', '#95a5a6']);
    
    // Add some grid lines so it's easier to read
    g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .tickSize(-height)
            .tickFormat("")
        );
    
    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat("")
        );
    
    // The actual axes with numbers and tick marks
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));
    
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScale));
    
    // Let people know what they're looking at
    g.append("text")
        .attr("transform", `translate(${width/2}, ${height + 50})`)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Hours of Music per Day");
    
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Mental Health Score");
    
    // Add a legend so people know what the colors mean
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 120}, 20)`);
    
    const legendItems = legend.selectAll(".legend-item")
        .data(['Improve', 'Worsen', 'No effect'])
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);
    
    legendItems.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 5)
        .style("fill", d => colorScale(d));
    
    legendItems.append("text")
        .attr("x", 12)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .text(d => d);
    
    // Set up brushing so people can select areas by dragging
    brush = d3.brush()
        .extent([[0, 0], [width, height]])
        .on("end", brushed);
    
    g.append("g")
        .attr("class", "brush")
        .call(brush);
    
    // Zooming and panning because everyone loves to zoom
    zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", zoomed);
    
    svg.call(zoom);
    
    // Save these for later so other functions can use them
    window.overviewG = g;
    window.overviewXScale = xScale;
    window.overviewYScale = yScale;
    window.overviewColorScale = colorScale;
    window.overviewWidth = width;
    window.overviewHeight = height;
}

/**
 * Set up the space for our fancy parallel coordinates chart
 */
function setupGenreChart() {
    const margin = {top: 30, right: 30, bottom: 40, left: 30};
    const width = 300 - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;
    
    const svg = d3.select("#genre-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Save these so we can use them later
    window.genreG = g;
    window.genreWidth = width;
    window.genreHeight = height;
    window.genreMargin = margin;
}

/**
 * Set up our mental health breakdown chart space
 */
function setupMentalHealthChart() {
    const margin = {top: 20, right: 20, bottom: 60, left: 80};
    const width = 300 - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;
    
    const svg = d3.select("#mental-health-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Keep these handy for updates
    window.mentalHealthG = g;
    window.mentalHealthWidth = width;
    window.mentalHealthHeight = height;
}

/**
 * Update the main scatter plot when things change
 * This handles all the smooth animations when you switch between mental health metrics
 */
function updateOverviewChart() {
    const g = window.overviewG;
    const xScale = window.overviewXScale;
    const yScale = window.overviewYScale;
    const colorScale = window.overviewColorScale;
    
    // Connect our data to visual elements (D3's special sauce)
    const circles = g.selectAll(".data-point")
        .data(data, d => d.id);
    
    // Add new points with a nice entrance animation
    circles.enter()
        .append("circle")
        .attr("class", "data-point")
        .attr("r", 0) // Start tiny
        .attr("cx", d => xScale(d.hoursPerDay))
        .attr("cy", d => yScale(d[currentMetric]))
        .style("fill", d => colorScale(d.musicEffect))
        .style("opacity", 0) // Start invisible
        .on("click", pointClicked)
        .on("mouseover", showTooltip)
        .on("mouseout", hideTooltip)
        .transition()
        .duration(500)
        .attr("r", 4) // Grow to normal size
        .style("opacity", 0.8); // Fade in
    
    // Update existing points smoothly when metric changes
    circles.transition()
        .duration(500)
        .attr("cx", d => xScale(d.hoursPerDay))
        .attr("cy", d => yScale(d[currentMetric]))
        .style("fill", d => colorScale(d.musicEffect));
    
    // Remove points that aren't needed anymore
    circles.exit()
        .transition()
        .duration(300)
        .attr("r", 0) // Shrink
        .style("opacity", 0) // Fade out
        .remove();
    
    // Update the axis label to match current metric
    g.select(".axis text")
        .text(currentMetric.charAt(0).toUpperCase() + currentMetric.slice(1) + " Score");
}

/**
 * This is our fancy parallel coordinates chart using real survey data!
 * It shows how age, music listening, and mental health all relate to each other
 */
function updateGenreChart() {
    const g = window.genreG;
    const width = window.genreWidth;
    const height = window.genreHeight;
    
    // Start fresh each time
    g.selectAll("*").remove();
    
    // Use real survey data (but not too much - it gets messy with 700+ lines)
    const dataToUse = csvData.slice(0, 200);
    
    // Our three axes: age, music hours, and whatever mental health metric is selected
    const dimensions = [
        {
            name: "Age",
            key: "age",
            scale: d3.scaleLinear()
                .domain(d3.extent(dataToUse, d => d.age))
                .range([height, 0])
        },
        {
            name: "Hours/Day",
            key: "hoursPerDay", 
            scale: d3.scaleLinear()
                .domain(d3.extent(dataToUse, d => d.hoursPerDay))
                .range([height, 0])
        },
        {
            name: currentMetric.charAt(0).toUpperCase() + currentMetric.slice(1),
            key: currentMetric,
            scale: d3.scaleLinear()
                .domain([0, 10])
                .range([height, 0])
        }
    ];
    
    // Position our three vertical axes across the width
    const xScale = d3.scalePoint()
        .domain(dimensions.map(d => d.name))
        .range([0, width])
        .padding(0.1);
    
    // Same color scheme as the main chart
    const colorScale = d3.scaleOrdinal()
        .domain(['Improve', 'Worsen', 'No effect'])
        .range(['#2ecc71', '#e74c3c', '#95a5a6']);
    
    // Draw the three vertical axes
    dimensions.forEach(dimension => {
        const axisGroup = g.append("g")
            .attr("class", "pc-axis")
            .attr("transform", `translate(${xScale(dimension.name)}, 0)`);
        
        // Add the axis line and tick marks
        axisGroup.call(d3.axisLeft(dimension.scale).ticks(5));
        
        // Label each axis
        axisGroup.append("text")
            .attr("class", "axis-title")
            .attr("text-anchor", "middle")
            .attr("y", -15)
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .style("fill", "#2c3e50")
            .text(dimension.name);
        
        // Make the axes look nice
        axisGroup.selectAll("path, line")
            .style("stroke", "#34495e")
            .style("stroke-width", 2);
        
        axisGroup.selectAll("text")
            .style("fill", "#2c3e50")
            .style("font-size", "10px");
    });
    
    // This creates smooth curved lines connecting the three axes
    const line = d3.line()
        .x(d => xScale(d.dimension))
        .y(d => d.value)
        .curve(d3.curveCardinal.tension(0.5));
    
    // Save all this stuff so the animation function can use it
    window.pcData = dataToUse;
    window.pcDimensions = dimensions;
    window.pcXScale = xScale;
    window.pcLine = line;
    window.pcColorScale = colorScale;
    
    // Add the color legend
    const legend = g.append("g")
        .attr("class", "pc-legend")
        .attr("transform", `translate(${width - 80}, ${height - 60})`);
    
    const legendItems = legend.selectAll(".legend-item")
        .data(['Improve', 'Worsen', 'No effect'])
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 15})`);
    
    legendItems.append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("y1", 0)
        .attr("y2", 0)
        .style("stroke", d => colorScale(d))
        .style("stroke-width", 3);
    
    legendItems.append("text")
        .attr("x", 20)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "10px")
        .style("fill", "#2c3e50")
        .text(d => d);
    
    // Let people know this is real data
    const info = g.append("g")
        .attr("class", "data-info")
        .attr("transform", `translate(5, ${height + 20})`);
    
    info.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .style("font-size", "9px")
        .style("fill", "#7f8c8d")
        .text(`Showing ${dataToUse.length} real survey responses`);
}

/**
 * The fun part - animate all those lines sweeping in from left to right!
 * This creates a really satisfying reveal effect
 */
function animateParallelCoordinates() {
    const g = window.genreG;
    const dataToUse = window.pcData;
    const dimensions = window.pcDimensions;
    const xScale = window.pcXScale;
    const line = window.pcLine;
    const colorScale = window.pcColorScale;
    
    if (!dataToUse || !dimensions) {
        console.log("Hmm, looks like we don't have data ready for animation yet");
        return;
    }
    
    // Update the button so people know something's happening
    const btn = document.getElementById('animate-btn');
    btn.textContent = 'Animating...';
    btn.disabled = true;
    
    // Clear out any old lines
    g.selectAll(".pc-line").remove();
    
    // Create a "window" that starts closed and opens left to right
    const clipPath = g.append("defs")
        .append("clipPath")
        .attr("id", "pc-clip")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 0) // Start with zero width
        .attr("height", window.genreHeight);
    
    // Put all our lines in this clipped area
    const lineGroup = g.append("g")
        .attr("class", "pc-lines")
        .attr("clip-path", "url(#pc-clip)");
    
    // Draw all the lines (they'll be hidden by the clip path initially)
    const paths = lineGroup.selectAll(".pc-line")
        .data(dataToUse)
        .enter()
        .append("path")
        .attr("class", "pc-line")
        .style("fill", "none")
        .style("stroke", d => colorScale(d.musicEffect || 'No effect'))
        .style("stroke-width", 1.5)
        .style("opacity", 0.6)
        .attr("d", d => {
            // For each person, create a line connecting their values across the three axes
            const lineData = dimensions.map(dim => ({
                dimension: dim.name,
                value: dim.scale(d[dim.key])
            }));
            return line(lineData);
        })
        .on("mouseover", function(event, d) {
            // Highlight the line when you hover over it
            d3.select(this)
                .style("stroke-width", 3)
                .style("opacity", 1);
            
            // Show details about this person
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            
            tooltip.html(`
                <strong>Age:</strong> ${d.age.toFixed(1)}<br/>
                <strong>Hours/Day:</strong> ${d.hoursPerDay.toFixed(1)}<br/>
                <strong>${currentMetric.charAt(0).toUpperCase() + currentMetric.slice(1)}:</strong> ${d[currentMetric].toFixed(1)}<br/>
                <strong>Music Effect:</strong> ${d.musicEffect || 'No effect'}<br/>
                <strong>Favorite Genre:</strong> ${d.favGenre}
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            // Back to normal when you move your mouse away
            d3.select(this)
                .style("stroke-width", 1.5)
                .style("opacity", 0.6);
            
            // Hide the tooltip
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    // Here's the magic - slowly open the "window" to reveal the lines
    clipPath.transition()
        .duration(3000) // Takes 3 seconds
        .ease(d3.easeQuadInOut) // Smooth acceleration and deceleration
        .attr("width", window.genreWidth)
        .on("end", function() {
            // Clean up after the animation
            lineGroup.attr("clip-path", null);
            g.select("defs").remove();
            
            // Reset the button
            btn.textContent = 'Animate Lines';
            btn.disabled = false;
            
            // Add a little pulse effect for extra pizzazz
            paths.transition()
                .duration(1000)
                .style("opacity", 0.8)
                .transition()
                .duration(1000)
                .style("opacity", 0.6);
        });
}

/**
 * Update the mental health breakdown chart
 * Shows average scores for different mental health aspects
 */
function updateMentalHealthChart() {
    const g = window.mentalHealthG;
    const width = window.mentalHealthWidth;
    const height = window.mentalHealthHeight;
    
    // Calculate average scores for all four mental health metrics
    const metrics = ['anxiety', 'depression', 'insomnia', 'ocd'];
    const avgData = metrics.map(metric => {
        const avg = selectedData.reduce((sum, d) => sum + d[metric], 0) / selectedData.length;
        return {
            metric: metric.charAt(0).toUpperCase() + metric.slice(1),
            value: avg
        };
    });
    
    // Set up our scales
    const xScale = d3.scaleBand()
        .domain(avgData.map(d => d.metric))
        .range([0, width])
        .padding(0.2);
    
    const yScale = d3.scaleLinear()
        .domain([0, 10])
        .range([height, 0]);
    
    // Different color for each mental health metric
    const colorScale = d3.scaleOrdinal()
        .domain(metrics.map(m => m.charAt(0).toUpperCase() + m.slice(1)))
        .range(['#3498db', '#e74c3c', '#f39c12', '#9b59b6']);
    
    // Start fresh
    g.selectAll("*").remove();
    
    // Add the axes
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));
    
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScale));
    
    // Add the bars with a nice growth animation
    g.selectAll(".mental-health-bar")
        .data(avgData)
        .enter()
        .append("rect")
        .attr("class", "mental-health-bar")
        .attr("x", d => xScale(d.metric))
        .attr("width", xScale.bandwidth())
        .attr("y", height) // Start at the bottom
        .attr("height", 0) // Start with no height
        .style("fill", d => colorScale(d.metric))
        .transition()
        .duration(800)
        .attr("y", d => yScale(d.value)) // Grow to the right height
        .attr("height", d => height - yScale(d.value));
    
    // Add value labels on top of each bar
    g.selectAll(".value-label")
        .data(avgData)
        .enter()
        .append("text")
        .attr("class", "value-label")
        .attr("x", d => xScale(d.metric) + xScale.bandwidth()/2)
        .attr("y", d => yScale(d.value) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("opacity", 0) // Start invisible
        .text(d => d.value.toFixed(1))
        .transition()
        .delay(800) // Wait for bars to finish growing
        .duration(300)
        .style("opacity", 1); // Fade in
}

/**
 * Handle clicking on individual points in the scatter plot
 * This lets people build up custom selections
 */
function pointClicked(event, d) {
    // Check if this point is already selected
    const isSelected = d3.select(this).classed("selected");
    
    if (isSelected) {
        // Remove it from selection
        d3.select(this).classed("selected", false);
        selectedData = selectedData.filter(item => item.id !== d.id);
    } else {
        // Add it to selection
        d3.select(this).classed("selected", true);
        if (!selectedData.find(item => item.id === d.id)) {
            selectedData.push(d);
        }
    }
    
    // Update the other charts to reflect the new selection
    updateSelectionInfo();
    updateGenreChart();
    updateMentalHealthChart();
}

/**
 * Handle brush selection (when people drag to select an area)
 * This is really satisfying to use!
 */
function brushed(event) {
    const selection = event.selection;
    
    if (!selection) {
        // No brush area = select everything
        selectedData = [...data];
        d3.selectAll(".data-point").classed("selected", false);
    } else {
        // Figure out which points are inside the brush area
        const [[x0, y0], [x1, y1]] = selection;
        const xScale = window.overviewXScale;
        const yScale = window.overviewYScale;
        
        selectedData = [];
        
        d3.selectAll(".data-point")
            .classed("selected", function(d) {
                const x = xScale(d.hoursPerDay);
                const y = yScale(d[currentMetric]);
                const selected = x >= x0 && x <= x1 && y >= y0 && y <= y1;
                
                if (selected) {
                    selectedData.push(d);
                }
                
                return selected;
            });
    }
    
    // Update everything else
    updateSelectionInfo();
    updateGenreChart();
    updateMentalHealthChart();
}

/**
 * Handle zooming and panning in the main chart
 * People love being able to zoom into interesting areas
 */
function zoomed(event) {
    const transform = event.transform;
    const g = window.overviewG;
    const xScale = window.overviewXScale;
    const yScale = window.overviewYScale;
    
    // Apply the zoom transform to our scales
    const newXScale = transform.rescaleX(xScale);
    const newYScale = transform.rescaleY(yScale);
    
    // Update the axes
    g.select(".axis")
        .filter(function() { return this.getAttribute("transform") === `translate(0,${window.overviewHeight})`; })
        .call(d3.axisBottom(newXScale));
    
    g.select(".axis")
        .filter(function() { return !this.getAttribute("transform"); })
        .call(d3.axisLeft(newYScale));
    
    // Move all the points to their new positions
    g.selectAll(".data-point")
        .attr("cx", d => newXScale(d.hoursPerDay))
        .attr("cy", d => newYScale(d[currentMetric]));
}

/**
 * Show a tooltip when hovering over a point
 * Gives people more details about each individual
 */
function showTooltip(event, d) {
    tooltip.transition()
        .duration(200)
        .style("opacity", .9);
    
    tooltip.html(`
        <strong>Age:</strong> ${d.age.toFixed(1)}<br/>
        <strong>Hours/Day:</strong> ${d.hoursPerDay.toFixed(1)}<br/>
        <strong>${currentMetric.charAt(0).toUpperCase() + currentMetric.slice(1)}:</strong> ${d[currentMetric].toFixed(1)}<br/>
        <strong>Music Effect:</strong> ${d.musicEffect}<br/>
        <strong>Favorite Genre:</strong> ${d.favGenre}
    `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
}

/**
 * Hide the tooltip when mouse moves away
 */
function hideTooltip() {
    tooltip.transition()
        .duration(500)
        .style("opacity", 0);
}

/**
 * Switch between different mental health metrics
 * Called when people click the buttons at the top
 */
function updateMentalHealthMetric(metric) {
    currentMetric = metric;
    
    // Update button appearance
    d3.selectAll(".control-button").classed("active", false);
    d3.select(`button[onclick="updateMentalHealthMetric('${metric}')"]`).classed("active", true);
    
    // Refresh the main chart with the new metric
    updateOverviewChart();
}

/**
 * Reset everything back to showing all the data
 */
function clearSelection() {
    selectedData = [...data];
    d3.selectAll(".data-point").classed("selected", false);
    window.overviewG.select(".brush").call(brush.move, null);
    
    updateSelectionInfo();
    updateGenreChart();
    updateMentalHealthChart();
}

/**
 * Update the little info box that shows how many people are selected
 */
function updateSelectionInfo() {
    const info = document.getElementById("selection-info");
    
    if (selectedData.length === data.length) {
        // Everyone's selected, so hide the info
        info.style.display = "none";
    } else {
        // Show how many people are selected
        info.style.display = "block";
        info.innerHTML = `Selected ${selectedData.length} of ${data.length} individuals`;
    }
}

/**
 * Refresh all three charts
 */
function updateAllCharts() {
    updateOverviewChart();
    updateGenreChart();
    updateMentalHealthChart();
}

// Get everything started when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
});