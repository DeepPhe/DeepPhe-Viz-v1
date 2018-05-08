// Global settings
var factBasedReports = [];

function getPatientEncounterAge(encounterDateObj, birthday) {
	// encounterDateObj is Date object while birthday is a string
    var ageDiffMs = encounterDateObj.getTime() - new Date(birthday).getTime();
    var ageDate = new Date(ageDiffMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
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
	var patientsCounts = {};

	// Calculate and add the box plot data to each stageInfo object
	data.forEach(function(stageInfo) {
		// Initialise stats object
	    var ageStats = {
	        minVal: Infinity,
	        lowerWhisker: Infinity,
	        q1Val: Infinity,
	        medianVal: 0,
	        q3Val: -Infinity,
	        iqr: 0, // Interquartile range or IQR
	        upperWhisker: -Infinity,
	        maxVal: -Infinity
	    };

	    // calculate statistics
	    // stageInfo.ages is already sorted array
	    ageStats.minVal = stageInfo.ages[0];
	    ageStats.q1Val = d3.quantile(stageInfo.ages, .25);
	    ageStats.medianVal = d3.quantile(stageInfo.ages, .5);
	    ageStats.q3Val = d3.quantile(stageInfo.ages, .75);
	    ageStats.iqr = ageStats.q3Val - ageStats.q1Val;
	    ageStats.maxVal = stageInfo.ages[stageInfo.ages.length - 1];
        
        // Add new property
	    stageInfo.ageStats = ageStats;

	    // Add to patientsCounts object for later use (modify the Y label)
	    if (typeof patientsCounts[stageInfo.stage] === "undefined") {
            patientsCounts[stageInfo.stage] = stageInfo.patientsCount;
	    }
	});

	// set the dimensions and margins of the graph
	var margin = {top: 20, right: 20, bottom: 30, left: 170};
	var width = 960 - margin.left - margin.right;
	var height = 540 - margin.top - margin.bottom;
	var gapBetweenTwoAxes = 20;

    // Box plot
    var boxHeight = 12;
    var textBottomPadding = 2;

	// set the ranges
	var x = d3.scaleLinear()
	    .range([0, width/2])
	    .domain([10, 70]); // 10 years to 70 years old
	    
    var xCount = d3.scaleLinear()
	    .range([0, width/2])
	    .domain([d3.max(data, function(d) { 
			return d.patientsCount; 
		}), 0]);

	var y = d3.scaleBand()
		.range([0, height]) // top to bottom: stages by patients count in ascending order 
		.domain(data.map(function(d) { 
			return d.stage; 
		}))
		.padding(0.7); // blank space between bands

	var svg = d3.select("#" + svgContainerId).append("svg")
		.attr("width", width + margin.left + margin.right + gapBetweenTwoAxes)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Only show the patient age when the stage has only one patient
    var singlePatientGrp = svg.selectAll(".single_patient_group")
		.data(data.filter(function(d) {
			return d.patientsCount === 1;
		}))
		.enter().append("g")
		.attr("class", "single_patient_group");

    singlePatientGrp.append("text")
		.attr("class", "single_patient_text")
		.attr("x", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ages[0]);
		})
		.attr("y", function(d) {
			return y(d.stage) + 10;
		})
		.text(function(d) {
            return d.ages[0];
		});

	
	// Show the box plot for stage that has more than one patient
	var boxplotGrp = svg.selectAll(".boxplot")
		.data(data.filter(function(d) {
			return d.patientsCount > 1;
		}))
		.enter().append("g")
		.attr("class", "boxplot");
		
    // Verical line of min age
	boxplotGrp.append("line")
		.attr("class", "boxplot_min")
		.attr("x1", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.minVal);
		})
		.attr("y1", function(d) {
			return y(d.stage) + y.bandwidth()/2;
		})
		.attr("x2", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.minVal);
		})
		.attr("y2", function(d) {
			return y(d.stage) + y.bandwidth()/2 + boxHeight;
		});

	// Text of min age
	boxplotGrp.append("text")
		.attr("class", "boxplot_text")
		.attr("x", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.minVal);
		})
		.attr("y", function(d) {
			return y(d.stage) + y.bandwidth()/2 - textBottomPadding;
		})
		.text(function(d) {
            return d.ageStats.minVal;
		});

	// Vertical line of max age
	boxplotGrp.append("line")  
		.attr("class", "boxplot_max")
		.attr("x1", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.maxVal);
		})
		.attr("y1", function(d) {
			return y(d.stage) + y.bandwidth()/2;
		})
		.attr("x2", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.maxVal);
		})
		.attr("y2", function(d) {
			return y(d.stage) + y.bandwidth()/2 + boxHeight;
		});

    // Text of max age
	boxplotGrp.append("text")
		.attr("class", "boxplot_text")
		.attr("x", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.maxVal);
		})
		.attr("y", function(d) {
			return y(d.stage) + y.bandwidth()/2 - textBottomPadding;
		})
		.text(function(d) {
            return d.ageStats.maxVal;
		});

	// Horizontal whisker lines
	boxplotGrp.append("line")
		.attr("class", "boxplot_whisker")
		.attr("x1",  function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.minVal);
		})
		.attr("y1", function(d) {
			return y(d.stage) + y.bandwidth()/2 + boxHeight/2;
		})
		.attr("x2",  function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.maxVal);
		})
		.attr("y2", function(d) {
			return y(d.stage) + y.bandwidth()/2 + boxHeight/2;
		});

	// Rect for iqr
	boxplotGrp.append("rect")    
		.attr("class", "boxplot_box")
		.attr("x", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.q1Val);
		})
		.attr("y", function(d) {
			return y(d.stage) + y.bandwidth()/2;
		})
		.attr("width", function(d) {
            return x(d.ageStats.q3Val) - x(d.ageStats.q1Val);
		})
		.attr("height", boxHeight)
		.on("click", function(d) {
            var clickedBox = d3.select(this);
            var css = "clicked_box";

            // Toggle
            if (!clickedBox.classed(css)) {
            	// Remove previouly added css class
	            d3.selectAll(".boxplot_box").classed(css, false);
                // Highlight the clicked box and show corresponding patients
            	clickedBox.classed(css, true);
            	showPatients(d.stage);
            } else {
            	// When clicked again, remove highlight and show all patients
            	clickedBox.classed(css, false);
            	showPatients();
            }
		});
    
    // Text of q1 age
	boxplotGrp.append("text")
		.attr("class", "boxplot_text")
		.attr("x", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.q1Val);
		})
		.attr("y", function(d) {
			return y(d.stage) + y.bandwidth()/2 - textBottomPadding;
		})
		.text(function(d) {
            return d.ageStats.q1Val;
		});

	// Text of q3 age
	boxplotGrp.append("text")
		.attr("class", "boxplot_text")
		.attr("x", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.q3Val);
		})
		.attr("y", function(d) {
			return y(d.stage) + y.bandwidth()/2 - textBottomPadding;
		})
		.text(function(d) {
            return d.ageStats.q3Val;
		});

    // Must after the box so the bar doesn't gets covered by the box
	// Vertical line of median age
	boxplotGrp.append("line")
		.attr("class", "boxplot_median")
		.attr("x1", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.medianVal);
		})
		.attr("y1", function(d) {
			return y(d.stage) + y.bandwidth()/2;
		})
		.attr("x2", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.medianVal);
		})
		.attr("y2", function(d) {
			return y(d.stage) + y.bandwidth()/2 + boxHeight;
		});

	// Text of median age
	boxplotGrp.append("text")
		.attr("class", "boxplot_text")
		.attr("x", function(d) {
            return (width/2 + gapBetweenTwoAxes) + x(d.ageStats.medianVal);
		})
		.attr("y", function(d) {
			return y(d.stage) + y.bandwidth()/2 - textBottomPadding;
		})
		.attr("text-anchor", "middle")
		.text(function(d) {
			return d.ageStats.medianVal;
		});

    // Add the x ages Axis
	svg.append("g")
		.attr("transform", "translate(" + (width/2 + gapBetweenTwoAxes) + ", " + height + ")")
		.call(d3.axisBottom(x))
		// Append axis label
		.append("text")
		.attr("class", "stages_chart_ages_axis_label")
		.attr("x", width/2)
		.attr("y", -6)
		.text("Age of first encounter");

	

    // Bar chart of patients counts
	svg.selectAll(".bar")
		.data(data)
		.enter().append("rect")
		.attr("class", "bar")
		
		.attr("x", width/2)
		.attr("y", function(d) { 
			return y(d.stage) + y.bandwidth(); 
		})
		.attr("height", 3)
		.transition()
        .duration(800) // time in ms
		.attr("x", function(d) { 
			return xCount(d.patientsCount);
		})
		.attr("width", function(d) { 
			return width/2 - xCount(d.patientsCount);
		});


    // xCount axis
	svg.append("g")
		.attr("transform", "translate(0, " + height + ")")
		.call(d3.axisBottom(xCount))
		// Append axis label
		.append("text")
		.attr("class", "stages_chart_counts_axis_label")
		.attr("x", 0)
		.attr("y", -6)
		.text("Number of patients");

    // add the y Axis
	svg.append("g")
	    .attr("transform", "translate(" + (width/2 + gapBetweenTwoAxes/2) + ", 0)")
		.call(d3.axisLeft(y).tickSize(0)) // Remove tick marks
		// Now modify the label text to add patients count
		.selectAll("text")
		.text(function(d) {
			return d + " (" + patientsCounts[d] + ")";
		})
		//.attr("text-anchor", "middle");
		

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
	    renderTimeline(svgContainerId, response.patientInfo, response.reportTypes, response.typeCounts, response.maxVerticalCountsPerType, response.episodes, response.episodeCounts, response.episodeDates, response.reportData, response.reportsGroupedByDateAndTypeObj);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get timeline data");
	});
}

// Render the timeline to the target SVG container
function renderTimeline(svgContainerId, patientInfo, reportTypes, typeCounts, maxVerticalCountsPerType, episodes, episodeCounts, episodeDates, reportData, reportsGroupedByDateAndTypeObj) {
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
	var episodeBarY2 = 13; // episodeBarY1 + episodeBarHeight + 1px gap

	var width = 660;
	// Dynamic height based on vertical counts
	var height = totalMaxVerticalCounts * mainReportTypeRowHeightPerCount;

    var pad = 25;

    // Dynamic height based on vertical counts
	var overviewHeight = totalMaxVerticalCounts * overviewReportTypeRowHeightPerCount;

    var ageAreaHeight = 16;
    var ageAreaBottomPad = 10;

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

    // Transition used by focus/defocus episode
    var transt = d3.transition()
		    .duration(500)
		    .ease(d3.easeLinear);

	// Main area and overview area share the same width
	var mainX = d3.scaleTime()
	        .domain([startDate, endDate])
			.range([0, width]);

	var overviewX = d3.scaleTime()
	        .domain([startDate, endDate])
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
	    .attr("height", margin.top + legendHeight + episodeAreaHeight + height + pad + overviewHeight + pad + ageAreaHeight + margin.bottom);

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

    var episodeLegend = episodeLegendGrp.selectAll('.episode_legend')
        .data(episodes)
        .enter()
        .append('g')
        .attr('class', 'episode_legend');

    episodeLegend.append('circle')
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

            // Toggle and episode bar
            var episodeBar = d3.select("#" + d + "_bar");
            episodeBar.classed("hide", !episodeBar.classed("hide"));

            // Also toggle the episode legend look
            var legendCircle = d3.select(this);
            var cssClass = "selected_episode_legend_circle";
            legendCircle.classed(cssClass, !legendCircle.classed(cssClass));
        });

    // Legend label text
    episodeLegend.append('text')
        .attr('x', function(d, i) {
            return reportMainRadius*2 + legendSpacing + lengendX(i);
        })
        .attr('y', 10)
        .attr('class', 'legend_text')
        .text(function(d) { 
            return d + " (" + episodeCounts[d] + ")"; 
        })
        .on("click", function(d, i) {
            // Toggle
            var legendText = d3.select(this);
            var cssClass = "selected_episode_legend_text";

            if (legendText.classed(cssClass)) {
                legendText.classed(cssClass, false);
                
                // Reset to show all
                defocusEpisode();
            } else {
            	// Remove previously added class on other legend text
            	$(".legend_text").removeClass(cssClass);

            	legendText.classed(cssClass, true);

                // episodeSpansData maintains the same order of episodes as the episodes array
                // so we can safely use i to get the corresponding startDate and endDate
            	var episodeSpanObj = episodeSpansData[i];
                focusEpisode(episodeSpanObj);
            }
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
    	d3.selectAll(".episode_bar")
	        .attr("x", function(d) { 
				return mainX(d.startDate) - reportMainRadius; 
			})
	        .attr('width', function(d) {
	            return mainX(d.endDate) - mainX(d.startDate) + reportMainRadius*2;
	        });

    	// Update main area
		d3.selectAll(".main_report")
			.attr("cx", function(d) { 
				return mainX(d.formattedTime); 
			});
	
	    // Update the main x axis
		d3.select(".main-x-axis").call(xAxis);
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

    // Encounter ages
    var age = svg.append("g")
	    .attr("class", "age")
	    .attr("transform", "translate(" + margin.left + "," + (margin.top + legendHeight + episodeAreaHeight + height + pad) + ")");

	// Mini overview
	var overview = svg.append("g")
	    .attr("class", "overview")
	    .attr("transform", "translate(" + margin.left + "," + (margin.top + legendHeight + episodeAreaHeight + height + pad + ageAreaHeight + ageAreaBottomPad) + ")");

    var getReportCirclePositionY = function(d, yScaleCallback, reportTypeRowHeightPerCount) {
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
            var h = maxVerticalCountsPerType[d.type] * reportTypeRowHeightPerCount / arr.length;
            return yScaleCallback(verticalPositions[d.type]) - ((arr.length - (index + 1)) * h + h/2); 
        } else {
        	// Vertically center the dot if only one
        	return yScaleCallback(verticalPositions[d.type]) - reportTypeRowHeightPerCount * maxVerticalCountsPerType[d.type] / 2; 
        }
    };

    // Episode interval spans
    var focusEpisode = function(episode) {
    	// Here we we add extra days before the start and after the end date to have a little cushion
        var daysDiff = Math.floor((episode.endDate - episode.startDate) / (1000 * 60 * 60 * 24));
        var numOfDays = daysDiff > 30 ? 3 : 1;

        // setDate() will change the start and end dates, and we still need the origional dates to update the episode bar
        // so we clone the date objects
        var newStartDate = new Date(episode.startDate.getTime());
        var newEndDate = new Date(episode.endDate.getTime());

        // The setDate() method sets the day of the month to the date object.
		newStartDate.setDate(newStartDate.getDate() - numOfDays);
		newEndDate.setDate(newEndDate.getDate() + numOfDays);

        // Span the episode coverage across the whole main area using this new domain
        mainX.domain([newStartDate, newEndDate]);

        var transt = d3.transition()
		    .duration(500)
		    .ease(d3.easeLinear);

        // Move the brush with transition
        // The brush move will cause the report circles move accordingly
        // So no need to call update() with transition
		// https://github.com/d3/d3-selection#selection_call
        //Can also use brush.move(d3.select(".brush"), [overviewX(newStartDate), overviewX(newEndDate)]);
        overview.select(".brush").transition(transt).call(brush.move, [overviewX(newStartDate), overviewX(newEndDate)]);
    };

    var defocusEpisode = function() {
        // Reset the mainX domain
        mainX.domain([startDate, endDate]);

        // Move the brush with transition
		// https://github.com/d3/d3-selection#selection_call
        //Can also use brush.move(d3.select(".brush"), [overviewX(newStartDate), overviewX(newEndDate)]);
        overview.select(".brush").transition(transt).call(brush.move, [overviewX(startDate), overviewX(endDate)]);
    };

    var episodeBarsGrp = svg.append("g")
        .attr("clip-path", "url(#episode_area_clip)")
        .attr('class', 'episode_bars')
        .attr("transform", "translate(" + margin.left + "," + (margin.top + legendHeight) +  ")");

    var episodeBarGrp = episodeBarsGrp.selectAll('.episode_bar_group')
        .data(episodeSpansData)
        .enter()
        .append('g')
        .attr('class', 'episode_bar_group');

    episodeBarGrp.append('rect')
        .attr('class', 'episode_bar')
        .attr("id", function(d) {
            return d.episode + "_bar";
        })
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
	    	return getReportCirclePositionY(d, mainY, mainReportTypeRowHeightPerCount);
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
	    .attr("class", "main-x-axis")
	    .attr("transform", "translate(0," + height + ")")
	    .call(xAxis);

    // Encounter ages
    age.append("text")
	    .attr("x", -textMargin)
	    .attr("y", ageAreaHeight/2) // Relative to the overview area
	    .attr("dy", ".5ex")
	    .attr("class", "age_label")
	    .text("Patient Age");

    // Date objects, not strings
    var encounterDates = [xMinDate, xMaxDate];
    
    age.selectAll(".encounter_age")
        .data(encounterDates)
        .enter()
        .append("text")
	    .attr("x", function(d) {
	    	return mainX(d);
	    })
	    .attr("y", ageAreaHeight/2)
	    .attr("dy", ".5ex")
	    .attr("class", "encounter_age")
	    .text(function(d) {
	    	return getPatientEncounterAge(d, patientInfo.birthday);
	    });

    // Vertical guidelines
    age.selectAll(".encounter_age_guideline")
        .data(encounterDates)
        .enter()
        .append("line")
	    .attr("x1", function(d) {
	    	return mainX(d);
	    })
	    .attr("y1", 12)
	    .attr("x2", function(d) {
	    	return mainX(d);
	    })
	    .attr("y2", 25)
	    .attr("class", "encounter_age_guideline");

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
			return getReportCirclePositionY(d, overviewY, overviewReportTypeRowHeightPerCount);
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
	    .attr("class", "overview-x-axis")
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

		// Zoom the main area
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
	    .attr("transform", "translate(20, " + (margin.top + legendHeight + pad + height + pad + ageAreaHeight + ageAreaBottomPad + overviewHeight) + ")")
	    .append("xhtml:body")
        .html('<button>Reset</button>');

}