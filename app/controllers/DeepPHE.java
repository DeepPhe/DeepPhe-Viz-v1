package controllers;

import db.Neo4JRESTCaller;
import play.Configuration;
import play.mvc.Controller;
import play.mvc.Result;


import javax.inject.Inject;
import java.io.IOException;

/**
 * Created by Girish Chavan on 10/3/2016.
 */
public class DeepPHE extends Controller {

    private final Configuration configuration;
    private final Neo4JRESTCaller neo4jRESTCaller;

    @Inject
    public DeepPHE(Configuration configuration){
        this.configuration = configuration;
        String SERVER_ROOT_URI = configuration.getString("neo4j.url");
        String username = configuration.getString("neo4j.username");
        String password = configuration.getString("neo4j.password");
        neo4jRESTCaller = new Neo4JRESTCaller(SERVER_ROOT_URI, username, password);
    }

    public Result getPatients() {
        try {

            return ok(neo4jRESTCaller.getNodesWithLabelJSON("Patient")).as("text/json");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public Result getPatient(String patientName) {
        if (request().accepts("application/json")) {
            return ok(neo4jRESTCaller.getPatientJSON(patientName)).as("application/json");
        } else {
            return badRequest();
        }
    }

    public Result getCancerSummaries(String patientName) {
        if (request().accepts("application/json")) {
            try {
                return ok(neo4jRESTCaller.getCancersJSON(patientName)).as("application/json");
            } catch (IOException e) {
                e.printStackTrace();
                return internalServerError(e.getMessage());
            }
        } else {
            return badRequest();
        }

    }

    public Result getFact(String factId) {
        if (request().accepts("application/json")) {
            try {
                return ok(neo4jRESTCaller.getFactJSON(factId)).as("application/json");
            } catch (IOException e) {
                e.printStackTrace();
                return internalServerError(e.getMessage());
            }
        } else {
            return badRequest();
        }

    }


    public Result getReports(String patientName) {
        if (request().accepts("application/json")) {
            return ok(neo4jRESTCaller.getReportsJSON(patientName)).as("application/json");
        } else {
            return badRequest();
        }
    }

    public Result getTumorSummaries(String patientName, String cancerIdentifier) {
        if (request().accepts("application/json")) {
            try {
                return ok(neo4jRESTCaller.getTumorsJSON(patientName,cancerIdentifier)).as("application/json");
            } catch (Exception e) {
                e.printStackTrace();
                return internalServerError(e.getMessage());
            }

        } else {
            return badRequest();
        }

    }


}
