import db.Neo4JRESTCaller;
import org.junit.Test;

import java.io.IOException;

import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

public class Neo4JRESTCallerTest {

	String SERVER_ROOT_URI = "http://localhost:7474/db/data/";
	String username = "neo4j";
	String password = "123";

	@Test
	public void testGetCancerSummaries() {
		String patientName = "Patient01";

		Neo4JRESTCaller neo4jRESTCaller = new Neo4JRESTCaller(SERVER_ROOT_URI, username, password);

		try {
			String patientJSON = neo4jRESTCaller.getCancersJSON(patientName);
			assertTrue(patientJSON.length()>0);
			System.out.println(patientJSON);
		} catch (IOException e) {
			e.printStackTrace();
			fail(e.getMessage());
		}
	}

	@Test
	public void testGetFact() {
		String factId = "MedicalRecord_Breast_709";

		Neo4JRESTCaller neo4jRESTCaller = new Neo4JRESTCaller(SERVER_ROOT_URI, username, password);

		try {
			String patientJSON = neo4jRESTCaller.getFactJSON(factId);
			assertTrue(patientJSON.length()>0);
			System.out.println(patientJSON);
		} catch (IOException e) {
			e.printStackTrace();
			fail(e.getMessage());
		}
	}

	@Test
	public void testGetReports() {
		String patientName = "Patient03";

		Neo4JRESTCaller neo4jRESTCaller = new Neo4JRESTCaller(SERVER_ROOT_URI, username, password);


		String patientJSON = neo4jRESTCaller.getReportsJSON(patientName);
		assertTrue(patientJSON.length()>0);
		System.out.println(patientJSON);
	}
}
