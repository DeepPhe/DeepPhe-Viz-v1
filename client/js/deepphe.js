// Global settings
var factBasedReports = [];

// Add birthdays to all patient nodes
function addBirthdays() {
    // Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/generateBirthday',
	    method: 'GET', 
	    async : true,
	    dataType : 'json'
	});

	jqxhr.done(function(response) {
        var patients = response.patients;

        patients.forEach(function(patient) {
            addBirthday(patient.name, patient.birthday)
        });
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't add patient birthdays");
	});
}

// Add birthday to the specified patient
function addBirthday(patientName, birthday) {
    // Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/addBirthday/' + encodeURIComponent(patientName) + "/" + encodeURIComponent(birthday),
	    method: 'GET', 
	    async : true,
	    dataType : 'text'
	});

	jqxhr.done(function(response) {
        console.log(response);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't add patient birthday");
	});
}

function getCancerStages() {
    // Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/cancerStages',
	    method: 'GET', 
	    async : true,
	    dataType : 'json'
	});

	jqxhr.done(function(response) {
        // Draw the bar chart
        showStagesChart("stages", response.stagesInfo);

	    // Show all patients by default
        showPatients();
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get cancer stages");
	});
}

function showStagesChart(svgContainerId, data) {
	// set the dimensions and margins of the graph
	var margin = {top: 20, right: 20, bottom: 30, left: 140};
	var width = 600 - margin.left - margin.right;
	var height = 240 - margin.top - margin.bottom;

	// set the ranges
	var x = d3.scaleLinear()
	    .range([0, width]);
	    
	var y = d3.scaleBand()
		.range([0, height]) // top to bottom: stages by patients count in ascending order 
		.padding(0.2); // blank space between bands
		
	var svg = d3.select("#" + svgContainerId).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Scale the range of the data in the domains
	x.domain([0, d3.max(data, function(d) { 
		return d.patientsCount; 
	})]);

	y.domain(data.map(function(d) { 
		return d.stage; 
	}));

	// append the rectangles for the bar chart
	svg.selectAll(".bar")
		.data(data)
		.enter().append("rect")
		.attr("class", "bar")
		.attr("x", 0)
		.attr("y", function(d) { 
			return y(d.stage); 
		})
		.on("mouseover", function(d) {
            d3.select(this)           
            .style("stroke", "rgb(82, 84, 163)")
            .style("stroke-width", 1);
		})
		.on("mouseout", function(d) {
            d3.select(this)           
            .style("stroke", "")
            .style("stroke-width", 0);
		})
		// Must add the clickable before transition
		.on("click", function(d) {
            var clickedStage = d3.select(this);
            var css = "clicked_stage";

            // Toggle
            if (!clickedStage.classed(css)) {
            	// Remove previouly added css class
	            d3.selectAll(".bar").classed(css, false);
                // Highlight the clicked bar and show corresponding patients
            	clickedStage.classed(css, true);
            	showPatients(d.stage);
            } else {
            	// When clicked again, remove highlight and show all patients
            	clickedStage.classed(css, false);
            	showPatients();
            }
		})
		.transition()
        .duration(800) // time in ms
		.attr("width", function(d) { 
			return x(d.patientsCount)
		})
		.attr("height", y.bandwidth());
		
	// add the x Axis
	svg.append("g")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(x));

	// add the y Axis
	svg.append("g")
		.call(d3.axisLeft(y));
}


function showAgesChart(svgContainerId, data) {
	// set the dimensions and margins of the graph
	var margin = {top: 20, right: 20, bottom: 60, left: 140};
	var width = 600 - margin.left - margin.right;
	var height = 240 - margin.top - margin.bottom;
    
    var xDomain = [];
    
    data.forEach(function(d) {
    	xDomain.push(d.name);
    });

	// set the ranges
	var x = d3.scalePoint()
	    .range([10, width])
	    .domain(xDomain);
	    
	var y = d3.scaleLinear()
		.range([height, 0])
		.domain([10, 80]); // 10 years to 80 years old
		
	// Empty the container each time
    var container = d3.select("#" + svgContainerId);
    container.html("");

	var svg = container.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// append the rectangles for the bar chart
	svg.selectAll(".patient")
		.data(data)
		.enter().append("circle")
		.attr("class", "patient")
		.attr("cx", function(d, i) {
            return x(d.name);
		})
		.attr("cy", function(d) { 
            return y(d.age);
		})
		.attr("r", 4)
		.attr("fill", "#1e88e5");
		
	// add the x Axis
	svg.append("g")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(x))
		.selectAll("text")	
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");

	// add the y Axis
	svg.append("g")
		.call(d3.axisLeft(y));
}


// Filter the patients by given cancer stage
// without stage, get all patients
// Must use encodeURIComponent() otherwise may have URI parsing issue
function showPatients(stage) {
	// stage is optional
	// undefined means a variable has been declared but has not yet been assigned a value
	var url = (typeof(stage) === 'undefined') ? '/patients' : '/patients/' + encodeURIComponent(stage);

	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + url, 
	    method: 'GET', 
	    async : true,
	    dataType : 'json'
	});

	jqxhr.done(function(response) {
	    //console.log(response);

	    // Show bar chart of patient age distribution
	    showAgesChart("ages", response.patients);

	    // Render response
	    $('#patients').html(response.renderedPatientsList);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get target patients");
	});
}

// Show patient info
function getPatientInfo(patientName) {
	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/patient/' + patientName + '/info',
	    method: 'GET', 
	    async : true,
	    dataType : 'html' // Use 'html' instead of 'json' for rendered html content
	});

	jqxhr.done(function(response) {
	    //console.log(response);

	    // Render response
	    $('#info').html(response);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get pateint info");
	});
}

// Get cancer summary
function getCancerSummary(patientName) {
	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/patient/' + patientName + '/cancers',
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
	    url: baseUri + '/patient/' + patientName + '/' + cancerId + '/tumors',
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
// We need patientId because sometimes a fact may have matching TextMention nodes from different paitents
function getFact(patientId, factId) {
	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/fact/' + patientId + '/' + factId,
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
			// Add to the global factBasedReports array for later use
            factBasedReports = reportIds;

			// Remove the previouly fact-based highlighting
			$('.main_report').removeClass("fact_highlighted_report");

			reportIds.forEach(function(id) {
				// Set fill-opacity to 1
                highlightReportBasedOnFact(id);
			});

			// Also show the content of the first report
			// The reportIds is sorted
			getReport(reportIds[0]);

			// And highlight the current displaying report circle with a thicker stroke
			highlightSelectedTimelineReport(reportIds[0])
		}
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get fact");
	});
}

function removeFactBasedHighlighting(reportId) {
	$('.fact').removeClass("highlighted_fact");
    $('.main_report').removeClass("fact_highlighted_report");
    // Also remove the fact detail
    $('#fact_detail').hide().html("").fadeIn('slow');
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

        // If there are fact based reports, highlight the displaying one
        var cssClass = 'current_displaying_report';
        $('.fact_based_report_id').removeClass(cssClass);
        $('#' + reportId).addClass(cssClass);

        $('#report_id').html('<i class="far fa-file"></i><span class="display_report_id ' + cssClass + '">' + getShortDocId(reportId) + '</span>');

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
    // Remove previous added highlighting classes
    var css = "selected_report";
    $('.main_report').removeClass(css);
    $('.overview_report').removeClass(css);

    // Remove previous added font awesome icon
	$('.selected_report_icon').remove();

    // Highlight the selected circle in both overview and main areas
    $('#main_' + reportId).addClass(css);
    $('#overview_' + reportId).addClass(css);
}

// Highlight the selected report circle 
function highlightReportBasedOnFact(reportId) {
    d3.select('#main_' + reportId).classed("fact_highlighted_report", true);
}

// Fetch timeline data and render the SVG
function getTimeline(patientName, svgContainerId) {
	// First get the data needed for timeline rendering
	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/patient/' + patientName + '/timeline',
	    method: 'GET', 
	    async : true,
	    dataType : 'json' 
	});

	jqxhr.done(function(response) {
	    renderTimeline(svgContainerId, response.reportTypes, response.typeCounts, response.maxVerticalCountsPerType, response.episodes, response.episodeCounts, response.episodeDates, response.reportData, response.reportsGroupedByDateAndTypeObj);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get timeline data");
	});
}

// Render the timeline to the target SVG container
function renderTimeline(svgContainerId, reportTypes, typeCounts, maxVerticalCountsPerType, episodes, episodeCounts, episodeDates, reportData, reportsGroupedByDateAndTypeObj) {
    // Vertical count position of each report type
    // E.g., "Progress Note" has max 6 vertical reports, "Surgical Pathology Report" has 3
    // then the vertical position of "Progress Note" bottom line is 6, and "Surgical Pathology Report" is 6+3=9
    var verticalPositions = {};
    // Vertical max counts from top to bottom
    // This is used to decide the domain range of mainY and overviewY
    var totalMaxVerticalCounts = 0;
	Object.keys(maxVerticalCountsPerType).forEach(function(key) {
        totalMaxVerticalCounts += maxVerticalCountsPerType[key];
        if (typeof verticalPositions[key] === 'undefined') {
        	verticalPositions[key] = totalMaxVerticalCounts;
        }
    });

	var margin = {top: 20, right: 20, bottom: 10, left: 170};
	var mainReportTypeRowHeightPerCount = 14;
	var overviewReportTypeRowHeightPerCount = 3;

	var legendHeight = 22;
    var legendSpacing = 2;
    var widthPerLetter = 12;

	var episodeAreaHeight = 20;
	var episodeLegendAnchorPositionX = 100;
	var episodeLegendAnchorPositionY = 6;
	var episodeBarHeight = 2;
	var episodeBarY1 = 10;
	var episodeBarY2 = 13;

	var width = 660;
	// Dynamic height based on vertical counts
	var height = totalMaxVerticalCounts * mainReportTypeRowHeightPerCount;

    var pad = 30;
    // Dynamic height based on vertical counts
	var overviewHeight = totalMaxVerticalCounts * overviewReportTypeRowHeightPerCount;

    var reportMainRadius = 5;
    var reportOverviewRadius = 1.5;

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
		// d.origTime.slice(0, 19) returns the time string without the time zone part.
		// E.g., "11/28/2012 01:00 AM" from "11/28/2012 01:00 AM AST"
		var formattedTimeStr = formatTime(new Date(d.origTime.slice(0, 19)));
		// Then convert a string back to a date to be used by d3
        d.formattedTime = parseTime(formattedTimeStr);
	});

    // Get the index position of target element in the reportTypes array
    // Need this to position the circles in mainY
    var getIndex = function(element) {
    	return reportTypes.indexOf(element);
    };
    
    // Color categories for types of episodes
    // https://bl.ocks.org/pstuffa/3393ff2711a53975040077b7453781a9
	var color = d3.scaleOrdinal()
	        .domain(['PreDiagnostics', 'Diagnostic', 'Decision', 'Treatment', 'Follow-up'])
	        .range(['rgb(49, 130, 189)', 'rgb(230, 85, 13)', 'rgb(49, 163, 84)', 'rgb(140, 86, 75)', 'rgb(117, 107, 177)']);

	// Main area and overview area share the same width
	var mainX = d3.scaleTime()
			.range([0, width]);

	var overviewX = d3.scaleTime()
			.range([0, width]);

	// Y scale to handle main area
	var mainY = d3.scaleLinear()
			.domain([0, totalMaxVerticalCounts])
			.range([0, height]);

    // Y scale to handle overview area
	var overviewY = d3.scaleLinear()
	        .domain([0, totalMaxVerticalCounts])
			.range([0, overviewHeight]);

    // Process episode dates
    var episodeSpansData = [];

    episodes.forEach(function(episode) {
    	var obj = {};
    	var datesArr = episodeDates[episode];
        var newDatesArr = [];

    	datesArr.forEach(function(d) {
			// Format the date to a human-readable string first, formatTime() takes Date object instead of string
			// d.slice(0, 19) returns the time string without the time zone part.
			// E.g., "11/28/2012 01:00 AM" from "11/28/2012 01:00 AM AST"
			var formattedTimeStr = formatTime(new Date(d.slice(0, 19)));
			// Then convert a string back to a date to be used by d3
	        var date = parseTime(formattedTimeStr);

	        newDatesArr.push(date);
		});

		var minDate = d3.min(newDatesArr, function(d) {return d;});
    	var maxDate = d3.max(newDatesArr, function(d) {return d;});

        // Assemble the obj properties
        obj.episode = episode;
        obj.startDate = minDate;
        obj.endDate = maxDate;

        episodeSpansData.push(obj);
    });

    // SVG
	var svg = d3.select("#" + svgContainerId).append("svg")
	    .attr("class", "timeline_svg")
	    .attr("width", margin.left + width + margin.right)
	    .attr("height", margin.top + legendHeight + episodeAreaHeight + height + pad + overviewHeight + pad + margin.bottom);

    // Dynamically calculate the x posiiton of each lengend rect
    var lengendX = function(index) {
    	var x = 10;

    	for (var i = 0; i < index; i++) {
            x += episodes[i].length * widthPerLetter + i * (reportMainRadius*2 + legendSpacing);
    	}

    	return episodeLegendAnchorPositionX + legendSpacing + x;
    };

    var episodeLegendGrp = svg.append("g")
        .attr('class', 'episode_legend_group')
	    .attr("transform", "translate(10, " + margin.top + ")");

    // Overview label text
	episodeLegendGrp.append("text")
	    .attr("x", episodeLegendAnchorPositionX) // Relative to episodeLegendGrp
	    .attr("y", episodeLegendAnchorPositionY) 
	    .attr("dy", ".5ex")
	    .attr('class', 'legend_text')
	    .attr("text-anchor", "end") // the end of the text string is at the initial current text position
	    .text("Episodes:");

    // Divider line
    episodeLegendGrp.append("line")
		.attr("x1", 0)
		.attr("y1", legendHeight)
		.attr("x2", margin.left + width)
		.attr("y2", legendHeight)
		.attr("class", "legend_group_divider");

    var legend = episodeLegendGrp.selectAll('.episode_legend')
        .data(episodes)
        .enter()
        .append('g')
        .attr('class', 'episode_legend');

    legend.append('circle')
        .attr("class", "episode_legend_circle")
        .attr("id", function(d) {
            return d;
        })
        .attr('cx', function(d, i) {
            return lengendX(i);
        })
        .attr('cy', 6)
        .attr('r', reportMainRadius)
        .style('fill', function(d) {
            return color(d);
        })
        .style('stroke', function(d) {
            return color(d);
        })
        .on("click", function(d) {
            // Toggle (hide/show reports of the clicked episode)
            var nodes = d3.selectAll("." + d);
            nodes.each(function() {
            	var node = d3.select(this);
                node.classed("hide", !node.classed("hide"));
            });

            // Also toggle the episode legend look
            var legendRect = d3.select(this);
            legendRect.classed("selected_episode_legend", !legendRect.classed("selected_episode_legend"));
        });

    // Legend label text
    legend.append('text')
        .attr('x', function(d, i) {
            return reportMainRadius*2 + legendSpacing + lengendX(i);
        })
        .attr('y', 10)
        .attr('class', 'legend_text')
        .text(function(d) { 
            return d + " (" + episodeCounts[d] + ")"; 
        });



	// Specify a specific region of an element to display, rather than showing the complete area
	// Any parts of the drawing that lie outside of the region bounded by the currently active clipping path are not drawn.
	svg.append("defs").append("clipPath")
	    .attr("id", "episode_area_clip")
	    .append("rect")
	    .attr("width", width)
	    .attr("height", episodeAreaHeight);

	svg.append("defs").append("clipPath")
	    .attr("id", "main_area_clip")
	    .append("rect")
	    .attr("width", width)
	    .attr("height", height);

    var update = function() {
    	// Update the episode bars
    	episodes.selectAll(".episode_bar")
	        .attr("x", function(d) { 
				return mainX(d.startDate) - reportMainRadius; 
			})
	        .attr('width', function(d) {
	            return mainX(d.endDate) - mainX(d.startDate) + reportMainRadius*2;
	        });

    	// Update main area
		main.selectAll(".main_report")
			.attr("cx", function(d) { 
				return mainX(d.formattedTime); 
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
		update();

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
	    .translateExtent([[0, 0], [width, height + episodeAreaHeight]])
	    .extent([[0, 0], [width, height + episodeAreaHeight]])
	    .on("zoom", zoomed);

    // Appending zoom rect after the main area will prevent clicking on the report circles/
    // So we need to create the zoom panel first
	svg.append("rect")
		.attr("class", "zoom")
		.attr("width", width)
		.attr("height", height + episodeAreaHeight)
		.attr("transform", "translate(" + margin.left + "," + (margin.top + + episodeAreaHeight) + ")")
		.call(zoom);

	// Main area
	// Create main area after zoom panel, so we can select the report circles
	var main = svg.append("g")
	    .attr("class", "main")
	    .attr("transform", "translate(" + margin.left + "," + (margin.top + legendHeight + episodeAreaHeight) + ")");

	// Mini overview
	var overview = svg.append("g")
	    .attr("class", "overview")
	    .attr("transform", "translate(" + margin.left + "," + (margin.top + legendHeight + episodeAreaHeight + height + pad) + ")");

	// The earliest report date
	var xMinDate = d3.min(reportData, function(d) {return d.formattedTime;});

	// Set the start date of the x axis 10 days before the xMinDate
	var startDate = new Date(xMinDate);
	startDate.setDate(startDate.getDate() - numOfDays);

	// The latest report date
	var xMaxDate = d3.max(reportData, function(d) {return d.formattedTime;});

	// Set the end date of the x axis 10 days after the xMaxDate
	var endDate = new Date(xMaxDate);
	endDate.setDate(endDate.getDate() + numOfDays);

	// Set the mainX domain based on start and end dates
	mainX.domain([startDate, endDate]);

	overviewX.domain(mainX.domain());
	overviewY.domain(mainY.domain());


    // Episode interval spans
    var episodes = svg.append("g")
        .attr('class', 'episodes')
	    .attr("transform", "translate(" + margin.left + "," + (margin.top + legendHeight) +  ")");

    var episodeBarsGrp = episodes.append('g')
        .attr("clip-path", "url(#episode_area_clip)")
        .attr('class', 'episode_bars');

    var episodeBarGrp = episodeBarsGrp.selectAll('.episode_bar_group')
        .data(episodeSpansData)
        .enter()
        .append('g')
        .attr('class', 'episode_bar_group');

    episodeBarGrp.append('rect')
        .attr('class', 'episode_bar')
        .attr("x", function(d) { 
			return mainX(d.startDate) - reportMainRadius; 
		})
        .attr('y', function(d, i) {
        	// Stagger the bars
        	if (i % 2 === 0) {
                return episodeBarY1;
        	} else {
        		return episodeBarY2;
        	}
        })
        .attr('width', function(d) {
            return mainX(d.endDate) - mainX(d.startDate) + reportMainRadius*2;
        })
        .attr('height', episodeBarHeight)
        .style('fill', function(d) {
            return color(d.episode);
        });

    // Mian report type divider lines
    // Put this before rendering the report dots so the enlarged dot on hover will cover the divider line
	main.append("g").selectAll(".report_type_divider")
	    // Don't create line for the first type
		.data(reportTypes)
		.enter().append("line")
		.attr("x1", 0) // relative to main area
		.attr("y1", function(d) {
			return mainY(verticalPositions[d]);
		})
		.attr("x2", width)
		.attr("y2", function(d) {
			return mainY(verticalPositions[d]);
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
			return mainY(verticalPositions[d] - maxVerticalCountsPerType[d]/2);
		})
		.attr("dy", ".5ex")
		.attr("class", "report_type_label");


	// Report dots in main area
	// Reference the clipping path that shows the report dots
	var mainReports = main.append("g")
		.attr("clip-path", "url(#main_area_clip)");

    // Report circles in main area
	mainReports.selectAll(".main_report")
	    .data(reportData)
	    .enter().append("g")
	    .append("circle")
	    .attr('class', function(d) {
	    	return 'main_report ' + d.episode;
	    })
	    .attr("id", function(d) {
            // Prefix with "main_"
            return "main_" + d.id;
	    })
	    .attr("data-episode", function(d) {
            // For debugging
            return d.episode;
	    })
	    .attr("r", reportMainRadius)
	    .attr("cx", function(d) { 
	    	return mainX(d.formattedTime); 
	    })
	    // Vertically spread the dots with same time
	    .attr("cy", function(d) { 
            var arr = reportsGroupedByDateAndTypeObj[d.date][d.type];

            if (arr.length > 1) {
                var index = 0;
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i].id === d.id) {
                        index = i;
                        break;
                    }
                }
                
                // The height of per chunk 
                var h = maxVerticalCountsPerType[d.type] * mainReportTypeRowHeightPerCount / arr.length;
                return mainY(verticalPositions[d.type]) - ((arr.length - (index + 1)) * h + h/2); 
            } else {
            	// Vertically center the dot if only one
            	return mainY(verticalPositions[d.type]) - mainReportTypeRowHeightPerCount * maxVerticalCountsPerType[d.type] / 2; 
            }
	    })
	    .style("fill", function(d) {
			return color(d.episode);
		})
		.style("stroke", function(d) {
			return color(d.episode);
		})
	    .on("click", function(d) {
            // Check to see if this report is one of the fact-based reports that are being highlighted
            // d.id has no prefix, just raw id
            if (factBasedReports.indexOf(d.id) === -1) {
                // Remove the fact related highlighting
                removeFactBasedHighlighting(d.id);
            }

            // Highlight the selected report circle with solid fill and thicker stroke
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
			return overviewX(d.formattedTime); 
		})
		.attr("cy", function(d) { 
            var arr = reportsGroupedByDateAndTypeObj[d.date][d.type];

            if (arr.length > 1) {
                var index = 0;
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i].id === d.id) {
                        index = i;
                        break;
                    }
                }
                
                // The height of per chunk
                var h = maxVerticalCountsPerType[d.type] * overviewReportTypeRowHeightPerCount / arr.length;
                return overviewY(verticalPositions[d.type]) - ((arr.length - (index + 1)) * h + h/2);  
            } else {
            	// Vertically center the dot if only one
            	return overviewY(verticalPositions[d.type]) - overviewReportTypeRowHeightPerCount * maxVerticalCountsPerType[d.type] / 2; 
            }
	    })
		.style("fill", function(d) {
			return color(d.episode);
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

	    update();

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

	// Reset button
	svg.append("foreignObject")
	    .attr('id', 'reset')
	    .attr("transform", "translate(10, " + (margin.top + + legendHeight + height + overviewHeight + pad*2) + ")")
	    .append("xhtml:body")
        .html('<button>Reset</button>');

}
