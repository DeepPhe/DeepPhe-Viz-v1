'use strict';

var util = {
    convertPatientsJson: function(neo4jRawJson) {
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

    convertPatientJson: function(neo4jRawJson) {
    	//return neo4jRawJson;

    	var cancerSummary = {};
    	var dataArr = neo4jRawJson.data;
    	cancerSummary.id = dataArr[0][0].data.id;
        cancerSummary.collatedFacts = [];

        // Build an arry of unique cancerFactReln
        var uniqueCancerFactRelnArr = [];

        for (var i = 0; i < dataArr.length; i++) {
            if (uniqueCancerFactRelnArr.indexOf(dataArr[i][1].data.name) ===-1) {
                uniqueCancerFactRelnArr.push(dataArr[i][1].data.name);
            }
        }

        // Build new data structure
        for (var j = 0; j < uniqueCancerFactRelnArr.length; j++) {
            var collatedFactObj = {};

            // The name of category
            collatedFactObj.category = uniqueCancerFactRelnArr[j];
            // Array of facts of this category
            collatedFactObj.facts = [];

            // Loop through the origional data
            for (var k = 0; k < dataArr.length; k++) {
            	var cancerFactReln = dataArr[k][1].data;
	        	var fact = dataArr[k][2].data;

                // Add to facts array
	            if (cancerFactReln.name === collatedFactObj.category && collatedFactObj.facts.indexOf(fact) === -1) {
	            	collatedFactObj.facts.push(fact);
	            	// Need to delete the added fact from dataArr for better performance?
	            	// So we won't need to check it for the next category?
	            }
            }

            // Add collatedFactObj to cancerSummary.collatedFacts
            cancerSummary.collatedFacts.push(collatedFactObj);
        }

        return cancerSummary;
    }
}

module.exports = util;

