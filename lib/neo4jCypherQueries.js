'use strict';

const neo4jCypherQueries = {
	
	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            COHORT DATA
	//
	////////////////////////////////////////////////////////////////////////////////////////
    getCohortData: function() {
		let query = "MATCH (p:Patient)-->(cancer:Cancer)-[r:hasCancerStage]->(f:Fact) " +
					"RETURN p, f.prettyName";
		return {"statement": query};
	},

    getDiagnosis: function(patientIds) {
        let query = "MATCH (p:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[:hasDiagnosis]->(fact:Fact) " +
        			"WHERE p.name IN ['" + patientIds.join("','") + "'] " +
					"RETURN p.name, fact.prettyName";
		return {"statement": query};
	},

    getPatientsTumorInfo: function(patientIds) {
        let query = "MATCH (p:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact) " +
        			"WHERE p.name IN ['" + patientIds.join("','") + "'] " +
                    "OPTIONAL MATCH (p:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact)-[rel]->(f:Fact) " +
					"WHERE rel.name = 'OrdinalInterpretation' OR rel.name = 'Laterality' " +
					"RETURN p.name, tumor.id,tumorFactReln.name,fact,rel,f";
		return {"statement": query};
	},

	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            INDIVIDUAL PATIENT DATA
	//
	/////////////////////////////////////////////////////////////////////////////////////////
    getPatientInfo: function(patientId) {
		let query = "MATCH (p:Patient) " +
					"WHERE p.name = '" + patientId + "' " +
					"RETURN p";
		return {"statement": query};
	},

    getCancerSummary: function(patientId) {
		let query = "MATCH (p:Patient)-->(cancer:Cancer)-[cancerFactReln]->(fact:Fact) " +
					"WHERE p.name = '" + patientId + "' " +
					"RETURN cancer.id,cancerFactReln.name,fact";
		return {"statement": query};
	},

    getTumorSummary: function(patientId) {
        let query = "MATCH (p:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact) " +
        			"WHERE p.name = '" + patientId + "' " +
                    "OPTIONAL MATCH (p:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact)-[rel]->(f:Fact) " +
					"WHERE rel.name = 'OrdinalInterpretation' OR rel.name = 'Laterality' " +
					"RETURN tumor.id,tumorFactReln.name,fact,rel,f";
		return {"statement": query};
	},

	getTimelineData: function(patientId) {
		// Use DISTINCT to exclude duplicates
		// Adding "ORDER BY r.principalDate" to sort the dates doesn't work
		let query = "MATCH (p:Patient)-->(r:Report)-->(e:Episode) " +
		            "WHERE p.name = '" + patientId + "' " +
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
 * Expose the neo4jCypherQueries object as a local module
 */
module.exports = neo4jCypherQueries;