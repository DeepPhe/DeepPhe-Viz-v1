package db;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.databind.JsonMappingException;

import db.CancerSummary.CancerPhenotype;

public class DatamodelUtility extends Neo4JRESTCaller{

	public DatamodelUtility(String serverRootURI, String username, String password) {
		super(serverRootURI, username, password);
	}
	
	public List<Patient> getPatients() throws JsonParseException, JsonMappingException, IOException{
		List<LinkedHashMap<String,Object>> rows = getNodesWithLabel("Patient");
		
		List<Patient> patientList = new ArrayList<Patient>();
		
		for(LinkedHashMap<String,Object> datamap:rows){
			Patient p = new Patient();
			patientList.add(p);
			p.setId((int) datamap.get("id"));
			p.setName((String) datamap.get("name"));
			p.setSummaries(new ArrayList<Summary>());
			p.setDocuments(new ArrayList<Document>());
			/////////////////////// Summaries

			List<LinkedHashMap<String,Object>> srows = getOutgoingNodesWithRelationshipType(p.getId()+"", "hasCancerSummary");
			
			for(LinkedHashMap<String,Object> sdatamap:srows){
				CancerSummary cs = new CancerSummary();
				cs.setId((int) sdatamap.get("id"));
				cs.setName((String) sdatamap.get("name"));
				p.getSummaries().add(cs);
				
				List<LinkedHashMap<String,Object>> cprows = getOutgoingNodesWithRelationshipType(cs.getId()+"", "hasCancerPhenotype");
				
				for(LinkedHashMap<String,Object> cpdatamap:cprows){
					CancerPhenotype cp = new CancerSummary.CancerPhenotype();
					cp.setId((int) cpdatamap.get("id"));
					cp.setName((String) cpdatamap.get("name"));
					cs.addPhenotype(cp);
				}
				
				List<LinkedHashMap<String,Object>> trows = getOutgoingNodesWithRelationshipType(cs.getId()+"", "hasTumorSummary");
				
				for(LinkedHashMap<String,Object> tsdatamap:trows){
					TumorSummary ts = new TumorSummary();
					ts.setId((int) tsdatamap.get("id"));
					ts.setName((String) tsdatamap.get("name"));
					cs.addTumor(ts);
				}
			}
			
			List<LinkedHashMap<String,Object>> psrows = getOutgoingNodesWithRelationshipType(p.getId()+"", "hasPatientSummary");
			
			for(LinkedHashMap<String,Object> psdatamap:psrows){
				PatientSummary ps = new PatientSummary();
				ps.setId((int) psdatamap.get("id"));
				ps.setName((String) psdatamap.get("name"));
				p.getSummaries().add(ps);
				
				
			}
			
			/////////////////////// Documents
			
			List<LinkedHashMap<String,Object>> docrows = getIncomingNodesWithRelationshipType(p.getId()+"", "hasSubject");
			
			for(LinkedHashMap<String,Object> docdatamap:docrows){
				Document document = new Document();
				document.setId((int) docdatamap.get("id"));
				document.setName((String) docdatamap.get("name"));
				document.setText((String)docdatamap.get("text"));
				
				document.setDiagnoses(new ArrayList<Diagnosis>());
				document.setProcedures(new ArrayList<Procedure>());
				document.setMedications(new ArrayList<Medication>());
				
				document.setSubject(p);
				p.getDocuments().add(document);
				
				List<LinkedHashMap<String,Object>> drows = getOutgoingNodesWithRelationshipType(document.getId()+"", "hasDiagnosis");
			
				for(LinkedHashMap<String,Object> dmap:drows){
					Diagnosis di = new Diagnosis();
					di.setId((int) dmap.get("id"));
					di.setName((String) dmap.get("name"));
					
					document.getDiagnoses().add(di);
				}
				
				drows = getOutgoingNodesWithRelationshipType(document.getId()+"", "hasProcedure");
				
				for(LinkedHashMap<String,Object> dmap:drows){
					Procedure di = new Procedure();
					di.setId((int) dmap.get("id"));
					di.setName((String) dmap.get("name"));
					
					document.getProcedures().add(di);
				}
				
				drows = getOutgoingNodesWithRelationshipType(document.getId()+"", "hasMedication");
				
				for(LinkedHashMap<String,Object> dmap:drows){
					Medication di = new Medication();
					di.setId((int) dmap.get("id"));
					di.setName((String) dmap.get("name"));
					
					document.getMedications().add(di);
				}
			}
		}
		
		return patientList;
	}
	
}
