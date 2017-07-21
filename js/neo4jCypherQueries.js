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

	getPatient: function(patientName) {
		// Find and return all nodes with Patient label, and the patient has tumor fact?
		// Relationships are basically an arrow --> between two nodes.
		// Additional information can be placed in square brackets inside of the arrow.
		var query = "MATCH (p:Patient)-->(c:Cancer)-->(t:Tumor)-[rel]->(f:Fact) " +
					"WHERE p.name = '" + patientName + "' " +
					"RETURN p.name,c.id,t.id,type(rel),f.name,f.uri";
		return query;
	},

	getReports: function(patientName) {
		var query = "MATCH (p:Patient {name:'" + patientName + "'})-->(r:Report) " +
					"RETURN r";
		return query;
	},
    
    getCancers: function(patientName) {
		var query = "MATCH (patient:Patient)-->(cancer:Cancer)-[cancerFactReln]->(fact:Fact) " +
					"WHERE patient.name = '" + patientName + "' " +
					"WITH cancer,cancerFactReln,fact " +
					"OPTIONAL MATCH (fact)-[factModifier]->(modifierFact:Fact) " +
					"WHERE factModifier.name <> 'hasProvenance' " +
					"RETURN cancer,cancerFactReln,fact,factModifier,modifierFact";
		return query;
	},

	getFact: function(factId) {
        var query = "MATCH (fact:Fact {id:'" + factId +"'}) " +
					"OPTIONAL MATCH (fact)-[rel]->(n) " +
					"RETURN fact,rel,n";
		return query;
	}

};

module.exports = neo4jCypherQueries;