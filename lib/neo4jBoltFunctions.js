'use strict';

/**
 * Module dependencies.
 */

// Load the full build of lodash
// Differences between core build and full build: https://github.com/lodash/lodash/wiki/Build-Differences
const _ = require('lodash');

// For writing debugging JSON into file
const fs = require('fs');


	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            Neo4j Bolt Interface
	//
	////////////////////////////////////////////////////////////////////////////////////////

// Use npm to find out the latest version of the driver:
//    npm show neo4j-driver@* version
//    npm install neo4j-driver

// API Docs
// https://neo4j.com/docs/api/javascript-driver/current/
// https://neo4j.com/docs/api/javascript-driver/1.6/

// Example
// https://github.com/neo4j-examples/movies-javascript-bolt

//
//    Create Driver
//

// Default bolt port is 7687
// Create a driver instance, for the user neo4j with password 123.
// It should be enough to have a single driver per database per application.
var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "123"));

driver.onCompleted = () => {
  console.log('Driver created');
};

driver.onError = error => {
  console.log(error);
};

//
//    Create Session
//

const session = driver.session();


// Add methods to neo4jBoltFunctions.prototype
const neo4jBoltFunctions = {



	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            COHORT DATA
	//
	////////////////////////////////////////////////////////////////////////////////////////
    getCohortData: function(tx) {
		return tx.run('deepphe.getCohortData()');
	},

    getDiagnosis: function(tx,patientIds) {
      return tx.run('deepphe.getDiagnosis ([{names: $names}])', {names: patientIds.join("','")} );
	},

    getPatientsTumorInfo: function(tx,patientIds) {
      return tx.run('deepphe.getPatientsTumorInfo ([{names: $names}])', {names: patientIds.join("','")} );
	},


	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            INDIVIDUAL PATIENT DATA
	//
	/////////////////////////////////////////////////////////////////////////////////////////

    getPatientInfo: function(tx,patientId) {
		return tx.run('deepphe.getPatientInfo ({name: $name})', {name: patientId} ));
	},

   getCancerSummary: function(tx,patientId) {
      return tx.run('deepphe.getCancerSummary ({name: $name})', {name: patientId} ));
	},

    getTumorSummary: function(tx,patientId) {
      return tx.run('deepphe.getTumorSummary ({name: $name})', {name: patientId} ));
	},

	getTimelineData: function(tx,patientId) {
      return tx.run('deepphe.getTimelineData ({name: $name})', {name: patientId} ));
	},

    getReport: function(tx,reportId) {
      return tx.run('deepphe.getReport ({name: $name})', {name: reportId} ));
	},

	getFact: function(tx,factId) {
      return tx.run('deepphe.getFact ({name: $name})', {name: factId} ));
	}


}

/**
 * Expose the neo4jBoltFunctions class as a local module
 */
module.exports = neo4jBoltFunctions;
