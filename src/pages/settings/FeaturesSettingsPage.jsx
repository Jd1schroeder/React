import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  CalendarCog,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  FileText,
  Gauge,
  Inbox,
  MapPin,
  MonitorCog,
  Package,
  PanelTop,
  Pencil,
  RotateCcw,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useWorkspace } from "../../components/layout/useWorkspace";
import { updateOrganization } from "../../services/organizationService";
import { DEFAULT_FEATURE_LABELS, FEATURE_LABEL_SECTIONS, getFeatureLabel, normalizeFeatureLabels } from "../../utils/featureLabels";
import "./FeaturesSettingsPage.css";

const featureItems = [
  {
    title: "Work Orders",
    labelKey: "workOrder",
    description: (labels) => `Customize ${getFeatureLabel(labels, "workOrder", "singular")} preferences like Time & Cost Tracking, Procedure Corrective Actions, and more.`,
    icon: ClipboardList,
    action: "Set Preferences",
  },
  {
    title: "Requests",
    labelKey: "request",
    description: (labels) => `Customize ${getFeatureLabel(labels, "request", "singular")} preferences like routing and required fields.`,
    icon: Inbox,
    action: "Set Preferences",
  },
  {
    title: "Assets",
    labelKey: "asset",
    description: (labels) => `Customize ${getFeatureLabel(labels, "asset")}-related settings like Barcode Generation or ${getFeatureLabel(labels, "asset")} creation form.`,
    icon: Boxes,
    action: "Set Preferences",
  },
  {
    title: "Locations",
    labelKey: "location",
    description: (labels) => `Create, manage and edit ${getFeatureLabel(labels, "location")} within your Organization.`,
    icon: MapPin,
    action: "Set Preferences",
  },
  {
    title: "Reporting",
    labelKey: "reporting",
    description: (labels) => `Customize aspects of the ${getFeatureLabel(labels, "reporting", "singular")} feature.`,
    icon: BarChart3,
    action: "Set Preferences",
  },
  {
    title: "Request Portals",
    labelKey: "requestPortal",
    description: (labels) => `Create, manage, and edit all ${getFeatureLabel(labels, "requestPortal")} in your organization.`,
    icon: PanelTop,
    action: "Go to Request Portals",
    moduleToggle: true,
  },
  {
    title: "Purchase Orders",
    labelKey: "purchaseOrder",
    description: (labels) => `Customize your ${getFeatureLabel(labels, "purchaseOrder")} by adding titles and/or prefixes and setting default CC email addresses.`,
    icon: FileText,
    action: "Set Preferences",
    moduleToggle: true,
  },
  {
    title: "Parts Inventory",
    labelKey: "part",
    description: (labels) => `Customize ${getFeatureLabel(labels, "part")} Inventory form, edit Escalation Teams, and adjust Barcode Generation settings.`,
    icon: Wrench,
    action: "Set Preferences",
    moduleToggle: true,
  },
  {
    title: "Meters",
    labelKey: "meter",
    description: (labels) => `Set (or Create) ${getFeatureLabel(labels, "meter")} and track their Readings.`,
    icon: Gauge,
    action: "Set Preferences",
    moduleToggle: true,
  },
  {
    title: "Vendors",
    labelKey: "vendor",
    description: (labels) => `Create, manage, and edit ${getFeatureLabel(labels, "vendor")} to contact from your Organization.`,
    icon: Package,
    action: "Set Preferences",
    moduleToggle: true,
  },
  {
    title: "Workstation Mode",
    labelKey: "workstation",
    description: (labels) => `Set inactivity timer for sessions on ${getFeatureLabel(labels, "workstation", "singular")}.`,
    icon: MonitorCog,
    action: "Set Preferences",
    moduleToggle: true,
  },
  {
    title: "Work Order Template",
    labelKey: "workOrderTemplate",
    description: (labels) => `Create ${getFeatureLabel(labels, "workOrderTemplate")} to standardize your ${getFeatureLabel(labels, "workOrder")}.`,
    icon: FileText,
    moduleToggle: true,
  },
  {
    title: "Automations",
    labelKey: "automation",
    description: (labels) => `Use conditions to trigger tasks and optimize your ${getFeatureLabel(labels, "automation")} operations.`,
    icon: Zap,
    moduleToggle: true,
  },
  {
    title: "Maintenance Plans",
    labelKey: "maintenancePlan",
    description: (labels) => `Configure defaults for ${getFeatureLabel(labels, "maintenancePlan")}`,
    icon: CalendarCog,
    action: "Set Preferences",
  },
];

export function FeaturesSettingsPage() {
  const workspace = useWorkspace();
  const organization = workspace.organization ?? {};
  const organizationId = organization.id;
  const isOrganizationAdmin = organization.roleDefinition?.system_key === "organization_admin" || ["owner", "admin"].includes(organization.role);
  const savedFeatureLabels = normalizeFeatureLabels(organization.feature_labels);
  const [enabledModules, setEnabledModules] = useState(() => Object.fromEntries(featureItems.filter((item) => item.moduleToggle).map((item) => [item.title, true])));
  const [customLabels, setCustomLabels] = useState(savedFeatureLabels);
  const [labelsOrganizationId, setLabelsOrganizationId] = useState(organizationId);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelDraft, setLabelDraft] = useState(savedFeatureLabels);
  const [expandedLabel, setExpandedLabel] = useState(null);
  const [isSavingLabels, setIsSavingLabels] = useState(false);
  const [labelSaveError, setLabelSaveError] = useState("");
  const visibleLabels = labelsOrganizationId === organizationId ? customLabels : savedFeatureLabels;

  const toggleModule = (title) => setEnabledModules((current) => ({ ...current, [title]: !current[title] }));
  const openLabelModal = (labelKey) => {
    setLabelDraft(visibleLabels);
    setExpandedLabel(labelKey);
    setLabelSaveError("");
    setIsLabelModalOpen(true);
  };
  const closeLabelModal = () => setIsLabelModalOpen(false);
  const saveLabels = async () => {
    if (!organizationId) return;
    setIsSavingLabels(true);
    setLabelSaveError("");
    try {
      const normalizedLabels = normalizeFeatureLabels(labelDraft);
      await updateOrganization({ organizationId, updates: { feature_labels: normalizedLabels } });
      setCustomLabels(normalizedLabels);
      setLabelsOrganizationId(organizationId);
      await workspace.refreshWorkspace?.();
      closeLabelModal();
    } catch (error) {
      setLabelSaveError(error.message || "Unable to save feature labels.");
    } finally {
      setIsSavingLabels(false);
    }
  };

  useEffect(() => {
    if (!isLabelModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeLabelModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isLabelModalOpen]);

  return (
    <>
      <section className="features-settings-content" aria-labelledby="features-settings-list-title">
        <h2 id="features-settings-list-title" className="sr-only">Feature modules</h2>
        <div className="features-settings-list">
          {featureItems.map((feature) => {
            const Icon = feature.icon;
            const isEnabled = enabledModules[feature.title] ?? true;
            const featureLabel = getFeatureLabel(visibleLabels, feature.labelKey);
            return (
              <article className="feature-settings-card" key={feature.title}>
                <div className="feature-settings-card-main">
                  <div className="feature-settings-card-heading">
                    <span className="feature-settings-icon"><Icon size={17} aria-hidden="true" /></span>
                    <h3>{featureLabel ?? feature.title}</h3>
                    {isOrganizationAdmin && <button type="button" className="feature-settings-edit-labels" onClick={() => openLabelModal(feature.labelKey)}><Pencil size={15} aria-hidden="true" />Edit Labels</button>}
                  </div>
                  <p>{typeof feature.description === "function" ? feature.description(visibleLabels) : feature.description}</p>
                  {feature.action && <button type="button" className="feature-settings-action">{feature.action}<ChevronRight size={16} aria-hidden="true" /></button>}
                </div>
                {feature.moduleToggle && <FeatureModuleToggle title={feature.title} checked={isEnabled} onChange={() => toggleModule(feature.title)} />}
              </article>
            );
          })}
        </div>
      </section>
      {isLabelModalOpen && <FeatureLabelsModal draft={labelDraft} savedLabels={visibleLabels} expandedLabel={expandedLabel} isSaving={isSavingLabels} error={labelSaveError} onChange={setLabelDraft} onExpand={setExpandedLabel} onClose={closeLabelModal} onSave={saveLabels} />}
    </>
  );
}

function FeatureModuleToggle({ title, checked, onChange }) {
  return (
    <div className="feature-module-control">
      <span>Feature Module: {checked ? "On" : "Off"}</span>
      <button type="button" className={`feature-module-toggle${checked ? " is-on" : ""}`} role="switch" aria-checked={checked} aria-label={`${title} feature module ${checked ? "on" : "off"}`} onClick={onChange}>
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

function FeatureLabelsModal({ draft, savedLabels, expandedLabel, isSaving, error, onChange, onExpand, onClose, onSave }) {
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(savedLabels);
  const hasCustomLabels = JSON.stringify(draft) !== JSON.stringify(DEFAULT_FEATURE_LABELS);
  const restoreLabel = (key) => onChange((current) => ({ ...current, [key]: { ...DEFAULT_FEATURE_LABELS[key] } }));
  const restoreAllLabels = () => onChange(normalizeFeatureLabels(DEFAULT_FEATURE_LABELS));

  return (
    <div className="feature-label-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="feature-label-modal" role="dialog" aria-modal="true" aria-labelledby="feature-label-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="feature-label-modal-header">
          <h2 id="feature-label-modal-title">Customize Feature Labels</h2>
          <button type="button" className="feature-label-modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>
        <div className="feature-label-modal-content">
          <p>Customizing labels will have an impact across the entire App, so we suggest labeling features in a way that sounds familiar to your team.</p>
          <div className="feature-label-sections">
            {FEATURE_LABEL_SECTIONS.map((section) => {
              const isExpanded = expandedLabel === section.key;
              const sectionLabel = draft[section.key]?.singular ?? section.label;
              return (
                <section className={`feature-label-section${isExpanded ? " is-expanded" : ""}`} key={section.key}>
                  <button type="button" className="feature-label-section-toggle" aria-expanded={isExpanded} onClick={() => onExpand(isExpanded ? null : section.key)}>
                    <span>{sectionLabel}</span>{isExpanded ? <ChevronUp size={21} aria-hidden="true" /> : <ChevronDown size={21} aria-hidden="true" />}
                  </button>
                  {isExpanded && <div className="feature-label-fields">
                    <p>How would you name this feature?</p>
                    <label><span>“{DEFAULT_FEATURE_LABELS[section.key].singular}”</span><input value={draft[section.key]?.singular ?? ""} placeholder="Enter Custom Label" onChange={(event) => onChange((current) => ({ ...current, [section.key]: { ...current[section.key], singular: event.target.value } }))} /></label>
                    <label><span>“{DEFAULT_FEATURE_LABELS[section.key].plural}”</span><input value={draft[section.key]?.plural ?? ""} placeholder="Enter Custom Label" onChange={(event) => onChange((current) => ({ ...current, [section.key]: { ...current[section.key], plural: event.target.value } }))} /></label>
                    <button type="button" className="feature-label-restore" disabled={JSON.stringify(draft[section.key]) === JSON.stringify(DEFAULT_FEATURE_LABELS[section.key])} onClick={() => restoreLabel(section.key)}><RotateCcw size={16} aria-hidden="true" />Restore Default Label</button>
                  </div>}
                </section>
              );
            })}
          </div>
        </div>
        {error && <p className="feature-label-modal-error" role="alert">{error}</p>}
        <footer className="feature-label-modal-footer">
          <button type="button" className="feature-label-restore-all" disabled={!hasCustomLabels || isSaving} onClick={restoreAllLabels}><RotateCcw size={16} aria-hidden="true" />Restore All Default Labels</button>
          <div className="feature-label-modal-footer-actions"><button type="button" className="feature-label-modal-cancel" onClick={onClose} disabled={isSaving}>Cancel</button><button type="button" className="feature-label-modal-save" disabled={!hasChanges || isSaving} onClick={onSave}>{isSaving ? "Saving..." : "Save Changes"}</button></div>
        </footer>
      </section>
    </div>
  );
}
