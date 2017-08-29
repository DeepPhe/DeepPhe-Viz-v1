// Timeline

//data
var lanes = ["Radiology Report", "Progress Note", "Surgical Pathology Report", "Discharge Summary"];

var laneLength = lanes.length;

var items = [
				{"type": 0, "id": "Report1", "time": 5},
				{"type": 0, "id": "Report2", "time": 265},
				{"type": 0, "id": "Report3", "time": 580},
				{"type": 0, "id": "Report4", "time": 620},
				{"type": 0, "id": "Report5", "time": 960},
				{"type": 1, "id": "Report6", "time": 1270},
				{"type": 1, "id": "Report7", "time": 1370},
				{"type": 1, "id": "Report8", "time": 1645},
				{"type": 1, "id": "Report9", "time": 300},
				{"type": 1, "id": "Report10", "time": 550},
				{"type": 1, "id": "Report11", "time": 710},
				{"type": 2, "id": "Report12", "time": 800},
				{"type": 2, "id": "Report13", "time": 1190},
				{"type": 2, "id": "Report14", "time": 1340},
				{"type": 2, "id": "Report15", "time": 1610},
				{"type": 2, "id": "Report16", "time": 1870},
				{"type": 2, "id": "Report17", "time": 1910},
				{"type": 2, "id": "Report18", "time": 1925},
				{"type": 3, "id": "Report19", "time": 1990},
				{"type": 3, "id": "Report20", "time": 10},
				{"type": 3, "id": "Report21", "time": 690},
				{"type": 3, "id": "Report22", "time": 920},
				{"type": 3, "id": "Report23", "time": 1390},
				{"type": 3, "id": "Report24 Empire", "time": 1900}
			];

var timeBegin = 0;

var timeEnd = 2000;

var miniRect = {width: 15, height: 10};

var m = [20, 15, 15, 160]; //top right bottom left
var w = 960 - m[1] - m[3];
var h = 500 - m[0] - m[2];
var miniHeight = laneLength * 12 + 50;
var mainHeight = h - miniHeight - 50;

// Up to 10 color categories for 10 types of reports
var reportColor = d3.scaleOrdinal(d3.schemeCategory10);

//scales
var miniX = d3.scaleLinear()
		.domain([timeBegin, timeEnd])
		.range([0, w]);

var miniY = d3.scaleLinear()
		.domain([0, laneLength])
		.range([0, miniHeight]);

var mainX = d3.scaleLinear()
		.range([0, w]);

var mainY = d3.scaleLinear()
		.domain([0, laneLength])
		.range([0, mainHeight]);



var chart = d3.select("#reports-timeline")
			.append("svg")
			.attr("width", w + m[1] + m[3])
			.attr("height", h + m[0] + m[2])
			.attr("class", "chart");

chart.append("defs").append("clipPath")
	.attr("id", "clip")
	.append("rect")
	.attr("width", w)
	.attr("height", mainHeight);

// Main chart for zoom in details
var main = chart.append("g")
			.attr("transform", "translate(" + m[3] + "," + m[0] + ")")
			.attr("width", w)
			.attr("height", mainHeight)
			.attr("class", "main");

// Mini overview chart
var mini = chart.append("g")
			.attr("transform", "translate(" + m[3] + "," + (mainHeight + m[0]) + ")")
			.attr("width", w)
			.attr("height", miniHeight)
			.attr("class", "mini");

//main lanes and texts
main.append("g").selectAll(".laneLines")
	.data(items)
	.enter().append("line")
	.attr("x1", m[1])
	.attr("y1", function(d) {
		return mainY(d.type);
	})
	.attr("x2", w)
	.attr("y2", function(d) {
		return mainY(d.type);
	})
	.attr("stroke", "lightgray")

main.append("g").selectAll(".laneText")
	.data(lanes)
	.enter().append("text")
	.text(function(d) {
		return d;
	})
	.attr("x", -m[1])
	.attr("y", function(d, i) {
		return mainY(i + .5);
	})
	.attr("dy", ".5ex")
	.attr("text-anchor", "end")
	.attr("class", "laneText");

//mini lanes and texts
mini.append("g").selectAll(".laneLines")
	.data(items)
	.enter().append("line")
	.attr("x1", m[1])
	.attr("y1", function(d) {
		return miniY(d.type);
	})
	.attr("x2", w)
	.attr("y2", function(d) {
		return miniY(d.type);
	})
	.attr("stroke", "lightgray");

mini.append("g").selectAll(".laneText")
	.data(lanes)
	.enter().append("text")
	.text(function(d) {
		return d;
	})
	.attr("x", -m[1])
	.attr("y", function(d, i) {
		return miniY(i + .5);
	})
	.attr("dy", ".5ex")
	.attr("text-anchor", "end")
	.attr("class", "laneText");

var itemRects = main.append("g")
					.attr("clip-path", "url(#clip)");

//mini item rects
mini.append("g").selectAll("miniItems")
	.data(items)
	.enter().append("rect")
	.attr("class", function(d) {
		return "miniItem" + d.type;
	})
	.attr("x", function(d) {
		return miniX(d.time);
	})
	.attr("y", function(d) {
		return miniY(d.type + .5) - 5;
	})
	.attr("width", miniRect.width)
	.attr("height", miniRect.height)
	.style("fill", function(d) {
		return reportColor(d.type);
	});

//mini labels
mini.append("g").selectAll(".miniLabels")
	.data(items)
	.enter().append("text")
	.text(function(d) {
		return d.id;
	})
	.attr("x", function(d) {
		return miniX(d.time);
	})
	.attr("y", function(d) {
		return miniY(d.type + .5);
	})
	.attr("dy", ".5ex");

// Creates a new one-dimensional brush along the x-dimension.
var brush = d3.brushX()
                // sets the brushable extent to the specified array of points [[x0, y0], [x1, y1]]
                .extent([[0, 0], [w, miniHeight]])
                // sets the event listener for "brush" type ("start", "brush" or "end") and returns the brush
				.on("brush", showBrushedDetails); 

// Brush overlay
mini.append("g")
	.attr("class", "brush")
	.call(brush)
	.selectAll("rect")
	.attr("y", 1)
	.attr("height", miniHeight - 1);


function showBrushedDetails() {
	/*
		The brush attributes are no longer stored 
		in the brush itself, but rather in the 
		element it is brushing. That's where much of
		the confusion around v4's brushes seems to be.
		The new method is a little difficult to adapt
		to, but seems more efficient. I think much of
		this confusion comes from the fact that 
		brush.extent() still exists, but means
		something completely different.

		Instead of calling brush.extent() to get the 
		range of the brush, call 
		d3.brushSelection(node) on what is being 
		brushed.

		brush.extent()[0] --> d3.brushSelection(this)[0];
		brush.extent()[1] --> d3.brushSelection(this)[1];
	*/
	// For an x-brush, d3.brushSelection(this) is [x0, x1]
	// But this [x0, x1] is the actual selection range, we'll need to 
	// convert it back to the miniX range so we can use it to filter
	// selected items based on item.start, item.end
	var selectionRange = d3.brushSelection(this).map(miniX.invert);
	var minExtent = selectionRange[0];
	var maxExtent = selectionRange[1];
console.log(minExtent + ", " + maxExtent);
    // Filter out the brushed items based on selection
	var brushedItems = items.filter(function(d) {
		return (d.time + miniRect.width) > minExtent && d.time < maxExtent;
	});

    // Set the domain to the specified array of values
	mainX.domain([minExtent, maxExtent]);

	// update main item rects in main area
	var rects = itemRects.selectAll("rect")
	    .data(brushedItems, function(d) { 
	    	return d.id; 
	    })
		.attr("x", function(d) {
			return mainX(d.time);
		})
		.attr("width", function(d) {
			// Need to miniX.invert(miniRect.width)
			return mainX(d.time + miniX.invert(miniRect.width)) - mainX(d.time);
		});
	
	rects.enter().append("rect")
		.attr("class", function(d) {
			return "miniItem" + d.type;
		})
		.attr("x", function(d) {
			return mainX(d.time);
		})
		.attr("y", function(d) {
			return mainY(d.type) + 10;
		})
		.attr("width", function(d) {
			// Need to miniX.invert(miniRect.width)
			return mainX(d.time + miniX.invert(miniRect.width)) - mainX(d.time);
		})
		.attr("height", function(d) {
			// .8 of the mainY height to have some margins between two lanes
			return .8 * mainY(1);
		})
		.style("fill", function(d) {
			return reportColor(d.type);
		});

	rects.exit().remove();

	// update the item labels
	var labels = itemRects.selectAll("text")
		.data(brushedItems, function (d) { 
			return d.id; 
		})
		.attr("x", function(d) {
			return mainX(Math.max(d.time, minExtent) + 2);
		});

	labels.enter().append("text")
		.text(function(d) {
			return d.id;
		})
		.attr("x", function(d) {
			return mainX(Math.max(d.time, minExtent));
		})
		.attr("y", function(d) {
			return mainY(d.type + .5);
		})
		.attr("text-anchor", "start");

	labels.exit().remove();
}

