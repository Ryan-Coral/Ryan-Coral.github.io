/* This file was written by a d3.js noob and is based on https://observablehq.com/@d3/mobile-patent-suits */

/* This function controls the shape of the arrows */
function linkArc(d) {
    return `
    M${d.source.x},${d.source.y}
    A0,0 0 0,1 ${d.target.x},${d.target.y}
  `;
}

d3.json("db.json").then(function (dbExport) {
    const exclusions = new Set([
        "E",
        "V",
        "OTriggered",
        "OPermission",
        "OSchedule",
        "OFunction",
        "ORestricted",
        "OSequence",
        "ORole",
        "OUser",
        "OIdentity",
        "_studio"
    ]);
    const classes = dbExport.schema.classes.filter(c => !exclusions.has(c.name));
    const nodes = classes.map(c => ({id: c.name}));
    const links = classes.flatMap(c => {
        const superClasses = ((c['super-classes'] === undefined) ? [] : c['super-classes'])
            .filter(sc => !exclusions.has(sc))
            .map(sc => ({source: c.name, target: sc, type: 'Inheritance'}));
        const properties = (c.properties === undefined) ? [] : c.properties;
        const embedded = properties.filter(p => p.type === "EMBEDDED")
            .map(p => ({source: c.name, target: p['linked-class'], type: 'Embedded class'}));
        const links = properties.filter(p => p.type === "LINK" && p.name === "in")
            .map(p => ({source: p['linked-class'], target: c.name, type: 'Edge in'}));
        const outEdges = properties.filter(p => p.type === "LINK" && p.name === "out")
            .map(p => ({source: c.name, target: p['linked-class'], type: 'Edge out'}));
        const inEdges = properties.filter(p => p.type === "LINK" && p.name !== "in" && p.name !== "out")
            .map(p => ({source: c.name, target: p['linked-class'], type: 'Link'}));
        return superClasses.concat(embedded).concat(links).concat(outEdges).concat(inEdges);
    });
    const width = 1280;
    const height = 720;
    const svg = d3.select("#viz_area")
        .attr("viewBox", [-width, -height, width * 2, height * 2])
        .style("font", "10px sans-serif");
    const types = Array.from(new Set(links.map(d => d.type)));
    const color = d3.scaleOrdinal(types, d3.schemeCategory10);
    svg.selectAll("legend_dots")
        .data(types)
        .enter()
        .append("circle")
        .attr("cx", - width + 100)
        .attr("cy", function(d,i){ return - height + 100 + i*25})
        .attr("r", 7)
        .style("fill", function(d){ return color(d)});

    svg.selectAll("legend_labels")
        .data(types)
        .enter()
        .append("text")
        .attr("x", -width + 120)
        .attr("y", function(d,i){ return - height + 100 + i*25})
        .style("fill", function(d){ return color(d)})
        .text(function(d){ return d})
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle");

    const drag = simulation => {

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("x", d3.forceX())
        .force("y", d3.forceY());

    // Per-type markers, as they don't inherit styles.
    svg.append("defs").selectAll("marker")
        .data(types)
        .join("marker")
        .attr("id", d => `arrow-${d}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -0.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", color)
        .attr("d", "M0,-5L10,0L0,5");

    const link = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("stroke", d => color(d.type))
        .attr("marker-end", d => `url(${new URL(`#arrow-${d.type}`, location)})`);

    const node = svg.append("g")
        .attr("fill", "currentColor")
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .call(drag(simulation));

    node.append("circle")
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .attr("r", 4);

    node.append("text")
        .attr("x", 8)
        .attr("y", "0.31em")
        .text(d => d.id)
        .clone(true).lower()
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 3);

    simulation.on("tick", () => {
        link.attr("d", linkArc);
        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
});
