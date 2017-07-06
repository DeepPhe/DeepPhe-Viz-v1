package db;

public class Diagnosis extends Node {
	
	String[] bodySites;
	String stage;
	public String[] getBodySites() {
		return bodySites;
	}
	public void setBodySites(String[] bodySites) {
		this.bodySites = bodySites;
	}
	public String getStage() {
		return stage;
	}
	public void setStage(String stage) {
		this.stage = stage;
	}
	
	
}
