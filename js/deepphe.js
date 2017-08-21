
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

// Get reports
function getReports(patientName) {
	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/patients/' + patientName + '/reports',
	    method: 'GET', 
	    async : true,
	    dataType : 'html' // Use 'html' instead of 'json' for rendered html content
	});

	jqxhr.done(function(response) {
	    //console.log(response);
	    
	    // Render response
	    //$('#reports').html('<pre>' + JSON.stringify(response, null, 4) + '</pre>');
	    $('#reports').html(response);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get reports");
	});
}

// Get report by ID
function getReport(reportId, textProvenancesArr) {
	// Separate the ajax request with callbacks
	var jqxhr = $.ajax({
	    url: baseUri + '/reports/' + reportId,
	    method: 'GET', 
	    async : true,
	    dataType : 'json'
	});

	jqxhr.done(function(response) {
	    //console.log("Report: " + reportId);

        var reportText = response.data[0][0].data.text;

        // Also highlight the mentioned texts if there's any
        if (textProvenancesArr.length > 0) {
            reportText = highlightMentionedTexts(textProvenancesArr, reportText);
        }

console.log(reportText);

	    // Render response
	    $('#report_content').html(reportText);
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get report");
	});
}

function highlightMentionedTexts(textMentions, reportText){
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

		// Highlight report ID in list if there's text mention
		if (reportId !== '') {
		    highlightReport(reportId, textProvenancesArr);
		}
	});

	jqxhr.fail(function () { 
	    console.log("Ajax error - can't get fact");
	});
}

function highlightReport(reportId, textProvenancesArr) {
    // First get the report content
    getReport(reportId, textProvenancesArr);

    // Remove previous added highlighting class
    $('.report_name').removeClass("highlight");
    // Also highlight this file
    $('#' + reportId).addClass("highlight");
}


