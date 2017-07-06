package controllers;

import play.mvc.Controller;
import play.mvc.Result;
import play.routing.JavaScriptReverseRouter;

/**
 * Created by Girish Chavan on 10/3/2016.
 */
public class JavascriptRouter extends Controller{

    public Result jsRoutes() {

        return ok(JavaScriptReverseRouter.create("jsRoutes",
                    routes.javascript.Application.getPatient(),
                    routes.javascript.DeepPHE.getPatients(),
                    routes.javascript.DeepPHE.getPatient(),
                    routes.javascript.DeepPHE.getReports(),
                    routes.javascript.DeepPHE.getCancerSummaries(),
                    routes.javascript.DeepPHE.getTumorSummaries(),
                    routes.javascript.DeepPHE.getFact()
                )
        ).as(("text/javascript"));
    }

}
