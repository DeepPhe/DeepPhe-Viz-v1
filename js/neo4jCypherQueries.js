var neo4jCypherQueries = {
	getPatient: function(patientName) {
		var cypherQuery = "MATCH (p:Patient)-->(c:Cancer)-->(t:Tumor)-[rel]->(f:Fact) " +
							"WHERE p.name = '" + patientName + "' " +
							"RETURN p.name,c.id,t.id,type(rel),f.name,f.uri";
		return cypherQuery;
	}
};

module.exports = neo4jCypherQueries;