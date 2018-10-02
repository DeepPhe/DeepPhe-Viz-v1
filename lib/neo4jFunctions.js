'use strict';

// User Defined Neo4j Functions
// Functions are simple computations / conversions and return a single value
const neo4jFunctions = {

	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            COHORT DATA
	//
	////////////////////////////////////////////////////////////////////////////////////////
    getCohortData: function(tx) {
    	let query = 'return deepphe.getCohortData() AS cohortData';
		return tx.run(query);
	},

    getDiagnosis: function(tx, patientIds) {
    	let query = "return deepphe.getDiagnosis(['"+ patientIds.join("','") + "']) AS diagnosis";
        return tx.run(query);
	},

    getPatientsTumorInfo: function(tx, patientIds) {
      	let query = "return deepphe.getPatientsTumorInfo(['"+ patientIds.join("','") + "']) AS patientsTumorInfo";
        return tx.run(query);
	},


	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            INDIVIDUAL PATIENT DATA
	//
	/////////////////////////////////////////////////////////////////////////////////////////

    getPatientInfo: function(tx, patientId) {
    	let query = "return deepphe.getPatientInfo('"+ patientId + "') AS patientInfo";
        return tx.run(query);
	},

    getCancerSummary: function(tx, patientId) {
   	    let query = "return deepphe.getCancerSummary('"+ patientId + "') AS cancerSummary";
        return tx.run(query);
	},

    getTumorSummary: function(tx, patientId, cancerId) {
    	let query = "return deepphe.getTumorSummary('"+ patientId + "', '" + cancerId + "') AS tumorSummary";
        return tx.run(query);
	},

	getTimelineData: function(tx, patientId) {
		let query = "return deepphe.getTimelineData('"+ patientId + "') AS timelineData";
        return tx.run(query);
	},

    getReport: function(tx, reportId) {
    	let query = "return deepphe.getReport('"+ reportId + "') AS report";
        return tx.run(query);
	},

	getFact: function(tx, factId) {
		let query = "return deepphe.getFact('"+ factId + "') AS fact";
        return tx.run(query);
	}


}

/**
 * Expose the neo4jFunctions class as a local module
 */
module.exports = neo4jFunctions;
