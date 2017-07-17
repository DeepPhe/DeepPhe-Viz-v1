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
	}
};

module.exports = neo4jCypherQueries;