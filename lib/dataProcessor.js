'use strict';

/**
 * Module dependencies.
 */

// Load the full build of lodash
// Differences between core build and full build: https://github.com/lodash/lodash/wiki/Build-Differences
const _ = require('lodash');

// Class declaration, constructor with no arguments
// In the JavaScript, a function can be treated like a class.
// Class names should be capitalized using upper camel case.
const DataProcessor = function() {};

// Add methods to DataProcessor.prototype
DataProcessor.prototype = {
    // Convert the neo4jRawJson into a simple client JSON
    getPatients: function(neo4jRawJson, stage) {
        //return neo4jRawJson;
        var patientsJson = {};
        var dataArr = neo4jRawJson.results[0].data;
        var uniquePatientsArr = [];

        // Remove duplicates
        for (var i = 0; i < dataArr.length; i++) {
        	var patient = {};
        	patient.id = dataArr[i].meta[0].id;
        	patient.name = dataArr[i].row[0].name;
        	patient.cancerStage = [];

            // Lodash's _.indexOf() doesn't work in this case, use _.findIndex()
            if (_.findIndex(uniquePatientsArr, patient) ===-1) {
            	uniquePatientsArr.push(patient);
            } 
        }
        
        // Assemble the extracted cancer stages for each patient
        for (var j = 0; j < dataArr.length; j++) {
        	var patientId = dataArr[j].meta[0].id;
        	var patientCancerStage = dataArr[j].row[1];

        	for (var k = 0; k < uniquePatientsArr.length; k++) {
                if (patientId === uniquePatientsArr[k].id) {
                    uniquePatientsArr[k].cancerStage.push(patientCancerStage);
                }
        	}
        }

        // Now use stage as a filter if provided
        if (stage !== null) {
            var filteredUniquePatientsArr = uniquePatientsArr.filter(function(obj) {
                return (obj.cancerStage.indexOf(stage) > -1);
            });

            // Add "patients" key as patients array data
            patientsJson.patients = filteredUniquePatientsArr;
        } else {
            patientsJson.patients = uniquePatientsArr;
        }

        // Return the JSON object
        return patientsJson;
    },

    // Convert the neo4jRawJson into a simple client array
    getCancerStages: function(neo4jRawJson) {
        //return neo4jRawJson;
        var stagesJson = {};
        stagesJson.stages = [];

        var dataArr = neo4jRawJson.results[0].data;
        
        for (var i = 0; i < dataArr.length; i++) {
            var obj = {};
            obj.name = dataArr[i].row[0];

            stagesJson.stages.push(obj);
        }

        // Return the JSON object
        return stagesJson;
    },

    // Convert the neo4jRawJson into a simple client JSON that
    // groups the facts by sorted categories
    getCancerSummary: function(neo4jRawJson) {
    	//console.log(JSON.stringify(neo4jRawJson, null, 4));

        // "id" and "collatedFacts" are the keys of this object
    	var cancerSummary = {};
    	var dataArr = neo4jRawJson.results[0].data;

        // Remove the "CancerSummary-" prefix from "CancerSummary-Breast"
    	cancerSummary.name = dataArr[0].row[0].replace('CancerSummary-', '');
        // TNM
        cancerSummary.tnm = [];
        // Other categories other than TNM
        cancerSummary.collatedFacts = [];
        
        // Build an arry of unique cancerFactReln
        var uniqueCancerFactRelnArr = [];

        for (var i = 0; i < dataArr.length; i++) {
            var relationship = dataArr[i].row[1];
            // Skip the body site info since cancer name explains it?
            // Don't show Diagnosis and Tumor Extent in cancer summary
            if (uniqueCancerFactRelnArr.indexOf(relationship) ===-1 
                && relationship !== "hasBodySite" 
                && relationship !== "hasDiagnosis" 
                && relationship !== "hasTumorExtent") {
                // Histological type could be interesting - but not needed for breast cancer
                if (cancerSummary.name === 'Breast') {
                    if (relationship !== "hasHistologicType") {
                        uniqueCancerFactRelnArr.push(relationship);
                    }
                } else {
                    uniqueCancerFactRelnArr.push(relationship);
                }
            }
        }

        // Sort this uniqueCancerFactRelnArr in a specific order
        // categories not in this order will be listed at the bottom
        // based on their original order
        var order = [
            'hasCancerStage', 
            'hasTreatment'
        ];
        
        // Sort the uniqueCancerFactRelnArr by the item's index in the order array
        var sortedUniqueCancerFactRelnArr = this.sortByProvidedOrder(uniqueCancerFactRelnArr, order);

        // Build new data structure
        // This is similar to what getCollatedFacts() does,
        // except it only handles one cancer ID.
        var allCollatedFacts = [];

        for (var j = 0; j < sortedUniqueCancerFactRelnArr.length; j++) {
            var collatedFactObj = {};

            // The name of category
            collatedFactObj.category = sortedUniqueCancerFactRelnArr[j];
            collatedFactObj.categoryName = this.formatCategoryName(sortedUniqueCancerFactRelnArr[j]);

            // Array of facts of this category
            collatedFactObj.facts = [];

            var factsArr = [];

            // Loop through the origional data
            for (var k = 0; k < dataArr.length; k++) {
            	var cancerFactReln = dataArr[k].row[1];
	        	var fact = dataArr[k].row[2];

                // Add to facts array
                // Filter out Treatment facts that start with "Other" or "pharmacotherapeutic", they are not helpful to show
	            if (cancerFactReln === collatedFactObj.category && !fact.prettyName.startsWith("Other") && !fact.prettyName.startsWith("pharmacotherapeutic")) {
                    factsArr.push(fact);
	            }
            }

            // Array of facts of this category
            // Remove duplicates using lodash's _.uniqWith() then sort by the alphabetical order of 'prettyName'
            collatedFactObj.facts = _.sortBy(_.uniqWith(factsArr, _.isEqual), ['prettyName']);

            // Add collatedFactObj to allCollatedFacts only when the facts array is not empty after all the above filtering
            // E.g., treatment facts can be an empty array if the treatements are OtherTherapeuticProcedure and OtherMedication
            // since they'll get filtered out
            if (collatedFactObj.facts.length > 0) {
            	allCollatedFacts.push(collatedFactObj);
            }
        }

        // Will use this to build TNM staging table
        var tnmClassifications = {
            "unspecified": [ // Use "unspecified" instead of "generic"
                'hasGenericTClassification',
                'hasGenericNClassification',
                'hasGenericMClassification'
            ],
            "clinical": [
                'hasClinicalTClassification',
                'hasClinicalNClassification',
                'hasClinicalMClassification'
            ],
            "pathologic": [
                'hasPathologicTClassification',
                'hasPathologicNClassification',
                'hasPathologicMClassification'
            ]
        };

        // Hard code type names
        // Use "Unspecified" as the title of Generic TNM
        var unspecifiedTNM = this.buildTNM(allCollatedFacts, "Unspecified", tnmClassifications.unspecified);
        var clinicalTNM = this.buildTNM(allCollatedFacts, "Clinical", tnmClassifications.clinical);
        var pathologicTNM = this.buildTNM(allCollatedFacts, "Pathologic", tnmClassifications.pathologic);

        // Add to cancerSummary.tnm if has data
        if (unspecifiedTNM.data.T.length > 0 || unspecifiedTNM.data.N.length > 0 || unspecifiedTNM.data.M.length > 0) {
            cancerSummary.tnm.push(unspecifiedTNM);
        }

        if (clinicalTNM.data.length > 0  || clinicalTNM.data.N.length > 0 || clinicalTNM.data.M.length > 0) {
            cancerSummary.tnm.push(clinicalTNM);
        }

        if (pathologicTNM.data.length > 0  || pathologicTNM.data.N.length > 0 || pathologicTNM.data.M.length > 0) {
            cancerSummary.tnm.push(pathologicTNM);
        }

        // If clinical and pathological are found (ie, cT2 and pT2), don't need Unspecified
        // But if Unspecified is the only type, show it
        if (cancerSummary.tnm.length > 1) {
            cancerSummary.tnm = cancerSummary.tnm.filter(function(obj) {
            	return obj.type !== 'Unspecified'; // Captilized "Unspecified" instead of "unspecified"
            });
        }

        // Categories other than TNM
        cancerSummary.collatedFacts = allCollatedFacts.filter(function(obj) {
            return (tnmClassifications.unspecified.indexOf(obj.category) === -1 
                && tnmClassifications.clinical.indexOf(obj.category) === -1 
                && tnmClassifications.pathologic.indexOf(obj.category) === -1);
        });

        return cancerSummary;
    },

    buildTNM: function(collatedFacts, type, tnmClassifications) {
        var tnmObj = {};

        // Two properties
        tnmObj.type = type;
        tnmObj.data = {};
        // Make sure to use T, N, M as keys so we don't 
        // have to worry about the ordering of corresponding facts data
        tnmObj.data.T = [];
        tnmObj.data.N = [];
        tnmObj.data.M = [];

        // Build the TNM object of this type
        // collatedFacts contains all the cancer categories, we only need the TNM relationships of this type
        for (var i = 0; i < collatedFacts.length; i++) {
            if (tnmClassifications.indexOf(collatedFacts[i].category) !== -1) {
                var itemObj = {};
                // Extracted single letter of the classification, "T", or "N", or "M"
                var classification = collatedFacts[i].category.substr(-15, 1);
                // Don't use dot expression ".classification" here, use "[classification]"
                tnmObj.data[classification] = collatedFacts[i].facts;
            }
        }

        return tnmObj;
    },

    // For vertical tumor summary table
    getTumorSummary: function(neo4jRawJson) {
        var self = this;

        var summary = {};

        summary.tumors = [];
        summary.collatedFactsByCategory = [];

        var dataArr = neo4jRawJson.results[0].data;

        // Build an arry of unique tumors (id and name)
        var summaryTumors = [];
        for (var i = 0; i < dataArr.length; i++) {
            if (summaryTumors.indexOf(dataArr[i].row[0]) ===-1 && dataArr[i].row[1]=== 'hasTumorType') {
                var tumorObj = {};
                // Remove the "TumorSummary-MergedTumor-" prefix from "TumorSummary-MergedTumor-23781020"
                tumorObj.id = dataArr[i].row[0];
                tumorObj.type = this.formatTumorType(dataArr[i].row[2].prettyName);

                summaryTumors.push(tumorObj);
            }
        }

        // Show Primary Tumor on the first column...
        var tumorTypesArr = [
            'Primary Tumor',
            'Regional Metastasis',
            'Distant Metastasis'
        ];

        summary.tumors = this.sortByTumorType(summaryTumors, tumorTypesArr);

        var allTumorFactRelnArr = [];

        // Get a list of tumor fact relationships for each tumor
        for (var j = 0; j < summary.tumors.length; j++) {
            // Collect categories of each tumor
            var tumorFactRelnArr = this.getTumorFactRelnArr(dataArr, summary.tumors[j].id);
            allTumorFactRelnArr.push(tumorFactRelnArr);
        }

        var mergedArr = [];
        for (var m = 0; m < allTumorFactRelnArr.length; m++) {
            // https://lodash.com/docs/4.17.4#union
            // Creates an array of unique values, in order, from all given arrays
            mergedArr = _.unionWith(mergedArr, allTumorFactRelnArr[m], _.isEqual);
        }

        // Sort this allTumorFactRelnArr in a specific order
        // categories not in this order will be listed at the bottom
        // based on their original order
        var order = [
            'hasBodySite',
            'hasDiagnosis',
            'hasTreatment',
            // Group biomarkers - Breast cancer only
            'hasERStatus',
            'hasPRStatus',
            'hasHer2Status',
            'hasKi67Status',
            // Group tumor sizes
            'hasTumorSize',
            'hasRadiologicTumorSize',
            'hasPathologicTumorSize',
            'hasPathologicAggregateTumorSize',
            'hasNuclearGrade'
        ];

        // Sort the commonFactRelationships by the item's index in the order array
        var sortedFactRelationships = this.sortByProvidedOrder(mergedArr, order);

        // For each common category, get collacted facts for each tumor
        for (var k = 0; k < sortedFactRelationships.length; k++) {
            var obj = {};
            // Convert the 'hasXXX' relationship to category
            
            obj.category = this.formatCategoryName(sortedFactRelationships[k]);
            obj.categoryClass = this.getCategoryClass(sortedFactRelationships[k]);
            obj.data = [];

            // Add collacted facts array for each tumor
            for (var n = 0; n < summary.tumors.length; n++) {
                // Pass in the raw relationship name as categoryClass to be used in CSS, for list view
                var factsObj = this.getTumorFactsByRelationship(summary.tumors[n].id, obj.category, sortedFactRelationships[k], dataArr);
                obj.data.push(factsObj);
            }

            summary.collatedFactsByCategory.push(obj);
        }

        // Data structure for list view
        // Add data property to each tumor object in summary.tumors
        for (var m = 0; m < summary.tumors.length; m++) {
            var obj = summary.tumors[m];
            obj.data = [];

            for (var p = 0; p < summary.collatedFactsByCategory.length; p++) {
                var dataObj = {};
            	dataObj.category = summary.collatedFactsByCategory[p].category;
            	dataObj.factsObj = summary.collatedFactsByCategory[p].data[m];
            	obj.data.push(dataObj);
            }
        }

        return summary;
    },

    // For tumor fact box background rendering in CSS
    getCategoryClass: function(categoryClass) {
        // Manual filtering for now
        var categoryClassesArr = [
            'hasBodySite',
            'hasDiagnosis',
            'hasTreatment',
            'hasERStatus',
            'hasPRStatus',
            'hasHer2Status',
            'hasKi67Status',
            'hasTumorSize',
            'hasRadiologicTumorSize',
            'hasPathologicTumorSize',
            'hasPathologicAggregateTumorSize',
            'hasNuclearGrade',
            'hasCancerCellLine',
            'hasHistologicType',
            'hasTumorExtent'
        ];

        if (categoryClassesArr.indexOf(categoryClass) === -1) {
            categoryClass = 'unspecified';
        } 

        return categoryClass;
    },

    getTumorFactsByRelationship: function(tumorId, category, categoryClass, dataArr) {
        var factsObj = {};

        factsObj.tumorId = tumorId;
        factsObj.category = category; // Already in non camal case
        factsObj.categoryClass = this.getCategoryClass(categoryClass);
        factsObj.facts = [];
        
        var factsArr = [];
        // Loop through the origional data
        for (var i = 0; i < dataArr.length; i++) {
            var targetTumorId = dataArr[i].row[0];
            var targetTumorFactRel = this.formatCategoryName(dataArr[i].row[1]);
            var fact = dataArr[i].row[2];
            
            var combinedFact = {};
            combinedFact.id = fact.id;
            combinedFact.name = fact.name;
            combinedFact.prettyName = fact.prettyName;
            combinedFact.type = fact.type;
            combinedFact.uri = fact.uri;

            if (dataArr[i].row[3] !== null && dataArr[i].row[4] !== null) {
                // ordinalinterpretation or laterality, lowercased
                // Can't add BodyModifier since it may have multiple values
                var rel2AnotherFact = dataArr[i].row[3].name.toLowerCase(); 
                // ordinalinterpretation: Positive or Negative
                // laterality: Left or Right
                // Use name instead of prettyName due to "Gender Unknown" exception for ordinalinterpretation
                var anotherFact = dataArr[i].row[4].name; 
                // Use rel2AnotherFact as key, anotherFact as value
                combinedFact[rel2AnotherFact] = anotherFact;
            }

            if (tumorId === targetTumorId && category === targetTumorFactRel) {
                // Add fact to the factsArr
                factsArr.push(combinedFact);
            }
        }

        // Array of facts of this category
        // Remove duplicates using lodash's _.uniqWith(), then sort by the alphabetical order of 'prettyName'
        factsObj.facts = _.sortBy(_.uniqWith(factsArr, _.isEqual), ['prettyName']);

        return factsObj;
    },

    // Get an arry of tumor fact relationships without duplicates
    getTumorFactRelnArr: function(dataArr, tumorId) {
        // Build an arry of unique tumorFactReln
        var uniqueTumorFactRelnArr = [];

        for (var i = 0; i < dataArr.length; i++) {
        	if (dataArr[i].row[0] === tumorId && uniqueTumorFactRelnArr.indexOf(dataArr[i].row[1]) === -1) {
                // HACK - filter out `hasTumorType`, `hasTreatment` and `hasReceptorStatus` from tumor table
                if (dataArr[i].row[1] !== 'hasTumorType' && dataArr[i].row[1] !== 'hasTreatment' && dataArr[i].row[1] !== 'hasReceptorStatus') {
                    uniqueTumorFactRelnArr.push(dataArr[i].row[1]);
                }
        	}
        }

        return uniqueTumorFactRelnArr;
    },

    // One fact can have multiple matching texts
    // or the same matching text can be found in multiple places in the same report
    getFact: function(neo4jRawJson) {
    	var self = this;

        var factJson = {};

        var dataArr = neo4jRawJson.results[0].data;

//console.log(JSON.stringify(dataArr, null, 4));

        // factJson object has properties: 
        // "detail", "textProvenances", "ordinalInterpretations", "procedures", "groupedTextMentions"
    	factJson.detail = dataArr[0].row[0];

        // This array may have duplicates
        var textProvenancesArr = [];
        var ordinalInterpretationsArr = [];
        var proceduresArr = [];
        var lateralitiesArr = [];
        var bodyModifiersArr = [];

        for (var i = 0; i < dataArr.length; i++) {
        	// Due to the use of "OPTIONAL MATCH" in cypher query, we may have nulls
            if (dataArr[i].row[1] !== null) {
                // We can also specify the relationship in Cypher query
                if (dataArr[i].row[1].name === 'hasTextProvenance') {
                    textProvenancesArr.push(dataArr[i].row[2]);
                }

                if (dataArr[i].row[1].name === 'OrdinalInterpretation') {
                    ordinalInterpretationsArr.push(dataArr[i].row[2]);
                }

                if (dataArr[i].row[1].name === 'Procedure') {
                    proceduresArr.push(dataArr[i].row[2]);
                }

                if (dataArr[i].row[1].name === 'Laterality') {
                    lateralitiesArr.push(dataArr[i].row[2]);
                }

                if (dataArr[i].row[1].name === 'BodyModifier') {
                    bodyModifiersArr.push(dataArr[i].row[2]);
                }
            }
        }

        // Remove duplicates using lodash's _.uniqWith()
        var uniqueTextProvenances = _.uniqWith(textProvenancesArr, _.isEqual);
        factJson.ordinalInterpretations = _.uniqWith(ordinalInterpretationsArr, _.isEqual);
        factJson.procedures = _.uniqWith(proceduresArr, _.isEqual);
        factJson.lateralities = _.uniqWith(lateralitiesArr, _.isEqual);
        factJson.bodyModifiers = _.uniqWith(bodyModifiersArr, _.isEqual);

        // Use report number "report008" to sort the documents.
        // The report number should be based on the report date?
        uniqueTextProvenances.sort(function(a, b) {
        	return a.documentId.split('_')[2].slice(6) - b.documentId.split('_')[2].slice(6);
        });

        // Group text mentions by report ID
        // Considering the fact that Fact-Report(1-n)
        var docIds = [];
        for (var j = 0; j < uniqueTextProvenances.length; j++) {
            var docId = uniqueTextProvenances[j].documentId;

            if (docIds.indexOf(docId) === -1) {
                docIds.push(docId);
            }
        }

        var groupedTextProvenances = [];

        docIds.forEach(function(id) {
            var textProvenanceObj = {};
            textProvenanceObj.docId = id;
            textProvenanceObj.shortDocId = self.getShortDocId(id);
            textProvenanceObj.texts = [];
            textProvenanceObj.groupedTexts = [];
            for (var k = 0; k < uniqueTextProvenances.length; k++) {
                if (uniqueTextProvenances[k].documentId === id) {
                    textProvenanceObj.texts.push(uniqueTextProvenances[k].text);
                }
            }
            groupedTextProvenances.push(textProvenanceObj);
        });

        // Additional process to aggregate tesxt mentions with count for each test mention group
        for (var m = 0; m < groupedTextProvenances.length; m++) {
            var textCounts = [];
            var textsArr = groupedTextProvenances[m].texts;

            for (var n = 0; n < textsArr.length; n++) {
                var countObj = {};
                countObj.text = textsArr[n];
                countObj.count = _.countBy(textsArr)[textsArr[n]];

                textCounts.push(countObj);
            }

            // Remove duplicates
            // Note: groupedTextMentions is used to render fact.html
            // textProvenances is used to highlight the report text
            // they serve different purposes
            groupedTextProvenances[m].groupedTexts = _.uniqWith(textCounts, _.isEqual);
        }

//console.log(JSON.stringify(groupedTextProvenances, null, 4));

        factJson.groupedTextProvenances = groupedTextProvenances;

        // Also return and docIds array
        factJson.docIds = docIds;

    	return factJson;
    },

    getReport: function(neo4jRawJson) {
        //console.log(JSON.stringify(neo4jRawJson, null, 4));
        var dataArr = neo4jRawJson.results[0].data;
        
        var report = {};

        // Report text is repeated in each row, unfortunately
        report.text = dataArr[0].row[0];
        report.mentionedTerms = [];

        // All mentioned texts with count
        for (var i = 0; i < dataArr.length; i++) {
            // If dataArr[i].row[1] is not null, dataArr[i].row[2] must be not null as well
            if (dataArr[i].row[1] !== null) {
                var term = {};

                term.text = dataArr[i].row[1];
                term.startOffset = dataArr[i].row[2];
                term.endOffset = dataArr[i].row[3];
                // Add to the array
                report.mentionedTerms.push(term);
            }
        }

        return report;
    },

    // Sort from newest date to oldest date
    // Format the report type
    sortReportsByDate: function(dataArr) {
        // Date format returned by neo4j is "07/19/2006 09:33 AM EDT"
        dataArr.sort(function(a, b) {
            // Turn strings into dates, and then subtract them
            // to get a value that is either negative, positive, or zero.
            return (new Date(b.row[1]) - new Date(a.row[1]));
        });

        // Now we just put the data we need together
        var arr = [];
        for (var i = 0; i < dataArr.length; i++) {
    	    var row = dataArr[i].row

    	    var typeArr = row[3].toLowerCase().split('_');
            typeArr.forEach(function(v, i, a) {
                // Capitalize the first letter of each word
                a[i] = v.charAt(0).toUpperCase() + v.substr(1);
            });

            // Joins all elements of the typeArr into a string
            row[3] = typeArr.join(' ');

            arr.push(row);
        }

        return arr;
    },

    // Convert the index array to named array
    prepareTimelineData: function(dataArr) {
        var preparedReports = {};

        // Three properties
        preparedReports.reportData = [];
        preparedReports.typeCounts = {};
        preparedReports.episodes = [];
        preparedReports.episodeCounts = {};

        var reportTypes = [];

        var episodes = [];
        var episodeDates = {};

        // Using lodash's `_.forEach()`
        _.forEach(dataArr, function(item) { 
            var report = {};

            report.id = item[0];
            report.time = item[1];
            report.name = item[2];
            report.type = item[3]; // Is already formatted/normalized
            report.episode = item[4];

            // Add to reportData array
            preparedReports.reportData.push(report);

            // Create an array of report types without duplicates
            if (reportTypes.indexOf(report.type) === -1) {
                reportTypes.push(report.type);
            }
  
            // Add the type as key to typeCounts object
            // JavaScript objects cannot have duplicate keys
            if (report.type in preparedReports.typeCounts) {
                preparedReports.typeCounts[report.type]++;
            } else {
                preparedReports.typeCounts[report.type] = 1;
            }

            // Create an array of episode types without duplicates
            if (episodes.indexOf(report.episode) === -1) {
                episodes.push(report.episode);
            }

            // Also count the number of reports for each episode type
            if (report.episode in preparedReports.episodeCounts) {
                preparedReports.episodeCounts[report.episode]++;
            } else {
                preparedReports.episodeCounts[report.episode] = 1;
            }

            // Add dates to each episode dates named array
            if (typeof (episodeDates[report.episode]) === 'undefined') {
                // Use the episode name as key
                episodeDates[report.episode] = [];
            }
            
            episodeDates[report.episode].push(report.time);
        });

        // Sort the report types based on this specific order
        var orderOfReportTypes = [
            'Progress Note',
            'Radiology Report',
            'Surgical Pathology Report',
            'Discharge Summary'
        ];

        preparedReports.reportTypes = this.sortByProvidedOrder(reportTypes, orderOfReportTypes);

        // Sort the episodes based on this specific order
        var orderOfEpisodes = [
            'PreDiagnostics',
            'Diagnostic',
            'Decision',
            'Treatment',
            'Follow-up'
        ];

        preparedReports.episodes = this.sortByProvidedOrder(episodes, orderOfEpisodes);

        preparedReports.episodeDates = episodeDates;

        return preparedReports;
    },

    // https://stackoverflow.com/questions/18859186/sorting-an-array-of-javascript-objects-a-specific-order-using-existing-function
    sortByProvidedOrder: function(array, orderArr) {
        var orderMap = {};
        // Using lodash's `_.forEach()`, `_.sortBy` and `_.indexOf`
        _.forEach(orderArr, function(item) { 
            // Remember the index of each item in order array
            orderMap[item] = _.indexOf(orderArr, item); 
        });

        // Sort the original array by the item's index in the orderArr
        var sortedArray = _.sortBy(array, function(item){ 
            return orderMap[item];
        });

        return sortedArray;
    },

    // In tumor summary table, show Primary Tumor in the first data column...
    sortByTumorType: function(array, orderArr) {
        var orderMap = {};
        // Using lodash's `_.forEach()`, `_.sortBy` and `_.indexOf`
        _.forEach(orderArr, function(item) { 
            // Remember the index of each item in order array
            orderMap[item] = _.indexOf(orderArr, item); 
        });

        // Sort the original array by the item's index in the orderArr
        var sortedArray = _.sortBy(array, function(item){ 
            // Use item.type since we are ordering by tumor type
            // this is the only difference from sortByProvidedOrder()
            return orderMap[item.type];
        });

        return sortedArray;
    },

    // "Distant_Metastasis" to "Distant Metastasis"
    // "Regional_Metastasis" to "Regional Metastasis"
    // "PrimaryTumor" to "Primary Tumor"
    formatTumorType: function(type) {
        // Remove the underscore first then add a space to the uppercased word
        var str = type.replace('_', '').replace(/([A-Z])/g, " $1" );
        // Trim out the beginning space
        return str.trim();
    },

    // "REPORT_patient10_report051_NOTE_2076902750" -> "Report051_NOTE"
    // This utility funtion can also be found in deepphe.js
    // But we can't reuse it due to the fact of different componments
    // Functions in deepphe.js are used by client side
    // and functions in dataProcessor.js are used by server side
    getShortDocId: function(id) {
        var partsArr = id.split('_');
        var str = partsArr[2] + '_' + partsArr[3];
        // Also capitalize the first letter
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // E.g., convert "hasBodySite" into "Body Site"
    // Exception: "hasERStatus" -> "ER", no space between E and R, similarly for "hasBIRADSCategory"
    formatCategoryName: function(text) {
        if (text === 'hasERStatus') {
            return 'ER'; // Also omit "Status"
        } else if (text === 'hasPRStatus') {
            return 'PR';
        } else if (text === 'hasHer2Status') {
            return 'HER2';
        } else if (text === 'hasKi67Status') {
            return 'Ki-67';
        } else if (text === 'hasBIRADSCategory') {
            return 'BIRADS'; // Also omit "Category"
        } else {
            // Remove 'has' from the beginning then add a space to the uppercased word
            var result = text.substring(3).replace(/([A-Z])/g, " $1" );
            var str = result.charAt(0).toUpperCase() + result.slice(1);
            // Trim out the beginning space
            return str.trim();
        }
    }
};

/**
 * Expose the DataProcessor class as a local module
 */
module.exports = DataProcessor;

