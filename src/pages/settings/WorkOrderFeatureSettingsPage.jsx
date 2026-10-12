import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, Info, LockKeyhole, X } from "lucide-react";
import { Select } from "../../components/ui/Select";
import { useWorkspace } from "../../components/layout/useWorkspace";
import { getNextWorkOrderNumber, updateOrganization, updateWorkOrderStartingNumber } from "../../services/organizationService";
import { getFeatureLabel } from "../../utils/featureLabels";
import { normalizeFeatureModules } from "../../utils/featureModules";
import { normalizeWorkOrderSettings } from "../../utils/workOrderSettings";
import { SettingsLayout } from "./SettingsLayout";
import { WorkOrderStartingIdModal } from "./WorkOrderStartingIdModal";
import "./WorkOrderFeatureSettingsPage.css";

function updateNestedSetting(current, path, value) {
  const [group, key] = path.split(".");
  if (!key) return { ...current, [group]: value };
  return { ...current, [group]: { ...current[group], [key]: value } };
}

export function WorkOrderFeatureSettingsPage({ onNavigate }) {
  const workspace = useWorkspace();
  const organization = workspace.organization ?? {};
  const labels = organization.feature_labels;
  const workOrderLabel = getFeatureLabel(labels, "workOrder");
  const workOrderSingularLabel = getFeatureLabel(labels, "workOrder", "singular");
  const workOrderTemplateLabel = getFeatureLabel(labels, "workOrderTemplate");
  const isOrganizationAdmin = organization.roleDefinition?.system_key === "organization_admin" || ["owner", "admin"].includes(organization.role);
  const savedSettings = normalizeWorkOrderSettings(organization.work_order_settings);
  const savedFeatureModules = normalizeFeatureModules(organization.feature_modules);
  const [settings, setSettings] = useState(savedSettings);
  const [settingsOrganizationId, setSettingsOrganizationId] = useState(organization.id);
  const displayedSettings = settingsOrganizationId === organization.id ? settings : savedSettings;
  const [featureModules, setFeatureModules] = useState(savedFeatureModules);
  const [featureModulesOrganizationId, setFeatureModulesOrganizationId] = useState(organization.id);
  const displayedFeatureModules = featureModulesOrganizationId === organization.id ? featureModules : savedFeatureModules;
  const [savingKey, setSavingKey] = useState("");
  const [savingFeatureModule, setSavingFeatureModule] = useState("");
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState(null);
  const [isToastLeaving, setIsToastLeaving] = useState(false);
  const [isStartingIdModalOpen, setIsStartingIdModalOpen] = useState(false);
  const [isSavingStartingId, setIsSavingStartingId] = useState(false);
  const [isLoadingStartingId, setIsLoadingStartingId] = useState(false);
  const [startingIdValue, setStartingIdValue] = useState(organization.work_order_start_number ?? 1);
  const [startingIdError, setStartingIdError] = useState("");

  const updateSetting = async (path, value) => {
    if (!organization.id || !isOrganizationAdmin) return;
    const previous = displayedSettings;
    const next = updateNestedSetting(previous, path, value);
    setSettings(next);
    setSettingsOrganizationId(organization.id);
    setSavingKey(path);
    setSaveError("");
    try {
      await updateOrganization({ organizationId: organization.id, updates: { work_order_settings: next } });
      workspace.patchOrganization?.(organization.id, { work_order_settings: next });
      setIsToastLeaving(false);
      setToast({ message: "Setting changed!", tone: "success" });
    } catch (error) {
      setSettings(previous);
      const message = error.message || "Unable to save Work Order settings.";
      setSaveError(message);
      setIsToastLeaving(false);
      setToast({ message, tone: "error" });
    } finally {
      setSavingKey("");
    }
  };

  const toggleFeatureModule = async (moduleKey, label) => {
    if (!organization.id || !isOrganizationAdmin || savingFeatureModule) return;
    const previous = displayedFeatureModules;
    const next = { ...previous, [moduleKey]: !previous[moduleKey] };
    setFeatureModules(next);
    setFeatureModulesOrganizationId(organization.id);
    setSavingFeatureModule(moduleKey);
    setSaveError("");
    try {
      await updateOrganization({ organizationId: organization.id, updates: { feature_modules: next } });
      workspace.patchOrganization?.(organization.id, { feature_modules: next });
      setIsToastLeaving(false);
      setToast({ message: `${label} turned ${next[moduleKey] ? "on" : "off"}.`, tone: "success" });
    } catch (error) {
      setFeatureModules(previous);
      const message = error.message || "Unable to update feature modules.";
      setSaveError(message);
      setIsToastLeaving(false);
      setToast({ message, tone: "error" });
    } finally {
      setSavingFeatureModule("");
    }
  };

  useEffect(() => {
    if (!toast) return undefined;
    const leaveTimeout = window.setTimeout(() => setIsToastLeaving(true), 5000);
    const removeTimeout = window.setTimeout(() => setToast(null), 5220);
    return () => {
      window.clearTimeout(leaveTimeout);
      window.clearTimeout(removeTimeout);
    };
  }, [toast]);

  const dismissToast = () => {
    setIsToastLeaving(true);
    window.setTimeout(() => setToast(null), 220);
  };

  const openStartingIdModal = async () => {
    if (!organization.id || !isOrganizationAdmin || isLoadingStartingId) return;
    setIsLoadingStartingId(true);
    setStartingIdError("");
    try {
      setStartingIdValue(await getNextWorkOrderNumber(organization.id));
      setIsStartingIdModalOpen(true);
    } catch (error) {
      setSaveError(error.message || `Unable to load the next ${workOrderSingularLabel} ID.`);
    } finally {
      setIsLoadingStartingId(false);
    }
  };

  const saveStartingId = async (value) => {
    if (!organization.id || !isOrganizationAdmin) return;
    setIsSavingStartingId(true);
    setStartingIdError("");
    try {
      const savedStartingNumber = await updateWorkOrderStartingNumber({ organizationId: organization.id, startingNumber: value });
      workspace.patchOrganization?.(organization.id, { work_order_start_number: savedStartingNumber });
      setIsStartingIdModalOpen(false);
    } catch (error) {
      setStartingIdError(error.message || `Unable to save the ${workOrderSingularLabel} starting ID.`);
    } finally {
      setIsSavingStartingId(false);
    }
  };

  return (
    <div className="settings-page work-order-feature-page">
      {toast && createPortal(
        <div className={`work-order-settings-toast is-${toast.tone}${isToastLeaving ? " is-leaving" : ""}`} role="status" aria-live="polite">
          {toast.tone === "error" ? <AlertCircle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
          <span>{toast.message}</span>
          <button type="button" onClick={dismissToast} aria-label="Dismiss notification"><X size={18} aria-hidden="true" /></button>
        </div>,
        document.body,
      )}
      {isStartingIdModalOpen && <WorkOrderStartingIdModal workOrderLabel={workOrderSingularLabel} initialValue={startingIdValue} minimumValue={startingIdValue} error={startingIdError} isSaving={isSavingStartingId} onClose={() => { if (!isSavingStartingId) { setIsStartingIdModalOpen(false); setStartingIdError(""); } }} onSave={saveStartingId} />}
      <header className="settings-page-header">
        <div>
          <p className="eyebrow">Organization Settings</p>
          <h1>{workOrderLabel}</h1>
          <p>Configure {workOrderLabel.toLowerCase()} preferences and behavior for this workspace.</p>
        </div>
      </header>
      <SettingsLayout pageName="Settings / Features" onNavigate={onNavigate} className="work-order-settings-layout">
        <div className="work-order-feature-content">
          <button type="button" className="work-order-feature-back" onClick={() => onNavigate("Settings / Features")}><ArrowLeft size={17} aria-hidden="true" /> Back to Features</button>
          {!isOrganizationAdmin && <p className="work-order-feature-readonly">Only organization administrators can change these settings.</p>}
          {saveError && <p className="work-order-feature-error" role="alert">{saveError}</p>}

          <SettingsCard title={`External ${workOrderLabel}`}>
            <SettingToggle label={`Share ${workOrderSingularLabel} Externally`} description={`Share an external link to ${workOrderLabel.toLowerCase()} with your Vendor contacts. Control what they can see and do with each ${workOrderSingularLabel.toLowerCase()}.`} checked={displayedSettings.externalWorkOrders} onChange={(value) => updateSetting("externalWorkOrders", value)} saving={savingKey === "externalWorkOrders"} disabled={!isOrganizationAdmin} locked />
          </SettingsCard>

          <WorkOrderTemplateModuleCard label={workOrderTemplateLabel} workOrderLabel={workOrderLabel} checked={displayedFeatureModules.workOrderTemplate} locked={!isOrganizationAdmin} saving={savingFeatureModule === "workOrderTemplate"} onChange={() => toggleFeatureModule("workOrderTemplate", workOrderTemplateLabel)} />

          <SettingsCard title="Comment requirements" description={`Configure when comments are required for key ${workOrderSingularLabel.toLowerCase()} actions.`}>
            <div className="work-order-comment-table" role="group" aria-label="Comment requirements">
              <div className="work-order-comment-header"><span>Comment requirements on {workOrderSingularLabel} status changes</span><div><strong>None</strong><strong>Optional</strong><strong>Mandatory</strong></div></div>
              {[['onHold', `Status changed to on hold`], ['skipped', `${workOrderSingularLabel} skipped`], ['canceled', `${workOrderSingularLabel} canceled`]].map(([key, label]) => <RadioSettingRow key={key} label={label} value={displayedSettings.commentRequirements[key]} onChange={(value) => updateSetting(`commentRequirements.${key}`, value)} disabled={!isOrganizationAdmin} />)}
            </div>
          </SettingsCard>

          <SettingsCard title="Preferences">
            <SettingToggle label="Filter by Fail or Flag" description={`Enable filtering ${workOrderLabel.toLowerCase()} list based on Failures or Flags.`} checked={displayedSettings.filterByFailOrFlag} onChange={(value) => updateSetting("filterByFailOrFlag", value)} saving={savingKey === "filterByFailOrFlag"} disabled={!isOrganizationAdmin} locked />
            <SettingToggle label="Assign Users and Teams on Mention" description={`Assign mentioned users and Teams to the ${workOrderSingularLabel.toLowerCase()} from a ${workOrderSingularLabel.toLowerCase()} comment.`} checked={displayedSettings.assignUsersTeamsOnMention} onChange={(value) => updateSetting("assignUsersTeamsOnMention", value)} saving={savingKey === "assignUsersTeamsOnMention"} disabled={!isOrganizationAdmin} locked={false} />
            <SettingToggle label={`Show ${workOrderLabel} in To Do by start date only`} description={`Show ${workOrderLabel.toLowerCase()} in To Do view based on their start date only. When off ${workOrderLabel.toLowerCase()} that are nearly due or overdue will also appear.`} checked={displayedSettings.showToDoByStartDateOnly} onChange={(value) => updateSetting("showToDoByStartDateOnly", value)} saving={savingKey === "showToDoByStartDateOnly"} disabled={!isOrganizationAdmin} locked />
            <ActionSetting label="Manage Work Orders Overdue Escalation Teams" description={`Select a Team to notify when ${workOrderLabel.toLowerCase()} are overdue.`} locked />
            <SettingToggle label="Use Smart Time Estimates" description={`Enable Smart Time Estimates to calculate ${workOrderSingularLabel.toLowerCase()} estimated time based on historical data.`} checked={displayedSettings.useSmartTimeEstimates} onChange={(value) => updateSetting("useSmartTimeEstimates", value)} saving={savingKey === "useSmartTimeEstimates"} disabled={!isOrganizationAdmin} locked enterprise />
            <ActionSetting label={`Next ${workOrderSingularLabel} ID`} description={`Modify the ${workOrderSingularLabel.toLowerCase()} starting ID for this Organization.`} locked={!isOrganizationAdmin || isLoadingStartingId} onClick={openStartingIdModal} />
          </SettingsCard>

          <SettingsCard title="Time & Cost Tracking">
            <SettingToggle label="Enable cost tracking" description="" checked={displayedSettings.enableCostTracking} onChange={(value) => updateSetting("enableCostTracking", value)} saving={savingKey === "enableCostTracking"} disabled={!isOrganizationAdmin} locked />
            <SettingToggle label="Require cost tracking" description={`Users must enter costs in ${workOrderLabel.toLowerCase()}.`} checked={displayedSettings.requireCostTracking} onChange={(value) => updateSetting("requireCostTracking", value)} saving={savingKey === "requireCostTracking"} disabled={!isOrganizationAdmin} locked />
            <ActionSetting label="Manage custom cost types" locked />
            <SettingToggle label="Enable time tracking" description="" checked={displayedSettings.enableTimeTracking} onChange={(value) => updateSetting("enableTimeTracking", value)} saving={savingKey === "enableTimeTracking"} disabled={!isOrganizationAdmin} locked />
            <SettingToggle label="Require time tracking" description={`Users must enter time in ${workOrderLabel.toLowerCase()}.`} checked={displayedSettings.requireTimeTracking} onChange={(value) => updateSetting("requireTimeTracking", value)} saving={savingKey === "requireTimeTracking"} disabled={!isOrganizationAdmin} locked />
            <ActionSetting label="Manage custom time types" locked />
            <SettingToggle label="Enable unit cost overrides for parts" description={`Overrides only apply to the ${workOrderSingularLabel.toLowerCase()} and don’t affect global unit cost.`} checked={displayedSettings.enableUnitCostOverrides} onChange={(value) => updateSetting("enableUnitCostOverrides", value)} saving={savingKey === "enableUnitCostOverrides"} disabled={!isOrganizationAdmin} />
            <SettingToggle label="Require parts" description={`Users must add parts to ${workOrderLabel.toLowerCase()}.`} checked={displayedSettings.requireParts} onChange={(value) => updateSetting("requireParts", value)} saving={savingKey === "requireParts"} disabled={!isOrganizationAdmin} locked />
          </SettingsCard>

          <SettingsCard title="Procedures">
            <SelectSetting label="Corrective Actions on Failures" description={`${workOrderSingularLabel} creation when a Procedure fails.`} value={displayedSettings.correctiveActionsOnFailures} onChange={(value) => updateSetting("correctiveActionsOnFailures", value)} disabled={!isOrganizationAdmin} locked />
            <SelectSetting label="Corrective Actions on Flags (including Anomalies)" description={`${workOrderSingularLabel} creation when a Procedure includes any flags.`} value={displayedSettings.correctiveActionsOnFlags} onChange={(value) => updateSetting("correctiveActionsOnFlags", value)} disabled={!isOrganizationAdmin} locked />
            <SettingToggle label="Anomaly Detection" description="Detects anomalies in Procedure fields based on historical data." checked={displayedSettings.anomalyDetection} onChange={(value) => updateSetting("anomalyDetection", value)} saving={savingKey === "anomalyDetection"} disabled={!isOrganizationAdmin} locked />
          </SettingsCard>

          <SettingsCard title={`Customize ${workOrderSingularLabel} Form`}>
            <ActionSetting label={`${workOrderSingularLabel} fields`} description="Set required or optional fields and manage custom fields." locked />
          </SettingsCard>

          <SettingsCard title="Resource Planning">
            <SettingToggle label="Enable Workload View" description={`${workOrderSingularLabel} section will include a new view to access data about Resource Planning.`} checked={displayedSettings.enableWorkloadView} onChange={(value) => updateSetting("enableWorkloadView", value)} saving={savingKey === "enableWorkloadView"} disabled={!isOrganizationAdmin} locked />
            <ActionSetting label="Set Organization Capacity" description="Determine the working capacity for your Organization members." locked />
            <div className="work-order-multiple-assignees is-locked"><p className="work-order-setting-label"><LockKeyhole size={15} aria-hidden="true" /> Multiple Assignees</p><p>In {workOrderLabel.toLowerCase()} with multiple assignees, work time distribution should be:</p><label><input type="radio" name="multiple-assignees" checked={displayedSettings.multipleAssignees === "split_evenly"} onChange={() => updateSetting("multipleAssignees", "split_evenly")} disabled /> Split evenly between all assignees <Info size={15} aria-hidden="true" /></label><label><input type="radio" name="multiple-assignees" checked={displayedSettings.multipleAssignees === "fully_assigned"} onChange={() => updateSetting("multipleAssignees", "fully_assigned")} disabled /> Totally assigned to each of the assignees <Info size={15} aria-hidden="true" /></label></div>
          </SettingsCard>
        </div>
      </SettingsLayout>
    </div>
  );
}

function SettingsCard({ title, description, children }) {
  return <section className="work-order-settings-card" aria-labelledby={`work-order-settings-${title.toLowerCase().replaceAll(" ", "-")}`}><h2 id={`work-order-settings-${title.toLowerCase().replaceAll(" ", "-")}`}>{title}</h2>{description && <p className="work-order-settings-card-description">{description}</p>}<div className="work-order-settings-card-body">{children}</div></section>;
}

function WorkOrderTemplateModuleCard({ label, workOrderLabel, checked, locked, saving, onChange }) {
  return (
    <section className="work-order-settings-card work-order-template-module-card" aria-labelledby="work-order-template-module-title">
      <div className="work-order-template-module-content">
        <div>
          <h2 id="work-order-template-module-title">{label}</h2>
          <p>Create {label} to standardize your {workOrderLabel}.</p>
          <button type="button" className="work-order-template-preferences" disabled aria-label={`${label} preferences unavailable`}>
            Set Preferences <LockKeyhole size={16} aria-hidden="true" />
          </button>
        </div>
        <div className={`work-order-feature-module-control${locked ? " is-locked" : ""}`}>
          {locked && <LockKeyhole size={16} aria-hidden="true" />}
          <span>Feature Module: {checked ? "On" : "Off"}</span>
          <button type="button" className={`work-order-feature-module-toggle${checked ? " is-on" : ""}`} role="switch" aria-checked={checked} aria-label={`${label} feature module ${checked ? "on" : "off"}`} onClick={onChange} disabled={locked || saving}>
            <span aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

function SettingToggle({ label, description, checked, onChange, disabled, locked = true, enterprise = false, saving }) {
  return <div className={`work-order-setting-row${locked ? " is-locked" : ""}`}><div><div className="work-order-setting-label">{locked && <LockKeyhole size={15} aria-hidden="true" />}{label}</div>{description && <p>{description}</p>}</div><div className="work-order-setting-control">{enterprise && <span className="work-order-enterprise">Enterprise Only</span>}{locked && !enterprise && <LockKeyhole size={18} aria-hidden="true" />}<button type="button" className={`work-order-toggle${checked ? " is-on" : ""}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} disabled={disabled || locked || saving}><span aria-hidden="true" /></button></div></div>;
}

function RadioSettingRow({ label, value, onChange, disabled }) {
  return <div className="work-order-comment-row"><span>{label}</span><div>{["none", "optional", "mandatory"].map((option) => <label key={option} aria-label={`${label}: ${option}`}><input type="radio" name={`comment-${label}`} value={option} checked={value === option} onChange={() => onChange(option)} disabled={disabled} /></label>)}</div></div>;
}

function SelectSetting({ label, description, value, onChange, disabled, locked = true }) {
  return <div className={`work-order-select-setting${locked ? " is-locked" : ""}`}><div><div className="work-order-setting-label">{locked && <LockKeyhole size={15} aria-hidden="true" />}{label}</div><p>{description}</p></div><div className="work-order-setting-control">{locked && <LockKeyhole size={18} aria-hidden="true" />}<Select ariaLabel={label} value={value} onChange={onChange} disabled={disabled || locked} options={[{ value: "automatic", label: "Automatic without Prompt" }, { value: "prompt", label: "Prompt" }, { value: "none", label: "No action" }]} /></div></div>;
}

function ActionSetting({ label, description, locked = false, onClick }) {
  return <div className={`work-order-action-setting${locked ? " is-locked" : ""}`}><button type="button" className="work-order-action-title" onClick={onClick} disabled={locked}><span>{label}</span>{locked ? <LockKeyhole size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}</button>{description && <div className="work-order-action-description"><p>{description}</p></div>}</div>;
}
