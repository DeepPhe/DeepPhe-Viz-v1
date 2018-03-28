'use strict';

var neo4jCypherQueries = {
	getAllPatients: function() {
		var query = "MATCH (p:Patient) RETURN p.name";
		return {"statement": query};
	},

    addBirthday: function(patientName, birthday) {
		var query = "MATCH (p:Patient) " +
		            "WHERE p.name = '" + patientName + "' " +
		            "SET p.birthday = '" + birthday + "'";
		return {"statement": query};
	},

	// Instead of using Cypher query, we can also do a direct API call 
	// http://localhost:7474/db/data/label/Patient/nodes to get all the nodes with "Patient" label
	getPatients: function() {
		var query = "MATCH (p:Patient)-->(cancer:Cancer)-[cancerFactReln:hasCancerStage]->(fact:Fact) " +
		            "RETURN p,fact.prettyName";
		// Need to wrap the query string into a JSON object with "statement" key
		return {"statement": query};
	},

    // Use DISTINCT to exclude duplicates
    getCancerStages: function() {
		var query = "MATCH (p:Patient)-->(cancer:Cancer)-[r:hasCancerStage]->(f:Fact) " +
					"RETURN p.name, f.prettyName";
		return {"statement": query};
	},

	getReports: function(patientName) {
		// Use DISTINCT to exclude duplicates
		// Adding "ORDER BY r.principalDate" to sort the dates doesn't work
		var query = "MATCH (p:Patient)-->(r:Report)-->(e:Episode) " +
		            "WHERE p.name = '" + patientName + "' " +
		            "OPTIONAL MATCH (r:Report)-->(e:Episode) " +
					"RETURN DISTINCT r.id, r.principalDate, r.title, r.type, e.type AS episode";
		return {"statement": query};
	},
    
    getReport: function(reportId) {
		var query = "MATCH (r:Report {id:'" + reportId + "'}) " +
		            "OPTIONAL MATCH (n:TextMention {documentId:'" + reportId + "'}) " +
					"RETURN DISTINCT r.text, n.text, n.startOffset, n.endOffset";
		return {"statement": query};
	},

    getCancerSummary: function(patientName) {
		var query = "MATCH (p:Patient)-->(cancer:Cancer)-[cancerFactReln]->(fact:Fact) " +
					"WHERE p.name = '" + patientName + "' " +
					"RETURN cancer.id,cancerFactReln.name,fact";
		return {"statement": query};
	},

    getTumorSummary: function(patientName, cancerId) {
        var query = "MATCH (p:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact) " +
        			"WHERE p.name = '" + patientName + "' AND cancer.id = '" + cancerId + "' " +
                    "OPTIONAL MATCH (p:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact)-[rel]->(f:Fact) " +
					"WHERE rel.name = 'OrdinalInterpretation' OR rel.name = 'Laterality' " +
					"RETURN tumor.id,tumorFactReln.name,fact,rel,f";
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

/**
 * Expose the neo4jCypherQueries objection as a local module
 */
module.exports = neo4jCypherQueries;