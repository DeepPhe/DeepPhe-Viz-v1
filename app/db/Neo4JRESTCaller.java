package db;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.client.Entity;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.org.apache.bcel.internal.generic.RETURN;
import org.glassfish.jersey.client.ClientConfig;
import org.glassfish.jersey.client.authentication.HttpAuthenticationFeature;

import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import static org.neo4j.io.fs.FileUtils.path;

public class Neo4JRESTCaller {

	private static final String DEFAULT_LOCALNEO4j = "http://localhost:7474/db/data/";


	private static final String NODES_SUFFIX = "/nodes";
	private static final String INCOMING_RELATIONS_SUFFIX = "/relationships/in";
	private static final String OUTGOING_RELATIONS_SUFFIX = "/relationships/out";

	String serverRootURI = DEFAULT_LOCALNEO4j;

	String username = null;
	String password = null;
	
	
	public Neo4JRESTCaller(String serverRootURI, String username, String password) {
		this.serverRootURI = serverRootURI;
		this.username = username;
		this.password = password;
	}

	/*****************  JSON Methods **********************/
	public String	getNodesWithLabelJSON(String label) throws JsonParseException, JsonMappingException, IOException{
		String restURI = serverRootURI + "label/" + label + NODES_SUFFIX;
		String jsonStr = makeRESTCall(restURI);
		return jsonStr;
	}


	public String getPatientJSON(String patientName) {
		String cypherQuery =  "MATCH (p:Patient)-->(c:Cancer)-->(t:Tumor)-[rel]->(f:Fact) " +
						"WHERE p.name = '" + patientName + "' " +
						"RETURN p.name,c.id,t.id,type(rel),f.name,f.uri";

		return makeCypherCall(cypherQuery);
	}

	public String getFactJSON(String factId) throws IOException {
//		String cypherQuery = "MATCH (fact:Fact)-[rel]->(n) " +
//							"WHERE fact.id = '" + factId +"' " +
//							"RETURN fact,rel,n";

		String cypherQuery = "MATCH (fact:Fact {id:'" + factId +"'}) " +
								"OPTIONAL MATCH (fact)-[rel]->(n) " +
								"RETURN fact,rel,n";
		String json = makeCypherCall(cypherQuery);

		json = transformRawFactGraphJSONToClientJSON(json);

		return json;
	}
	public String getReportsJSON(String patientName) {
		String cypherQuery =  "MATCH (patient:Patient { name:'" + patientName + "'})-->(report:Report) " +
								"RETURN report";

		return makeCypherCall(cypherQuery);
	}


	public String getCancersJSON(String patientName) throws IOException {
		String cypherQuery =  "MATCH (patient:Patient)-->(cancer:Cancer)-[cancerFactReln]->(fact:Fact) " +
								"WHERE patient.name = '" + patientName + "' " +
								"WITH cancer,cancerFactReln,fact " +
									"OPTIONAL MATCH (fact)-[factModifier]->(modifierFact:Fact) " +
									"WHERE factModifier.name <> 'hasProvenance' " +
									"RETURN cancer,cancerFactReln,fact,factModifier,modifierFact";
		String json = makeCypherCall(cypherQuery);

		json = transformRawSummaryGraphJSONToClientJSON(json);

		return json;
	}

	public String getTumorsJSON(String patientName, String cancerID) throws Exception {
		String cypherQuery =
				"MATCH (patient:Patient)-->(cancer:Cancer)-[cancerTumorReln:hasTumor]->(tumor:Tumor)-[tumorFactReln]->(fact:Fact) " +
						"WHERE patient.name = '" + patientName + "' AND cancer.id = '" + cancerID + "' " +
						"WITH tumor,tumorFactReln,fact " +
						"OPTIONAL MATCH (fact)-[factModifier]->(modifierFact:Fact) " +
						"WHERE factModifier.name <> 'hasProvenance' " +
						"RETURN tumor,tumorFactReln,fact,factModifier,modifierFact";

		String json = makeCypherCall(cypherQuery);
		json = transformRawSummaryGraphJSONToClientJSON(json);

		return json;
	}

	private String transformRawSummaryGraphJSONToClientJSON(String json) throws IOException {
		ObjectMapper mapper = new ObjectMapper();
		ArrayNode outputRootNode = mapper.getNodeFactory().arrayNode();

		HashMap<String,ObjectNode> summaryNodeMap = new HashMap<String,ObjectNode>();
		HashMap<String,ObjectNode> factNodeMap = new HashMap<String,ObjectNode>();

		JsonNode neo4jJsonRoot = null;

		neo4jJsonRoot = mapper.readTree(json);
		JsonNode results = neo4jJsonRoot.path("results");
		JsonNode result = null;

		//Get first result
		for(JsonNode o:results){
			result = o;
			break;
		}

		JsonNode data = result.path("data");
		for (JsonNode node : data) {
			JsonNode row = node.path("row");

			//Load row data into objects
			String summaryID = row.get(0).get("id").asText();
			String summaryFactRelation = row.get(1).get("name").asText();
			JsonNode neo4jFact = row.get(2);
			JsonNode factModifier = row.get(3);
			JsonNode neo4jModifierFact = row.get(4);


			ObjectNode summaryNode = summaryNodeMap.get(summaryID);
			if(summaryNode==null){
				summaryNode = mapper.getNodeFactory().objectNode();
				summaryNode.put("id",summaryID);
				summaryNode.putArray("collatedFacts");

				summaryNodeMap.put(summaryID,summaryNode);
				outputRootNode.add(summaryNode);
			}
			ObjectNode collatedFactsNode = addCollatedFactNodeForCategoryIfRequired(mapper, summaryFactRelation, summaryNode);

			//Check to see if we have seen this fact before. Since the IDs are assumed to be *unique*, we can use a global map.
			ObjectNode factNode = factNodeMap.get(neo4jFact.get("id").asText());

			//If not created, do so and add to the collatedFactList
			if(factNode==null){
				//Copy over fact JsonNode to our own ObjectNode.
				factNode =  neo4jFact.deepCopy();

				factNode.putArray("modifiers");

				factNodeMap.put(neo4jFact.get("id").asText(),factNode);
				((ArrayNode)collatedFactsNode.get("facts")).add(factNode);
			}

			if(!neo4jModifierFact.isMissingNode() && neo4jModifierFact.get("prettyName")!=null){
				((ArrayNode)factNode.get("modifiers")).add(neo4jModifierFact);
			}

			if(summaryFactRelation.equals("hasBodySite")){
				String bodySite = neo4jFact.get("prettyName").asText();
				if(!neo4jModifierFact.isMissingNode() && neo4jModifierFact.get("prettyName")!=null &&
						!factModifier.isMissingNode() && factModifier.get("name").asText().equalsIgnoreCase("laterality")){

					bodySite += "(" + neo4jModifierFact.get("prettyName").asText() + ")";
				}
				summaryNode.put("hasBodySite",bodySite);
			}
		}

		return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(outputRootNode);
	}



	private String transformRawFactGraphJSONToClientJSON(String json) throws IOException {
		ObjectMapper mapper = new ObjectMapper();
		ObjectNode factNode = null;

		JsonNode neo4jJsonRoot = mapper.readTree(json);
		JsonNode results = neo4jJsonRoot.path("results");
		JsonNode result = null;

		//Get first result
		for(JsonNode o:results){
			result = o;
			break;
		}

		JsonNode data = result.path("data");
		for (JsonNode node : data) {
			JsonNode row = node.path("row");

			//Load row data into objects
			JsonNode neo4jFactNode = row.get(0);

			JsonNode relnNode = row.get(1);
			JsonNode neo4jConnectedNode = row.get(2);

			if(factNode==null){
				factNode = neo4jFactNode.deepCopy();
				factNode.putArray("collatedFacts");
				factNode.putArray("textMentions");
			}

			if(!(relnNode instanceof NullNode) && !(neo4jConnectedNode instanceof NullNode)) {
				ObjectNode connectedNode = neo4jConnectedNode.deepCopy();

				if (relnNode.get("name").asText().equals("hasTextProvenance")) {
					((ArrayNode) factNode.get("textMentions")).add(connectedNode);
				} else {
					ObjectNode collatedFactsNode = addCollatedFactNodeForCategoryIfRequired(mapper, relnNode.get("name").asText(), factNode);
					((ArrayNode) collatedFactsNode.get("facts")).add(connectedNode);
				}
			}
		}

		return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(factNode);
	}

	private ObjectNode addCollatedFactNodeForCategoryIfRequired(ObjectMapper mapper, String category, ObjectNode parentNode) {
		ArrayNode collatedFactNodesArrayNode = (ArrayNode) parentNode.get("collatedFacts");

		//Check to see if we have already created this CollatedFactList
		ObjectNode collatedFactsNode = null;
		for(JsonNode cf:collatedFactNodesArrayNode){
			if(cf.get("category").asText().equals(category)) {
				collatedFactsNode = (ObjectNode)cf;
				break;
			}
		}
		//If not created yet, do so and add to the list
		if(collatedFactsNode == null){
			collatedFactsNode = mapper.getNodeFactory().objectNode();
			collatedFactsNode.put("category", category);
			collatedFactsNode.putArray("facts");

			collatedFactNodesArrayNode.add(collatedFactsNode);
		}
		return collatedFactsNode;
	}

	public String makeCypherCall(String cypherQuery){
		String json = constructJSONQuery(cypherQuery);
		String restURI = serverRootURI + "transaction/commit";
		return makePOSTCall(restURI,json);
	}

	private String constructJSONQuery(String cypherQuery) {
		String json = "{\n" +
				"  \"statements\": [\n" +
				"    {\n" +
				"      \"statement\": \"" + cypherQuery + "\",\n" +
				"      \"parameters\": null,\n" +
				"      \"resultDataContents\": [\n" +
				"        \"row\"\n" +
				"      ],\n" +
				"      \"includeStats\": false\n" +
				"    }\n" +
				"  ]\n" +
				"}";

		return json;
	}

	/***************** Objectified Methods ******************/

	public List<LinkedHashMap<String, Object>>	getNodesWithLabel(String label) throws JsonParseException, JsonMappingException, IOException{
    	String jsonStr = getNodesWithLabelJSON(label);
        return objectifyNodeJSON(jsonStr);
	}



	
	
	public List<LinkedHashMap<String, Object>>	getIncomingNodesWithRelationshipType(String id, String relationType) throws JsonParseException, JsonMappingException, IOException{
		 List<LinkedHashMap<String, Object>> out = new ArrayList<LinkedHashMap<String, Object>>();
//		http://localhost:7474/db/data/node/10354/relationships/in
		String restURI = serverRootURI + "node/" + id + INCOMING_RELATIONS_SUFFIX;
		
    	String jsonStr = makeRESTCall(restURI);
	   
	    List<LinkedHashMap<String, Object>> rows = objectifyRelationshipJSON(jsonStr);
	    for(LinkedHashMap<String,Object> datamap:rows){
	    	restURI = (String) datamap.get("start");
	    	jsonStr = makeRESTCall(restURI);
	    	
	    	out.addAll(objectifyNodeJSON(jsonStr));
	    }
	    
	    return out;
	}

	public List<LinkedHashMap<String, Object>>	getOutgoingNodesWithRelationshipType(String id, String relationType) throws JsonParseException, JsonMappingException, IOException{
		 List<LinkedHashMap<String, Object>> out = new ArrayList<LinkedHashMap<String, Object>>();
//		http://localhost:7474/db/data/node/10354/relationships/out
		String restURI = serverRootURI + "node/" + id + OUTGOING_RELATIONS_SUFFIX + "/" + relationType;
		System.out.println(restURI);
		String jsonStr = makeRESTCall(restURI);
	   
	    List<LinkedHashMap<String, Object>> rows = objectifyRelationshipJSON(jsonStr);
	    for(LinkedHashMap<String,Object> datamap:rows){
	    	restURI = (String) datamap.get("end");
	    	jsonStr = makeRESTCall(restURI);
	    	
	    	out.addAll(objectifyNodeJSON(jsonStr));
	    }
	    
	    return out;
	}

	

	private String makeRESTCall(String restURI) {
		ClientConfig config = new ClientConfig();

	    Client client = ClientBuilder.newClient(config);
	    HttpAuthenticationFeature authFeature =
	            HttpAuthenticationFeature.basic(username, password);
	         
	    client.register(authFeature);
	    
	    WebTarget target = client.target(restURI);
	    
	    Response response = target.
	              request().
	              accept(MediaType.APPLICATION_JSON_TYPE).
	              get(Response.class);
    	
	    String jsonStr = response.readEntity(String.class);
		return jsonStr;
	}
	
	
	public String makePOSTCall(String restURI,String query) {
		ClientConfig config = new ClientConfig();

	    Client client = ClientBuilder.newClient(config);
	    HttpAuthenticationFeature authFeature =
	            HttpAuthenticationFeature.basic(username, password);
	         
	    client.register(authFeature);
	    
	    WebTarget target = client.target(restURI);
	    
	    Response response = target.
	              request(MediaType.APPLICATION_JSON_TYPE).
	               post(Entity.entity(query,MediaType.APPLICATION_JSON_TYPE));
    	
	    String jsonStr = response.readEntity(String.class);
		return jsonStr;
	}
	
	public List<LinkedHashMap<String, Object>> objectifyRelationshipJSON(String jsonStr) throws JsonParseException, JsonMappingException, IOException{
		ObjectMapper mapper = new ObjectMapper();
        Map<String,Object> dataMap = new HashMap<String,Object>(); 
        Object[] rows = new Object[]{};
        rows = mapper.readValue(jsonStr, Object[].class);
        
        List<LinkedHashMap<String, Object>> out = new ArrayList<LinkedHashMap<String, Object>>();
        
        for(Object o:rows){
	    LinkedHashMap<String, Object> rowmap = (LinkedHashMap<String, Object>) o;
        	
        	
        	LinkedHashMap<String, Object> datamap = (LinkedHashMap<String, Object>) rowmap.get("data");
        	LinkedHashMap<String, Object> metadatamap = (LinkedHashMap<String, Object>) rowmap.get("metadata");
        	for(String key:metadatamap.keySet()){
        		datamap.put(key, metadatamap.get(key));
        	}
        	
        	datamap.put("start",rowmap.get("start"));
        	datamap.put("end",rowmap.get("end"));
        	
        	out.add(datamap);
        	
        }
        
        return out;
	}
	
	public List<LinkedHashMap<String, Object>> objectifyNodeJSON(String jsonStr) throws JsonParseException, JsonMappingException, IOException{
		ObjectMapper mapper = new ObjectMapper();

        Object[] rows;
        if(jsonStr.trim().startsWith("{")){
        	LinkedHashMap<String, Object> rowMap = (LinkedHashMap<String, Object>) mapper.readValue(jsonStr, Map.class);
        	rows = new Object[]{rowMap};
        }
        else
        	rows = mapper.readValue(jsonStr, Object[].class);
        
        List<LinkedHashMap<String, Object>> out = new ArrayList<LinkedHashMap<String, Object>>();
        
        for(Object o:rows){
        	LinkedHashMap<String, Object> rowmap = (LinkedHashMap<String, Object>)o;
        	LinkedHashMap<String, Object> datamap = (LinkedHashMap<String, Object>) rowmap.get("data");
        	LinkedHashMap<String, Object> metadatamap = (LinkedHashMap<String, Object>) rowmap.get("metadata");
        	
        	for(String key:metadatamap.keySet()){
        		datamap.put(key, metadatamap.get(key));
        	}
        	out.add(datamap);
        	
        }
        
        return out;
	}

}
