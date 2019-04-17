'use strict';

// User Defined Neo4j Functions
// Functions are simple computations / conversions and return a single value
const neo4jFunctions = {

	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            COHORT DATA
	//
	////////////////////////////////////////////////////////////////////////////////////////
    
    // The neo4j function deepphe.getCohortData() returns a list of patient data
    getCohortData: function() {
    	return 'return deepphe.getCohortData() AS cohortData';
	},

    // The neo4j function deepphe.getDiagnosis() returns a list of diagnosis per patient
    getDiagnosis: function(patientIds) {
    	return "return deepphe.getDiagnosis(['"+ patientIds.join("','") + "']) AS diagnosis";
	},

    // The neo4j function deepphe.getBiomarkers() returns a list of biomarkers information
    getBiomarkers: function(patientIds) {
      	return "return deepphe.getBiomarkers(['"+ patientIds.join("','") + "']) AS biomarkers";
	},


	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            INDIVIDUAL PATIENT DATA
	//
	/////////////////////////////////////////////////////////////////////////////////////////

    // The neo4j function deepphe.getPatientInfo() returns the patient properties as a JSON directly
    getPatientInfo: function(patientId) {
    	return "return deepphe.getPatientInfo('"+ patientId + "') AS patientInfo";
	},

    // The neo4j function deepphe.getCancerAndTumorSummary() returns a list
    getCancerAndTumorSummary: function(patientId) {
   	    return "return deepphe.getCancerAndTumorSummary('"+ patientId + "') AS cancerAndTumorSummary";
	},

    // The neo4j function deepphe.getTimelineData() returns the patient information adn a list of all the reports
	getTimelineData: function(patientId) {
		return "return deepphe.getTimelineData('"+ patientId + "') AS timelineData";
	},

    // The neo4j function deepphe.getReport() returns the report text and all text mentions as a JSON directly
    getReport: function(reportId) {
    	return "return deepphe.getReport('"+ reportId + "') AS report";
	},

    // The neo4j function deepphe.getFact() returns the fact and all text mentions as a JSON directly
	getFact: function(patientId, factId) {
		return "return deepphe.getFact('"+ patientId + "', '"+ factId + "') AS fact";
	},

    /////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            API ONLY
	//
	/////////////////////////////////////////////////////////////////////////////////////////
    // The neo4j function deepphe.getAllPatients() returns a list of patient nodes
    getAllPatients: function() {
    	return 'return deepphe.getAllPatients() AS allPatients';
	}
    
}

/**
 * Expose the neo4jFunctions class as a local module
 */
module.exports = neo4jFunctions;
