'use strict';

// Add methods to neo4jBoltFunctions.prototype
const neo4jBoltFunctions = {

	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            COHORT DATA
	//
	////////////////////////////////////////////////////////////////////////////////////////
    getCohortData: function(tx) {
    	let query = 'return deepphe.getCohortData() AS getCohortData';
		return tx.run(query);
	},

    getDiagnosis: function(tx,patientIds) {
    	let query = "return deepphe.getDiagnosis(['"+ patientIds.join("','") + "']) AS getDiagnosis";
        return tx.run(query);
	},

    getPatientsTumorInfo: function(tx,patientIds) {
      	let query = "return deepphe.getPatientsTumorInfo(['"+ patientIds.join("','") + "']) AS getPatientsTumorInfo";
        return tx.run(query);
	},


	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            INDIVIDUAL PATIENT DATA
	//
	/////////////////////////////////////////////////////////////////////////////////////////

    getPatientInfo: function(tx,patientId) {
		return tx.run('return deepphe.getPatientInfo ({$name})', {name: patientId} );
	},

   getCancerSummary: function(tx,patientId) {
      return tx.run('return deepphe.getCancerSummary ({$name})', {name: patientId} );
	},

    getTumorSummary: function(tx,patientId) {
      return tx.run('return deepphe.getTumorSummary ({$name})', {name: patientId} );
	},

	getTimelineData: function(tx,patientId) {
      return tx.run('return deepphe.getTimelineData ({$name})', {name: patientId} );
	},

    getReport: function(tx,reportId) {
      return tx.run('return deepphe.getReport ({$name})', {name: reportId} );
	},

	getFact: function(tx,factId) {
      return tx.run('return deepphe.getFact ({name: $name})', {name: factId} );
	}


}

/**
 * Expose the neo4jBoltFunctions class as a local module
 */
module.exports = neo4jBoltFunctions;
