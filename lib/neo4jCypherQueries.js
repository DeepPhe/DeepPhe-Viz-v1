'use strict';

var neo4jCypherQueries = {
	// Instead of using Cypher query, we can also do a direct API call 
	// http://localhost:7474/db/data/label/Patient/nodes to get all the nodes with "Patient" label
    
    
    getAllPatients: function() {
		let query = "MATCH (p:Patient)-->(cancer:Cancer)-[r:hasCancerStage]->(f:Fact) " +
					"RETURN p, f.prettyName";
		return {"statement": query};
	},

    getPatientsTumorInfo: function(patientNames, cancerId) {
        let query = "MATCH (p:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact) " +
        			"WHERE p.name IN ['" + patientNames.join("','") + "'] AND cancer.id = '" + cancerId + "' " +
                    "OPTIONAL MATCH (p:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact)-[rel]->(f:Fact) " +
					"WHERE rel.name = 'OrdinalInterpretation' OR rel.name = 'Laterality' " +
					"RETURN p.name, tumor.id,tumorFactReln.name,fact,rel,f";
		return {"statement": query};
	},

    getDiagnosis: function(patientNames, cancerId) {
        let query = "MATCH (p:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[:hasDiagnosis]->(fact:Fact) " +
        			"WHERE p.name IN ['" + patientNames.join("','") + "'] AND cancer.id = '" + cancerId + "' " +
					"RETURN p.name, fact.prettyName";
		return {"statement": query};
	},

    getPatientInfo: function(patientName) {
		let query = "MATCH (p:Patient) " +
					"WHERE p.name = '" + patientName + "' " +
					"RETURN p";
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
		let query = "MATCH (p:Patient)-->(cancer:Cancer)-[cancerFactReln]->(fact:Fact) " +
					"WHERE p.name = '" + patientName + "' " +
					"RETURN cancer.id,cancerFactReln.name,fact";
		return {"statement": query};
	},

    getTumorSummary: function(patientName, cancerId) {
        let query = "MATCH (p:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact) " +
        			"WHERE p.name = '" + patientName + "' AND cancer.id = '" + cancerId + "' " +
                    "OPTIONAL MATCH (p:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact)-[rel]->(f:Fact) " +
					"WHERE rel.name = 'OrdinalInterpretation' OR rel.name = 'Laterality' " +
					"RETURN tumor.id,tumorFactReln.name,fact,rel,f";
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