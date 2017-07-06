package db;
import java.util.ArrayList;
import java.util.List;


public class TumorSummary extends Summary {
	private String tumorType;
	private TumorPhenotype phenotype;
	private List<String> treatment, tumorSequenceVarient, outcome, bodySite;
	
	
	public static class TumorPhenotype extends Node{
		private List<String> manifestation, histologicType, tumorExtent;

		public List<String> getManifestations() {
			if(manifestation == null)
				manifestation = new ArrayList<String>();
			return manifestation;
		}

		public void addManifestation(String m) {
			getManifestations().add(m);
		}

		public List<String> getHistologicTypes() {
			if(histologicType == null)
				histologicType = new ArrayList<String>();
			return histologicType;
		}

		public void addHistologicType(String ht) {
			getHistologicTypes().add(ht);
		}

		public List<String> getTumorExtent() {
			if(tumorExtent == null){
				tumorExtent = new ArrayList<String>();
			}
			return tumorExtent;
		}

		public void addTumorExtent(String te) {
			getTumorExtent().add(te);
		}

		public String getResourceIdentifier() {
			return getClass().getSimpleName()+"_"+Math.abs(hashCode());
		}

		public String getDisplayText() {
			return getClass().getSimpleName();
		}		
		public String getSummaryText() {
			StringBuffer st = new StringBuffer();
			st.append(getDisplayText());
			return st.toString();
		}


		
	}
	
	public String getTumorType() {
		return tumorType;
	}
	public void setTumorType(String tumorType) {
		this.tumorType = tumorType;
	}
	public TumorPhenotype getPhenotype() {
		return phenotype;
	}
	public void setPhenotype(TumorPhenotype phenotype) {
		this.phenotype = phenotype;
	}
	public List<String> getTreatments() {
		if(treatment == null)
			treatment = new ArrayList<String>();
		return treatment;
	}
	public void addTreatment(String t) {
		getTreatments().add(t);
	}
	public List<String> getTumorSequenceVarients() {
		if(tumorSequenceVarient == null)
			tumorSequenceVarient = new ArrayList<String>();
		return tumorSequenceVarient;
	}
	public void addTumorSequenceVarient(String ts) {
		getTumorSequenceVarients().add(ts);
	}
	public List<String> getOutcomes() {
		if(outcome == null)
			outcome = new ArrayList<String>();
		return outcome;
	}
	public void addOutcome(String o) {
		getOutcomes().add(o);
	}
	public List<String> getBodySite() {
		if(bodySite == null)
			bodySite = new ArrayList<String>();
		return bodySite;
	}
	public void addBodySite(String b) {
		getBodySite().add(b);
	}
	public String getDisplayText() {
		return  getClass().getSimpleName();
	}
	public String getResourceIdentifier() {
		return getClass().getSimpleName()+"_"+Math.abs(hashCode());
	}
	public String getSummaryText() {
		StringBuffer st = new StringBuffer();
		st.append(getDisplayText()+":\t");
		if(getPhenotype() != null){
			st.append("["+getPhenotype().getSummaryText()+"]");
		}
		return st.toString();
	}

}
