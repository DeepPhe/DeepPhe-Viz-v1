'use strict';

// User Defined Neo4j Functions
// Functions are simple computations / conversions and return a single value
const neo4jFunctions = {

	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            COHORT DATA
	//
	////////////////////////////////////////////////////////////////////////////////////////
    getCohortData: function() {
    	return 'return deepphe.getCohortData() AS cohortData';
	},

    getDiagnosis: function(patientIds) {
    	return "return deepphe.getDiagnosis(['"+ patientIds.join("','") + "']) AS diagnosis";
	},

    getPatientsTumorInfo: function(patientIds) {
      	return "return deepphe.getPatientsTumorInfo(['"+ patientIds.join("','") + "']) AS patientsTumorInfo";
	},


	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            INDIVIDUAL PATIENT DATA
	//
	/////////////////////////////////////////////////////////////////////////////////////////

    getPatientInfo: function(patientId) {
    	return "return deepphe.getPatientInfo('"+ patientId + "') AS patientInfo";
	},

    getCancerSummary: function(patientId) {
   	    return "return deepphe.getCancerSummary('"+ patientId + "') AS cancerSummary";
	},

    getTumorSummary: function(patientId, cancerId) {
    	return "return deepphe.getTumorSummary('"+ patientId + "', '" + cancerId + "') AS tumorSummary";
	},

	getTimelineData: function(patientId) {
		return "return deepphe.getTimelineData('"+ patientId + "') AS timelineData";
	},

    getReport: function(reportId) {
    	return "return deepphe.getReport('"+ reportId + "') AS report";
	},

	getFact: function(factId) {
		return "return deepphe.getFact('"+ factId + "') AS fact";
	}


}

/**
 * Expose the neo4jFunctions class as a local module
 */
module.exports = neo4jFunctions;