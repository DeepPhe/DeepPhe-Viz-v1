package db;

import java.util.List;

public class Document extends Node {
	String text;
	Patient subject;
	
	
	List<Procedure> procedures;
	List<Observation> observations;
	List<Medication> medications;
	List<Diagnosis> diagnoses;
	
	
	public String getText() {
		return text;
	}
	public void setText(String text) {
		this.text = text;
	}
	public Patient getSubject() {
		return subject;
	}
	public void setSubject(Patient subject) {
		this.subject = subject;
	}
	public List<Procedure> getProcedures() {
		return procedures;
	}
	public void setProcedures(List<Procedure> procedures) {
		this.procedures = procedures;
	}
	public List<Observation> getObservations() {
		return observations;
	}
	public void setObservations(List<Observation> observations) {
		this.observations = observations;
	}
	public List<Medication> getMedications() {
		return medications;
	}
	public void setMedications(List<Medication> medications) {
		this.medications = medications;
	}
	public List<Diagnosis> getDiagnoses() {
		return diagnoses;
	}
	public void setDiagnoses(List<Diagnosis> diagnoses) {
		this.diagnoses = diagnoses;
	}
	
}
