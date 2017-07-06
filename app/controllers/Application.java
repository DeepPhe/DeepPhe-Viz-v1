package controllers;


import play.mvc.Controller;
import play.mvc.Result;
import views.html.patient;

public class Application extends Controller {

    public Result index() {

        return ok("This is cool");
    }

    public Result getPatient(String patientName) {
        return ok(patient.render(patientName));
    }




}
