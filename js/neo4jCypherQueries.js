'use strict';

var neo4jCypherQueries = {
	// Instead of using Cypher query, we can also do a direct API call 
	// http://localhost:7474/db/data/label/Patient/nodes to get all the nodes with "Patient" label
	getPatients: function() {
		// Find and return all nodes with Patient label
		// p is the node variable name, Patient is the node label
		var query = "MATCH (p:Patient) RETURN p";
		return query;
	},

    getPatientSummary: function(patientName) {
		var query = "MATCH (p:Patient)" +
					"WHERE p.name = '" + patientName + "' " +
					"RETURN p";
		return query;
	},

	getReports: function(patientName) {
		var query = "MATCH (p:Patient {name:'" + patientName + "'})-->(r:Report) " +
					"RETURN r.id, r.principalDate, r.title, r.type, r.text";
		return query;
	},
    
    getReport: function(reportId) {
		var query = "MATCH (r:Report {id:'" + reportId + "'}) " +
					"RETURN r";
		return query;
	},

    // Old cypher query that returns everything
    getCancerSummaryOld: function(patientName) {
		var query = "MATCH (patient:Patient)-->(cancer:Cancer)-[cancerFactReln]->(fact:Fact) " +
					"WHERE patient.name = '" + patientName + "' " +
					"WITH cancer,cancerFactReln,fact " +
					"OPTIONAL MATCH (fact)-[factModifier]->(modifierFact:Fact) " +
					"WHERE factModifier.name <> 'hasProvenance' " +
					"RETURN cancer,cancerFactReln,fact,factModifier,modifierFact";
		return query;
	},
    
    getCancer: function(patientName) {
		var query = "MATCH (patient:Patient)-->(cancer:Cancer) " +
					"WHERE patient.name = '" + patientName + "' " +
					"RETURN cancer";
		return query;
	},

    getCancerSummary: function(patientName) {
		var query = "MATCH (patient:Patient)-->(cancer:Cancer)-[cancerFactReln]->(fact:Fact) " +
					"WHERE patient.name = '" + patientName + "' " +
					"RETURN cancer.id,cancerFactReln.name,fact";
		return query;
	},

	getFact: function(factId) {
        var query = "MATCH (fact:Fact {id:'" + factId +"'}) " +
					"OPTIONAL MATCH (fact)-[rel]->(n) " +
					"RETURN fact,rel,n";
		return query;
	},

    getTumorSummary: function(patientName, cancerId) {
        var query = "MATCH (patient:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact) " +
					"WHERE patient.name = '" + patientName + "' AND cancer.id = '" + cancerId + "' " +
					"RETURN tumor.id,tumorFactReln.name,fact";
		return query;
	},

	getTumorSummaryOld: function(patientName, cancerId) {
        var query = "MATCH (patient:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact) " +
					"WHERE patient.name = '" + patientName + "' AND cancer.id = '" + cancerId + "' " +
					"WITH tumor,tumorFactReln,fact " +
					"OPTIONAL MATCH (fact)-[factModifier]->(modifierFact:Fact) " +
					"WHERE factModifier.name <> 'hasProvenance' " +
					"RETURN tumor,tumorFactReln,fact,factModifier,modifierFact";
		return query;
	}

};

module.exports = neo4jCypherQueries;