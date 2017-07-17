var neo4jCypherQueries = {
	getPatients: function() {
		var query = "MATCH (p:Patient) RETURN p.name";
		return query;
	},

	getPatient: function(patientName) {
		var query = "MATCH (p:Patient)-->(c:Cancer)-->(t:Tumor)-[rel]->(f:Fact) " +
					"WHERE p.name = '" + patientName + "' " +
					"RETURN p.name,c.id,t.id,type(rel),f.name,f.uri";
		return query;
	},

    // This query returns empty data
	getReports: function(patientName) {
		var query = "MATCH (patient:Patient { name:'" + patientName + "'})-->(report:Report) " +
					"RETURN report";
		return query;
	},
    
    // This query returns empty data
    getCancers: function(patientName) {
		var query = "MATCH (patient:Patient)-->(cancer:Cancer)-[cancerFactReln]->(fact:Fact) " +
					"WHERE patient.name = '" + patientName + "' " +
					"WITH cancer,cancerFactReln,fact " +
					"OPTIONAL MATCH (fact)-[factModifier]->(modifierFact:Fact) " +
					"WHERE factModifier.name <> 'hasProvenance' " +
					"RETURN cancer,cancerFactReln,fact,factModifier,modifierFact";
		return query;
	}

};

module.exports = neo4jCypherQueries;