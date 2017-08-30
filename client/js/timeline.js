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

var brush = d3.brushX()
    .extent([[0, 0], [width, overviewHeight]])
    .on("brush", brushed);

var zoom = d3.zoom()
    .scaleExtent([1, Infinity])
    .translateExtent([[0, 0], [width, height]])
    .extent([[0, 0], [width, height]])
    .on("zoom", zoomed);

var svg = d3.select("#reports-timeline").append("svg")
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
var context = svg.append("g")
    .attr("class", "context")
    .attr("transform", "translate(" + overviewMargin.left + "," + overviewMargin.top + ")");

// Up to 10 color categories for 10 types of reports
var reportColor = d3.scaleOrdinal(d3.schemeCategory10);

data.forEach(function(d) {
	d.report_time = parseTime(d.report_time);
});

// The earliest report date
var xMin = d3.min(data, function(d) { return d.report_time; });

// The latest report date
var xMax = d3.max(data, function(d) { return d.report_time; });

x.domain([xMin, xMax]);
y.domain([0, lanes.length]);

overviewX.domain(x.domain());
overviewY.domain(y.domain());



// append scatter plot to main chart area
var messages = focus.append("g");

messages.attr("clip-path", "url(#clip)");

messages.selectAll("message")
    .data(data)
    .enter().append("circle")
    .attr('class', 'message')
    .attr("r", 4)
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
focus.append("g").selectAll(".laneLine")
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
	.attr("stroke", "lightgray")
	.attr("class", "laneLine");

// Report types texts
focus.append("g").selectAll(".laneText")
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
	.attr("class", "laneText");


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
var messages = context.append("g");

messages.attr("clip-path", "url(#clip)");

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

context.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", "translate(0," + overviewHeight + ")")
    .call(overviewXAxis);

context.append("g")
    .attr("class", "brush")
    .call(brush)
    .call(brush.move, x.range());


//create brush function redraw scatterplot with selection
function brushed() {
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
	var s = d3.event.selection || overviewX.range();
	x.domain(s.map(overviewX.invert, overviewX));

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

	focus.select(".x-axis").call(xAxis);

	svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
		.scale(width / (s[1] - s[0]))
		.translate(-s[0], 0));
}

function zoomed() {
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
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
	context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
}