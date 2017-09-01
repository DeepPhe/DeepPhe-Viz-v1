
// Get cancer summary
function getCancerSummary(patientName) {
	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/patients/' + patientName + '/cancers',
	    method: 'GET', 
	    async : true,
	    dataType : 'html' // Use 'html' instead of 'json' for rendered html content
	});

	jqxhr.done(function(response) {
	    //console.log(response);

	    // Render response
	    $('#cancer').html(response);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get cancer summary");
	});
}

// Get tumor summary
function getTumorSummary(patientName, cancerId) {
	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/patients/' + patientName + '/' + cancerId + '/tumors',
	    method: 'GET', 
	    async : true,
	    dataType : 'html' // Use 'html' instead of 'json' for rendered html content
	});

	jqxhr.done(function(response) {
	    //console.log(response);

	    // Render response
	    $('#tumors').html(response);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get cancer summary");
	});
}

function highlightMentionedTexts(textMentions, reportText) {
    // Sort the textMentions array first based on startOffset
    textMentions.sort(function(a, b) {
        var comp =  a.startOffset - b.startOffset;
        if(comp==0) {
            return b.endOffset - a.endOffset;
        } else {
            return comp;
        }
    });

    var textFragments = [];

    if (textMentions.length === 1){
        var textMention = textMentions[0];

        if (textMention.startOffset == 0) {
            textFragments.push('');
        } else {
            textFragments.push(reportText.substring(0, textMention.startOffset));
        }

        textFragments.push('<span class="highlighted_text">' + reportText.substring(textMention.startOffset, textMention.endOffset) + '</span>');
        textFragments.push(reportText.substring(textMention.endOffset));
    } else {
        var lastValidTMIndex = 0;

        for (var i = 0; i < textMentions.length; i++) {
            var textMention = textMentions[i];
            var lastValidTM = textMentions[lastValidTMIndex];

            // If this is the first textmention, paste the start of the document before the first TM.
            if (i === 0) {
                if (textMention.startOffset == 0) {
                    textFragments.push('');
                } else {
                    textFragments.push(reportText.substring(0, textMention.startOffset));
                }
            } else { // Otherwise, check if this text mention is valid. if it is, paste the text from last valid TM to this one.
                if (textMention.startOffset < lastValidTM.endOffset) {
                        // Push end of the document
                    continue; // Skipping this TM.
                } else{
                    textFragments.push(reportText.substring(lastValidTM.endOffset, textMention.startOffset));
                }
            }

            textFragments.push('<span class="highlighted_text">' + reportText.substring(textMention.startOffset, textMention.endOffset) + '</span>');
            lastValidTMIndex = i;
        }
        // Push end of the document
        textFragments.push(reportText.substring(textMentions[lastValidTMIndex].endOffset));
    }

    // Assemble the final report content with highlighted texts
    var highlightedReportText = '';

    for (var j = 0; j < textFragments.length; j++) {
        highlightedReportText += textFragments[j];
    }

    return highlightedReportText;
}

// Get fact details by ID
function getFact(factId) {
	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/fact/' + factId,
	    method: 'GET', 
	    async : true,
	    dataType : 'json'
	});

	jqxhr.done(function(response) {
	    console.log("Fact response:");
	    console.log(response);

	    // Render response
	    $('#fact').html(response.renderedFact);

	    // Also highlight the report and corresponding text mentions if this fact has text provanences in the report
	    var reportId = response.reportId;
		var textProvenancesArr = response.textProvenancesArr;

		// Is it possible to have multiple associated reports?

		// Highlight report ID in timeline there's text mention
		// and show the highlighted text mentions in report content
		if (reportId !== '') {
		    highlightTimelineReport(reportId)
		    getReport(reportId, textProvenancesArr);
		}
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get fact");
	});
}

// Get report content by ID 
function getReport(reportId, textProvenancesArr) {
	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/reports/' + reportId,
	    method: 'GET', 
	    async : true,
	    dataType : 'text'
	});

	jqxhr.done(function(response) {
        var reportText = response;

        // Also highlight the mentioned texts if there's any
        // used by fact only
        if (textProvenancesArr.length > 0) {
            reportText = highlightMentionedTexts(textProvenancesArr, reportText);
        }

	    // Render response
	    $('#report_content').html(reportText);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get report");
	});
}

// Highlight the selected report circle in timeline
function highlightTimelineReport(reportId) {
    // Remove previous added highlighting classes
    $('.main_report').removeClass("highlighted_report");
    $('.overview_report').removeClass("highlighted_report");

    // Also highlight the circle in both overview and main areas
    $('#main_' + reportId).addClass("highlighted_report");
    $('#overview_' + reportId).addClass("highlighted_report");
}

// Fetch timeline data and render the SVG
function getTimeline(patientName, svgContainerId) {
	// First get the data needed for timeline rendering
	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/patients/' + patientName + '/timeline',
	    method: 'GET', 
	    async : true,
	    dataType : 'json' 
	});

	jqxhr.done(function(response) {
	    renderTimeline(svgContainerId, response.reportTypes, response.reportData);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get timeline data");
	});
}

// Render the timeline to the target SVG container
function renderTimeline(svgContainerId, reportTypes, reportData) {
	//  SVG sizing
	var margin = {top: 20, right: 20, bottom: 100, left: 200};
	var width = 960 - margin.left - margin.right;
	var height = 320 - margin.top - margin.bottom;

	var overviewMargin = {top: 250, right: 20, bottom: 30, left: 200};
	var overviewHeight = 320 - overviewMargin.top - overviewMargin.bottom;

    // https://github.com/d3/d3-time-format#d3-time-format
    var formatTime = d3.timeFormat("%Y-%m-%d %I:%M %p");
    var parseTime = d3.timeParse("%Y-%m-%d %I:%M %p");

	// Convert string to date
	reportData.forEach(function(d) {
		// Initially d.time is returned as a human-readable string from neo4j
		// Format the date to a human-readable string first, it takes date instead of string
		var formattedTimeStr = formatTime(new Date(d.time));
		// Then convert a string back to a date to be used by d3
        d.time = parseTime(formattedTimeStr);
	});

    // Get the index position of target element in the reportTypes array
    // Need this to position the circles in mainY
    var getIndex = function(element) {
    	return reportTypes.indexOf(element);
    };
    
	// Main area and overview area share the same width
	var mainX = d3.scaleTime()
			.range([0, width]);

	var overviewX = d3.scaleTime()
			.range([0, width]);

	// Y scale to handle main area
	var mainY = d3.scaleLinear()
			.domain([0, reportTypes.length])
			.range([0, height]);

	var overviewY = d3.scaleLinear()
			.range([0, overviewHeight]);

	// https://github.com/d3/d3-axis#axisBottom
	var xAxis = d3.axisBottom(mainX).tickSize(10);

	var overviewXAxis = d3.axisBottom(overviewX).tickSize(0);

	var svg = d3.select("#" + svgContainerId).append("svg")
	    .attr("class", "timeline_svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom);

	// Specify a specific region of an element to display, rather than showing the complete area
	svg.append("defs").append("clipPath")
	    .attr("id", "clip")
	    .append("rect")
	    .attr("width", width)
	    .attr("height", height);

	// Function expression to handle mouse wheel zoom or drag on main area
	// Need to define this before defining zoom since it's function expression instead of function declariation
	var zoomed = function() {
		// Ignore zoom-by-brush
		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") {
		    return; 
		}; 

		var transform = d3.event.transform;

		mainX.domain(transform.rescaleX(overviewX).domain());

	    // Update the report dots in main area
		main.selectAll(".main_report")
			.attr("cx", function(d) { 
				return mainX(d.time); 
			})
			.attr("cy", function(d) { 
				return mainY(getIndex(d.type) + .5);
			});

	    // Also update the main x axis
		main.select(".x-axis").call(xAxis);

	    // Update the overview as moving
		overview.select(".brush").call(brush.move, mainX.range().map(transform.invertX, transform));

	    // Also need to update the position of custom brush handles
	    // First we need to get the current brush selection
	    // https://github.com/d3/d3-brush#brushSelection
	    // The node desired in the argument for d3.brushSelection is the g element corresponding to your brush.
		var selection = d3.brushSelection(overviewBrush.node());

		// Then translate the x of each custom brush handle
		showAndMoveCustomBrushHandles(selection);
	};

	// Zoom rect that covers the main main area
	var zoom = d3.zoom()
	    .scaleExtent([1, Infinity])
	    .translateExtent([[0, 0], [width, height]])
	    .extent([[0, 0], [width, height]])
	    .on("zoom", zoomed);

    // Appending zoom rect after the main area will prevent clicking on the report circles/
    // So we need to create the zoom panel first
	svg.append("rect")
		.attr("class", "zoom")
		.attr("width", width)
		.attr("height", height)
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.call(zoom);

	// Main area
	// Create main area after zoom panel, so we can select the report circles
	var main = svg.append("g")
	    .attr("class", "main")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Mini overview
	var overview = svg.append("g")
	    .attr("class", "overview")
	    .attr("transform", "translate(" + overviewMargin.left + "," + overviewMargin.top + ")");

	// Up to 10 color categories for 10 types of reports
	var reportColor = d3.scaleOrdinal(d3.schemeCategory10);

	// The earliest report date
	var xMinDate = d3.min(reportData, function(d) { return d.time; });

	// Set the start date of the x axis 30 days before the xMinDate
	var startDate = new Date(xMinDate);
	startDate.setDate(startDate.getDate() - 30);

	// The latest report date
	var xMaxDate = d3.max(reportData, function(d) { return d.time; });

	// Set the end date of the x axis 30 days after the xMaxDate
	var endDate = new Date(xMaxDate);
	endDate.setDate(endDate.getDate() + 30);

	// Set the mainX domain based on start and end dates
	mainX.domain([startDate, endDate]);

	overviewX.domain(mainX.domain());
	overviewY.domain(mainY.domain());

	// Report dots in main area
	// Reference the clipping path that shows the report dots
	var mainReports = main.append("g")
		.attr("clip-path", "url(#clip)");

	mainReports.selectAll(".main_report")
	    .data(reportData)
	    .enter().append("circle")
	    .attr("id", function(d) {
            // Prefix with "main_"
            return "main_" + d.id;
	    })
	    .attr('class', 'main_report')
	    .attr("r", 6)
	    .attr("cx", function(d) { 
	    	return mainX(d.time); 
	    })
	    .attr("cy", function(d) { 
	    	return mainY(getIndex(d.type)); 
	    })
	    .on("click", function(d) {
            // Highlight the selected report circle
            // d.id has no prefix, just raw id
            highlightTimelineReport(d.id);

            // And show the report content
            // No text mentions array needed in this case
            // so we just pass an empty array
            getReport(d.id, []);
	    });

	main.append("g")
	    .attr("class", "axis x-axis")
	    .attr("transform", "translate(0," + height + ")")
	    .call(xAxis);

	// Report type divider lines
	main.append("g").selectAll(".report_type_devlider")
		.data(reportTypes)
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
	main.append("g").selectAll(".report_type_text")
		.data(reportTypes)
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
	    .text("Patient Timeline (" + reportData.length + " reports)");

	// Report dots in overview area
	// No need to use clipping path since the overview area contains all the report dots
	var overviewReports = overview.append("g").selectAll(".overview_report")
		.data(reportData)
		.enter().append("circle")
		.attr('id', function(d) {
			// Prefix with "overview_"
            return "overview_" + d.id;
		})
		.attr('class', 'overview_report')
		.attr("r", 3)
		.attr("cx", function(d) { 
			return overviewX(d.time); 
		})
		.attr("cy", function(d) { 
			return overviewY(getIndex(d.type) + .5); 
		})
		.style("fill", function(d) {
			return reportColor(d.type);
		});

	// Overview x axis
	overview.append("g")
	    .attr("class", "axis x-axis")
	    .attr("transform", "translate(0," + overviewHeight + ")")
	    .call(overviewXAxis);

	// Add brush to overview
	var overviewBrush = overview.append("g")
	    .attr("class", "brush");

	// Add custom brush handles
	var customBrushHandlesData = [{type: "w"}, {type: "e"}];

	// Function expression to create custom brush handle path
	var createCustomBrushHandle = function(d) {
	    var e = +(d.type == "e"),
	        x = e ? 1 : -1,
	        y = overviewHeight / 2;

	    return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) + "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
	};

	var customBrushHandle = overviewBrush.selectAll(".handle--custom")
	    .data(customBrushHandlesData)
	    .enter().append("path")
	    .attr("class", "handle--custom")
	    .attr("stroke", "#000")
	    .attr("cursor", "ew-resize")
		.attr("d", createCustomBrushHandle);

	// Function expression of updating custom handles positions
	var showAndMoveCustomBrushHandles = function(selection) {
		customBrushHandle
		    // First remove the "display: none" added by brushStart to show the handles
		    .style("display", null)
		    // Then move the handles to desired positions
	        .attr("transform", function(d, i) { 
	        	return "translate(" + [selection[i], -overviewHeight/4] + ")"; 
	        });
	};

    // Hide the custom brush handles on mousedown ( the start of a brush gesture)
    var hideCustomBrushHandles = function() {
        var selection = d3.brushSelection(overviewBrush.node());
        var mousePosition = d3.mouse(this);
        
        // Only hide the brush handles when mouse clicks outside of the selection
        // Don't hide the handles when clicks inside the selected brush area
        if (mousePosition[0] == selection[0] || mousePosition[0] == selection[1]) {
            customBrushHandle
		    	.style("display", "none");
        }
    };

	// Function expression to create brush function redraw with selection
	// Need to define this before defining brush since it's function expression instead of function declariation
	var brushed = function() {
		// Ignore brush-by-zoom
		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") {
			return; 
		}

	    // Can also use d3.event.selection as an alternative to d3.brushSelection(overviewBrush.node())
		var selection = d3.brushSelection(overviewBrush.node());

	    // Update the position of custom brush handles
    	showAndMoveCustomBrushHandles(selection);

	    // Set the domain of the main area based on brush selection
		mainX.domain(selection.map(overviewX.invert, overviewX));

	    // Update main main area
		main.selectAll(".main_report")
			.attr("cx", function(d) { 
				return mainX(d.time); 
			})
			.attr("cy", function(d) { 
				return mainY(getIndex(d.type) + .5); 
			})
			.style("fill", function(d) {
				return reportColor(d.type);
			});

	    // Update the main x axis
		main.select(".x-axis").call(xAxis);

	    // Zoom the main main area
		svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
			.scale(width / (selection[1] - selection[0]))
			.translate(-selection[0], 0));
	};

	// D3 brush
	var brush = d3.brushX()
	    .extent([[0, 0], [width, overviewHeight]])
	    // https://github.com/d3/d3-brush#brush_on
	    // First to hide the custom handles at the start of a brush gesture(mousedown)
	    .on("start", hideCustomBrushHandles)
	    // Then update the UI on brush move
	    .on("brush", brushed);

	// Applying brush on the overviewBrush element
	// Don't merge this with the overviewBrush definition because
	// brush calls brushed which uses customBrushHandle when it gets called and 
	// we can't define overviewBrush before brush if combined.
	overviewBrush
	    // For the first time of loading this page, no brush movement
	    .call(brush)
	    // We use overviewX.range() as the default selection
	    // https://github.com/d3/d3-selection#selection_call
	    // call brush.move and pass overviewX.range() as argument
	    // https://github.com/d3/d3-brush#brush_move
	    .call(brush.move, overviewX.range());

}
