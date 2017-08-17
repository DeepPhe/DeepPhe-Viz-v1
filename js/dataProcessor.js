'use strict';

// Load the full build of lodash
var _ = require('lodash');

// Class declaration, constructor
var DataProcessor = function() {
    // In the format of "hasXXX"
    this.sortedCommonFactRelationships = [];

    // Space seperated and captalized words
    this.commonCategories = [];
};

// Add methods to DataProcessor.prototype
DataProcessor.prototype = {
    getPatientsJson: function(neo4jRawJson) {
        var patientsJson = {};
        var dataArr = neo4jRawJson.data;
        var patientsArr = [];

        for (var i = 0; i < dataArr.length; i++) {
        	var patient = {};
        	patient.id = dataArr[i][0].metadata.id;
        	patient.name = dataArr[i][0].data.name;
 
            patientsArr.push(patient);
        }
        
        // Add "patients" key as patients array data
        patientsJson.patients = patientsArr;

        // Return the JSON object
        return patientsJson;
    },

    getCancerSummaryJson: function(neo4jRawJson) {
    	//return neo4jRawJson;

        // "id" and "collatedFacts" are the keys of this object
    	var cancerSummary = {};
    	var dataArr = neo4jRawJson.data;

        // Remove the "CancerSummary-" prefix from "CancerSummary-Breast"
    	cancerSummary.id = dataArr[0][0].replace('CancerSummary-', '');
        cancerSummary.collatedFacts = [];

        // Build an arry of unique cancerFactReln
        var uniqueCancerFactRelnArr = [];

        for (var i = 0; i < dataArr.length; i++) {
            if (uniqueCancerFactRelnArr.indexOf(dataArr[i][1]) ===-1) {
                uniqueCancerFactRelnArr.push(dataArr[i][1]);
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
        
        // https://stackoverflow.com/questions/18859186/sorting-an-array-of-javascript-objects-a-specific-order-using-existing-function
        var orderMap = {};
        // Using lodash's `_.forEach()`, `_.sortBy` and `_.indexOf`
        _.forEach(order, function(item) { 
            // Remember the index of each item in order array
            orderMap[item] = _.indexOf(order, item); 
        });

        // Sort the uniqueCancerFactRelnArr by the item's index in the order array
        var sortedUniqueCancerFactRelnArr = _.sortBy(uniqueCancerFactRelnArr, function(item){ 
            //console.log(item + "-->" + orderMap[item]);
            return orderMap[item];
        });

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
            	var cancerFactReln = dataArr[k][1];
	        	var fact = dataArr[k][2].data;

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
    getTumorsArr: function(neo4jRawJson) {
    	//return neo4jRawJson;

        var self = this;

    	var tumors = {};
        // tumors object has two properties: 'commonCategories' and 'data'
        // If there's only one tumor, commonCategories contains all categories of this tumor, 
        // and thus tumor.factsOfUiqueCategories will be empty array
    	tumors.commonCategories = [];
    	tumors.data = [];

    	var allTumorFactRelnArr = [];

    	var dataArr = neo4jRawJson.data;

        // Build an arry of unique tumors
        var tumorIdArr = [];

        for (var i = 0; i < dataArr.length; i++) {
            if (tumorIdArr.indexOf(dataArr[i][0]) ===-1) {
                tumorIdArr.push(dataArr[i][0]);
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
            'hasBodySite'
        ];
        
        // https://stackoverflow.com/questions/18859186/sorting-an-array-of-javascript-objects-a-specific-order-using-existing-function
        var orderMap = {};
        // Using lodash's `_.forEach()`, `_.sortBy` and `_.indexOf`
        _.forEach(order, function(item) { 
            // Remember the index of each item in order array
            orderMap[item] = _.indexOf(order, item); 
        });

        // Sort the commonFactRelationships by the item's index in the order array
        this.sortedCommonFactRelationships = _.sortBy(commonFactRelationships, function(item){ 
            //console.log(item + "-->" + orderMap[item]);
            return orderMap[item];
        });


        // Convert the 'hasXXX' relationship to category
        var commonCats = [];
	    this.sortedCommonFactRelationships.forEach(function(item) {
	    	var relationship2Category = self.toNonCamelCase(item.substring(3));
	    	commonCats.push(relationship2Category);
	    });

        // This ensures reset this.commonCategories every time we call getTumorsArr()
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

    getTumorFactRelnArr: function(dataArr, tumorId) {
        // Build an arry of unique tumorFactReln
        var uniqueTumorFactRelnArr = [];

        for (var i = 0; i < dataArr.length; i++) {
        	if (dataArr[i][0] === tumorId && uniqueTumorFactRelnArr.indexOf(dataArr[i][1]) === -1) {
                uniqueTumorFactRelnArr.push(dataArr[i][1]);
        	}
        }

        return uniqueTumorFactRelnArr;
    },

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
        tumor.factsOfUiqueCategories = [];

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
                var cancerFactReln = dataArr[k][1];
                var fact = dataArr[k][2].data;

                // Add to facts array
                if (dataArr[k][0] === tumorId && cancerFactReln === collatedFactObj.category) {
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
    getFactJson: function(neo4jRawJson) {
    	var factJson = {};

        var dataArr = neo4jRawJson.data;

//console.log(JSON.stringify(dataArr, null, 4));

        // factJson object has properties: 
        // "detail", "textProvenances", "ordinalInterpretations", "procedures"
    	factJson.detail = dataArr[0][0].data;

        // This array may have duplicates
        var textProvenancesArr = [];
        var ordinalInterpretationsArr = [];
        var proceduresArr = [];
        var lateralitiesArr = [];
        var bodyModifiersArr = [];

        for (var i = 0; i < dataArr.length; i++) {
        	// Due to the use of "OPTIONAL MATCH" in cypher query, we may have nulls
            if (dataArr[i][1] !== null) {
                // We can also specify the relationship in Cypher query
                if (dataArr[i][1].data.name === 'hasTextProvenance') {
                    textProvenancesArr.push(dataArr[i][2].data);
                }

                if (dataArr[i][1].data.name === 'OrdinalInterpretation') {
                    ordinalInterpretationsArr.push(dataArr[i][2].data);
                }

                if (dataArr[i][1].data.name === 'Procedure') {
                    proceduresArr.push(dataArr[i][2].data);
                }

                if (dataArr[i][1].data.name === 'Laterality') {
                    lateralitiesArr.push(dataArr[i][2].data);
                }

                if (dataArr[i][1].data.name === 'BodyModifier') {
                    bodyModifiersArr.push(dataArr[i][2].data);
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

    // Sort from newest date to oldest date
    // Format the report type
    sortReportsByDate: function(arr) {
        // Date format returned by neo4j is "07/19/2006 09:33 AM EDT"
        arr.sort(function(a, b) {
            // Turn strings into dates, and then subtract them
            // to get a value that is either negative, positive, or zero.
            return (new Date(b[1]) - new Date(a[1]));
        });

//console.log(JSON.stringify(arr, null, 4));

        // Format/normalize the report type (with index 3)
        // E.g., from "Radiology_report" to "Radiology Report"
        // Each report is an array
        arr.forEach(function(currentValue, index, array) {
            // Lowercase the type and split into an array
            var typeArr = currentValue[3].toLowerCase().split('_');
            typeArr.forEach(function(v, i, a) {
                // Capitalize
                a[i] = v.charAt(0).toUpperCase() + v.substr(1);
            });

            // Joins all elements of the typeArr into a string
            array[index][3] = typeArr.join(' ');
        });

        return arr;
    },

    // E.g., convert "hasBodySite" into " Body Site"
    toNonCamelCase: function(text) {
        var result = text.replace( /([A-Z])/g, " $1" );
        var str = result.charAt(0).toUpperCase() + result.slice(1);
        // Trim out the beginning space
        return str.trim();
    }
}

module.exports = DataProcessor;

