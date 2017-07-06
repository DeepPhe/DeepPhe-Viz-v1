package db;

import java.util.ArrayList;
import java.util.List;

public class CancerSummary extends Summary {
	public static class CancerPhenotype extends Node{
		private String cancerStage,cancerType,tumorExtent,primaryTumorClassification, distantMetastasisClassification,regionalLymphNodeClassification;
		private List<String> manifestation;
		
		public String getCancerStage() {
			return cancerStage;
		}
		public void setCancerStage(String cancerStage) {
			this.cancerStage = cancerStage;
		}
		public String getCancerType() {
			return cancerType;
		}
		public void setCancerType(String cancerType) {
			this.cancerType = cancerType;
		}
		public String getTumorExtent() {
			return tumorExtent;
		}
		public void setTumorExtent(String tumorExtent) {
			this.tumorExtent = tumorExtent;
		}
		public String getPrimaryTumorClassification() {
			return primaryTumorClassification;
		}
		public void setPrimaryTumorClassification(String primaryTumorClassification) {
			this.primaryTumorClassification = primaryTumorClassification;
		}
		public String getDistantMetastasisClassification() {
			return distantMetastasisClassification;
		}
		public void setDistantMetastasisClassification(String distantMetastasisClassification) {
			this.distantMetastasisClassification = distantMetastasisClassification;
		}
		public String getRegionalLymphNodeClassification() {
			return regionalLymphNodeClassification;
		}
		public void setRegionalLymphNodeClassification(String regionalLymphNodeClassification) {
			this.regionalLymphNodeClassification = regionalLymphNodeClassification;
		}
		public List<String> getManifestations() {
			if(manifestation == null)
				manifestation = new ArrayList<String>();
			return manifestation;
		}
		public void addManifestation(String manifestation) {
			getManifestations().add(manifestation);
		}
		public String getDisplayText() {
			return getClass().getSimpleName();
		}
		public String getResourceIdentifier() {
			return getClass().getSimpleName()+"_"+Math.abs(hashCode());
		}
		public String getSummaryText() {
			StringBuffer st = new StringBuffer();
			st.append(getDisplayText());
			return st.toString();
		}

	}
	private List<CancerPhenotype> phenotype;
	private List<String> bodySite, treatment, outcome;
	private List<TumorSummary> tumors;
	
	public List<String> getBodySite() {
		if(bodySite == null)
			bodySite = new ArrayList<String>();
		return bodySite;
	}
	public void addBodySite(String bodySite) {
		getBodySite().add(bodySite);
	}
	public List<CancerPhenotype> getPhenotypes() {
		if(phenotype == null)
			phenotype = new ArrayList<CancerSummary.CancerPhenotype>();
		return phenotype;
	}
	public void addPhenotype(CancerPhenotype phenotype) {
		getPhenotypes().add(phenotype);
	}
	public List<String> getTreatments() {
		if(treatment == null)
			treatment = new ArrayList<String>();
		return treatment;
	}
	public void addTreatment(String treatment) {
		getTreatments().add(treatment);
	}
	public List<String> getOutcomes() {
		if(outcome == null)
			outcome = new ArrayList<String>();
		return outcome;
	}
	public void addOutcome(String outcome) {
		getOutcomes().add(outcome);
	}
	public List<TumorSummary> getTumors() {
		if(tumors == null)
			tumors = new ArrayList<TumorSummary>();
		return tumors;
	}
	public void addTumor(TumorSummary tumor) {
		getTumors().add(tumor);
	}
	public String getDisplayText() {
		return getClass().getSimpleName();
	}
	public String getResourceIdentifier() {
		return getClass().getSimpleName()+"_"+Math.abs(hashCode());
	}
	public String getSummaryText() {
		StringBuffer st = new StringBuffer();
		st.append(getDisplayText()+":\t");
		for(CancerPhenotype ph: getPhenotypes()){
			st.append("["+ph.getSummaryText()+"] ");
		}
		for(TumorSummary ts: getTumors()){
			st.append("("+ts.getSummaryText().replaceAll("\t"," ")+") ");
		}
		return st.toString();
	}


}
