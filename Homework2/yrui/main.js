d3.csv("data/student-mat.csv").then(data => {
    data.forEach(function(d) {
      d.age = +d.age;
      d.G3 = +d.G3;
      d.Walc = +d.Walc;
      d.Dalc = +d.Dalc;
      d.studytime = +d.studytime;
      d.failures = +d.failures;
    });
  
    buildDashboard(data);
  });

// Use viewBox to build 3 responsive charts, use ai prompts and get a few code snippets
  function buildDashboard(data) {
    document.body.innerHTML = "";

    // Create scrollable container
    const container = d3.select("body")
      .style("margin", "0")
      .style("padding", "0")
      .style("overflow-x", "hidden")
      .style("font-family", "sans-serif");
      
    // Each chart configuration
    const charts = [
      { id: "age-view", draw: drawDrinkerBarByAge },
      { id: "guardian-pie", draw: drawPieChartByGuardian },
      { id: "parallel-view", draw: drawParallelPlot }
    ];
  
    charts.forEach(chart => {
    // Each chart uses a fixed-size virtual canvas for responsive scaling
      const svgWidth = 1000;
      const svgHeight = 450;
  
      const svg = container.append("svg")
        .attr("id", chart.id)
        .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "auto")
        .style("display", "block")
        .style("margin-bottom", "50px");
  
      chart.draw(svg, data, 0, 0, svgWidth, svgHeight);
    });
  }
  
  // View 1: Bar chart (drinkers per age, shaded by count)
  function drawDrinkerBarByAge(svg, data, xOffset, yOffset, w, h) {
    const g = svg.append("g").attr("transform", `translate(${xOffset}, ${yOffset})`);
    const margin = 40;
  
    const ageGroups = d3.range(15, 23).map(age => {
      const count = data.filter(d => d.age === age && (d.Walc > 1 || d.Dalc > 1)).length;
      return { age, count };
    });
  
    const x = d3.scaleBand().domain(ageGroups.map(d => d.age)).range([margin, w - margin]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(ageGroups, d => d.count)]).nice().range([h - margin, margin]);
    const color = d3.scaleLinear().domain([0, d3.max(ageGroups, d => d.count)]).range(["#dbe9f6", "#08306b"]);
  
    g.append("text")
      .attr("x", w / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text("Number of Drinkers by Age");
  
    g.append("g").attr("transform", `translate(0, ${h - margin})`).call(d3.axisBottom(x));
    g.append("g").attr("transform", `translate(${margin}, 0)`).call(d3.axisLeft(y));
  
    g.append("text")
      .attr("x", w / 2)
      .attr("y", h - 5)
      .attr("text-anchor", "middle")
      .text("Age");
  
    g.append("text")
      .attr("transform", `translate(15, ${h / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .text("Number of Drinkers");
    // Bars and tooltips
    g.selectAll("rect")
      .data(ageGroups)
      .enter()
      .append("rect")
      .attr("x", d => x(d.age))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => y(0) - y(d.count))
      .attr("fill", d => color(d.count))
      .append("title")
      .text(d => `Age ${d.age}: ${d.count} drinkers`);
    // Color
    const legend = g.append("g").attr("transform", `translate(${w - 140}, ${margin})`);
    legend.selectAll("rect")
      .data(d3.range(0, d3.max(ageGroups, d => d.count) + 1))
      .enter()
      .append("rect")
      .attr("x", (d, i) => i)
      .attr("y", 0)
      .attr("width", 1)
      .attr("height", 10)
      .attr("fill", d => color(d));
  
    legend.append("text").attr("x", 0).attr("y", 25).text("Fewer");
    legend.append("text").attr("x", 90).attr("y", 25).text("More");
    legend.append("text").attr("x", 0).attr("y", -5).text("Drinkers");
  }
  
  // View 2: Pie chart (alcohol use by guardian)
  function drawPieChartByGuardian(svg, data, xOffset, yOffset, w, h) {
    const g = svg.append("g").attr("transform", `translate(${xOffset + w / 2}, ${yOffset + h / 2})`);
  
    const guardianGroups = d3.nest()
       .key(d => d.guardian)
       .rollup(v => d3.sum(v, d => d.Dalc + d.Walc))
       .entries(data);

  
    const color = d3.scaleOrdinal()
      .domain(["mother", "father", "other"])
      .range(["#66c2a5", "#fc8d62", "#8da0cb"]);
  
    const radius = Math.min(w, h) / 3;
  
    const pie = d3.pie()
      .value(d => d.value);
  
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);
    // Title
    g.append("text")
      .attr("y", -radius - 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text("Average Alcohol Use by Guardian");
    // Pie slices and labels
    const arcs = g.selectAll(".arc")
      .data(pie(guardianGroups))
      .enter()
      .append("g")
      .attr("class", "arc");
  
    arcs.append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.key))
      .append("title")
      .text(d => `${d.data.key}: ${d.data.value.toFixed(2)}`);
  
    arcs.append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .text(d => d.data.key);
  
    const legend = svg.append("g").attr("transform", `translate(${xOffset + w - 120}, ${yOffset + 30})`);
    ["mother", "father", "other"].forEach((key, i) => {
      legend.append("rect")
        .attr("x", 0).attr("y", i * 20)
        .attr("width", 12).attr("height", 12)
        .attr("fill", color(key));
      legend.append("text")
        .attr("x", 20).attr("y", i * 20 + 10)
        .text(key)
        .attr("font-size", "12px");
    });
  }
  
  // View 3: Parallel Coordinates Plot
  function drawParallelPlot(svg, data, xOffset, yOffset, w, h) {
    const g = svg.append("g")
    .attr("transform", `translate(${xOffset + w * 0.05}, ${yOffset + h * 0.05}) scale(0.8)`);
  
    const margin = { top: 60, right: 20, bottom: 20, left: 40 };
  
    const dims = ["Dalc", "Walc", "studytime", "failures", "G3"];
    const tickValues = {
      Dalc: [1, 2, 3, 4, 5],
      Walc: [1, 2, 3, 4, 5],
      studytime: [1, 2, 3, 4],
      failures: [0, 1, 2, 3],
      G3: null
    };
  
    const y = {};
    dims.forEach(dim => {
      const domain = tickValues[dim] ? [d3.min(tickValues[dim]), d3.max(tickValues[dim])] : d3.extent(data, d => d[dim]);
      y[dim] = d3.scaleLinear().domain(domain).range([h - margin.bottom, margin.top]);
    });
  
    const x = d3.scalePoint().domain(dims).range([margin.left, w - margin.right]);
  
    // Chart title — slightly raised
    svg.append("text")
      .attr("x", xOffset + w / 2)
      .attr("y", yOffset + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .text("Parallel Coordinates: Alcohol, Study, Failures, and Grades");
  
    // Axis rendering
    g.selectAll(".axis")
      .data(dims)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${x(d)},0)`)
      .each(function(d) {
        const axis = d3.axisLeft(y[d]);
        if (tickValues[d]) axis.tickValues(tickValues[d]);
        d3.select(this).call(axis);
      })
      .append("text")
      .attr("y", margin.top - 20)
      .attr("x", 0)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .attr("font-size", "11px")
      .text(d => {
        switch (d) {
          case "Dalc": return "Daily Alcohol";
          case "Walc": return "Weekend Alcohol";
          case "studytime": return "Study Time";
          case "failures": return "Failures";
          case "G3": return "Final Grade";
        }
      });
  
    // Plot lines
    g.selectAll("path")
      .data(data)
      .enter()
      .append("path")
      .attr("d", d => d3.line()(dims.map(p => [x(p), y[p](d[p])])))
      .attr("fill", "none")
      .attr("stroke", d => d3.interpolateReds(d.G3 / 20))
      .attr("stroke-width", 1)
      .attr("opacity", 0.5);
  
    // Gradient legend for G3
    const legendWidth = 120;
    const legendHeight = 10;
    const legendX = x("G3") + 30;
    const legendY = h - 30;
  
    const defs = svg.append("defs");
  
    const gradient = defs.append("linearGradient")
      .attr("id", "g3-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");
  
    gradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateReds(0));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateReds(1));
  
    g.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#g3-gradient)");
  
    g.append("text")
      .attr("x", legendX)
      .attr("y", legendY - 5)
      .attr("font-size", "11px")
      .text("G3 (Final Grade)");
  
    g.append("text")
      .attr("x", legendX)
      .attr("y", legendY + 25)
      .attr("font-size", "10px")
      .text("Low");
  
    g.append("text")
      .attr("x", legendX + legendWidth - 20)
      .attr("y", legendY + 25)
      .attr("font-size", "10px")
      .text("High");
  }
  