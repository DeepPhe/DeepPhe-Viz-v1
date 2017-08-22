'use strict';

var neo4jCypherQueries = {
	// Instead of using Cypher query, we can also do a direct API call 
	// http://localhost:7474/db/data/label/Patient/nodes to get all the nodes with "Patient" label
	getPatients: function() {
		// Find and return all nodes with Patient label
		// p is the node variable name, Patient is the node label
		var query = "MATCH (p:Patient) RETURN p";
		// Need to wrap the query string into a JSON object with "statement" key
		return {"statement": query};
	},

	getReports: function(patientName) {
		// Use DISTINCT to exclude duplicates
		// Adding "ORDER BY r.principalDate" to sort the dates doesn't work
		var query = "MATCH (p:Patient {name:'" + patientName + "'})-->(r:Report) " +
					"RETURN DISTINCT r.id, r.principalDate, r.title, r.type, r.text";
		return {"statement": query};
	},
    
    getReport: function(reportId) {
		var query = "MATCH (r:Report {id:'" + reportId + "'}) " +
					"RETURN r";
		return {"statement": query};
	},

    getCancerSummary: function(patientName) {
		var query = "MATCH (patient:Patient)-->(cancer:Cancer)-[cancerFactReln]->(fact:Fact) " +
					"WHERE patient.name = '" + patientName + "' " +
					"RETURN cancer.id,cancerFactReln.name,fact";
		return {"statement": query};
	},
    
    getTumorSummary: function(patientName, cancerId) {
        var query = "MATCH (patient:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact) " +
					"WHERE patient.name = '" + patientName + "' AND cancer.id = '" + cancerId + "' " +
					"RETURN tumor.id,tumorFactReln.name,fact";
		return {"statement": query};
	},

	getFact: function(factId) {
        // The OPTIONAL MATCH clause is used to search for the pattern described in it, 
        // while using nulls for missing parts of the pattern.
        var query = "MATCH (fact:Fact {id:'" + factId +"'}) " +
					"OPTIONAL MATCH (fact)-[rel]->(n) " +
					"RETURN fact,rel,n";
		return {"statement": query};
	}

};

// Expose the neo4jCypherQueries objection as a local module
module.exports = neo4jCypherQueries;