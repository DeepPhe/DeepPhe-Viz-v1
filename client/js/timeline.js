// Data

var lanes = ["Radiology Report", "Progress Note", "Surgical Pathology Report", "Discharge Summary"];

var data = [
 {
   "report_id": 1,
   "report_time": "2014-04-05",
   "report_type": 0
 },
 {
   "report_id": 2,
   "report_time": "2014-12-04",
   "report_type": 0
 },
 {
   "report_id": 3,
   "report_time": "2015-02-05",
   "report_type": 0
 },
 {
   "report_id": 4,
   "report_time": "2015-03-06",
   "report_type": 1
 },
 {
   "report_id": 5,
   "report_time": "2015-08-16",
   "report_type": 1
 },
 {
   "report_id": 6,
   "report_time": "2015-08-26",
   "report_type": 1
 },
 {
   "report_id": 7,
   "report_time": "2015-09-10",
   "report_type": 2
 },
 {
   "report_id": 8,
   "report_time": "2015-10-22",
   "report_type": 2
 },
 {
   "report_id": 9,
   "report_time": "2015-12-03",
   "report_type": 2
 },
 {
   "report_id": 10,
   "report_time": "2016-01-19",
   "report_type": 3
 },
 {
   "report_id": 11,
   "report_time": "2016-03-11",
   "report_type": 3
 },
 {
   "report_id": 12,
   "report_time": "2016-11-24",
   "report_type": 3
 }
];

console.log(data);

var margin = {top: 20, right: 20, bottom: 100, left: 200};
var width = 960 - margin.left - margin.right;
var height = 320 - margin.top - margin.bottom;

var overviewMargin = {top: 250, right: 20, bottom: 30, left: 200};
var overviewHeight = 320 - overviewMargin.top - overviewMargin.bottom;


var mainY = d3.scaleLinear()
		.domain([0, lanes.length])
		.range([0, height]);


var parseTime = d3.timeParse("%Y-%m-%d");

var x = d3.scaleTime()
		.range([0, width]);

var overviewX = d3.scaleTime()
		.range([0, width]);

var y = d3.scaleLinear()
		.range([0, height]);

var overviewY = d3.scaleLinear()
		.range([0, overviewHeight]);

// https://github.com/d3/d3-axis#axisBottom
var xAxis = d3.axisBottom(x).tickSize(10);

var yAxis = d3.axisLeft(y).tickSize(0);

var overviewXAxis = d3.axisBottom(overviewX).tickSize(0);



var zoom = d3.zoom()
    .scaleExtent([1, Infinity])
    .translateExtent([[0, 0], [width, height]])
    .extent([[0, 0], [width, height]])
    .on("zoom", zoomed);

var svg = d3.select("#reports-timeline").append("svg")
    .attr("class", "timeline_svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

svg.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height);

// Main focus area
var focus = svg.append("g")
    .attr("class", "focus")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



// Mini overview
var overview = svg.append("g")
    .attr("class", "overview")
    .attr("transform", "translate(" + overviewMargin.left + "," + overviewMargin.top + ")");

// Up to 10 color categories for 10 types of reports
var reportColor = d3.scaleOrdinal(d3.schemeCategory10);

data.forEach(function(d) {
	d.report_time = parseTime(d.report_time);
});

// The earliest report date
var xMinDate = d3.min(data, function(d) { return d.report_time; });

// Set the start date of the x axis 30 days before the xMinDate
var startDate = new Date(xMinDate);
startDate.setDate(startDate.getDate() - 30);

// The latest report date
var xMaxDate = d3.max(data, function(d) { return d.report_time; });

// Set the end date of the x axis 30 days after the xMaxDate
var endDate = new Date(xMaxDate);
endDate.setDate(endDate.getDate() + 30);

x.domain([startDate, endDate]);
y.domain([0, lanes.length]);

overviewX.domain(x.domain());
overviewY.domain(y.domain());



// append scatter plot to main chart area
var messages = focus.append("g")
	.attr("clip-path", "url(#clip)");

messages.selectAll("message")
    .data(data)
    .enter().append("circle")
    .attr('class', 'message')
    .attr("r", 6)
    .attr("cx", function(d) { 
    	return x(d.report_time); 
    })
    .attr("cy", function(d) { 
    	return y(d.report_type); 
    })

focus.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);



// Report type divider lines
focus.append("g").selectAll(".report_type_devlider")
	.data(lanes)
	.enter().append("line")
	.attr("x1", 0) // relative to main area
	.attr("y1", function(d, i) {
		return mainY(i);
	})
	.attr("x2", width)
	.attr("y2", function(d, i) {
		return mainY(i);
	})
	.attr("class", "report_type_devlider");

// Report types texts
focus.append("g").selectAll(".report_type_text")
	.data(lanes)
	.enter().append("text")
	.text(function(d) {
		return d;
	})
	.attr("x", -margin.right)
	.attr("y", function(d, i) {
		return mainY(i + .5);
	})
	.attr("dy", ".5ex")
	.attr("text-anchor", "end")
	.style("font-size", '12px')    
	.attr("class", "report_type_text");


// X axis bottom text
svg.append("text")
    .attr("transform",
          "translate(" + ((width + margin.right + margin.left)/2) + " ," +
                         (height + margin.top + margin.bottom) + ")")
    .style("text-anchor", "middle")
    .style("font-size", '12px')    
    .text("Patient Timeline (" + data.length + " reports)");

svg.append("rect")
	.attr("class", "zoom")
	.attr("width", width)
	.attr("height", height)
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
	.call(zoom);

// append scatter plot to brush chart area
var messages = overview.append("g")
    .attr("clip-path", "url(#clip)");

messages.selectAll("message")
	.data(data)
	.enter().append("circle")
	.attr('class', 'messageContext')
	.attr("r", 3)
	.attr("cx", function(d) { 
		return overviewX(d.report_time); 
	})
	.attr("cy", function(d) { 
		return overviewY(d.report_type + .5); 
	})
	.style("fill", function(d) {
		return reportColor(d.report_type);
	});

overview.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", "translate(0," + overviewHeight + ")")
    .call(overviewXAxis);

// Add brush to overview
var overviewBrush = overview.append("g")
    .attr("class", "brush");


// Custom brush handle path
var createCustomBrushHandle = function(d) {
    var e = +(d.type == "e"),
        x = e ? 1 : -1,
        y = overviewHeight / 2;

    return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) + "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
};


// Add custom brush handles
var customBrushHandle = overviewBrush.selectAll(".handle--custom")
    .data([{type: "w"}, {type: "e"}]) // two handles
    .enter().append("path")
    .attr("class", "handle--custom")
    .attr("stroke", "#000")
    .attr("cursor", "ew-resize")
	.attr("d", createCustomBrushHandle);
	

// D3 brush
var brush = d3.brushX()
    .extent([[0, 0], [width, overviewHeight]])
    .on("start brush end", brushed);


// Add brush to overview
overviewBrush
    .call(brush)
    .call(brush.move, x.range());



// Create brush function redraw scatterplot with selection
function brushed() {
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") {
		return; // ignore brush-by-zoom
	}

    // Get the current brush selection
	var selection = d3.event.selection || overviewX.range();

    // Update the position of custom brush handles
    customBrushHandle
        .attr("display", null)
        .attr("transform", function(d, i) { 
        	return "translate(" + [ selection[i], - overviewHeight / 4] + ")"; 
        });

    // Set the domain of the focus area based on brush selection
	x.domain(selection.map(overviewX.invert, overviewX));

    // Update main focus area
	focus.selectAll(".message")
		.attr("cx", function(d) { 
			return x(d.report_time); 
		})
		.attr("cy", function(d) { 
			return mainY(d.report_type + .5); 
		})
		.style("fill", function(d) {
			return reportColor(d.report_type);
		});

    // Update the focus x axis
	focus.select(".x-axis").call(xAxis);

	svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
		.scale(width / (selection[1] - selection[0]))
		.translate(-selection[0], 0));
}

function zoomed() {
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") {
	    return; // ignore zoom-by-brush
	}; 

	var t = d3.event.transform;

	x.domain(t.rescaleX(overviewX).domain());

	focus.selectAll(".message")
		.attr("cx", function(d) { 
			return x(d.report_time); 
		})
		.attr("cy", function(d) { 
			return mainY(d.report_type + .5); 
		});

	focus.select(".x-axis").call(xAxis);

	overview.select(".brush").call(brush.move, x.range().map(t.invertX, t));
}