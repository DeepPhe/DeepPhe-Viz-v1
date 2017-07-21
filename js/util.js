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

        for (var i = 0; i < dataArr.length; i++) {
        	var cancerFactReln = dataArr[i][1];
        	var fact = dataArr[i][2];
        	var factModifier = dataArr[i][3];
        	var modifierFact = dataArr[i][4];

        	var obj = {};
        	obj.category = cancerFactReln.data.name;
        	obj.facts = [];
        	obj.facts.push(fact.data);

            cancerSummary.collatedFacts.push(obj);
        }

        return cancerSummary;
    }
}

module.exports = util;

