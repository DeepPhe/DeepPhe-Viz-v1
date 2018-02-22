// Global settings
var highlighted_report_icon = {
    offsetX: 5,
    offsetY: 18,
    size: 8
};

function getCancerStages() {
    // Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/cancerstages',
	    method: 'GET', 
	    async : true,
	    dataType : 'html' // Use 'html' instead of 'json' for rendered html content
	});

	jqxhr.done(function(response) {
	    //console.log(response);

	    // Render response
	    $('#cancerstages').html(response);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get cancer stages");
	});
}

// Filter the patients by given cancer stage
// without stage, get all patients
// Must use encodeURIComponent() otherwise may have URI parsing issue
function getCohort(stage) {
	// stage is optional
	// undefined means a variable has been declared but has not yet been assigned a value
	var url = (typeof(stage) === 'undefined') ? '/cohort' : '/cohort/' + encodeURIComponent(stage);

	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + url, 
	    method: 'GET', 
	    async : true,
	    dataType : 'html' // Use 'html' instead of 'json' for rendered html content
	});

	jqxhr.done(function(response) {
	    //console.log(response);

	    // Render response
	    $('#cohort').html(response);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get cohort");
	});
}

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
    var cssClass = "highlighted_term";

    // Sort the textMentions array first based on startOffset
    textMentions.sort(function(a, b) {
        var comp = a.startOffset - b.startOffset;
        if (comp === 0) {
            return b.endOffset - a.endOffset;
        } else {
            return comp;
        }
    });

    var textFragments = [];

    if (textMentions.length === 1) {
        var textMention = textMentions[0];

        if (textMention.startOffset === 0) {
            textFragments.push('');
        } else {
            textFragments.push(reportText.substring(0, textMention.startOffset));
        }

        textFragments.push('<span class="' + cssClass + '">' + reportText.substring(textMention.startOffset, textMention.endOffset) + '</span>');
        textFragments.push(reportText.substring(textMention.endOffset));
    } else {
        var lastValidTMIndex = 0;

        for (var i = 0; i < textMentions.length; i++) {
            var textMention = textMentions[i];
            var lastValidTM = textMentions[lastValidTMIndex];

            // If this is the first textmention, paste the start of the document before the first TM.
            if (i === 0) {
                if (textMention.startOffset === 0) {
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

            textFragments.push('<span class="' + cssClass + '">' + reportText.substring(textMention.startOffset, textMention.endOffset) + '</span>');
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
	    // Fade in the fact detail. Need to hide the div in order to fade in.
	    $('#fact_detail').hide().html(response.renderedFact).fadeIn('slow');

	    // Also highlight the report and corresponding text mentions if this fact has text provanences in the report
	    var reportIds = response.reportIds;
		var textProvenancesArr = response.textProvenancesArr;

		// Highlight report circles in timeline
		if (reportIds.length > 0) {
			// Remove previous added font awesome icons
			$('.fact_directed_report_icon').remove();

			reportIds.forEach(function(id) {
                highlightReportBasedOnFact(id);
			});

			// Also show the content of the first report
			getReport(reportIds[0]);

			// And highlight the current report in timeline
			highlightSelectedTimelineReport(reportIds[0])
		}
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get fact");
	});
}

// Get report content and mentioned terms by ID 
function getReport(reportId) {
	// Separate the ajax request with callbacks
	// Must use encodeURIComponent() otherwise may have URI parsing issue
	var jqxhr = $.ajax({
	    url: baseUri + '/reports/' + reportId ,
	    method: 'GET', 
	    async : true,
	    dataType : 'json'
	});

	jqxhr.done(function(response) {
        var reportText = response.reportText;
        var renderedMentionedTerms = response.renderedMentionedTerms;

        $('#report_id').html('<i class="fas fa-file-alt"></i><span class="display_report_id">' + getShortDocId(reportId) + '</span>');

        // Show rendered mentioned terms
        $('#report_mentioned_terms').html(renderedMentionedTerms);

	    // Show report content, either highlighted or not
	    $('#report_text').html(reportText);
	    // Scroll back to top of the report content div
	    $("#report_text").animate({scrollTop: 0}, "fast");
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get report");
	});
}

// "REPORT_patient10_report051_NOTE_2076902750" -> "Report051_NOTE"
// This utility funtion can also be found in dataProcessor.js
// But we can't reuse it due to the fact of different componments
// Functions in deepphe.js are used by client side
// and functions in dataProcessor.js are used by server side
function getShortDocId(id) {
    var partsArr = id.split('_');
    var str = partsArr[2] + '_' + partsArr[3];
    // Also capitalize the first letter
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Highlight the selected report circle in timeline
function highlightSelectedTimelineReport(reportId) {
    var css = "selected_report";
    // Remove previous added highlighting classes
    $('.main_report').removeClass(css);
    $('.overview_report').removeClass(css);

    // Remove previous added font awesome icon
	$('.selected_report_icon').remove();

    // Highlight the selected circle in both overview and main areas
    $('#main_' + reportId).addClass(css);
    $('#overview_' + reportId).addClass(css);

    // Add the arrow icon to make it more eye-catching
    var circle = d3.select('#main_' + reportId);
    d3.select(circle.node().parentNode).append("foreignObject")
        .attr('class', 'selected_report_icon')
        // Use the unary plus operator (+varname) to convert circle.attr("cx") to number first, 
        // otherwise they'll be concatenated instead
        .attr('x', (+circle.attr("cx")) - highlighted_report_icon.offsetX) 
        .attr('y', (+circle.attr("cy")) + highlighted_report_icon.offsetX)
        .attr('width', highlighted_report_icon.size)
        .attr('height', highlighted_report_icon.size)
        .append("xhtml:body")
        .html('<i class="fas fa-file-alt"></i>');

        console.log(circle.attr("cy") + highlighted_report_icon.offsetY*2);

    // Dim all other reports
    $('.main_report').addClass("dim_out");
    $('.' + css).removeClass("dim_out");
}

// Highlight the selected report circle with font awesome icon in timeline
function highlightReportBasedOnFact(reportId) {
    // Add a font awesome icon next to the current report circle
    // It doesn't work with the "text" element
    // It works with direct use of "i" element but zooming and brushing won't move the icon
    // I finally got it work with "foreignObject"
    var circle = d3.select('#main_' + reportId);
    d3.select(circle.node().parentNode).append("foreignObject")
        .attr('class', 'fact_directed_report_icon')
        .attr('x', (+circle.attr("cx")) - highlighted_report_icon.offsetX)
        .attr('y', (+circle.attr("cy")) - highlighted_report_icon.offsetY)
        .attr('width', highlighted_report_icon.size)
        .attr('height', highlighted_report_icon.size)
        .append("xhtml:body")
        .html('<i class="far fa-file"></i>');
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
	    renderTimeline(svgContainerId, response.reportTypes, response.typeCounts, response.episodes, response.episodeCounts, response.reportData);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get timeline data");
	});
}

// Render the timeline to the target SVG container
function renderTimeline(svgContainerId, reportTypes, typeCounts, episodes, episodeCounts, reportData) {
	//  SVG sizing, use numOfReportTypes to determine the height of main area
	var numOfReportTypes = Object.keys(typeCounts).length;
	var margin = {top: 20, right: 20, bottom: 10, left: 180};
	var legendHeight = 22;
	var width = 660;
	var height = 40*numOfReportTypes;
    var pad = 30;
	var overviewHeight = 10*numOfReportTypes;

    var reportMainRadius = 6;
    var reportOverviewRadius = 3;

    // Set the timeline start date 10 days before the min date
    // and end date 10 days after the max date
    var numOfDays = 10;

    // Gap between texts and mian area left border
    var textMargin = 10;

    // https://github.com/d3/d3-time-format#d3-time-format
    var formatTime = d3.timeFormat("%Y-%m-%d %I:%M %p");
    var parseTime = d3.timeParse("%Y-%m-%d %I:%M %p");

	// Convert string to date
	reportData.forEach(function(d) {
		// Format the date to a human-readable string first, formatTime() takes Date object instead of string
		// d.time.slice(0, 19) returns the time string without the time zone part.
		// E.g., "11/28/2012 01:00 AM" from "11/28/2012 01:00 AM AST"
		var formattedTimeStr = formatTime(new Date(d.time.slice(0, 19)));
		// Then convert a string back to a date to be used by d3
        d.time = parseTime(formattedTimeStr);
	});

    // Get the index position of target element in the reportTypes array
    // Need this to position the circles in mainY
    var getIndex = function(element) {
    	return reportTypes.indexOf(element);
    };
    
    // Up to 10 color categories for 10 types of reports
	var reportColor = d3.scaleOrdinal(d3.schemeCategory10);

	// Main area and overview area share the same width
	var mainX = d3.scaleTime()
			.range([0, width]);

	var overviewX = d3.scaleTime()
			.range([0, width]);

	// Y scale to handle main area
	var mainY = d3.scaleLinear()
			.domain([0, reportTypes.length])
			.range([0, height]);

    // Y scale to handle overview area
	var overviewY = d3.scaleLinear()
			.range([0, overviewHeight]);

    // SVG
	var svg = d3.select("#" + svgContainerId).append("svg")
	    .attr("class", "timeline_svg")
	    .attr("width", margin.left + width + margin.right)
	    .attr("height", margin.top + legendHeight + height + pad + overviewHeight + pad + margin.bottom);

    // Episode legend
    var legendRectSize = 10;
    var legendSpacing = 2;
    var widthPerLetter = 10;
    
    // Dynamically calculate the x posiiton of each lengend rect
    var lengendX = function(index) {
    	var x = 0;

    	for (var i = 0; i < index; i++) {
            x += episodes[i].length * widthPerLetter + i * (legendRectSize + legendSpacing);
    	}

    	return x;
    };

    var episodeLegendGrp = svg.append("g")
        .attr('class', 'episode_legend_group')
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Overview label text
	episodeLegendGrp.append("text")
	    .attr("x", -textMargin)
	    .attr("y", 6) // Relative to the overview area
	    .attr("dy", ".5ex")
	    .attr("class", "overview_label")
	    .text("Episodes:");

    // Divider line
    episodeLegendGrp.append("line")
		.attr("x1", 0)
		.attr("y1", legendHeight)
		.attr("x2", width)
		.attr("y2", legendHeight)
		.attr("class", "legend_group_divider");

    var legend = episodeLegendGrp.selectAll('.episode_legend')
        .data(episodes)
        .enter()
        .append('g')
        .attr('class', 'episode_legend');

    legend.append('rect')
        .attr('x', function(d, i) {
            return lengendX(i);
        })
        .attr('y', 1)
        .attr('width', legendRectSize)
        .attr('height', legendRectSize)
        .style('fill', function(d) {
            return reportColor(d);
        });

    // Legend label text
    legend.append('text')
        .attr('x', function(d, i) {
            return legendRectSize + legendSpacing + lengendX(i);
        })
        .attr('y', 10)
        .text(function(d) { 
            return d + " (" + episodeCounts[d] + ")"; 
        });

	// Specify a specific region of an element to display, rather than showing the complete area
	svg.append("defs").append("clipPath")
	    .attr("id", "clip")
	    .append("rect")
	    .attr("width", width)
	    .attr("height", height);

    var updateMainArea = function() {
    	// Update main area
		main.selectAll(".main_report")
			.attr("cx", function(d) { 
				return mainX(d.time); 
			})
			.attr("cy", function(d) { 
				return mainY(getIndex(d.type) + .5); 
			})
			.style("fill", function(d) {
				return reportColor(d.episode);
			});

        // Also need to move the font awesome icons accordlingly
        main.selectAll(".fact_directed_report_icon")
			.attr("x", function(d) { 
				return mainX(d.time) - highlighted_report_icon.offsetX; 
			})
			.attr("y", function(d) { 
				return mainY(getIndex(d.type) + .5) - highlighted_report_icon.offsetY;
			});

        main.selectAll(".selected_report_icon")
			.attr("x", function(d) { 
				return mainX(d.time) - highlighted_report_icon.offsetX; 
			})
			.attr("y", function(d) { 
				return mainY(getIndex(d.type) + .5) + highlighted_report_icon.offsetX; // Use offsetX
			});

	    // Update the main x axis
		main.select(".x-axis").call(xAxis);
    };

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
		updateMainArea();

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
		.attr("transform", "translate(" + margin.left + "," + (margin.top + legendHeight) + ")")
		.call(zoom);

	// Main area
	// Create main area after zoom panel, so we can select the report circles
	var main = svg.append("g")
	    .attr("class", "main")
	    .attr("transform", "translate(" + margin.left + "," + (margin.top + legendHeight) + ")");

	// Mini overview
	var overview = svg.append("g")
	    .attr("class", "overview")
	    .attr("transform", "translate(" + margin.left + "," + (margin.top + legendHeight + height + pad) + ")");

	// The earliest report date
	var xMinDate = d3.min(reportData, function(d) { return d.time; });

	// Set the start date of the x axis 10 days before the xMinDate
	var startDate = new Date(xMinDate);
	startDate.setDate(startDate.getDate() - numOfDays);

	// The latest report date
	var xMaxDate = d3.max(reportData, function(d) { return d.time; });

	// Set the end date of the x axis 10 days after the xMaxDate
	var endDate = new Date(xMaxDate);
	endDate.setDate(endDate.getDate() + numOfDays);

	// Set the mainX domain based on start and end dates
	mainX.domain([startDate, endDate]);

	overviewX.domain(mainX.domain());
	overviewY.domain(mainY.domain());

	// Report dots in main area
	// Reference the clipping path that shows the report dots
	var mainReports = main.append("g")
		.attr("clip-path", "url(#clip)");

    // Report circles in main area
	mainReports.selectAll(".main_report")
	    .data(reportData)
	    .enter().append("g")
	    .append("circle")
	    .attr('class', 'main_report')
	    .attr("id", function(d) {
            // Prefix with "main_"
            return "main_" + d.id;
	    })
	    .attr("r", reportMainRadius)
	    .attr("cx", function(d) { 
	    	return mainX(d.time); 
	    })
	    .attr("cy", function(d) { 
	    	return mainY(getIndex(d.type) + .5); 
	    })
	    .style("fill", function(d) {
			return reportColor(d.episode);
		})
	    .on("click", function(d) {
            // Highlight the selected report circle
            // d.id has no prefix, just raw id
            highlightSelectedTimelineReport(d.id);

            // And show the report content
            getReport(d.id);
	    });

    // Main area x axis
    // https://github.com/d3/d3-axis#axisBottom
	var xAxis = d3.axisBottom(mainX)
	    // https://github.com/d3/d3-axis#axis_tickSizeInner
	    .tickSizeInner(5)
	    .tickSizeOuter(0);

	// Append x axis to the bottom of main area
	main.append("g")
	    .attr("class", "x-axis")
	    .attr("transform", "translate(0," + height + ")")
	    .call(xAxis);

	// Report type divider lines
	main.append("g").selectAll(".report_type_divider")
	    // Don't create line for the first type
		.data(reportTypes.slice(1, reportTypes.length))
		.enter().append("line")
		.attr("x1", 0) // relative to main area
		.attr("y1", function(d, i) {
			return mainY(i + 1);
		})
		.attr("x2", width)
		.attr("y2", function(d, i) {
			return mainY(i + 1);
		})
		.attr("class", "report_type_divider");

	// Report types texts
	main.append("g").selectAll(".report_type_label")
		.data(reportTypes)
		.enter().append("text")
		.text(function(d) {
			return d + " (" + typeCounts[d] + "):";
		})
		.attr("x", -textMargin) // textMargin on the left of main area
		.attr("y", function(d, i) {
			return mainY(i + .5);
		})
		.attr("dy", ".5ex")
		.attr("class", "report_type_label");

	// Overview label text
	overview.append("text")
	    .attr("x", -textMargin)
	    .attr("y", overviewHeight/2) // Relative to the overview area
	    .attr("dy", ".5ex")
	    .attr("class", "overview_label")
	    .text("Timeline (" + reportData.length + " reports)");

	// Report dots in overview area
	// No need to use clipping path since the overview area contains all the report dots
	overview.append("g").selectAll(".overview_report")
		.data(reportData)
		.enter().append("g").append("circle")
		.attr('id', function(d) {
			// Prefix with "overview_"
            return "overview_" + d.id;
		})
		.attr('class', 'overview_report')
		.attr("r", reportOverviewRadius)
		.attr("cx", function(d) { 
			return overviewX(d.time); 
		})
		.attr("cy", function(d) { 
			return overviewY(getIndex(d.type) + .5); 
		})
		.style("fill", function(d) {
			return reportColor(d.episode);
		});

	// Overview x axis
	var overviewXAxis = d3.axisBottom(overviewX)
	    .tickSizeInner(5)
	    .tickSizeOuter(0);

	// Append x axis to the bottom of overview area
	overview.append("g")
	    .attr("class", "x-axis")
	    .attr("transform", "translate(0, " + overviewHeight + ")")
	    .call(overviewXAxis);

	// Add brush to overview
	var overviewBrush = overview.append("g")
	    .attr("class", "brush");

	// Add custom brush handles
	var customBrushHandlesData = [{type: "w"}, {type: "e"}];

	// Function expression to create custom brush handle path
	var createCustomBrushHandle = function(d) {
	    var e = +(d.type === "e"),
	        x = e ? 1 : -1,
	        y = overviewHeight / 2;

	    return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) + "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
	};

    // Add two custom brush handles
	var customBrushHandle = overviewBrush.selectAll(".handle--custom")
	    .data(customBrushHandlesData)
	    .enter().append("path")
	    .attr("class", "handle--custom")
	    .attr("stroke", "#000")
	    .attr("cursor", "ew-resize")
		.attr("d", createCustomBrushHandle)
		.attr("transform", function(d, i) { 
        	// Position the custom handles based on the default selection range
        	var selection = [0, width];
        	return "translate(" + [selection[i], -overviewHeight/4] + ")"; 
        });

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
        // Check if an user event exists
        // Otherwise we'll see the following error in firefox:
        // TypeError: Value being assigned to SVGPoint.x is not a finite floating-point value.
        // Because itss not supported to call d3.mouse when there is not a current user event.
        if (d3.event.sourceEvent) {
        	var selection = d3.brushSelection(overviewBrush.node());
        	var mousePosition = d3.mouse(this);
	        
	        // Only hide the brush handles when mouse clicks outside of the selection
	        // Don't hide the handles when clicks inside the selected brush area
	        if (mousePosition[0] === selection[0] || mousePosition[0] === selection[1]) {
	            customBrushHandle
			    	.style("display", "none");
	        }
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

	    updateMainArea();

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
