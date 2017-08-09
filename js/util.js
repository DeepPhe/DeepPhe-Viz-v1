'use strict';

// Load the full build of lodash
var _ = require('lodash');

var util = {
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

    	var cancerSummary = {};
    	var dataArr = neo4jRawJson.data;
    	// "id" and "collatedFacts" are the keys of this object
    	cancerSummary.id = dataArr[0][0];
        cancerSummary.collatedFacts = [];

        // Build an arry of unique cancerFactReln
        var uniqueCancerFactRelnArr = [];

        for (var i = 0; i < dataArr.length; i++) {
            if (uniqueCancerFactRelnArr.indexOf(dataArr[i][1]) ===-1) {
                uniqueCancerFactRelnArr.push(dataArr[i][1]);
            }
        }

        // Build new data structure
        for (var j = 0; j < uniqueCancerFactRelnArr.length; j++) {
            var collatedFactObj = {};

            // The name of category
            collatedFactObj.category = uniqueCancerFactRelnArr[j];
            // toNonCamelCase, remove 'has' from beginning
            collatedFactObj.categoryName = this.toNonCamelCase(uniqueCancerFactRelnArr[j].substring(3));

            // Array of facts of this category
            collatedFactObj.facts = [];

            // Loop through the origional data
            for (var k = 0; k < dataArr.length; k++) {
            	var cancerFactReln = dataArr[k][1];
	        	var fact = dataArr[k][2].data;

                // Add to facts array
	            if (cancerFactReln === collatedFactObj.category && collatedFactObj.facts.indexOf(fact) === -1) {
	            	collatedFactObj.facts.push(fact);
	            }
            }

            // Add collatedFactObj to cancerSummary.collatedFacts
            cancerSummary.collatedFacts.push(collatedFactObj);
        }

        return cancerSummary;
    },

    // Multiple tumors
    getTumorsArr: function(neo4jRawJson) {
    	//return neo4jRawJson;

        var self = this;

    	var tumors = [];

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
            var tumorFactRelnArr = this.getTumorCategories(dataArr, tumorIdArr[j]);
            allTumorFactRelnArr.push(tumorFactRelnArr);
        }

        // Find the common categories across tumors
        var commonFactRelationships = allTumorFactRelnArr.shift().filter(function(v) {
		    return allTumorFactRelnArr.every(function(a) {
		        return a.indexOf(v) !== -1;
		    });
		});

        var commonCategories = [];

        // Convert the 'hasXXX' relationship to category
	    commonFactRelationships.forEach(function(item) {
	    	var relationship2Category = self.toNonCamelCase(item.substring(3));
	    	commonCategories.push(relationship2Category);
	    });

        for (var j = 0; j < tumorIdArr.length; j++) {
            var tumor = this.getTumor(dataArr, tumorIdArr[j]);
            // Add commonCategories property
            tumor.commonCategories = commonCategories;
            // Add to tumors array
            tumors.push(tumor);
        }

        return tumors;
    },

    getTumorCategories: function(dataArr, tumorId) {
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
        var tumor = {};
        tumor.id = tumorId;
        tumor.collatedFacts = [];

        // Build an arry of unique tumorFactReln
        var uniqueTumorFactRelnArr = this.getTumorCategories(dataArr, tumorId);

        // Need to get the uncommon categories
       

        // Build new data structure
        for (var j = 0; j < uniqueTumorFactRelnArr.length; j++) {
            var collatedFactObj = {};

            // The name of category
            collatedFactObj.category = uniqueTumorFactRelnArr[j];
            // toNonCamelCase, remove 'has' from beginning
            collatedFactObj.categoryName = this.toNonCamelCase(uniqueTumorFactRelnArr[j].substring(3));
 
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

            // Add collatedFactObj to tumor.collatedFacts
            tumor.collatedFacts.push(collatedFactObj);
        }

        return tumor;
    },

    // One fact can have multiple matching texts
    // or the same matching text can be found in multiple places in the same report
    getFactJson: function(neo4jRawJson) {
    	var factJson = {};

        var dataArr = neo4jRawJson.data;

        // factJson object has properties: 
        // "detail", "textProvenances", "ordinalInterpretations", "procedures"
    	factJson.detail = dataArr[0][0].data;

        // This array may have duplicates
        var textProvenancesArr = [];
        var ordinalInterpretationsArr = [];
        var proceduresArr = [];

        for (var i = 0; i < dataArr.length; i++) {
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
        }

        // Remove duplicates using lodash's _.uniqWith()
        factJson.textProvenances = _.uniqWith(textProvenancesArr, _.isEqual);
        factJson.ordinalInterpretations = _.uniqWith(ordinalInterpretationsArr, _.isEqual);
        factJson.procedures = _.uniqWith(proceduresArr, _.isEqual);

    	return factJson;
    },

    // E.g., convert "hasBodySite" into " Body Site"
    toNonCamelCase: function(text) {
        var result = text.replace( /([A-Z])/g, " $1" );
        var str = result.charAt(0).toUpperCase() + result.slice(1);
        // Trim out the beginning space
        return str.trim();
    }
}

module.exports = util;

