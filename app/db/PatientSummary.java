package db;

import java.util.ArrayList;
import java.util.List;


public class PatientSummary extends Summary {
	private List<String> exposure, outcome, germlineSequenceVariant;

	public List<String> getExposure() {
		if(exposure == null)
			exposure = new ArrayList<String>();
		return exposure;
	}

	public List<String> getOutcomes() {
		if(outcome == null)
			outcome = new ArrayList<String>();
		return outcome;
	}

	public List<String> getGermlineSequenceVariant() {
		if(germlineSequenceVariant == null)
			germlineSequenceVariant = new ArrayList<String>();
		return germlineSequenceVariant;
	}

	public String getDisplayText() {
		return getClass().getSimpleName();
	}

	public String getResourceIdentifier() {
		return getClass().getSimpleName()+"_"+Math.abs(hashCode());
	}

	public String getSummaryText() {
		// TODO Auto-generated method stub
		return getDisplayText();
	}

}
