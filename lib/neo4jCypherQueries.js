'use strict';

const neo4jCypherQueries = {
	// Instead of using Cypher query, we can also do a direct API call 
	// http://localhost:7474/db/data/label/Patient/nodes to get all the nodes with "Patient" label
    
    
    getCohortData: function() {
		let query = "RETURN deepphe.getCohortData()";
		return {"statement": query};
	},

    getPatientsTumorInfo: function(patientNames) {
        let query = "RETURN deepphe.getPatientsTumorInfo(['" + patientNames.join("','") + "'])";
		return {"statement": query};
	},

    getDiagnosis: function(patientNames) {
        let query = "RETURN deepphe.getDiagnosis(['" + patientNames.join("','") + "'])";
		return {"statement": query};
	},

    getPatientInfo: function(patientName) {
		let query = "RETURN deepphe.getPatientInfo('" + patientName + "')";
		return {"statement": query};
	},

	getReports: function(patientName) {
		// Use DISTINCT to exclude duplicates
		// Adding "ORDER BY r.principalDate" to sort the dates doesn't work
		let query = "MATCH (p:Patient)-->(r:Report)-->(e:Episode) " +
		            "WHERE p.name = '" + patientName + "' " +
		            "OPTIONAL MATCH (r:Report)-->(e:Episode) " +
					"RETURN DISTINCT r.id, r.principalDate, r.title, r.type, e.type AS episode, p";
		return {"statement": query};
	},
    
    getReport: function(reportId) {
		let query = "MATCH (r:Report {id:'" + reportId + "'}) " +
		            "OPTIONAL MATCH (n:TextMention {documentId:'" + reportId + "'}) " +
					"RETURN DISTINCT r.text, n.text, n.startOffset, n.endOffset";
		return {"statement": query};
	},

    getCancerSummary: function(patientName) {
		let query = "RETURN deepphe.getCancerSummary('" + patientName + "')";
		return {"statement": query};
	},

    getTumorSummary: function(patientName) {
        let query = "RETURN deepphe.getTumorSummary('" + patientName + "')";
		return {"statement": query};
	},

	getFact: function(factId) {
        // The OPTIONAL MATCH clause is used to search for the pattern described in it, 
        // while using nulls for missing parts of the pattern.
        let query = "MATCH (fact:Fact {id:'" + factId +"'}) " +
					"OPTIONAL MATCH (fact)-[rel]->(n) " +
					"RETURN fact,rel,n";
		return {"statement": query};
	}

};

/**
 * Expose the neo4jCypherQueries objection as a local module
 */
module.exports = neo4jCypherQueries;