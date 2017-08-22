'use strict';

// Load the full build of lodash
// Differences between core build and full build: https://github.com/lodash/lodash/wiki/Build-Differences
var _ = require('lodash');

// Class declaration, constructor with no arguments
// In the JavaScript, a function can be treated like a class.
var DataProcessor = function() {
    // In the format of "hasXXX"
    this.sortedCommonFactRelationships = [];

    // Space seperated and captalized words
    // Parsed based on this.sortedCommonFactRelationships
    // So it keeps the sorted order
    this.commonCategories = [];
};

// Add methods to DataProcessor.prototype
DataProcessor.prototype = {
    // Convert the neo4jRawJson into a simple client JSON
    getPatients: function(neo4jRawJson) {
        //return neo4jRawJson;

        var patientsJson = {};
        var dataArr = neo4jRawJson.results[0].data;
        var patientsArr = [];

        for (var i = 0; i < dataArr.length; i++) {
        	var patient = {};
        	patient.id = dataArr[i].meta[0].id;
        	patient.name = dataArr[i].row[0].name;
 
            patientsArr.push(patient);
        }
        
        // Add "patients" key as patients array data
        patientsJson.patients = patientsArr;

        // Return the JSON object
        return patientsJson;
    },

    // Convert the neo4jRawJson into a simple client JSON that
    // groups the facts by sorted categories
    getCancerSummary: function(neo4jRawJson) {
    	//console.log(JSON.stringify(neo4jRawJson, null, 4));

        // "id" and "collatedFacts" are the keys of this object
    	var cancerSummary = {};
    	var dataArr = neo4jRawJson.results[0].data;

        // Remove the "CancerSummary-" prefix from "CancerSummary-Breast"
    	cancerSummary.id = dataArr[0].row[0].replace('CancerSummary-', '');
        cancerSummary.collatedFacts = [];

        // Build an arry of unique cancerFactReln
        var uniqueCancerFactRelnArr = [];

        for (var i = 0; i < dataArr.length; i++) {
            if (uniqueCancerFactRelnArr.indexOf(dataArr[i].row[1]) ===-1) {
                uniqueCancerFactRelnArr.push(dataArr[i].row[1]);
            }
        }

        // Sort this uniqueCancerFactRelnArr in a specific order
        // categories not in this order will be listed at the bottom
        // based on their original order
        var order = [
            'hasBodySite', 
            'hasCancerStage', 
            'hasClinicalTClassification',
            'hasClinicalNClassification',
            'hasClinicalMClassification',
            'hasDiagnosis',
            'hasTreatment'
        ];
        
        // Sort the uniqueCancerFactRelnArr by the item's index in the order array
        var sortedUniqueCancerFactRelnArr = this.sortByProvidedOrder(uniqueCancerFactRelnArr, order);

        // Build new data structure
        // This is similar to what getCollatedFacts() does,
        // except it only handles one cancer ID.
        for (var j = 0; j < sortedUniqueCancerFactRelnArr.length; j++) {
            var collatedFactObj = {};

            // The name of category
            collatedFactObj.category = sortedUniqueCancerFactRelnArr[j];
            // toNonCamelCase, remove 'has' from beginning
            collatedFactObj.categoryName = this.toNonCamelCase(sortedUniqueCancerFactRelnArr[j].substring(3));

            // Array of facts of this category
            collatedFactObj.facts = [];

            var factsArr = [];

            // Loop through the origional data
            for (var k = 0; k < dataArr.length; k++) {
            	var cancerFactReln = dataArr[k].row[1];
	        	var fact = dataArr[k].row[2];

                // Add to facts array
	            if (cancerFactReln === collatedFactObj.category) {
	            	factsArr.push(fact);
	            }
            }

            // Array of facts of this category
            // Remove duplicates using lodash's _.uniqWith()
            collatedFactObj.facts = _.uniqWith(factsArr, _.isEqual);

            // Add collatedFactObj to cancerSummary.collatedFacts
            cancerSummary.collatedFacts.push(collatedFactObj);
        }

        return cancerSummary;
    },

    // Multiple tumors sometimes
    getTumorSummary: function(neo4jRawJson) {
    	//return neo4jRawJson;

        var self = this;

    	var tumors = {};
        // tumors object has two properties: 'commonCategories' and 'data'
        // If there's only one tumor, commonCategories contains all categories of this tumor, 
        // and thus tumor.factsOfUiqueCategories will be empty array
    	tumors.commonCategories = [];
    	tumors.data = [];

    	var allTumorFactRelnArr = [];

    	var dataArr = neo4jRawJson.results[0].data;

        // Build an arry of unique tumors
        var tumorIdArr = [];

        for (var i = 0; i < dataArr.length; i++) {
            if (tumorIdArr.indexOf(dataArr[i].row[0]) ===-1) {
                tumorIdArr.push(dataArr[i].row[0]);
            }
        }

        // Build new data structure
        for (var j = 0; j < tumorIdArr.length; j++) {
            // Collect categories of each tumor
            var tumorFactRelnArr = this.getTumorFactRelnArr(dataArr, tumorIdArr[j]);
            allTumorFactRelnArr.push(tumorFactRelnArr);
        }

        // Find the common categories across tumors
        var commonFactRelationships = allTumorFactRelnArr.shift().filter(function(v) {
		    return allTumorFactRelnArr.every(function(a) {
		        return a.indexOf(v) !== -1;
		    });
		});
        
        // Sort this commonFactRelationships in a specific order
        // categories not in this order will be listed at the bottom
        // based on their original order
        var order = [
            'hasTumorType',
            'hasBodySite',
            'hasDiagnosis',
            'hasTreatment'
        ];

        // Sort the commonFactRelationships by the item's index in the order array
        this.sortedCommonFactRelationships = this.sortByProvidedOrder(commonFactRelationships, order);

        // Convert the 'hasXXX' relationship to category
        var commonCats = [];
	    this.sortedCommonFactRelationships.forEach(function(item) {
	    	var relationship2Category = self.toNonCamelCase(item.substring(3));
	    	commonCats.push(relationship2Category);
	    });

        // This ensures reset this.commonCategories every time we call getTumors()
        // otherwise it will keep appending categories
        this.commonCategories = commonCats;

        // Add to tumors 
        tumors.commonCategories = this.commonCategories;

        // Add each tumor to tumors array
        for (var j = 0; j < tumorIdArr.length; j++) {
            var tumor = this.getTumor(dataArr, tumorIdArr[j]);
            
            tumors.data.push(tumor);
        }

//console.log(JSON.stringify(tumors, null, 4));

        return tumors;
    },

    // Get an arry of tumor fact relationships without duplicates
    getTumorFactRelnArr: function(dataArr, tumorId) {
        // Build an arry of unique tumorFactReln
        var uniqueTumorFactRelnArr = [];

        for (var i = 0; i < dataArr.length; i++) {
        	if (dataArr[i].row[0] === tumorId && uniqueTumorFactRelnArr.indexOf(dataArr[i].row[1]) === -1) {
                uniqueTumorFactRelnArr.push(dataArr[i].row[1]);
        	}
        }

        return uniqueTumorFactRelnArr;
    },

    // Group tumor facts by common categories and unique categories
    // If there's only one tumor, tumor.factsOfCommonCategories has all
    getTumor: function(dataArr, tumorId) {
        var self = this;
        
        // Each tumor object has the following properties: 
        // "id", "factsOfCommonCategories", "factsOfUiqueCategories"
        var tumor = {};

        // Remove the "TumorSummary-" prefix from "TumorSummary-MergedTumor-23781020"
        tumor.id = tumorId.replace('TumorSummary-', '');
        
        // Common categories across all tumors
        tumor.factsOfCommonCategories = [];

        // Unique categories only found in this tumor
        tumor.factsOfUniqueCategories = [];

        // Build an arry of unique tumorFactReln, no duplicates
        // This is not the formatted categories, it a list of "hasXXX"
        var tumorFactRelnNoDuplicates = this.getTumorFactRelnArr(dataArr, tumorId);

        // Need to get the unique categories
        var uniqueFactRelationships = tumorFactRelnNoDuplicates.filter(function(item) {
            return (self.sortedCommonFactRelationships.indexOf(item) === -1);
        });

        // Group all common categories and their facts
        tumor.factsOfCommonCategories = this.getCollatedTumorFacts(dataArr, tumorId, this.sortedCommonFactRelationships);
        
        // Group all tumor unique/specific categories and their facts
        tumor.factsOfUniqueCategories = this.getCollatedTumorFacts(dataArr, tumorId, uniqueFactRelationships);
        
        return tumor;
    },

    // Group tumor facts by categories
    getCollatedTumorFacts: function(dataArr, tumorId, categoriesArr) {
        var factsOfCategories = [];

        for (var j = 0; j < categoriesArr.length; j++) {
            var collatedFactObj = {};

            // The name of category
            collatedFactObj.category = categoriesArr[j];
            // toNonCamelCase, remove 'has' from beginning
            collatedFactObj.categoryName = this.toNonCamelCase(categoriesArr[j].substring(3));
 
            var factsArr = [];
            // Loop through the origional data
            for (var k = 0; k < dataArr.length; k++) {
                var cancerFactReln = dataArr[k].row[1];
                var fact = dataArr[k].row[2];

                // Add to facts array
                if (dataArr[k].row[0] === tumorId && cancerFactReln === collatedFactObj.category) {
                    factsArr.push(fact);
                }
            }

            // Array of facts of this category
            // Remove duplicates using lodash's _.uniqWith()
            collatedFactObj.facts = _.uniqWith(factsArr, _.isEqual);

            // Add collatedFactObj to tumor.uniqueCategories
            factsOfCategories.push(collatedFactObj);
        }

        return factsOfCategories;
    },

    // One fact can have multiple matching texts
    // or the same matching text can be found in multiple places in the same report
    getFact: function(neo4jRawJson) {
    	var factJson = {};

        var dataArr = neo4jRawJson.results[0].data;

//console.log(JSON.stringify(dataArr, null, 4));

        // factJson object has properties: 
        // "detail", "textProvenances", "ordinalInterpretations", "procedures"
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
        factJson.textProvenances = _.uniqWith(textProvenancesArr, _.isEqual);
        factJson.ordinalInterpretations = _.uniqWith(ordinalInterpretationsArr, _.isEqual);
        factJson.procedures = _.uniqWith(proceduresArr, _.isEqual);
        factJson.lateralities = _.uniqWith(lateralitiesArr, _.isEqual);
        factJson.bodyModifiers = _.uniqWith(bodyModifiersArr, _.isEqual);

    	return factJson;
    },

    getReportText: function(neo4jRawJson) {
        return neo4jRawJson.results[0].data[0].row[0].text;
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

        // Format/normalize the report type (with index 3)
        // E.g., from "Radiology_report" to "Radiology Report"
        // Each report is an array
        dataArr.forEach(function(currentValue, index, array) {
            // Lowercase the type and split into an array
            var typeArr = currentValue.row[3].toLowerCase().split('_');
            typeArr.forEach(function(v, i, a) {
                // Capitalize
                a[i] = v.charAt(0).toUpperCase() + v.substr(1);
            });

            // Joins all elements of the typeArr into a string
            array[index].row[3] = typeArr.join(' ');
        });

        // Now we just put the data we need together
        var arr = [];

        for (var i = 0; i < dataArr.length; i++) {
            arr.push(dataArr[i].row);
        }

        return arr;
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

    // E.g., convert "hasBodySite" into " Body Site"
    toNonCamelCase: function(text) {
        var result = text.replace( /([A-Z])/g, " $1" );
        var str = result.charAt(0).toUpperCase() + result.slice(1);
        // Trim out the beginning space
        return str.trim();
    }
};

// Expose the DataProcessor class as a local module
module.exports = DataProcessor;

