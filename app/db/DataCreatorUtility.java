package db;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.databind.JsonMappingException;

public class DataCreatorUtility extends Neo4JRESTCaller{

	public DataCreatorUtility(String serverRootURI, String username, String password) {
		super(serverRootURI, username, password);
	}
	
	public String executeQueries(String queries) {
		String restURI = serverRootURI + "transaction/commit";
	    return 	makePOSTCall(restURI,queries);
	}
	
}
